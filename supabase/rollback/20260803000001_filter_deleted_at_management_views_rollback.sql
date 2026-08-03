-- Rollback: 20260803000001_filter_deleted_at_management_views
-- GSI ONE | PP2-E3A — Reverter filtro deleted_at nas views gerenciais
--
-- Efeito: restaura as tres views ao estado da migration 20260728000002,
-- SEM o filtro a.deleted_at IS NULL (e sem filtros em triagens/consultas).
-- Registros logicamente excluidos voltarao a computar nos indicadores.
--
-- Usar somente em ambiente de desenvolvimento/homologacao controlado.
-- Em producao, a reversao deve ser precedida de decisao formal documentada.

-- VIEW 1 — restaurar sem filtro deleted_at
create or replace view public.vw_gestao_indicadores_gerais as
select
  date_trunc('week', a.hora_chegada_ts)::date                                         as semana_inicio,
  count(*)                                                                              as total_atendimentos,
  count(*) filter (
    where d.codigo in ('alta', 'alta_observacao', 'medicacao_alta')
  )                                                                                     as total_altas,
  count(*) filter (where d.codigo = 'transferencia_regulada')                          as total_transferencias,
  count(*) filter (where d.codigo = 'obito')                                           as total_obitos,
  count(*) filter (where d.codigo = 'evasao_desistencia')                              as total_evasoes,
  count(*) filter (where a.desfecho_id is not null)                                    as total_com_desfecho,
  round(
    100.0 * count(*) filter (where a.desfecho_id is not null)
    / nullif(count(*), 0),
    1
  )                                                                                     as pct_com_desfecho
from public.atendimentos a
left join public.dom_desfechos d on d.id = a.desfecho_id
where
  public.has_permission('gestao.indicadores.visualizar')
  or public.has_permission('leitura.indicadores.visualizar')
group by date_trunc('week', a.hora_chegada_ts)
having count(*) >= 5
order by semana_inicio desc;

comment on view public.vw_gestao_indicadores_gerais is
  'Fase 2.6.1 — Indicadores operacionais semanais agregados. '
  'Perfis: Gestao Hospitalar (gestao.indicadores.visualizar), '
  'Leitura/Gestor (leitura.indicadores.visualizar). '
  'SECURITY DEFINER: acesso controlado por has_permission() no WHERE. '
  'Supressao: semanas com n < 5 omitidas. Nenhum dado nominal exposto.';

-- VIEW 2 — restaurar sem filtro deleted_at
create or replace view public.vw_gestao_producao_assistencial as
select
  date_trunc('week', a.hora_chegada_ts)::date                                         as semana_inicio,
  coalesce(a.setor_atual, 'Nao informado')                                             as setor,
  count(*) < 5                                                                         as suprimido,
  case when count(*) < 5 then null else count(*) end                                   as quantidade_atendimentos,
  case when count(*) < 5 then null
       else count(*) filter (
         where d.codigo in ('alta', 'alta_observacao', 'medicacao_alta')
       )
  end                                                                                   as quantidade_altas,
  case when count(*) < 5 then null
       else count(*) filter (where d.codigo = 'transferencia_regulada')
  end                                                                                   as quantidade_transferencias,
  case when count(*) < 5 then null
       else count(*) filter (where d.codigo = 'obito')
  end                                                                                   as quantidade_obitos,
  case when count(*) < 5 then null
       else count(*) filter (where d.codigo = 'evasao_desistencia')
  end                                                                                   as quantidade_evasoes,
  case when count(*) < 5 then null
       else count(*) filter (where a.desfecho_id is not null)
  end                                                                                   as quantidade_com_desfecho
from public.atendimentos a
left join public.dom_desfechos d on d.id = a.desfecho_id
where
  public.has_permission('gestao.producao.visualizar')
  or public.has_permission('gestao.relatorios.visualizar')
  or public.has_permission('leitura.relatorios.visualizar')
group by
  date_trunc('week', a.hora_chegada_ts),
  a.setor_atual
order by semana_inicio desc, setor;

comment on view public.vw_gestao_producao_assistencial is
  'Fase 2.6.1 — Producao assistencial semanal por setor. '
  'Perfis: Gestao Hospitalar (gestao.producao.visualizar, gestao.relatorios.visualizar), '
  'Leitura/Gestor (leitura.relatorios.visualizar). '
  'SECURITY DEFINER: acesso controlado por has_permission() no WHERE. '
  'Supressao: celulas com n < 5 retornam NULL; coluna suprimido = true. '
  'Nenhum dado nominal exposto.';

-- VIEW 3 — restaurar sem filtro deleted_at em atendimentos/triagens/consultas
create or replace view public.vw_gestao_tempos_assistenciais as
with
triagem_por_atend as (
  select
    atendimento_id,
    min(hora_inicio_ts) as hora_inicio_ts,
    min(hora_fim_ts)    as hora_fim_ts
  from public.triagens
  group by atendimento_id
),
consulta_por_atend as (
  select
    atendimento_id,
    min(hora_inicio_ts) as hora_inicio_ts
  from public.consultas
  group by atendimento_id
),
intervalos as (
  select
    date_trunc('week', a.hora_chegada_ts)::date as semana_inicio,
    case
      when t.hora_inicio_ts is not null
       and t.hora_inicio_ts > a.hora_chegada_ts
      then extract(epoch from (t.hora_inicio_ts - a.hora_chegada_ts)) / 60.0
    end as t_entrada_triagem,
    case
      when t.hora_fim_ts is not null
       and c.hora_inicio_ts is not null
       and c.hora_inicio_ts > t.hora_fim_ts
      then extract(epoch from (c.hora_inicio_ts - t.hora_fim_ts)) / 60.0
    end as t_triagem_consulta,
    case
      when a.hora_desfecho_ts is not null
       and a.hora_desfecho_ts > a.hora_chegada_ts
      then extract(epoch from (a.hora_desfecho_ts - a.hora_chegada_ts)) / 60.0
    end as t_permanencia
  from public.atendimentos a
  left join triagem_por_atend t on t.atendimento_id = a.id
  left join consulta_por_atend c on c.atendimento_id = a.id
  where
    public.has_permission('gestao.tempos.visualizar')
    or public.has_permission('leitura.paineis.visualizar')
),
agrupado as (
  select
    semana_inicio,
    count(*)                                                                    as n_registros_base,
    count(t_entrada_triagem)                                                    as n_entrada_triagem,
    avg(t_entrada_triagem)                                                      as media_entrada_triagem,
    percentile_cont(0.5) within group (order by t_entrada_triagem)             as mediana_entrada_triagem,
    count(t_triagem_consulta)                                                   as n_triagem_consulta,
    avg(t_triagem_consulta)                                                     as media_triagem_consulta,
    percentile_cont(0.5) within group (order by t_triagem_consulta)            as mediana_triagem_consulta,
    count(t_permanencia)                                                        as n_permanencia,
    avg(t_permanencia)                                                          as media_permanencia,
    percentile_cont(0.5) within group (order by t_permanencia)                 as mediana_permanencia
  from intervalos
  group by semana_inicio
)
select
  semana_inicio,
  n_registros_base                                                               as quantidade_registros_base,
  n_entrada_triagem                                                              as n_calculado_entrada_triagem,
  case when n_entrada_triagem < 5 then null
       else round(media_entrada_triagem::numeric, 1) end                         as tempo_medio_entrada_triagem_min,
  case when n_entrada_triagem < 5 then null
       else round(mediana_entrada_triagem::numeric, 1) end                       as tempo_mediano_entrada_triagem_min,
  n_triagem_consulta                                                             as n_calculado_triagem_consulta,
  case when n_triagem_consulta < 5 then null
       else round(media_triagem_consulta::numeric, 1) end                        as tempo_medio_triagem_consulta_min,
  case when n_triagem_consulta < 5 then null
       else round(mediana_triagem_consulta::numeric, 1) end                      as tempo_mediano_triagem_consulta_min,
  n_permanencia                                                                  as n_calculado_permanencia,
  case when n_permanencia < 5 then null
       else round(media_permanencia::numeric, 1) end                             as tempo_medio_permanencia_total_min,
  case when n_permanencia < 5 then null
       else round(mediana_permanencia::numeric, 1) end                           as tempo_mediano_permanencia_total_min
from agrupado
order by semana_inicio desc;

comment on view public.vw_gestao_tempos_assistenciais is
  'Fase 2.6.1 — Tempos assistenciais semanais agregados (media e mediana por metrica). '
  'Perfis: Gestao Hospitalar (gestao.tempos.visualizar), '
  'Leitura/Gestor (leitura.paineis.visualizar). '
  'SECURITY DEFINER: acesso controlado por has_permission() no WHERE. '
  'Intervalos negativos e nulos descartados. '
  'Supressao: metricas com n < 5 retornam NULL. '
  'Nenhum dado nominal ou UUID individual exposto.';

-- Grants — identicos ao estado original
revoke all on public.vw_gestao_indicadores_gerais    from anon, authenticated;
revoke all on public.vw_gestao_producao_assistencial from anon, authenticated;
revoke all on public.vw_gestao_tempos_assistenciais  from anon, authenticated;

grant select on public.vw_gestao_indicadores_gerais    to authenticated;
grant select on public.vw_gestao_producao_assistencial to authenticated;
grant select on public.vw_gestao_tempos_assistenciais  to authenticated;

-- ROLLBACK: 20260802000001_fix_soft_delete_visibility
-- GSI ONE | PP2-F — Correcao estrutural da visibilidade de exclusao logica
--
-- Contexto:
--   Reverte exatamente as alteracoes da migration 20260802000001.
--   Restaura as tres views gerenciais ao estado original (20260728000002),
--   sem filtros deleted_at.
--   Restaura as tres policies SELECT ao estado da Fase B1 (20260722100031),
--   sem filtros deleted_at.
--
-- Efeito:
--   - Views retornam a incluir registros logicamente excluidos nos indicadores.
--   - Perfis operacionais voltam a ver registros com deleted_at IS NOT NULL.
--   - Administracao e Auditoria: sem mudanca observavel (acesso era irrestrito).
--
-- Pre-condicao: executar APENAS em ambiente local (127.0.0.1:54322).
-- NAO executar em producao sem janela de manutencao aprovada.
--
-- Ordem de execucao:
--   R1: Restaurar as 3 views (CREATE OR REPLACE sem filtros deleted_at)
--   R2: Restaurar os grants das views
--   R3: Restaurar as 3 policies SELECT (DROP + CREATE sem deleted_at)

-- =========================================================================
-- R1: Restaurar as 3 views ao estado original (20260728000002)
-- =========================================================================

-- -------------------------------------------------------------------------
-- R1.1 vw_gestao_indicadores_gerais — sem filtro deleted_at
-- -------------------------------------------------------------------------
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
  'Supressao: semanas com n < 5 omitidas. Nenhum dado nominal exposto. '
  '[ROLLBACK PP2-F: filtro deleted_at IS NULL removido — estado original 20260728000002]';

-- -------------------------------------------------------------------------
-- R1.2 vw_gestao_producao_assistencial — sem filtro deleted_at
-- -------------------------------------------------------------------------
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
  'Nenhum dado nominal exposto. '
  '[ROLLBACK PP2-F: filtro deleted_at IS NULL removido — estado original 20260728000002]';

-- -------------------------------------------------------------------------
-- R1.3 vw_gestao_tempos_assistenciais — sem filtros deleted_at
-- -------------------------------------------------------------------------
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
  'Nenhum dado nominal ou UUID individual exposto. '
  '[ROLLBACK PP2-F: filtros deleted_at IS NULL removidos — estado original 20260728000002]';

-- =========================================================================
-- R2: Restaurar grants (identicos ao original 20260728000002)
-- =========================================================================
revoke all on public.vw_gestao_indicadores_gerais    from anon, authenticated;
revoke all on public.vw_gestao_producao_assistencial from anon, authenticated;
revoke all on public.vw_gestao_tempos_assistenciais  from anon, authenticated;

grant select on public.vw_gestao_indicadores_gerais    to authenticated;
grant select on public.vw_gestao_producao_assistencial to authenticated;
grant select on public.vw_gestao_tempos_assistenciais  to authenticated;

-- =========================================================================
-- R3: Restaurar as 3 policies SELECT ao estado da Fase B1 (20260722100031)
-- =========================================================================

-- R3.1 pacientes_select_operacional — sem deleted_at
drop policy if exists pacientes_select_operacional on public.pacientes;

create policy pacientes_select_operacional on public.pacientes
  for select to authenticated
  using (
    public.has_permission('paciente.visualizar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy pacientes_select_operacional on public.pacientes is
  'Rollback PP2-F: restaura estado B1 (20260722100031) sem filtro deleted_at. '
  'Registros logicamente excluidos voltam a ser visiveis para perfis operacionais.';

-- R3.2 atendimentos_select_operacional — sem deleted_at
drop policy if exists atendimentos_select_operacional on public.atendimentos;

create policy atendimentos_select_operacional on public.atendimentos
  for select to authenticated
  using (
    public.has_permission('atendimento.visualizar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy atendimentos_select_operacional on public.atendimentos is
  'Rollback PP2-F: restaura estado B1 (20260722100031) sem filtro deleted_at. '
  'Registros logicamente excluidos voltam a ser visiveis para perfis operacionais.';

-- R3.3 consultas_select_clinico — sem deleted_at
drop policy if exists consultas_select_clinico on public.consultas;

create policy consultas_select_clinico on public.consultas
  for select to authenticated
  using (
    public.has_permission('consulta.visualizar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy consultas_select_clinico on public.consultas is
  'Rollback PP2-F: restaura estado B1 (20260722100031) sem filtro deleted_at. '
  'Registros logicamente excluidos voltam a ser visiveis para perfis operacionais.';

-- =========================================================================
-- FIM DO ROLLBACK 20260802000001
-- Views restauradas: 3 (estado 20260728000002)
-- Policies restauradas: 3 (estado 20260722100031 / B1)
-- =========================================================================

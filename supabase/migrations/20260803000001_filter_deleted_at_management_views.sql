-- Migration: 20260803000001_filter_deleted_at_management_views
-- GSI ONE | PP2-E3A — Exclusao logica nas views gerenciais
--
-- Contexto:
--   A migration 20260709170000 adicionou deleted_at, deleted_by e delete_reason
--   em todas as tabelas assistenciais sensiveis, incluindo atendimentos, triagens
--   e consultas. As tres views gerenciais criadas em 20260728000002 nao filtravam
--   registros logicamente excluidos, o que faria fixtures de homologacao (PP2-E3)
--   computarem nos indicadores mesmo apos soft delete.
--
-- O que esta migration faz:
--   Recria as tres views com CREATE OR REPLACE, acrescentando:
--     a.deleted_at IS NULL  em atendimentos
--     t.deleted_at IS NULL  em triagens   (view de tempos)
--     c.deleted_at IS NULL  em consultas  (view de tempos)
--   Nenhuma outra logica, coluna, nome, tipo, permissao ou grant e alterado.
--
-- O que esta migration NAO faz:
--   - Nao altera migrations anteriores.
--   - Nao altera tabelas, colunas, RLS, policies, triggers, funcoes ou dominios.
--   - Nao altera grants (mantem REVOKE ALL + GRANT SELECT a authenticated).
--   - Nao altera o comportamento de seguranca das views (SECURITY DEFINER
--     por comportamento padrao do PostgreSQL permanece inalterado).
--   - Nao altera colunas, nomes ou tipos das views.
--   - Nao expoe dados nominais ou UUIDs individuais.
--
-- Rollback:
--   supabase/rollback/20260803000001_filter_deleted_at_management_views_rollback.sql
--
-- Validacao:
--   npx.cmd vitest run --config vitest.security.config.mjs
--     tests/security/management-views-deleted-at-filter.test.js

-- =========================================================================
-- PRE-CONDICAO: confirmar que as tres views ja existem
-- =========================================================================

do $pre$
begin
  if not exists (
    select 1 from pg_views
    where schemaname = 'public'
      and viewname = 'vw_gestao_indicadores_gerais'
  ) then
    raise exception
      'filter_deleted_at_management_views [PRE]: vw_gestao_indicadores_gerais nao encontrada. '
      'Aplicar migration 20260728000002 primeiro.';
  end if;

  if not exists (
    select 1 from pg_views
    where schemaname = 'public'
      and viewname = 'vw_gestao_producao_assistencial'
  ) then
    raise exception
      'filter_deleted_at_management_views [PRE]: vw_gestao_producao_assistencial nao encontrada. '
      'Aplicar migration 20260728000002 primeiro.';
  end if;

  if not exists (
    select 1 from pg_views
    where schemaname = 'public'
      and viewname = 'vw_gestao_tempos_assistenciais'
  ) then
    raise exception
      'filter_deleted_at_management_views [PRE]: vw_gestao_tempos_assistenciais nao encontrada. '
      'Aplicar migration 20260728000002 primeiro.';
  end if;

  -- Confirmar que a coluna deleted_at existe em atendimentos, triagens e consultas.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'atendimentos'
      and column_name  = 'deleted_at'
  ) then
    raise exception
      'filter_deleted_at_management_views [PRE]: coluna deleted_at ausente em atendimentos. '
      'Aplicar migration 20260709170000 primeiro.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'triagens'
      and column_name  = 'deleted_at'
  ) then
    raise exception
      'filter_deleted_at_management_views [PRE]: coluna deleted_at ausente em triagens. '
      'Aplicar migration 20260709170000 primeiro.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'consultas'
      and column_name  = 'deleted_at'
  ) then
    raise exception
      'filter_deleted_at_management_views [PRE]: coluna deleted_at ausente em consultas. '
      'Aplicar migration 20260709170000 primeiro.';
  end if;
end $pre$;

-- =========================================================================
-- VIEW 1: vw_gestao_indicadores_gerais
-- Alteracao: AND a.deleted_at IS NULL na clausula WHERE
-- =========================================================================

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
  a.deleted_at is null
  and (
    public.has_permission('gestao.indicadores.visualizar')
    or public.has_permission('leitura.indicadores.visualizar')
  )
group by date_trunc('week', a.hora_chegada_ts)
having count(*) >= 5
order by semana_inicio desc;

comment on view public.vw_gestao_indicadores_gerais is
  'Fase 2.6.1 — Indicadores operacionais semanais agregados. '
  'Perfis: Gestao Hospitalar (gestao.indicadores.visualizar), '
  'Leitura/Gestor (leitura.indicadores.visualizar). '
  'SECURITY DEFINER: acesso controlado por has_permission() no WHERE. '
  'Supressao: semanas com n < 5 omitidas. Nenhum dado nominal exposto. '
  'PP2-E3A: registros com deleted_at preenchido excluidos do calculo.';

-- =========================================================================
-- VIEW 2: vw_gestao_producao_assistencial
-- Alteracao: AND a.deleted_at IS NULL na clausula WHERE
-- =========================================================================

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
  a.deleted_at is null
  and (
    public.has_permission('gestao.producao.visualizar')
    or public.has_permission('gestao.relatorios.visualizar')
    or public.has_permission('leitura.relatorios.visualizar')
  )
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
  'PP2-E3A: registros com deleted_at preenchido excluidos do calculo.';

-- =========================================================================
-- VIEW 3: vw_gestao_tempos_assistenciais
-- Alteracoes:
--   triagem_por_atend : WHERE t.deleted_at IS NULL
--   consulta_por_atend: WHERE c.deleted_at IS NULL (alias c usado na CTE)
--   intervalos        : AND a.deleted_at IS NULL na clausula WHERE
-- Justificativa triagens/consultas:
--   Triagens ou consultas logicamente excluidas podem pertencer a atendimentos
--   ainda ativos. Incluir seus timestamps distorceria t_entrada_triagem e
--   t_triagem_consulta. O filtro e aplicado dentro de cada CTE para que o
--   MIN() por atendimento considere apenas registros validos.
--   Cardinalidade nao se altera: o join permanece LEFT JOIN, portanto
--   atendimentos sem triagem/consulta valida retornam NULL para as metricas
--   correspondentes (comportamento identico ao anterior para atendimentos
--   sem triagem/consulta alguma).
-- =========================================================================

create or replace view public.vw_gestao_tempos_assistenciais as
with
-- triagem_por_atend: um registro por atendimento (MIN dos validos).
-- deleted_at IS NULL exclui triagens logicamente removidas.
triagem_por_atend as (
  select
    atendimento_id,
    min(hora_inicio_ts) as hora_inicio_ts,
    min(hora_fim_ts)    as hora_fim_ts
  from public.triagens
  where deleted_at is null
  group by atendimento_id
),
-- consulta_por_atend: um registro por atendimento (MIN dos validos).
-- deleted_at IS NULL exclui consultas logicamente removidas.
consulta_por_atend as (
  select
    atendimento_id,
    min(hora_inicio_ts) as hora_inicio_ts
  from public.consultas
  where deleted_at is null
  group by atendimento_id
),
-- intervalos: base de calculo — somente atendimentos nao excluidos.
intervalos as (
  select
    date_trunc('week', a.hora_chegada_ts)::date as semana_inicio,
    -- Intervalo entrada → início da triagem (minutos); descarta negativos e nulos.
    case
      when t.hora_inicio_ts is not null
       and t.hora_inicio_ts > a.hora_chegada_ts
      then extract(epoch from (t.hora_inicio_ts - a.hora_chegada_ts)) / 60.0
    end as t_entrada_triagem,
    -- Intervalo fim da triagem → início da consulta (minutos).
    case
      when t.hora_fim_ts is not null
       and c.hora_inicio_ts is not null
       and c.hora_inicio_ts > t.hora_fim_ts
      then extract(epoch from (c.hora_inicio_ts - t.hora_fim_ts)) / 60.0
    end as t_triagem_consulta,
    -- Permanência total: chegada → desfecho (minutos).
    case
      when a.hora_desfecho_ts is not null
       and a.hora_desfecho_ts > a.hora_chegada_ts
      then extract(epoch from (a.hora_desfecho_ts - a.hora_chegada_ts)) / 60.0
    end as t_permanencia
  from public.atendimentos a
  left join triagem_por_atend t on t.atendimento_id = a.id
  left join consulta_por_atend c on c.atendimento_id = a.id
  where
    a.deleted_at is null
    and (
      public.has_permission('gestao.tempos.visualizar')
      or public.has_permission('leitura.paineis.visualizar')
    )
),
-- agrupado: agregacao semanal. percentile_cont ignora NULLs nativamente.
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
-- Projecao final com supressao aplicada coluna a coluna.
select
  semana_inicio,
  n_registros_base                                                               as quantidade_registros_base,
  -- Tempo entrada → triagem
  n_entrada_triagem                                                              as n_calculado_entrada_triagem,
  case when n_entrada_triagem < 5 then null
       else round(media_entrada_triagem::numeric, 1) end                         as tempo_medio_entrada_triagem_min,
  case when n_entrada_triagem < 5 then null
       else round(mediana_entrada_triagem::numeric, 1) end                       as tempo_mediano_entrada_triagem_min,
  -- Tempo triagem → consulta
  n_triagem_consulta                                                             as n_calculado_triagem_consulta,
  case when n_triagem_consulta < 5 then null
       else round(media_triagem_consulta::numeric, 1) end                        as tempo_medio_triagem_consulta_min,
  case when n_triagem_consulta < 5 then null
       else round(mediana_triagem_consulta::numeric, 1) end                      as tempo_mediano_triagem_consulta_min,
  -- Permanencia total
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
  'PP2-E3A: atendimentos, triagens e consultas com deleted_at preenchido excluidos do calculo.';

-- =========================================================================
-- GRANTS — mantidos identicos a 20260728000002
-- =========================================================================

revoke all on public.vw_gestao_indicadores_gerais    from anon, authenticated;
revoke all on public.vw_gestao_producao_assistencial from anon, authenticated;
revoke all on public.vw_gestao_tempos_assistenciais  from anon, authenticated;

grant select on public.vw_gestao_indicadores_gerais    to authenticated;
grant select on public.vw_gestao_producao_assistencial to authenticated;
grant select on public.vw_gestao_tempos_assistenciais  to authenticated;

-- =========================================================================
-- FIM DA MIGRATION 20260803000001
-- Rollback: supabase/rollback/20260803000001_filter_deleted_at_management_views_rollback.sql
-- Validacao: npx.cmd vitest run --config vitest.security.config.mjs
--            tests/security/management-views-deleted-at-filter.test.js
-- =========================================================================

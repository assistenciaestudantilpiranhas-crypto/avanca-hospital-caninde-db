-- Migration: 20260802000001_fix_soft_delete_visibility
-- GSI ONE | PP2-F — Correcao estrutural da visibilidade de exclusao logica
--
-- Problema corrigido:
--   As tres views gerenciais (vw_gestao_indicadores_gerais,
--   vw_gestao_producao_assistencial, vw_gestao_tempos_assistenciais) e as
--   tres policies SELECT (pacientes_select_operacional,
--   atendimentos_select_operacional, consultas_select_clinico) nao filtravam
--   registros com deleted_at IS NOT NULL.
--
--   Resultado: registros logicamente excluidos permaneciam visiveis para perfis
--   operacionais e compunham indicadores gerenciais, violando o principio de
--   exclusao logica estabelecido pela migration 20260709170000.
--
-- O que esta migration faz:
--   PARTE F1 — Recria as 3 views gerenciais com filtros deleted_at IS NULL
--              explícitos em atendimentos, triagens e consultas.
--   PARTE F2 — Recria as 3 policies SELECT com cláusula deleted_at IS NULL
--              para perfis operacionais; Admin e Auditoria mantêm acesso irrestrito.
--
-- O que esta migration NAO faz:
--   - Nao altera tabelas, colunas, sequences nem triggers.
--   - Nao altera grants (preservados via REVOKE/GRANT identicos ao original).
--   - Nao altera outras policies alem das tres listadas acima.
--   - Nao altera funcoes (has_permission, is_admin, is_auditoria).
--   - Nao altera permissoes nem perfis.
--   - Nao altera dados (nenhum INSERT, UPDATE, DELETE, TRUNCATE).
--   - Nao aplica no ambiente remoto sem autorizacao expressa.
--
-- Preservado integralmente:
--   - Nomes das views e colunas.
--   - Tipos de dados e expressoes de calculo.
--   - Logica de supressao de celula pequena (n < 5).
--   - Chamadas a has_permission() nas views e policies.
--   - Grants (REVOKE ALL + GRANT SELECT to authenticated).
--   - Comportamento validado no PP2-D.
--   - Acesso irrestrito de Administracao e Auditoria (incluindo registros excluidos).
--
-- Dependencias:
--   20260709170000_block_delete_assistencial_audit_append_only.sql
--     (campos deleted_at, deleted_by, delete_reason nas 19 tabelas assistenciais)
--   20260728000001_create_gestao_permissions.sql
--     (permissoes gestao.* e leitura.*)
--   20260728000002_create_low_risk_management_views.sql
--     (views originais — substituidas por CREATE OR REPLACE abaixo)
--   20260722100031_rls_phase_b1_read_permissions.sql
--     (policies B1 originais — substituidas por DROP/CREATE abaixo)
--
-- Rollback:
--   supabase/rollback/20260802000001_fix_soft_delete_visibility_rollback.sql
--
-- Validacao:
--   npx.cmd vitest run tests/security/pp2f-soft-delete-visibility.test.js
--   npx.cmd vitest run tests/security

-- =========================================================================
-- PRE-CONDICAO: campos deleted_at devem existir nas tres tabelas
-- =========================================================================

do $pre$
declare
  v_missing text := '';
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'atendimentos'
      and column_name = 'deleted_at'
  ) then
    v_missing := v_missing || 'atendimentos.deleted_at ';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'triagens'
      and column_name = 'deleted_at'
  ) then
    v_missing := v_missing || 'triagens.deleted_at ';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'consultas'
      and column_name = 'deleted_at'
  ) then
    v_missing := v_missing || 'consultas.deleted_at ';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pacientes'
      and column_name = 'deleted_at'
  ) then
    v_missing := v_missing || 'pacientes.deleted_at ';
  end if;

  if v_missing <> '' then
    raise exception
      'fix_soft_delete_visibility [PRE]: campos deleted_at ausentes: [%]. '
      'Aplicar migration 20260709170000 primeiro.', trim(v_missing);
  end if;
end $pre$;

-- =========================================================================
-- PARTE F1 — Recriar as 3 views gerenciais com filtros deleted_at IS NULL
-- =========================================================================

-- -------------------------------------------------------------------------
-- F1.1 vw_gestao_indicadores_gerais
-- Adicionado: AND a.deleted_at IS NULL no WHERE.
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
  a.deleted_at is null
  and (
    public.has_permission('gestao.indicadores.visualizar')
    or public.has_permission('leitura.indicadores.visualizar')
  )
group by date_trunc('week', a.hora_chegada_ts)
having count(*) >= 5
order by semana_inicio desc;

comment on view public.vw_gestao_indicadores_gerais is
  'Fase 2.6.1 / PP2-F — Indicadores operacionais semanais agregados. '
  'Perfis: Gestao Hospitalar (gestao.indicadores.visualizar), '
  'Leitura/Gestor (leitura.indicadores.visualizar). '
  'SECURITY DEFINER: acesso controlado por has_permission() no WHERE. '
  'Supressao: semanas com n < 5 omitidas. Nenhum dado nominal exposto. '
  'PP2-F: filtro deleted_at IS NULL adicionado — registros excluidos logicamente omitidos.';

-- -------------------------------------------------------------------------
-- F1.2 vw_gestao_producao_assistencial
-- Adicionado: AND a.deleted_at IS NULL no WHERE.
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
  'Fase 2.6.1 / PP2-F — Producao assistencial semanal por setor. '
  'Perfis: Gestao Hospitalar (gestao.producao.visualizar, gestao.relatorios.visualizar), '
  'Leitura/Gestor (leitura.relatorios.visualizar). '
  'SECURITY DEFINER: acesso controlado por has_permission() no WHERE. '
  'Supressao: celulas com n < 5 retornam NULL; coluna suprimido = true. '
  'Nenhum dado nominal exposto. '
  'PP2-F: filtro deleted_at IS NULL adicionado — registros excluidos logicamente omitidos.';

-- -------------------------------------------------------------------------
-- F1.3 vw_gestao_tempos_assistenciais
-- Adicionado:
--   - WHERE t.deleted_at IS NULL no CTE triagem_por_atend
--   - WHERE c.deleted_at IS NULL no CTE consulta_por_atend
--   - AND a.deleted_at IS NULL no WHERE do CTE intervalos
-- -------------------------------------------------------------------------
create or replace view public.vw_gestao_tempos_assistenciais as
with
triagem_por_atend as (
  select
    atendimento_id,
    min(hora_inicio_ts) as hora_inicio_ts,
    min(hora_fim_ts)    as hora_fim_ts
  from public.triagens
  where deleted_at is null
  group by atendimento_id
),
consulta_por_atend as (
  select
    atendimento_id,
    min(hora_inicio_ts) as hora_inicio_ts
  from public.consultas
  where deleted_at is null
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
    a.deleted_at is null
    and (
      public.has_permission('gestao.tempos.visualizar')
      or public.has_permission('leitura.paineis.visualizar')
    )
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
  'Fase 2.6.1 / PP2-F — Tempos assistenciais semanais agregados (media e mediana por metrica). '
  'Perfis: Gestao Hospitalar (gestao.tempos.visualizar), '
  'Leitura/Gestor (leitura.paineis.visualizar). '
  'SECURITY DEFINER: acesso controlado por has_permission() no WHERE. '
  'Intervalos negativos e nulos descartados. '
  'Supressao: metricas com n < 5 retornam NULL. '
  'Nenhum dado nominal ou UUID individual exposto. '
  'PP2-F: filtros deleted_at IS NULL adicionados em atendimentos, triagens e consultas.';

-- =========================================================================
-- Revogar e replicar grants (identicos ao original 20260728000002)
-- =========================================================================
revoke all on public.vw_gestao_indicadores_gerais    from anon, authenticated;
revoke all on public.vw_gestao_producao_assistencial from anon, authenticated;
revoke all on public.vw_gestao_tempos_assistenciais  from anon, authenticated;

grant select on public.vw_gestao_indicadores_gerais    to authenticated;
grant select on public.vw_gestao_producao_assistencial to authenticated;
grant select on public.vw_gestao_tempos_assistenciais  to authenticated;

-- =========================================================================
-- PARTE F2 — Recriar as 3 policies SELECT com filtro deleted_at IS NULL
-- =========================================================================
-- Estrategia:
--   Perfis operacionais (has_permission): veem apenas registros ativos
--     (deleted_at IS NULL).
--   Administracao (is_admin()) e Auditoria (is_auditoria()): acesso irrestrito,
--     incluindo registros excluidos logicamente — necessario para rastreabilidade
--     e auditoria forense.
-- DROP IF EXISTS + CREATE preserva a convencao das migrations anteriores.

-- -------------------------------------------------------------------------
-- F2.1 pacientes_select_operacional
-- -------------------------------------------------------------------------
drop policy if exists pacientes_select_operacional on public.pacientes;

create policy pacientes_select_operacional on public.pacientes
  for select to authenticated
  using (
    (public.has_permission('paciente.visualizar') and deleted_at is null)
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy pacientes_select_operacional on public.pacientes is
  'PP2-F (20260802000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito, inclusive a '
  'registros excluidos logicamente, para rastreabilidade e auditoria forense.';

-- -------------------------------------------------------------------------
-- F2.2 atendimentos_select_operacional
-- -------------------------------------------------------------------------
drop policy if exists atendimentos_select_operacional on public.atendimentos;

create policy atendimentos_select_operacional on public.atendimentos
  for select to authenticated
  using (
    (public.has_permission('atendimento.visualizar') and deleted_at is null)
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy atendimentos_select_operacional on public.atendimentos is
  'PP2-F (20260802000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito, inclusive a '
  'registros excluidos logicamente, para rastreabilidade e auditoria forense.';

-- -------------------------------------------------------------------------
-- F2.3 consultas_select_clinico
-- -------------------------------------------------------------------------
drop policy if exists consultas_select_clinico on public.consultas;

create policy consultas_select_clinico on public.consultas
  for select to authenticated
  using (
    (public.has_permission('consulta.visualizar') and deleted_at is null)
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy consultas_select_clinico on public.consultas is
  'PP2-F (20260802000001): perfis operacionais veem somente registros ativos '
  '(deleted_at IS NULL). Admin e Auditoria tem acesso irrestrito, inclusive a '
  'registros excluidos logicamente, para rastreabilidade e auditoria forense.';

-- =========================================================================
-- FIM DA MIGRATION 20260802000001
-- Views alteradas: 3 (vw_gestao_indicadores_gerais, vw_gestao_producao_assistencial,
--                     vw_gestao_tempos_assistenciais)
-- Policies alteradas: 3 (pacientes_select_operacional,
--                        atendimentos_select_operacional,
--                        consultas_select_clinico)
-- Tabelas alteradas: nenhuma.
-- Grants: identicos ao original 20260728000002.
-- Rollback: supabase/rollback/20260802000001_fix_soft_delete_visibility_rollback.sql
-- Validacao: npx.cmd vitest run tests/security/pp2f-soft-delete-visibility.test.js
-- =========================================================================

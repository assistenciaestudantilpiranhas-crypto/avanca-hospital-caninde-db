-- Migration: 20260728000002_create_low_risk_management_views
-- GSI ONE | Fase 2.6.1 — Views agregadas de baixo risco
--
-- Contexto:
--   Implementa as tres primeiras views gerenciais aprovadas na Fase 2.6.
--   As permissoes gestao.* e leitura.* ja existem (migration 20260728000001).
--
-- Views criadas:
--   public.vw_gestao_indicadores_gerais
--   public.vw_gestao_producao_assistencial
--   public.vw_gestao_tempos_assistenciais
--
-- O que esta migration NAO faz:
--   - Nao altera tabelas clinicas.
--   - Nao altera policies existentes (pacientes, atendimentos, consultas).
--   - Nao cria usuarios nem seeds.
--   - Nao concede SELECT direto nas tabelas clinicas a perfis gerenciais.
--   - Nao cria funcoes SECURITY DEFINER novas.
--   - Nao cria permissoes nem perfis.
--
-- Decisao de arquitetura — SECURITY DEFINER obrigatorio:
--   Os perfis gerenciais (Gestao Hospitalar, Leitura/Gestor) nao possuem
--   a permissao 'atendimento.visualizar'. A policy 'atendimentos_select_operacional'
--   (migration 20260722100031) bloqueia o SELECT em 'atendimentos' para qualquer
--   usuario sem essa permissao.
--
--   Com SECURITY INVOKER (security_invoker = true), as views rodariam com os
--   privilegios do usuario autenticado, que seria barrado pelo RLS acima — as
--   views retornariam sempre zero linhas para usuarios gerenciais.
--
--   Por isso, as views usam o comportamento padrao do PostgreSQL (SECURITY DEFINER):
--   executam com os privilegios do owner (postgres), contornando o RLS das tabelas
--   de origem. O acesso e controlado diretamente no WHERE de cada view, usando
--   public.has_permission() — se o usuario nao tiver a permissao correta, a clausula
--   WHERE e falsa e a view retorna zero linhas.
--
--   Este padrao e equivalente a uma policy inline: o controle esta na definicao da
--   view, nao no RLS da tabela de origem. Nenhuma linha individual e exposta —
--   apenas agregados.
--
-- Supressao de celula pequena:
--   Limiar padrao: n < 5.
--   vw_gestao_indicadores_gerais: HAVING count(*) >= 5 (semanas com volume < 5
--     sao omitidas da view — periodo de dados incompleto ou teste).
--   vw_gestao_producao_assistencial: CASE WHEN count(*) < 5 THEN NULL + coluna
--     'suprimido boolean' por linha de setor/semana.
--   vw_gestao_tempos_assistenciais: supressao por coluna de calculo — campos de
--     tempo retornam NULL quando o n do calculo especifico for < 5.
--
-- Rollback:
--   supabase/rollback/20260728000002_create_low_risk_management_views_rollback.sql
--
-- Validacao:
--   docker exec -i <container> psql -U postgres -d postgres < migration.sql
--   npx.cmd vitest run --config vitest.security.config.mjs tests/security/management-views-low-risk.test.js

-- =========================================================================
-- PRE-CONDICAO: permissoes gerenciais devem existir
-- =========================================================================

do $pre$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.permissoes
  where chave in (
    'gestao.indicadores.visualizar',
    'gestao.producao.visualizar',
    'gestao.tempos.visualizar',
    'gestao.relatorios.visualizar',
    'leitura.indicadores.visualizar',
    'leitura.relatorios.visualizar',
    'leitura.paineis.visualizar'
  );
  if v_count < 7 then
    raise exception
      'create_low_risk_management_views [PRE]: permissoes gerenciais ausentes. '
      'Aplicar migration 20260728000001_create_gestao_permissions.sql primeiro. '
      'Encontradas: %, esperadas: 7.', v_count;
  end if;
end $pre$;

-- =========================================================================
-- VIEW 1: vw_gestao_indicadores_gerais
-- =========================================================================
-- Indicadores operacionais agregados por semana.
-- Perfis autorizados: Gestao Hospitalar (gestao.indicadores.visualizar),
--                     Leitura/Gestor (leitura.indicadores.visualizar).
-- Granularidade: semanal.
-- Supressao: semanas com total_atendimentos < 5 sao omitidas (HAVING).
-- Dados proibidos: nenhum campo nominal, nenhum UUID de paciente/atendimento.

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

-- =========================================================================
-- VIEW 2: vw_gestao_producao_assistencial
-- =========================================================================
-- Producao assistencial agregada por setor e semana.
-- Perfis autorizados: Gestao Hospitalar (gestao.producao.visualizar,
--                     gestao.relatorios.visualizar),
--                     Leitura/Gestor (leitura.relatorios.visualizar).
-- Granularidade: semanal por setor.
-- Supressao: celulas de setor/semana com atendimentos < 5 retornam NULL
--            nos campos de contagem; coluna 'suprimido' sinaliza a supressao.
-- Dados proibidos: nenhum campo nominal, nenhum UUID de paciente/atendimento.

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

-- =========================================================================
-- VIEW 3: vw_gestao_tempos_assistenciais
-- =========================================================================
-- Tempos assistenciais agregados por semana.
-- Perfis autorizados: Gestao Hospitalar (gestao.tempos.visualizar),
--                     Leitura/Gestor (leitura.paineis.visualizar).
-- Granularidade: semanal.
-- Intervalos calculados:
--   t_entrada_triagem   : hora_chegada_ts -> triagens.hora_inicio_ts (min)
--   t_triagem_consulta  : triagens.hora_fim_ts -> consultas.hora_inicio_ts (min)
--   t_permanencia       : hora_chegada_ts -> hora_desfecho_ts (min)
-- Regras:
--   - Intervalos negativos sao descartados (CASE ... THEN NULL).
--   - Registros sem timestamps de fim sao ignorados para aquela metrica.
--   - Cada metrica informa seu proprio n (n_calculado_*).
--   - Supressao: metrica retorna NULL se n < 5.
--   - Mediana calculada via percentile_cont(0.5).
-- JOIN com triagens/consultas usa MIN() por atendimento para evitar
--   multiplicacao de linhas quando existem multiplos registros.
-- Dados proibidos: nenhum campo nominal, nenhum UUID individual.

create or replace view public.vw_gestao_tempos_assistenciais as
with
-- Subqueries de pre-agregacao: um registro por atendimento, evitando
-- multiplicacao de linhas por multiplas triagens/consultas do mesmo atendimento.
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
-- Calculo dos intervalos por atendimento, com descarte de valores invalidos.
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
    public.has_permission('gestao.tempos.visualizar')
    or public.has_permission('leitura.paineis.visualizar')
),
-- Agregacao por semana. percentile_cont ignora NULLs nativamente.
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
  'Nenhum dado nominal ou UUID individual exposto.';

-- =========================================================================
-- GRANTS E HARDENING
-- =========================================================================
-- O Supabase concede TRUNCATE, TRIGGER e REFERENCES por padrao a objetos
-- novos em 'public'. Revogamos TUDO de anon e authenticated e, em seguida,
-- concedemos apenas SELECT a authenticated.
-- 'service_role' e 'postgres' preservam acesso administrativo (padrao Supabase).

revoke all on public.vw_gestao_indicadores_gerais    from anon, authenticated;
revoke all on public.vw_gestao_producao_assistencial from anon, authenticated;
revoke all on public.vw_gestao_tempos_assistenciais  from anon, authenticated;

grant select on public.vw_gestao_indicadores_gerais    to authenticated;
grant select on public.vw_gestao_producao_assistencial to authenticated;
grant select on public.vw_gestao_tempos_assistenciais  to authenticated;

-- =========================================================================
-- FIM DA MIGRATION 20260728000002
-- Rollback: supabase/rollback/20260728000002_create_low_risk_management_views_rollback.sql
-- Validacao: npx.cmd vitest run --config vitest.security.config.mjs
--            tests/security/management-views-low-risk.test.js
-- =========================================================================

-- Migration: permissoes gerenciais — Gestao Hospitalar e Leitura/Gestor
-- GSI ONE | Fase 2.5 — Implementacao local das permissoes gerenciais
--
-- Contexto:
--   Implementa as permissoes gerenciais aprovadas nas fases 2.3 e 2.4:
--     docs/GSI_ONE_FASE_2_3_MATRIZ_PERFIS_GERENCIAIS.md
--     docs/GSI_ONE_FASE_2_4_APROVACAO_PERFIS_GERENCIAIS.md
--     docs/GSI_ONE_FASE_2_4_ESPECIFICACAO_TECNICA_PERMISSOES_GERENCIAIS.md
--
-- O que esta migration faz:
--   PARTE G0  — Valida que os dois perfis gerenciais existem; aborta se ausentes.
--   PARTE G1b — Cria as 13 permissoes gerenciais aprovadas (idempotente).
--   PARTE G1c — Vincula as permissoes aos perfis aprovados (idempotente).
--
-- O que esta migration NAO faz:
--   - Nao cria, nao altera e nao renomeia perfis em perfis_acesso.
--   - Nao usa IDs hardcoded — localiza perfis exclusivamente pelo nome oficial.
--   - Nao cria views, nao altera policies, nao altera grants.
--   - Nao altera RLS em nenhuma tabela.
--   - Nao vincula paciente.visualizar, atendimento.visualizar ou consulta.visualizar.
--   - Nao cria permissoes de escrita (INSERT, UPDATE, DELETE) para nenhum dos dois perfis.
--   - Nao altera permissoes clinicas existentes.
--   - Nao altera usuarios em auth.users nem em public.usuarios.
--   - Nao altera migrations anteriores.
--   - Nao aplica no ambiente remoto.
--
-- Perfis necessarios (devem preexistir — NAO sao criados aqui):
--   "Gestão Hospitalar"
--   "Leitura/Gestor"
--
-- Permissoes criadas (13 total):
--   Gestao Hospitalar (10):
--     gestao.indicadores.visualizar
--     gestao.relatorios.visualizar
--     gestao.producao.visualizar
--     gestao.tempos.visualizar
--     gestao.ocupacao.visualizar
--     gestao.fluxos.visualizar
--     gestao.setores.visualizar
--     gestao.usuarios.visualizar
--     gestao.auditoria_agregada.visualizar
--     gestao.exportar_agregado
--   Leitura/Gestor (3):
--     leitura.indicadores.visualizar
--     leitura.relatorios.visualizar
--     leitura.paineis.visualizar
--
-- Permissoes NAO criadas nesta fase:
--   gestao.dados_nominais.visualizar  — pendente de decisao expressa individual
--   gestao.auditoria.visualizar       — recorte integral, pendente de decisao
--   gestao.configuracoes.editar       — nao aprovada
--   gestao.exportar_nominal           — nao aprovada
--
-- Atomicidade:
--   O bloco DO inteiro e executado em uma unica transacao implicita pelo
--   Supabase/PostgreSQL. A validacao G0 ocorre antes de qualquer INSERT.
--   Se G0 lanca RAISE EXCEPTION, nenhuma permissao ou vinculo e criado.
--   ON CONFLICT DO NOTHING garante idempotencia em reexecucoes.
--
-- Rollback:
--   supabase/rollback/20260728000001_create_gestao_permissions_rollback.sql
--
-- Validacao:
--   npx.cmd vitest run tests/security/gestao-permissions.test.js
--   npx.cmd vitest run tests/security

do $$
declare
  v_gestao_id  uuid;
  v_leitura_id uuid;
begin

  -- =========================================================================
  -- G0: Validar que os perfis gerenciais existem antes de qualquer INSERT
  -- =========================================================================
  -- Localiza os perfis pelo nome oficial. Nao cria, nao altera, nao renomeia.
  -- Lanca RAISE EXCEPTION se qualquer perfil estiver ausente, garantindo que
  -- nenhuma permissao ou vinculo seja criado antes da pre-condicao ser satisfeita.

  select id into v_gestao_id
  from public.perfis_acesso
  where nome = 'Gestão Hospitalar';

  if v_gestao_id is null then
    raise exception
      'create_gestao_permissions [G0]: perfil "Gestão Hospitalar" nao encontrado em '
      'perfis_acesso. Migration abortada — nenhuma permissao ou vinculo foi criado. '
      'Crie o perfil antes de aplicar esta migration.';
  end if;

  select id into v_leitura_id
  from public.perfis_acesso
  where nome = 'Leitura/Gestor';

  if v_leitura_id is null then
    raise exception
      'create_gestao_permissions [G0]: perfil "Leitura/Gestor" nao encontrado em '
      'perfis_acesso. Migration abortada — nenhuma permissao ou vinculo foi criado. '
      'Crie o perfil antes de aplicar esta migration.';
  end if;

  -- =========================================================================
  -- G1b: Criar as 13 permissoes gerenciais aprovadas
  -- =========================================================================
  -- ON CONFLICT (chave) DO NOTHING garante idempotencia em reexecucoes.
  -- Modulo "Gestao" e "Leitura" separam claramente o escopo gerencial
  -- das permissoes clinicas existentes (Pacientes, Atendimentos, Consulta, etc.).

  insert into public.permissoes (chave, modulo, descricao)
  values
    -- Gestao Hospitalar — 10 permissoes aprovadas
    (
      'gestao.indicadores.visualizar',
      'Gestão',
      'Visualizar indicadores operacionais e institucionais agregados. Sem dado clinico individual.'
    ),
    (
      'gestao.relatorios.visualizar',
      'Gestão',
      'Visualizar relatorios gerenciais e operacionais. Escopo nominal somente com aprovacao especifica adicional.'
    ),
    (
      'gestao.producao.visualizar',
      'Gestão',
      'Visualizar producao hospitalar por setor, equipe e periodo. Dados agregados sem identificacao individual.'
    ),
    (
      'gestao.tempos.visualizar',
      'Gestão',
      'Visualizar tempos assistenciais agregados: espera, atendimento, permanencia, transferencia. Sem identificacao nominal por padrao.'
    ),
    (
      'gestao.ocupacao.visualizar',
      'Gestão',
      'Visualizar ocupacao hospitalar agregada: taxa de ocupacao de leitos, disponibilidade por setor. Sem identificacao nominal por padrao.'
    ),
    (
      'gestao.fluxos.visualizar',
      'Gestão',
      'Acompanhar fluxos hospitalares e filas operacionais: status agregado de triagem, observacao, estabilizacao e transferencias.'
    ),
    (
      'gestao.setores.visualizar',
      'Gestão',
      'Acompanhar gerencialmente cada setor: atividade, status operacional e indicadores por area. Sem dado clinico individual.'
    ),
    (
      'gestao.usuarios.visualizar',
      'Gestão',
      'Visualizar lista de usuarios e perfis para acompanhamento gerencial. Nao autoriza criacao, edicao ou exclusao de usuarios.'
    ),
    (
      'gestao.auditoria_agregada.visualizar',
      'Gestão',
      'Visualizar trilha de auditoria com recorte agregado e institucional. Nao permite resolver, mascarar ou excluir eventos de auditoria.'
    ),
    (
      'gestao.exportar_agregado',
      'Gestão',
      'Exportar relatorios e indicadores agregados autorizados. Toda exportacao gera registro auditavel. Exportacao nominal permanece nao aprovada.'
    ),
    -- Leitura/Gestor — 3 permissoes aprovadas
    (
      'leitura.indicadores.visualizar',
      'Leitura',
      'Visualizar indicadores institucionais e operacionais agregados. Perfil estritamente consultivo, sem escrita em nenhuma tabela.'
    ),
    (
      'leitura.relatorios.visualizar',
      'Leitura',
      'Consultar relatorios gerenciais e institucionais agregados. Escopo nominal somente com aprovacao expressa adicional.'
    ),
    (
      'leitura.paineis.visualizar',
      'Leitura',
      'Visualizar paineis institucionais consolidados: indicadores, producao, ocupacao. Dados agregados sem identificacao individual.'
    )
  on conflict (chave) do nothing;

  -- =========================================================================
  -- G1c: Vincular as permissoes aos perfis aprovados
  -- =========================================================================
  -- Usa v_gestao_id e v_leitura_id resolvidos em G0 — sem subselect adicional,
  -- sem ID hardcoded. ON CONFLICT DO NOTHING garante idempotencia.
  -- Nao vincula paciente.visualizar, atendimento.visualizar nem consulta.visualizar.

  -- Gestao Hospitalar: 10 permissoes gestao.*
  insert into public.perfil_permissao (perfil_id, permissao_id)
  select v_gestao_id, p.id
  from public.permissoes p
  where p.chave in (
    'gestao.indicadores.visualizar',
    'gestao.relatorios.visualizar',
    'gestao.producao.visualizar',
    'gestao.tempos.visualizar',
    'gestao.ocupacao.visualizar',
    'gestao.fluxos.visualizar',
    'gestao.setores.visualizar',
    'gestao.usuarios.visualizar',
    'gestao.auditoria_agregada.visualizar',
    'gestao.exportar_agregado'
  )
  on conflict (perfil_id, permissao_id) do nothing;

  -- Leitura/Gestor: 3 permissoes leitura.*
  insert into public.perfil_permissao (perfil_id, permissao_id)
  select v_leitura_id, p.id
  from public.permissoes p
  where p.chave in (
    'leitura.indicadores.visualizar',
    'leitura.relatorios.visualizar',
    'leitura.paineis.visualizar'
  )
  on conflict (perfil_id, permissao_id) do nothing;

end $$;

-- =========================================================================
-- FIM DA MIGRATION 20260728000001
-- Perfis criados: nenhum.
-- Permissoes criadas: 13 (10 gestao.* + 3 leitura.*).
-- Vinculos criados: 13 (10 para Gestao Hospitalar + 3 para Leitura/Gestor).
-- Rollback: supabase/rollback/20260728000001_create_gestao_permissions_rollback.sql
-- Validacao: npx.cmd vitest run tests/security/gestao-permissions.test.js
-- =========================================================================

-- GSI ONE - Fase 2.2
-- Validacao remota pos-migration, somente leitura.
-- Executar manualmente no projeto de homologacao, sem expor dados sensiveis.

SELECT
  '01_public_table_count' AS secao,
  COUNT(*) AS quantidade
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

SELECT
  '02_public_tables' AS secao,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT
  '03_rls_enabled_tables' AS secao,
  c.relname AS tabela
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND c.relrowsecurity IS TRUE
ORDER BY c.relname;

SELECT
  '04_tables_without_rls' AS secao,
  c.relname AS tabela
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND c.relrowsecurity IS FALSE
ORDER BY c.relname;

SELECT
  '05_policy_count' AS secao,
  COUNT(*) AS quantidade
FROM pg_policies
WHERE schemaname = 'public';

SELECT
  '06_policies' AS secao,
  schemaname AS schema,
  tablename AS tabela,
  policyname AS nome,
  cmd AS comando,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT
  '07_function_count' AS secao,
  COUNT(*) AS quantidade
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';

SELECT
  '08_functions' AS secao,
  p.proname AS nome,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS argumentos,
  pg_catalog.pg_get_function_result(p.oid) AS tipo_retorno,
  CASE WHEN p.prosecdef THEN 'security_definer' ELSE 'security_invoker' END AS seguranca,
  CASE p.provolatile
    WHEN 'i' THEN 'immutable'
    WHEN 's' THEN 'stable'
    WHEN 'v' THEN 'volatile'
    ELSE p.provolatile::text
  END AS volatilidade
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname, argumentos;

SELECT
  '09_trigger_count' AS secao,
  COUNT(*) AS quantidade
FROM information_schema.triggers
WHERE trigger_schema = 'public';

SELECT
  '10_triggers' AS secao,
  event_object_table AS tabela,
  trigger_name AS nome,
  event_manipulation AS evento,
  action_statement AS funcao_associada
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name, event_manipulation;

SELECT
  '11_privilegios_perigosos_anon' AS secao,
  table_name AS tabela,
  privilege_type AS privilegio
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
  AND privilege_type IN ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
ORDER BY table_name, privilege_type;

SELECT
  '12_privilegios_perigosos_authenticated' AS secao,
  table_name AS tabela,
  privilege_type AS privilegio
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'authenticated'
  AND privilege_type IN ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
ORDER BY table_name, privilege_type;

SELECT
  '13_delete_privileges' AS secao,
  grantee AS role,
  table_name AS tabela
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type = 'DELETE'
ORDER BY grantee, table_name;

SELECT
  '14_truncate_privileges' AS secao,
  grantee AS role,
  table_name AS tabela
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type = 'TRUNCATE'
ORDER BY grantee, table_name;

SELECT
  '15_references_privileges' AS secao,
  grantee AS role,
  table_name AS tabela
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type = 'REFERENCES'
ORDER BY grantee, table_name;

SELECT
  '16_trigger_privileges' AS secao,
  grantee AS role,
  table_name AS tabela
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type = 'TRIGGER'
ORDER BY grantee, table_name;

SELECT
  '17_perfis_oficiais' AS secao,
  nome,
  descricao
FROM public.perfis_acesso
ORDER BY nome;

SELECT
  '18_permissoes_oficiais' AS secao,
  chave,
  modulo,
  descricao
FROM public.permissoes
ORDER BY modulo, chave;

SELECT
  '19_perfil_permissoes' AS secao,
  pa.nome AS perfil,
  p.chave AS permissao,
  p.modulo
FROM public.perfil_permissao pp
JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
JOIN public.permissoes p ON p.id = pp.permissao_id
ORDER BY pa.nome, p.modulo, p.chave;

SELECT
  '20_auth_users_count' AS secao,
  COUNT(*) AS quantidade
FROM auth.users;

SELECT '21_clinical_count_pacientes' AS secao, COUNT(*) AS quantidade FROM public.pacientes;
SELECT '21_clinical_count_atendimentos' AS secao, COUNT(*) AS quantidade FROM public.atendimentos;
SELECT '21_clinical_count_triagens' AS secao, COUNT(*) AS quantidade FROM public.triagens;
SELECT '21_clinical_count_consultas' AS secao, COUNT(*) AS quantidade FROM public.consultas;
SELECT '21_clinical_count_evolucoes_enfermagem' AS secao, COUNT(*) AS quantidade FROM public.evolucoes_enfermagem;
SELECT '21_clinical_count_prescricoes' AS secao, COUNT(*) AS quantidade FROM public.prescricoes;
SELECT '21_clinical_count_exames' AS secao, COUNT(*) AS quantidade FROM public.exames;
SELECT '21_clinical_count_transferencias' AS secao, COUNT(*) AS quantidade FROM public.transferencias;
SELECT '21_clinical_count_movimentacoes_estoque' AS secao, COUNT(*) AS quantidade FROM public.estoque_movimentacoes;
SELECT '21_clinical_count_audit_log' AS secao, COUNT(*) AS quantidade FROM public.audit_log;

SELECT
  '22_bootstrap_administrativo' AS secao,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'bootstrap_primeiro_admin'
  ) AS existe;

SELECT
  '23_permissoes_b1_existencia' AS secao,
  e.chave,
  EXISTS (
    SELECT 1
    FROM public.permissoes p
    WHERE p.chave = e.chave
  ) AS existe
FROM (
  VALUES
    ('paciente.visualizar'),
    ('atendimento.visualizar'),
    ('consulta.visualizar')
) AS e(chave)
ORDER BY e.chave;

SELECT
  '24_policies_fase_a_existencia' AS secao,
  e.tabela,
  e.policy,
  EXISTS (
    SELECT 1
    FROM pg_policies pp
    WHERE pp.schemaname = 'public'
      AND pp.tablename = e.tabela
      AND pp.policyname = e.policy
      AND pp.cmd = 'SELECT'
  ) AS existe
FROM (
  VALUES
    ('pacientes', 'pacientes_select_operacional'),
    ('atendimentos', 'atendimentos_select_operacional'),
    ('chamadas', 'chamadas_select_operacional'),
    ('triagens', 'triagens_select_clinico'),
    ('consultas', 'consultas_select_clinico'),
    ('evolucoes_enfermagem', 'evolucoes_enfermagem_select_clinico'),
    ('observacoes', 'observacoes_select_clinico'),
    ('reavaliacoes_observacao', 'reavaliacoes_observacao_select_clinico'),
    ('estabilizacoes', 'estabilizacoes_select_clinico'),
    ('checklist_estabilizacao_itens', 'checklist_estabilizacao_itens_select_clinico'),
    ('prescricoes', 'prescricoes_select_farmacia_clinico'),
    ('prescricao_itens', 'prescricao_itens_select_farmacia_clinico'),
    ('exames', 'exames_select_diagnostico'),
    ('transferencias', 'transferencias_select_operacional'),
    ('checklist_transferencia_itens', 'checklist_transferencia_itens_select_operacional'),
    ('estoque_itens', 'estoque_itens_select_farmacia'),
    ('estoque_movimentacoes', 'estoque_movimentacoes_select_farmacia')
) AS e(tabela, policy)
ORDER BY e.tabela, e.policy;

SELECT
  '25_policies_fase_b1_existencia' AS secao,
  e.tabela,
  e.policy,
  e.permissao_esperada,
  EXISTS (
    SELECT 1
    FROM pg_policies pp
    WHERE pp.schemaname = 'public'
      AND pp.tablename = e.tabela
      AND pp.policyname = e.policy
      AND pp.cmd = 'SELECT'
      AND COALESCE(pp.qual, '') LIKE '%' || e.permissao_esperada || '%'
  ) AS existe_com_permissao_b1
FROM (
  VALUES
    ('pacientes', 'pacientes_select_operacional', 'paciente.visualizar'),
    ('atendimentos', 'atendimentos_select_operacional', 'atendimento.visualizar'),
    ('consultas', 'consultas_select_clinico', 'consulta.visualizar')
) AS e(tabela, policy, permissao_esperada)
ORDER BY e.tabela, e.policy;

SELECT
  '26_migration_history_count' AS secao,
  COUNT(*) AS quantidade
FROM supabase_migrations.schema_migrations;

SELECT
  '26_migration_history_versions' AS secao,
  version
FROM supabase_migrations.schema_migrations
ORDER BY version;

SELECT
  '27_consistencia_perfis_permissoes' AS secao,
  'perfil_sem_permissao' AS tipo,
  COUNT(*) AS quantidade
FROM public.perfis_acesso pa
WHERE NOT EXISTS (
  SELECT 1
  FROM public.perfil_permissao pp
  WHERE pp.perfil_id = pa.id
)
UNION ALL
SELECT
  '27_consistencia_perfis_permissoes' AS secao,
  'permissao_sem_perfil' AS tipo,
  COUNT(*) AS quantidade
FROM public.permissoes p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.perfil_permissao pp
  WHERE pp.permissao_id = p.id
)
UNION ALL
SELECT
  '27_consistencia_perfis_permissoes' AS secao,
  'vinculo_orfao' AS tipo,
  COUNT(*) AS quantidade
FROM public.perfil_permissao pp
LEFT JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
LEFT JOIN public.permissoes p ON p.id = pp.permissao_id
WHERE pa.id IS NULL
   OR p.id IS NULL
ORDER BY tipo;

SELECT
  '28_duplicidade_perfis' AS secao,
  nome,
  COUNT(*) AS quantidade
FROM public.perfis_acesso
GROUP BY nome
HAVING COUNT(*) > 1
ORDER BY nome;

SELECT
  '29_duplicidade_permissoes' AS secao,
  chave,
  COUNT(*) AS quantidade
FROM public.permissoes
GROUP BY chave
HAVING COUNT(*) > 1
ORDER BY chave;

SELECT
  '30_duplicidade_perfil_permissao' AS secao,
  pa.nome AS perfil,
  p.chave AS permissao,
  COUNT(*) AS quantidade
FROM public.perfil_permissao pp
JOIN public.perfis_acesso pa ON pa.id = pp.perfil_id
JOIN public.permissoes p ON p.id = pp.permissao_id
GROUP BY pa.nome, p.chave
HAVING COUNT(*) > 1
ORDER BY pa.nome, p.chave;

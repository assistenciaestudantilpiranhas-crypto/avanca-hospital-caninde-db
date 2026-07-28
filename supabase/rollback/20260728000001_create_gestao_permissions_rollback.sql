-- ROLLBACK: 20260728000001_create_gestao_permissions
-- GSI ONE | Fase 2.5 — Implementacao local das permissoes gerenciais
--
-- Contexto:
--   Reverte exatamente as alteracoes da migration 20260728000001.
--   Remove somente os vinculos e as permissoes criados por esta migration.
--   Nao remove perfis. Nao toca em permissoes clinicas.
--   Nao altera RLS, policies, grants, usuarios ou audit_log.
--
-- Ordem obrigatoria de execucao:
--   R1b (vinculos em perfil_permissao)  primeiro
--   R1a (permissoes em permissoes)      em seguida
--   R1c (perfis — somente se criados por esta migration e sem outros vinculos)  por ultimo
--
-- Pre-condicao: executar APENAS em ambiente local (127.0.0.1:54322).
-- NAO executar em producao sem janela de manutencao aprovada.
--
-- Efeito:
--   - Remove os vinculos de perfil_permissao das 13 permissoes gerenciais.
--   - Remove as 13 permissoes gerenciais da tabela permissoes.
--   - Nao remove os perfis "Gestão Hospitalar" e "Leitura/Gestor", pois
--     podem ter sido criados por migration anterior a esta.
--
-- Validacao pos-rollback:
--   SELECT chave FROM public.permissoes
--   WHERE chave LIKE 'gestao.%' OR chave LIKE 'leitura.%';
--   Esperado: zero linhas.
--
--   SELECT COUNT(*) FROM public.perfil_permissao pp
--   JOIN public.permissoes p ON p.id = pp.permissao_id
--   WHERE p.chave LIKE 'gestao.%' OR p.chave LIKE 'leitura.%';
--   Esperado: 0.

-- =========================================================================
-- R1b: Remover vinculos em perfil_permissao das permissoes gerenciais
-- =========================================================================
-- Remove apenas os vinculos das permissoes criadas por esta migration.
-- Nao afeta nenhuma outra linha de perfil_permissao.

delete from public.perfil_permissao
where permissao_id in (
  select id from public.permissoes
  where chave in (
    -- Gestao Hospitalar
    'gestao.indicadores.visualizar',
    'gestao.relatorios.visualizar',
    'gestao.producao.visualizar',
    'gestao.tempos.visualizar',
    'gestao.ocupacao.visualizar',
    'gestao.fluxos.visualizar',
    'gestao.setores.visualizar',
    'gestao.usuarios.visualizar',
    'gestao.auditoria_agregada.visualizar',
    'gestao.exportar_agregado',
    -- Leitura/Gestor
    'leitura.indicadores.visualizar',
    'leitura.relatorios.visualizar',
    'leitura.paineis.visualizar'
  )
);

-- =========================================================================
-- R1a: Remover as permissoes gerenciais criadas por esta migration
-- =========================================================================
-- Remove as permissoes somente se nao houver vinculos remanescentes.
-- Se outra migration posterior tiver criado vinculos adicionais,
-- a remocao em R1b acima ja os teria apagado — este DELETE e seguro.
-- Se a chave nao existir (migration nao foi aplicada), DELETE nao faz nada.

delete from public.permissoes
where chave in (
  -- Gestao Hospitalar
  'gestao.indicadores.visualizar',
  'gestao.relatorios.visualizar',
  'gestao.producao.visualizar',
  'gestao.tempos.visualizar',
  'gestao.ocupacao.visualizar',
  'gestao.fluxos.visualizar',
  'gestao.setores.visualizar',
  'gestao.usuarios.visualizar',
  'gestao.auditoria_agregada.visualizar',
  'gestao.exportar_agregado',
  -- Leitura/Gestor
  'leitura.indicadores.visualizar',
  'leitura.relatorios.visualizar',
  'leitura.paineis.visualizar'
);

-- =========================================================================
-- R1c: Perfis — NAO sao removidos por este rollback
-- =========================================================================
-- Os perfis "Gestão Hospitalar" e "Leitura/Gestor" podem ter sido criados
-- por migration anterior a esta ou podem ter vinculos de usuarios ja
-- existentes. A remocao de perfis exige decisao institucional expressa
-- separada e nao e parte deste rollback automatico.
--
-- Se a instituicao decidir remover os perfis apos o rollback, executar
-- manualmente e com cautela:
--
--   DELETE FROM public.perfis_acesso WHERE nome = 'Gestão Hospitalar';
--   DELETE FROM public.perfis_acesso WHERE nome = 'Leitura/Gestor';
--
-- Verificar antes se existem vinculos em usuario_perfil para esses perfis.

-- =========================================================================
-- FIM DO ROLLBACK 20260728000001
-- =========================================================================

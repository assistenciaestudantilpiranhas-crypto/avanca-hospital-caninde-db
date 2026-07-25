-- ROLLBACK: 20260722100031_rls_phase_b1_read_permissions
-- GSI ONE | Etapa 5B.8.5H
--
-- Contexto:
--   Reverte exatamente as alteracoes da migration 20260722100031.
--   Restaura as tres policies SELECT para as expressoes da Fase A (20260722100029).
--   Remove os vinculos em perfil_permissao criados por esta migration.
--   Remove as tres permissoes de leitura criadas, somente se nao estiverem
--   referenciadas por vinculos de outras migrations.
--
-- Ordem obrigatoria de execucao:
--   B1c (policies)  primeiro
--   B1b (vinculos)  em seguida
--   B1a (permissoes) por ultimo
--
-- Pre-condicao: executar APENAS em ambiente local (127.0.0.1:54322).
-- NAO executar em producao sem janela de manutencao aprovada.
--
-- Efeito:
--   - pacientes_select_operacional volta ao predicado da Fase A (6 permissoes de acao)
--   - atendimentos_select_operacional volta ao predicado da Fase A (6 permissoes de acao)
--   - consultas_select_clinico volta ao predicado da Fase A (3 permissoes de acao,
--     incluindo observacao.reavaliar que dava acesso nao intencional ao TEN)
--   - Farmacia volta a ler atendimentos (via prescricao.dispensar na Fase A)
--   - TEN volta a ler consultas (via observacao.reavaliar na Fase A)
--   - Perda: Enfermeiro mantinha acesso a consultas via observacao.reavaliar na Fase A;
--     continua mantendo. Nenhum perfil perde acesso com este rollback.
--
-- Validacao pos-rollback:
--   SELECT policyname, qual
--   FROM pg_policies
--   WHERE tablename IN ('pacientes','atendimentos','consultas')
--     AND cmd = 'SELECT';
--   Esperado: expressoes com 'prescricao.dispensar' e 'observacao.reavaliar' de volta.
--
--   SELECT p.chave FROM public.permissoes p
--   WHERE p.chave IN ('paciente.visualizar','atendimento.visualizar','consulta.visualizar');
--   Esperado: zero linhas (se rollback B1a executado).

-- =========================================================================
-- B1c: Restaurar as tres policies SELECT para o estado da Fase A
-- =========================================================================

-- pacientes_select_operacional — restaura a expressao da Fase A
drop policy if exists pacientes_select_operacional on public.pacientes;

create policy pacientes_select_operacional on public.pacientes
  for select to authenticated
  using (
    public.has_permission('paciente.criar')
    or public.has_permission('triagem.classificar')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('exame.visualizar')
    or public.has_permission('prescricao.dispensar')
    or public.has_permission('transferencia.aprovar_vaga')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy pacientes_select_operacional on public.pacientes is
  'Rollback 20260722100031: restaura expressao da Fase A (20260722100029). '
  'Leitura restrita a perfis com permissao operacional de acao.';

-- atendimentos_select_operacional — restaura a expressao da Fase A
drop policy if exists atendimentos_select_operacional on public.atendimentos;

create policy atendimentos_select_operacional on public.atendimentos
  for select to authenticated
  using (
    public.has_permission('atendimento.abrir')
    or public.has_permission('triagem.classificar')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('exame.visualizar')
    or public.has_permission('prescricao.dispensar')
    or public.has_permission('transferencia.aprovar_vaga')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy atendimentos_select_operacional on public.atendimentos is
  'Rollback 20260722100031: restaura expressao da Fase A (20260722100029). '
  'Farmacia volta a ler atendimentos via prescricao.dispensar.';

-- consultas_select_clinico — restaura a expressao da Fase A
drop policy if exists consultas_select_clinico on public.consultas;

create policy consultas_select_clinico on public.consultas
  for select to authenticated
  using (
    public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy consultas_select_clinico on public.consultas is
  'Rollback 20260722100031: restaura expressao da Fase A (20260722100029). '
  'TEN volta a ler consultas via observacao.reavaliar (acesso nao intencional reintroduzido pelo rollback).';

-- =========================================================================
-- B1b: Remover vinculos em perfil_permissao das tres novas permissoes
-- =========================================================================

-- Remove apenas os vinculos das permissoes criadas por esta migration.
-- Nao afeta nenhuma outra linha de perfil_permissao.
delete from public.perfil_permissao
where permissao_id in (
  select id from public.permissoes
  where chave in (
    'paciente.visualizar',
    'atendimento.visualizar',
    'consulta.visualizar'
  )
);

-- =========================================================================
-- B1a: Remover as tres permissoes criadas por esta migration
-- =========================================================================

-- Remove as permissoes somente se nao houver outros vinculos remanescentes.
-- Se outra migration posterior tiver criado vinculos adicionais para estas chaves,
-- a delecao falha com erro de FK — revisar antes de executar.
delete from public.permissoes
where chave in (
  'paciente.visualizar',
  'atendimento.visualizar',
  'consulta.visualizar'
);

-- =========================================================================
-- FIM DO ROLLBACK 20260722100031
-- =========================================================================

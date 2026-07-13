-- Migration: perfil Enfermeiro e permissao transferencia.confirmar_checklist - GSI ONE
--
-- Contexto: Decisao de produto aprovada (Passo 5B.7.1):
--   Médico                    -> solicita transferência (sem alteracao)
--   Regulação de Transferência -> confirma vaga / cancela  (sem alteracao)
--   Enfermeiro                -> confirma checklist + confirma saída  (NOVO)
--   Técnico em Enfermagem     -> não participa do fluxo de transferência (sem alteracao)
--
-- O que esta migration faz:
--   1. Insere permissao 'transferencia.confirmar_checklist' (se nao existir).
--   2. Insere perfil 'Enfermeiro' (se nao existir).
--   3. Vincula Enfermeiro a: confirmar_checklist + confirmar_saida.
--   4. Remove 'transferencia.confirmar_saida' de 'Regulação de Transferência'
--      (Regulação só aprova vaga a partir daqui).
--   5. Recria policy atendimentos_update_assistencial incluindo 'Enfermeiro'
--      (base: versao vigente de 20260623100021, que ja usa nomes pos-rename).
--   6. Recria policy checklist_transferencia_itens_write_regulacao_admin para
--      usar 'transferencia.confirmar_checklist' (nao mais aprovar_vaga /
--      confirmar_saida, que eram semanticamente incorretos para o checklist).
--
-- O que esta migration NAO faz:
--   - Nao altera 'transferencias_update_regulacao_admin': ela usa
--     aprovar_vaga OR confirmar_saida OR is_admin(), e Enfermeiro tera
--     confirmar_saida - portanto ja cobre UPDATE em transferencias para saida.
--   - Nao altera fn_validate_atendimento_transicao: a validacao de desfecho
--     'transferencia_regulada' exige has_permission('transferencia.confirmar_saida'),
--     e Enfermeiro tera essa permissao - sem necessidade de alteracao.
--   - Nao altera dados clinicos, usuarios, audit_log, auth.users.
--   - Nao cria tabela.
--
-- Idempotência:
--   - INSERT ... ON CONFLICT DO NOTHING para permissao e perfil.
--   - INSERT ... ON CONFLICT DO NOTHING para vinculos perfil_permissao.
--   - DELETE idempotente (no-op se ja removido).
--   - DROP POLICY IF EXISTS antes de cada CREATE POLICY.
--
-- Dependencias:
--   - Exige que 20260623100020 (rename) e 20260623100021 (compat RLS) ja
--     tenham sido aplicadas, pois referencia 'Regulação de Transferência'
--     (nome pos-rename) e se apoia na versao vigente de
--     atendimentos_update_assistencial definida em 20260623100021.

-- =========================================================================
-- 1. Permissao: transferencia.confirmar_checklist
-- =========================================================================

insert into public.permissoes (chave, modulo, descricao)
values ('transferencia.confirmar_checklist', 'Transferências', 'Confirmar checklist de transferência segura')
on conflict (chave) do nothing;

-- =========================================================================
-- 2. Perfil: Enfermeiro
-- =========================================================================

insert into public.perfis_acesso (nome, descricao)
values ('Enfermeiro', 'Confirma checklist de transferência segura e registra saída do paciente transferido')
on conflict (nome) do nothing;

-- =========================================================================
-- 3. Vínculos do perfil Enfermeiro
-- =========================================================================
-- transferencia.confirmar_checklist: gate do checklist de transferência.
-- transferencia.confirmar_saida: gate da saída + desfecho no atendimento
-- (validado também pelo trigger fn_validate_atendimento_transicao).

insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa, public.permissoes p
where pa.nome = 'Enfermeiro'
  and p.chave = 'transferencia.confirmar_checklist'
on conflict (perfil_id, permissao_id) do nothing;

insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa, public.permissoes p
where pa.nome = 'Enfermeiro'
  and p.chave = 'transferencia.confirmar_saida'
on conflict (perfil_id, permissao_id) do nothing;

-- =========================================================================
-- 4. Remover 'transferencia.confirmar_saida' de 'Regulação de Transferência'
-- =========================================================================
-- Regulação de Transferência mantém apenas 'transferencia.aprovar_vaga'.
-- Esta remoção é idempotente: DELETE WHERE é no-op se o vínculo já não existir.

delete from public.perfil_permissao
where perfil_id  = (select id from public.perfis_acesso where nome = 'Regulação de Transferência')
  and permissao_id = (select id from public.permissoes   where chave = 'transferencia.confirmar_saida');

-- =========================================================================
-- 5. Policy atendimentos_update_assistencial (adiciona Enfermeiro)
-- =========================================================================
-- Base: versão vigente definida por último em 20260623100021 (inclui Recepção
-- e nomes pós-rename). Esta recriação adiciona has_perfil('Enfermeiro') para
-- que o Enfermeiro possa fazer UPDATE em atendimentos ao confirmar saída/desfecho.

drop policy if exists atendimentos_update_assistencial on atendimentos;

create policy atendimentos_update_assistencial on atendimentos
  for update to authenticated
  using (
    public.has_perfil('Recepção')
    or public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Enfermeiro')
    or public.has_perfil('Médico')
    or public.has_perfil('Regulação de Transferência')
    or public.is_admin()
  )
  with check (
    public.has_perfil('Recepção')
    or public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Enfermeiro')
    or public.has_perfil('Médico')
    or public.has_perfil('Regulação de Transferência')
    or public.is_admin()
  );

comment on policy atendimentos_update_assistencial on atendimentos is
  'Permite UPDATE por linha aos perfis assistenciais, Recepcao e Enfermeiro. '
  'A restricao fina por coluna (quem pode alterar status/desfecho/classificacao) '
  'e aplicada pelo trigger fn_validate_atendimento_transicao. '
  'Atualizada em 20260623100024 para incluir perfil Enfermeiro.';

-- =========================================================================
-- 6. Policy checklist_transferencia_itens_write_regulacao_admin
-- =========================================================================
-- Corrigida para usar has_permission('transferencia.confirmar_checklist').
-- Antes (migrations 20260623100012): usava aprovar_vaga OR confirmar_saida,
-- que era semanticamente incorreto (aprovar vaga não deve abrir escrita no
-- checklist). Agora: apenas quem tem confirmar_checklist (Enfermeiro) ou
-- is_admin() pode escrever no checklist de transferência.

drop policy if exists checklist_transferencia_itens_write_regulacao_admin on checklist_transferencia_itens;

create policy checklist_transferencia_itens_write_regulacao_admin on checklist_transferencia_itens
  for all to authenticated
  using (
    public.has_permission('transferencia.confirmar_checklist')
    or public.is_admin()
  )
  with check (
    public.has_permission('transferencia.confirmar_checklist')
    or public.is_admin()
  );

comment on policy checklist_transferencia_itens_write_regulacao_admin on checklist_transferencia_itens is
  'Escrita no checklist de transferencia restrita a quem tem '
  'transferencia.confirmar_checklist (Enfermeiro) ou is_admin(). '
  'Atualizada em 20260623100024: antes usava aprovar_vaga/confirmar_saida '
  '(acoplamento incorreto); agora usa a permissao dedicada ao checklist.';

-- Migration: ampliar perfil Enfermeiro para o fluxo assistencial - GSI ONE
--
-- Contexto: Decisao de produto aprovada (Passo 5B.7.4):
--   O perfil Enfermeiro foi criado em 20260623100024 com escopo restrito a
--   transferencia (confirmar_checklist + confirmar_saida). A decisao de produto
--   amplia o perfil para o fluxo assistencial completo do enfermeiro.
--
-- O que esta migration faz:
--   1. Vincula ao perfil 'Enfermeiro' as permissoes assistenciais ja existentes
--      no banco (criadas em 20260623100004_acesso.sql), hoje exclusivas ao
--      perfil 'Tecnico em Enfermagem':
--        - triagem.classificar
--        - enfermagem.evolucao.registrar
--        - observacao.reavaliar
--        - estabilizacao.checklist_item
--        - paciente.alergia.registrar
--        - paciente.comorbidade.registrar
--   2. Recria duas policies RLS que usam has_perfil() (nao has_permission()),
--      adicionando has_perfil('Enfermeiro') sem remover nenhuma condicao vigente:
--        - observacoes_write_clinico_admin  (escrita em public.observacoes)
--        - estabilizacoes_write_enfermagem_admin  (escrita em public.estabilizacoes)
--
-- Por que so essas duas policies?
--   As demais tabelas relevantes ao fluxo do Enfermeiro (triagens,
--   evolucoes_enfermagem, reavaliacoes_observacao, checklist_estabilizacao_itens,
--   paciente_alergias, paciente_comorbidades) usam has_permission() nos gates de
--   escrita: ao receber as permissoes do item 1, o Enfermeiro e coberto
--   automaticamente, sem necessidade de recriar policies.
--
-- O que esta migration NAO faz:
--   - Nao vincula transferencia.solicitar ao Enfermeiro.
--   - Nao vincula transferencia.aprovar_vaga ao Enfermeiro.
--   - Nao vincula prescricao.criar ao Enfermeiro.
--   - Nao vincula consulta.iniciar/consulta.registrar_conduta ao Enfermeiro.
--   - Nao vincula paciente.criar ao Enfermeiro.
--   - Nao vincula atendimento.abrir ao Enfermeiro.
--   - Nao altera regras de transferencia ja aprovadas em 20260623100024.
--   - Nao altera dados clinicos, usuarios, audit_log, auth.users.
--   - Nao cria tabela, nao cria permissao nova.
--
-- Idempotencia:
--   - INSERT ... ON CONFLICT DO NOTHING para todos os vinculos perfil_permissao.
--   - DROP POLICY IF EXISTS antes de cada CREATE POLICY.
--
-- Dependencias:
--   - Exige perfil 'Enfermeiro' existente (criado em 20260623100024).
--   - Exige permissoes existentes (criadas em 20260623100004).
--   - A versao vigente de observacoes_write_clinico_admin foi definida por
--     ultimo em 20260623100021 (usa 'Tecnico em Enfermagem').
--   - A versao vigente de estabilizacoes_write_enfermagem_admin foi definida
--     por ultimo em 20260623100021 (usa 'Tecnico em Enfermagem').

-- =========================================================================
-- 1. Permissoes assistenciais para o perfil Enfermeiro
-- =========================================================================

insert into public.perfil_permissao (perfil_id, permissao_id)
select pa.id, p.id
from public.perfis_acesso pa, public.permissoes p
where pa.nome = 'Enfermeiro'
  and p.chave in (
    'triagem.classificar',
    'enfermagem.evolucao.registrar',
    'observacao.reavaliar',
    'estabilizacao.checklist_item',
    'paciente.alergia.registrar',
    'paciente.comorbidade.registrar'
  )
on conflict (perfil_id, permissao_id) do nothing;

-- =========================================================================
-- 2. Policy: observacoes_write_clinico_admin
-- =========================================================================
-- Versao vigente (migration 20260623100021): has_perfil('Tecnico em Enfermagem')
-- or has_perfil('Medico') or is_admin().
-- Esta recriacao adiciona has_perfil('Enfermeiro') sem remover nenhuma condicao.

drop policy if exists observacoes_write_clinico_admin on public.observacoes;

create policy observacoes_write_clinico_admin on public.observacoes
  for all to authenticated
  using (
    public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Enfermeiro')
    or public.has_perfil('Médico')
    or public.is_admin()
  )
  with check (
    public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Enfermeiro')
    or public.has_perfil('Médico')
    or public.is_admin()
  );

comment on policy observacoes_write_clinico_admin on public.observacoes is
  'Escrita em observacoes por perfis clinicos. '
  'Atualizada em 20260623100026: adicionado has_perfil(''Enfermeiro'') '
  '(antes: apenas Tecnico em Enfermagem e Medico).';

-- =========================================================================
-- 3. Policy: estabilizacoes_write_enfermagem_admin
-- =========================================================================
-- Versao vigente (migration 20260623100021): has_perfil('Tecnico em Enfermagem')
-- or has_perfil('Medico') or is_admin().
-- Esta recriacao adiciona has_perfil('Enfermeiro') sem remover nenhuma condicao.

drop policy if exists estabilizacoes_write_enfermagem_admin on public.estabilizacoes;

create policy estabilizacoes_write_enfermagem_admin on public.estabilizacoes
  for all to authenticated
  using (
    public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Enfermeiro')
    or public.has_perfil('Médico')
    or public.is_admin()
  )
  with check (
    public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Enfermeiro')
    or public.has_perfil('Médico')
    or public.is_admin()
  );

comment on policy estabilizacoes_write_enfermagem_admin on public.estabilizacoes is
  'Escrita em estabilizacoes por perfis de enfermagem e clinicos. '
  'Atualizada em 20260623100026: adicionado has_perfil(''Enfermeiro'') '
  '(antes: apenas Tecnico em Enfermagem e Medico).';

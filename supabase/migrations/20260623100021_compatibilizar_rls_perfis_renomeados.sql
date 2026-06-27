-- Migration: compatibilizar RLS/funcoes com os novos nomes de perfil - GSI ONE
-- Fase 2 da consolidacao de perfis oficiais (ver migration
-- 20260623100020_renomear_perfis_oficiais.sql, que renomeia
-- perfis_acesso.nome). Esta migration NAO renomeia nenhum perfil - apenas
-- recria, com CREATE OR REPLACE FUNCTION / DROP POLICY IF EXISTS + CREATE
-- POLICY, as policies/funcoes que comparavam o NOME do perfil como string
-- literal, trocando exclusivamente esse literal:
--   has_perfil('Enfermagem')               -> has_perfil('Técnico em Enfermagem')
--   has_perfil('Regulação/Transferências')  -> has_perfil('Regulação de Transferência')
-- has_perfil('Diagnóstico/Exames') NAO foi encontrado em nenhuma policy/
-- funcao de RLS (todo o gate de exames usa has_permission(), nao o nome do
-- perfil) - logo nenhum ajuste e necessario para o caso "Técnico em RX".
--
-- Nao cria tabela. Nao altera dados, permissoes, usuarios ou vinculos. Nao
-- amplia acesso: a logica de cada policy/funcao permanece EXATAMENTE a
-- mesma (mesmos has_permission(), mesmo is_admin(), mesma combinacao de
-- OR/AND, mesmas tabelas e operacoes) - muda apenas o literal de nome de
-- perfil dentro de has_perfil(...). Nao remove has_permission() nem
-- is_admin() de nenhuma condicao existente. Nao concede nada a Auditoria
-- que ela nao tivesse antes (Auditoria nao aparece em nenhuma das policies
-- abaixo, nem antes nem depois desta migration).
--
-- Locais identificados e recriados nesta migration:
--
-- 20260623100012_rls_policies.sql:
--   - policy chamadas_insert_assistencial (tabela chamadas, INSERT)
--   - policy triagens_write_enfermagem_admin (tabela triagens, ALL)
--   - policy observacoes_write_clinico_admin (tabela observacoes, ALL)
--   - policy estabilizacoes_write_enfermagem_admin (tabela estabilizacoes, ALL)
--   (NAO recriada aqui: checklist_estabilizacao_itens_write_enfermagem_admin -
--    apesar do nome mencionar "enfermagem", a condicao usa apenas
--    has_permission('estabilizacao.checklist_item'), sem has_perfil() - nada
--    a trocar.)
--
-- 20260623100015_regras_fluxo_assistencial.sql:
--   - policy atendimentos_update_assistencial (tabela atendimentos, UPDATE) -
--     esta policy foi definida em 20260623100012 e depois SOBRESCRITA
--     (drop+create) em 20260623100015 incluindo Recepção; a versao vigente
--     no banco e' a de 20260623100015, por isso e' essa versao (com
--     Recepção) que e recriada aqui, e nao a versao mais antiga.
--   - function public.fn_validate_atendimento_transicao() (trigger
--     BEFORE UPDATE em atendimentos) - corpo identico, exceto o literal de
--     perfil na verificacao de "alta_observacao".
--
-- Nao aplicar esta migration nem a 20260623100020 isoladamente em qualquer
-- ambiente com usuarios reais - ambas devem ser aplicadas juntas, na mesma
-- janela em que o frontend (script.js) tambem for atualizado para os novos
-- nomes, sob pena de Tecnico em Enfermagem/Regulacao de Transferencia
-- perderem acesso entre a aplicacao desta migration e a atualizacao do
-- frontend.

-- =========================================================================
-- 1. chamadas_insert_assistencial
-- =========================================================================

drop policy if exists chamadas_insert_assistencial on chamadas;
create policy chamadas_insert_assistencial on chamadas
  for insert to authenticated
  with check (
    public.has_permission('atendimento.abrir')
    or public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Médico')
    or public.is_admin()
  );

-- =========================================================================
-- 2. triagens_write_enfermagem_admin
-- =========================================================================

drop policy if exists triagens_write_enfermagem_admin on triagens;
create policy triagens_write_enfermagem_admin on triagens
  for all to authenticated
  using (public.has_permission('triagem.classificar') or public.has_perfil('Técnico em Enfermagem') or public.is_admin())
  with check (public.has_permission('triagem.classificar') or public.has_perfil('Técnico em Enfermagem') or public.is_admin());

-- =========================================================================
-- 3. observacoes_write_clinico_admin
-- =========================================================================

drop policy if exists observacoes_write_clinico_admin on observacoes;
create policy observacoes_write_clinico_admin on observacoes
  for all to authenticated
  using (public.has_perfil('Técnico em Enfermagem') or public.has_perfil('Médico') or public.is_admin())
  with check (public.has_perfil('Técnico em Enfermagem') or public.has_perfil('Médico') or public.is_admin());

-- =========================================================================
-- 4. estabilizacoes_write_enfermagem_admin
-- =========================================================================

drop policy if exists estabilizacoes_write_enfermagem_admin on estabilizacoes;
create policy estabilizacoes_write_enfermagem_admin on estabilizacoes
  for all to authenticated
  using (public.has_perfil('Técnico em Enfermagem') or public.has_perfil('Médico') or public.is_admin())
  with check (public.has_perfil('Técnico em Enfermagem') or public.has_perfil('Médico') or public.is_admin());

-- =========================================================================
-- 5. atendimentos_update_assistencial (versao vigente, definida por ultimo
--    em 20260623100015 - inclui Recepção)
-- =========================================================================

drop policy if exists atendimentos_update_assistencial on atendimentos;
create policy atendimentos_update_assistencial on atendimentos
  for update to authenticated
  using (
    public.has_perfil('Recepção')
    or public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Médico')
    or public.has_perfil('Regulação de Transferência')
    or public.is_admin()
  )
  with check (
    public.has_perfil('Recepção')
    or public.has_perfil('Técnico em Enfermagem')
    or public.has_perfil('Médico')
    or public.has_perfil('Regulação de Transferência')
    or public.is_admin()
  );

comment on policy atendimentos_update_assistencial on atendimentos is 'Permite UPDATE por linha aos perfis assistenciais e Recepcao. A restricao fina por coluna (quem pode alterar status/desfecho/classificacao) e aplicada pelo trigger fn_validate_atendimento_transicao, nao por esta policy.';

-- =========================================================================
-- 6. function public.fn_validate_atendimento_transicao()
-- =========================================================================
-- Corpo identico ao definido em 20260623100015_regras_fluxo_assistencial.sql,
-- exceto o literal de perfil na verificacao de "alta_observacao" (secao 3.3).
-- CREATE OR REPLACE preserva o trigger trg_validate_atendimento_transicao
-- ja existente (nao e necessario recriar o trigger, apenas a funcao).

create or replace function public.fn_validate_atendimento_transicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status_ordem int;
  v_new_status_ordem int;
  v_new_status_codigo text;
  v_new_desfecho_codigo text;
begin
  ---------------------------------------------------------------------------
  -- 3.1 Timestamps assistenciais imutaveis apos preenchidos (salvo Admin)
  ---------------------------------------------------------------------------
  if OLD.hora_chegada_ts is not null
     and NEW.hora_chegada_ts is distinct from OLD.hora_chegada_ts
     and not public.is_admin()
  then
    raise exception 'hora_chegada_ts ja preenchida nao pode ser alterada, exceto por Administracao.';
  end if;

  if OLD.hora_desfecho_ts is not null
     and NEW.hora_desfecho_ts is distinct from OLD.hora_desfecho_ts
     and not public.is_admin()
  then
    raise exception 'hora_desfecho_ts ja preenchida nao pode ser alterada, exceto por Administracao.';
  end if;

  ---------------------------------------------------------------------------
  -- 3.2 Classificacao de risco: quem pode alterar e ate quando
  ---------------------------------------------------------------------------
  if NEW.classificacao_risco_id is distinct from OLD.classificacao_risco_id then
    if not public.is_admin() then
      if not public.has_permission('triagem.classificar') then
        raise exception 'Apenas Enfermagem (triagem.classificar) ou Administracao pode definir classificacao de risco.';
      end if;

      if exists (
        select 1 from consultas
        where atendimento_id = NEW.id and hora_inicio_ts is not null
      ) then
        raise exception 'Classificacao de risco nao pode ser alterada apos o inicio da consulta, exceto por Administracao.';
      end if;
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- 3.3 Desfecho: quem pode definir e pre-condicoes por tipo de desfecho
  ---------------------------------------------------------------------------
  if NEW.desfecho_id is distinct from OLD.desfecho_id and NEW.desfecho_id is not null then
    v_new_desfecho_codigo := public.dom_codigo('dom_desfechos', NEW.desfecho_id);

    if not public.is_admin() then
      if v_new_desfecho_codigo = 'transferencia_regulada' then
        if not public.has_permission('transferencia.confirmar_saida') then
          raise exception 'Apenas Regulacao/Transferencias (transferencia.confirmar_saida) ou Administracao pode definir desfecho de transferencia regulada.';
        end if;
        if not exists (select 1 from transferencias where atendimento_id = NEW.id) then
          raise exception 'Nao e permitido desfecho de transferencia regulada sem registro correspondente em transferencias.';
        end if;

      elsif v_new_desfecho_codigo = 'alta_observacao' then
        if not (public.has_permission('observacao.reavaliar') or public.has_perfil('Técnico em Enfermagem') or public.has_perfil('Médico')) then
          raise exception 'Apenas Enfermagem/Medico ou Administracao pode definir alta da observacao.';
        end if;
        if not exists (select 1 from observacoes where atendimento_id = NEW.id) then
          raise exception 'Nao e permitido alta da observacao sem registro correspondente em observacoes.';
        end if;

      else
        -- Alta, Medicação e alta, Evasão/desistência, Óbito: exigem conduta
        -- medica registrada (regra "não permitir desfecho sem consulta/
        -- conduta registrada, salvo casos administrativos documentados").
        if not public.has_permission('consulta.registrar_conduta') then
          raise exception 'Apenas Medico (consulta.registrar_conduta) ou Administracao pode definir este desfecho.';
        end if;
        if not exists (
          select 1 from consultas
          where atendimento_id = NEW.id and conduta is not null
        ) then
          raise exception 'Nao e permitido definir desfecho final sem consulta/conduta registrada.';
        end if;
      end if;
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- 3.4 Status: retrocesso bloqueado (salvo Admin) e pre-requisitos por
  --     etapa (observacao/estabilizacao/transferencia precisam de registro
  --     correspondente antes de o status refletir essa etapa).
  ---------------------------------------------------------------------------
  if NEW.status_id is distinct from OLD.status_id then
    v_old_status_ordem := public.dom_ordem('dom_status_atendimento', OLD.status_id);
    v_new_status_ordem := public.dom_ordem('dom_status_atendimento', NEW.status_id);
    v_new_status_codigo := public.dom_codigo('dom_status_atendimento', NEW.status_id);

    if v_new_status_ordem < v_old_status_ordem and not public.is_admin() then
      raise exception 'Nao e permitido retroceder o status do atendimento (ordem % para %), exceto Administracao com justificativa futura.', v_old_status_ordem, v_new_status_ordem;
    end if;

    if v_new_status_codigo = 'em_observacao'
       and not exists (select 1 from observacoes where atendimento_id = NEW.id)
    then
      raise exception 'Status em_observacao exige registro previo em observacoes.';
    end if;

    if v_new_status_codigo = 'em_estabilizacao'
       and not exists (select 1 from estabilizacoes where atendimento_id = NEW.id)
    then
      raise exception 'Status em_estabilizacao exige registro previo em estabilizacoes.';
    end if;

    if v_new_status_codigo = 'em_transferencia_regulada'
       and not exists (select 1 from transferencias where atendimento_id = NEW.id)
    then
      raise exception 'Status em_transferencia_regulada exige registro previo em transferencias.';
    end if;
  end if;

  return NEW;
end;
$$;

comment on function public.fn_validate_atendimento_transicao() is 'BEFORE UPDATE em atendimentos. Implementa as regras do DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md: imutabilidade de timestamps preenchidos, restricao de quem altera classificacao de risco e desfecho, bloqueio de retrocesso de status, e exigencia de registro correspondente (observacoes/estabilizacoes/transferencias) antes de refletir a etapa no status. Administracao pode sobrepor estas regras - a acao fica auditada pelo trigger de auditoria (fn_audit_trigger, migration 20260623100013). Atualizada em 20260623100021 apenas para usar o nome de perfil "Técnico em Enfermagem" (antes "Enfermagem") na verificacao de alta da observacao.';

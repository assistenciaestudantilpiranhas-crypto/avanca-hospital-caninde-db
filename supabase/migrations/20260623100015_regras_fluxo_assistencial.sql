-- Migration: regras de transicao do fluxo assistencial - GSI Saude
-- Baseada no DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md. Reutiliza as funcoes
-- de RLS ja existentes (has_permission, has_perfil, is_admin), criadas em
-- 20260623100012_rls_policies.sql.
-- Nao altera frontend, nao cria login, nao integra Supabase.

-- =========================================================================
-- 1. Ajuste de RLS: Recepcao precisa poder UPDATE em atendimentos para
--    "dados administrativos iniciais" (regra 1 do escopo aprovado). A
--    policy atendimentos_update_assistencial (migration 20260623100012)
--    nao incluia Recepcao. Esta secao recria a policy incluindo Recepcao
--    no nivel de LINHA; a restricao por COLUNA (Recepcao nao pode definir
--    classificacao/desfecho/conduta) e' aplicada pelo trigger da secao 3,
--    que e' a unica forma de bloquear colunas especificas, ja que RLS
--    so' atua por linha.
-- =========================================================================

drop policy if exists atendimentos_update_assistencial on atendimentos;

create policy atendimentos_update_assistencial on atendimentos
  for update to authenticated
  using (
    public.has_perfil('Recepção')
    or public.has_perfil('Enfermagem')
    or public.has_perfil('Médico')
    or public.has_perfil('Regulação/Transferências')
    or public.is_admin()
  )
  with check (
    public.has_perfil('Recepção')
    or public.has_perfil('Enfermagem')
    or public.has_perfil('Médico')
    or public.has_perfil('Regulação/Transferências')
    or public.is_admin()
  );

comment on policy atendimentos_update_assistencial on atendimentos is 'Permite UPDATE por linha aos perfis assistenciais e Recepcao. A restricao fina por coluna (quem pode alterar status/desfecho/classificacao) e aplicada pelo trigger fn_validate_atendimento_transicao, nao por esta policy.';

-- =========================================================================
-- 2. Funcao auxiliar: codigo de dominio por tabela/id (evita repetir joins)
-- =========================================================================

create or replace function public.dom_codigo(p_tabela text, p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_codigo text;
begin
  if p_id is null then
    return null;
  end if;
  execute format('select codigo from %I where id = $1', p_tabela) into v_codigo using p_id;
  return v_codigo;
end;
$$;

comment on function public.dom_codigo(text, uuid) is 'Retorna o codigo (text) de uma linha de tabela de dominio (dom_status_atendimento, dom_desfechos etc.) a partir do id. Helper para os triggers de transicao de fluxo.';

create or replace function public.dom_ordem(p_tabela text, p_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ordem int;
begin
  if p_id is null then
    return null;
  end if;
  execute format('select ordem from %I where id = $1', p_tabela) into v_ordem using p_id;
  return v_ordem;
end;
$$;

comment on function public.dom_ordem(text, uuid) is 'Retorna o campo ordem de uma linha de tabela de dominio, usado para detectar retrocesso de status_atendimento.';

-- =========================================================================
-- 3. Trigger principal: valida transicoes de atendimentos
-- =========================================================================

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
        if not (public.has_permission('observacao.reavaliar') or public.has_perfil('Enfermagem') or public.has_perfil('Médico')) then
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

comment on function public.fn_validate_atendimento_transicao() is 'BEFORE UPDATE em atendimentos. Implementa as regras do DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md: imutabilidade de timestamps preenchidos, restricao de quem altera classificacao de risco e desfecho, bloqueio de retrocesso de status, e exigencia de registro correspondente (observacoes/estabilizacoes/transferencias) antes de refletir a etapa no status. Administracao pode sobrepor estas regras - a acao fica auditada pelo trigger de auditoria (fn_audit_trigger, migration 20260623100013).';

drop trigger if exists trg_validate_atendimento_transicao on atendimentos;
create trigger trg_validate_atendimento_transicao
  before update on atendimentos
  for each row execute function public.fn_validate_atendimento_transicao();

-- =========================================================================
-- 4. Regras ja cobertas por migrations anteriores (sem codigo novo aqui)
-- =========================================================================
-- As seguintes regras do escopo aprovado JA estao garantidas pelas RLS
-- policies da migration 20260623100012, por construcao (permissoes
-- inexistentes para os perfis citados), sem necessidade de trigger extra:
--   - Enfermagem nao pode registrar conduta medica nem prescrever:
--     policies consultas_write_medico_admin e prescricoes_insert_medico_admin
--     exigem has_permission('consulta.registrar_conduta'/'prescricao.criar'),
--     que Enfermagem nao possui no seed de perfil_permissao.
--   - Regulacao/Transferencia nao pode alterar conduta medica ou prescricao:
--     mesmas policies acima, Regulacao tambem nao possui essas permissoes.
--   - Auditoria/Faturamento so' tem policies de SELECT (nenhuma policy de
--     INSERT/UPDATE/DELETE foi criada para esse perfil em nenhuma tabela
--     assistencial) - leitura e conferencia, sem alteracao de prontuario.

-- =========================================================================
-- 5. TODOs (regras complexas demais para esta migration - versao
--    conservadora implementada, refinamento fica para depois)
-- =========================================================================
-- TODO 1: "Administracao pode corrigir registros, mas deve ficar auditado"
--   - cobrimos a parte de auditoria (toda sobreposicao de Administracao
--     gera linha em audit_log via trigger generico). NAO existe ainda um
--     campo de "justificativa" para retrocesso de status ou alteracao de
--     timestamp por Administracao. Recomenda-se, em migration futura,
--     criar uma tabela atendimentos_justificativas_admin (atendimento_id,
--     admin_id, motivo, criado_em) e exigir seu preenchimento antes da
--     sobreposicao administrativa.
-- TODO 2: "Nao permitir definir desfecho final sem consulta/conduta
--   registrada, salvo casos administrativos documentados" - a parte
--   "documentados" depende do TODO 1 (ainda nao ha onde documentar). Hoje
--   Administracao apenas sobrepoe a regra sem justificativa formal.
-- TODO 3: o helper dom_codigo()/dom_ordem() usa EXECUTE com nome de tabela
--   dinamico. E seguro aqui porque os nomes sao literais fixos no proprio
--   codigo desta migration (nao vem de input do usuario), mas qualquer uso
--   futuro desses helpers com nome de tabela vindo de fora deve validar
--   contra uma lista fixa antes do EXECUTE, para evitar SQL injection.
-- TODO 4: esta migration nao impede que o proprio modulo de Consulta marque
--   `conduta` como preenchida e depois a apague/altere livremente -
--   nenhuma regra de imutabilidade foi pedida para consultas.conduta nesta
--   tarefa; avaliar se e' necessario em migration futura.
-- TODO 5: nao foi criado controle de "Administracao nao deve apagar
--   historico assistencial" alem do que ja existe (RLS de migration
--   20260623100012 ja restringe DELETE em atendimentos/pacientes a
--   Administracao, e a maioria das tabelas clinicas nao tem policy de
--   DELETE para ninguem). Migrar para soft delete continua como
--   recomendacao futura, nao implementada aqui.

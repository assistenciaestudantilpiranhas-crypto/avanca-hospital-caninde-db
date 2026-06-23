-- Migration: auditoria automatica via trigger - GSI Saude
-- Escopo: funcao generica de auditoria + triggers AFTER INSERT/UPDATE/DELETE
-- nas tabelas assistenciais e administrativas sensiveis. audit_log passa a
-- ser alimentada preferencialmente pela funcao SECURITY DEFINER abaixo, nao
-- por escrita manual da aplicacao.
-- Nao altera frontend, nao cria login, nao integra Supabase.

-- =========================================================================
-- 1. Funcao auxiliar: gera um uuid deterministico a partir de texto.
--    Necessaria porque perfil_permissao e usuario_perfil tem chave primaria
--    composta (sem coluna "id" uuid) - ver decisao documentada na secao 3.
-- =========================================================================

create or replace function public.audit_text_to_uuid(input text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select (
    substr(md5(input), 1, 8) || '-' ||
    substr(md5(input), 9, 4) || '-' ||
    substr(md5(input), 13, 4) || '-' ||
    substr(md5(input), 17, 4) || '-' ||
    substr(md5(input), 21, 12)
  )::uuid;
$$;

comment on function public.audit_text_to_uuid(text) is 'Gera um uuid deterministico (hash md5) a partir de um texto. Usado apenas como identificador sintetico de auditoria para tabelas sem PK simples em uuid (ex.: perfil_permissao, usuario_perfil). Nao e referencia real de FK.';

-- =========================================================================
-- 2. Funcao generica de auditoria (SECURITY DEFINER)
-- =========================================================================

create or replace function public.fn_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dados_antes jsonb;
  v_dados_depois jsonb;
  v_row_referencia jsonb;
  v_registro_id uuid;
begin
  if TG_OP = 'INSERT' then
    v_dados_antes := null;
    v_dados_depois := to_jsonb(NEW);
    v_row_referencia := to_jsonb(NEW);
  elsif TG_OP = 'UPDATE' then
    v_dados_antes := to_jsonb(OLD);
    v_dados_depois := to_jsonb(NEW);
    v_row_referencia := to_jsonb(NEW);
  elsif TG_OP = 'DELETE' then
    v_dados_antes := to_jsonb(OLD);
    v_dados_depois := null;
    v_row_referencia := to_jsonb(OLD);
  else
    return null;
  end if;

  -- registro_id: usa a coluna "id" quando existir; caso contrario (chave
  -- composta, ex.: perfil_permissao, usuario_perfil), gera identificador
  -- sintetico deterministico a partir da linha completa.
  if v_row_referencia ? 'id' then
    v_registro_id := (v_row_referencia ->> 'id')::uuid;
  else
    v_registro_id := public.audit_text_to_uuid(TG_TABLE_NAME || ':' || v_row_referencia::text);
  end if;

  insert into audit_log (
    usuario_id, tabela_afetada, registro_id, acao, dados_antes, dados_depois, created_at
  ) values (
    auth.uid(), TG_TABLE_NAME, v_registro_id, lower(TG_OP), v_dados_antes, v_dados_depois, now()
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

comment on function public.fn_audit_trigger() is 'Funcao generica de auditoria. SECURITY DEFINER: executa com privilegio do proprietario da funcao (owner da migration), o que permite o INSERT em audit_log independente das policies de RLS vistas pelo usuario que disparou a operacao. Ver decisao documentada nesta migration sobre a policy provisoria de INSERT manual.';

-- =========================================================================
-- 3. Decisao tecnica documentada: SECURITY DEFINER e RLS de audit_log
-- =========================================================================
-- A funcao fn_audit_trigger() e' SECURITY DEFINER, ou seja, roda com os
-- privilegios do USUARIO PROPRIETARIO da funcao (normalmente o role que
-- aplica as migrations, ex.: postgres/supabase_admin), e nao com os
-- privilegios do usuario autenticado que efetivamente fez o INSERT/UPDATE/
-- DELETE na tabela assistencial.
--
-- Como o proprietario da tabela audit_log (mesmo role) e', por padrao,
-- isento de RLS sobre as proprias tabelas (RLS so' restringe roles que NAO
-- sao o owner, a menos que FORCE ROW LEVEL SECURITY tenha sido definido -
-- o que NAO foi feito na migration anterior), o INSERT feito pela funcao
-- do trigger ocorre independentemente das policies de audit_log.
--
-- Consequencia pratica: a partir desta migration, a escrita em audit_log
-- NAO depende mais da policy "audit_log_insert_linked" (criada na migration
-- 20260623100012 como medida provisoria, antes de existir trigger). Essa
-- policy e' removida nesta migration (secao 5), e o INSERT direto por
-- qualquer usuario autenticado (mesmo vinculado) passa a ser bloqueado.
-- Daqui em diante, audit_log so' recebe registros via fn_audit_trigger().

-- =========================================================================
-- 4. Triggers nas tabelas assistenciais e administrativas sensiveis
-- =========================================================================
-- Nao aplicado em audit_log (evita recursao), conforme exigido no escopo.

do $$
declare
  audited_table text;
begin
  for audited_table in select unnest(array[
    'usuarios', 'perfis_acesso', 'permissoes', 'perfil_permissao', 'usuario_perfil',
    'pacientes', 'paciente_alergias', 'paciente_comorbidades',
    'paciente_medicamentos_continuos', 'paciente_alertas_clinicos',
    'atendimentos', 'chamadas', 'triagens', 'consultas', 'evolucoes_enfermagem',
    'observacoes', 'reavaliacoes_observacao', 'estabilizacoes',
    'checklist_estabilizacao_itens', 'exames', 'estoque_itens',
    'estoque_movimentacoes', 'prescricoes', 'prescricao_itens',
    'transferencias', 'checklist_transferencia_itens'
  ])
  loop
    execute format(
      'drop trigger if exists %I on %I;',
      'trg_audit_' || audited_table, audited_table
    );
    execute format(
      'create trigger %I
         after insert or update or delete on %I
         for each row execute function public.fn_audit_trigger();',
      'trg_audit_' || audited_table, audited_table
    );
  end loop;
end $$;

-- =========================================================================
-- 5. Restringir a policy provisoria de INSERT manual em audit_log
-- =========================================================================
-- A policy "audit_log_insert_linked" (migration 20260623100012) permitia
-- que qualquer usuario vinculado inserisse manualmente em audit_log,
-- enquanto nao havia trigger automatico. Agora que a auditoria e'
-- alimentada por fn_audit_trigger() (SECURITY DEFINER, que nao depende
-- dessa policy), a policy e' removida para reduzir superficie de escrita.

drop policy if exists audit_log_insert_linked on audit_log;

-- Reforco estrutural: revoga INSERT direto de authenticated/anon. A unica
-- via de escrita em audit_log passa a ser a funcao do trigger (executada
-- como owner, que nao se sujeita a este REVOKE).
revoke insert on audit_log from authenticated;
revoke insert on audit_log from anon;

-- UPDATE/DELETE em audit_log permanecem bloqueados conforme a migration
-- anterior (ausencia de policy + REVOKE UPDATE, DELETE ja aplicado em
-- 20260623100012). Nenhuma policy de UPDATE/DELETE e' criada aqui.

-- TODO: se no futuro for necessario um processo de expurgo/retencao de
-- audit_log (ex.: por volume), criar uma funcao SECURITY DEFINER dedicada
-- para isso, nunca abrir DELETE direto via policy.

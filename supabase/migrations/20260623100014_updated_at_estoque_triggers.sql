-- Migration: trigger generico de updated_at + protecao de estoque - GSI Saude
-- Nao altera frontend, nao cria login, nao integra Supabase.

-- =========================================================================
-- 1. Funcao generica: atualiza updated_at em qualquer tabela que a tenha.
-- =========================================================================

create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.fn_set_updated_at() is 'Trigger generico BEFORE UPDATE: forca updated_at = now() em qualquer linha alterada, independente do valor enviado pela aplicacao.';

-- =========================================================================
-- 2. Aplica o trigger de updated_at nas tabelas listadas que possuem a
--    coluna (todas possuem, conforme migrations 20260623100002 a 11).
--    Omitidas de proposito: perfil_permissao e usuario_perfil (sem
--    updated_at - tabelas de vinculo N:N) e estoque_movimentacoes (sem
--    UPDATE permitido - ver secao 4).
-- =========================================================================

do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'usuarios', 'perfis_acesso', 'permissoes',
    'pacientes', 'paciente_alergias', 'paciente_comorbidades',
    'paciente_medicamentos_continuos', 'paciente_alertas_clinicos',
    'atendimentos', 'chamadas', 'triagens', 'consultas', 'evolucoes_enfermagem',
    'observacoes', 'reavaliacoes_observacao', 'estabilizacoes',
    'checklist_estabilizacao_itens', 'exames', 'estoque_itens',
    'prescricoes', 'prescricao_itens', 'transferencias',
    'checklist_transferencia_itens'
  ])
  loop
    execute format('drop trigger if exists trg_updated_at_%s on %I;', tbl, tbl);
    execute format(
      'create trigger trg_updated_at_%s
         before update on %I
         for each row execute function public.fn_set_updated_at();',
      tbl, tbl
    );
  end loop;
end $$;

-- =========================================================================
-- 3. Limitacao documentada: estoque_movimentacoes.tipo_movimentacao
-- =========================================================================
-- A coluna tipo_movimentacao (migration 20260623100009) aceita apenas os
-- valores 'entrada', 'saida' e 'ajuste' (check constraint ja existente).
-- O escopo desta tarefa cita tambem "baixa, perda, ajuste ou dispensacao"
-- como motivos de saida de estoque, mas NAO existe coluna propria para
-- esses sub-tipos - eles devem ser registrados como tipo_movimentacao =
-- 'saida', com o detalhe (baixa/perda/dispensacao) descrito no campo
-- "motivo" (texto livre). Esta migration NAO altera a estrutura da tabela
-- (nao adiciona nem remove colunas), para nao quebrar as migrations
-- anteriores - apenas documenta a convencao adotada:
--
--   - 'entrada' -> soma quantidade a estoque_itens.quantidade_atual.
--     quantidade deve ser informada como valor positivo.
--   - 'saida'   -> subtrai quantidade de estoque_itens.quantidade_atual.
--     quantidade deve ser informada como valor positivo (o sinal de
--     subtracao e' aplicado pela funcao, nao pelo usuario).
--   - 'ajuste'  -> soma quantidade diretamente, podendo ser positiva
--     (ajuste para cima) ou negativa (ajuste para baixo). Como nao ha
--     coluna de sinal/direcao dedicada, 'ajuste' e' o UNICO tipo em que a
--     aplicacao deve enviar quantidade com sinal explicito.
--
-- TODO: se a ambiguidade de 'ajuste' (sinal implicito no valor) se mostrar
-- insuficiente na pratica, considerar em migration futura adicionar uma
-- coluna "direcao" (entrada/saida) separada de "motivo" (baixa, perda,
-- dispensacao, correcao de inventario etc.), sem quebrar os dados ja
-- gravados nesta convencao.

-- =========================================================================
-- 4. Protecao de estoque_itens.quantidade_atual
-- =========================================================================
-- Estrategia: a coluna so' pode ser alterada quando a propria funcao de
-- recalculo (fn_estoque_aplicar_movimentacao, SECURITY DEFINER) estiver
-- executando o UPDATE. Para isso, ela sinaliza uma flag de sessao local a
-- transacao (set_config(..., is_local => true)) antes do UPDATE interno;
-- qualquer outro UPDATE de quantidade_atual fora desse contexto e rejeitado.

create or replace function public.fn_estoque_itens_protect_quantidade()
returns trigger
language plpgsql
as $$
begin
  if NEW.quantidade_atual is distinct from OLD.quantidade_atual
     and coalesce(current_setting('gsi.allow_quantidade_update', true), 'off') <> 'on'
  then
    raise exception
      'estoque_itens.quantidade_atual nao pode ser alterado diretamente por UPDATE. Registre um movimento em estoque_movimentacoes.';
  end if;
  return NEW;
end;
$$;

comment on function public.fn_estoque_itens_protect_quantidade() is 'BEFORE UPDATE em estoque_itens: bloqueia alteracao manual de quantidade_atual, exceto quando a flag de sessao gsi.allow_quantidade_update = on (definida apenas pela funcao fn_estoque_aplicar_movimentacao).';

drop trigger if exists trg_protect_quantidade_atual on estoque_itens;
create trigger trg_protect_quantidade_atual
  before update on estoque_itens
  for each row execute function public.fn_estoque_itens_protect_quantidade();

-- =========================================================================
-- 5. Recalculo automatico a partir de estoque_movimentacoes
-- =========================================================================

create or replace function public.fn_estoque_aplicar_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric;
  v_quantidade_resultante numeric;
begin
  if NEW.quantidade is null or NEW.quantidade = 0 then
    raise exception 'estoque_movimentacoes.quantidade deve ser diferente de zero.';
  end if;

  if NEW.tipo_movimentacao = 'entrada' then
    if NEW.quantidade < 0 then
      raise exception 'Movimentacao de entrada deve ter quantidade positiva.';
    end if;
    v_delta := NEW.quantidade;
  elsif NEW.tipo_movimentacao = 'saida' then
    if NEW.quantidade < 0 then
      raise exception 'Movimentacao de saida deve ter quantidade positiva (o sinal de subtracao e aplicado automaticamente).';
    end if;
    v_delta := -NEW.quantidade;
  elsif NEW.tipo_movimentacao = 'ajuste' then
    -- 'ajuste' carrega o proprio sinal (ver limitacao documentada na secao 3).
    v_delta := NEW.quantidade;
  else
    raise exception 'tipo_movimentacao % nao reconhecido.', NEW.tipo_movimentacao;
  end if;

  select quantidade_atual + v_delta into v_quantidade_resultante
  from estoque_itens
  where id = NEW.item_id
  for update;

  if v_quantidade_resultante is null then
    raise exception 'estoque_itens % nao encontrado para aplicar movimentacao.', NEW.item_id;
  end if;

  if v_quantidade_resultante < 0 then
    raise exception
      'Movimentacao recusada: estoque resultante (%) seria negativo para o item %. Nao ha regra autorizada para permitir estoque negativo.',
      v_quantidade_resultante, NEW.item_id;
  end if;

  perform set_config('gsi.allow_quantidade_update', 'on', true);

  update estoque_itens
  set quantidade_atual = v_quantidade_resultante,
      updated_by = NEW.responsavel_id
  where id = NEW.item_id;

  perform set_config('gsi.allow_quantidade_update', 'off', true);

  return NEW;
end;
$$;

comment on function public.fn_estoque_aplicar_movimentacao() is 'AFTER INSERT em estoque_movimentacoes: calcula o delta conforme tipo_movimentacao, recusa resultado negativo, e atualiza estoque_itens.quantidade_atual via flag de sessao que autoriza o UPDATE protegido. SECURITY DEFINER para poder escrever em estoque_itens independentemente da policy de RLS do usuario chamador.';

drop trigger if exists trg_aplicar_movimentacao on estoque_movimentacoes;
create trigger trg_aplicar_movimentacao
  after insert on estoque_movimentacoes
  for each row execute function public.fn_estoque_aplicar_movimentacao();

-- =========================================================================
-- 6. Bloqueio estrutural de UPDATE/DELETE em estoque_movimentacoes
-- =========================================================================
-- A migration de RLS (20260623100012) ja nao cria policy de UPDATE/DELETE
-- para esta tabela, o que bloqueia usuarios comuns. Esta secao adiciona um
-- bloqueio em nivel de trigger, valido inclusive para roles com privilegio
-- elevado (ex.: table owner, service role), reforcando que o historico de
-- movimentacao e' imutavel por definicao de produto.

create or replace function public.fn_block_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception '% em % nao e permitido - historico de movimentacao de estoque e imutavel.', TG_OP, TG_TABLE_NAME;
end;
$$;

comment on function public.fn_block_update_delete() is 'Bloqueia UPDATE/DELETE incondicionalmente. Usado para reforcar a imutabilidade de estoque_movimentacoes mesmo contra roles que bypassam RLS.';

drop trigger if exists trg_block_update_estoque_movimentacoes on estoque_movimentacoes;
create trigger trg_block_update_estoque_movimentacoes
  before update on estoque_movimentacoes
  for each row execute function public.fn_block_update_delete();

drop trigger if exists trg_block_delete_estoque_movimentacoes on estoque_movimentacoes;
create trigger trg_block_delete_estoque_movimentacoes
  before delete on estoque_movimentacoes
  for each row execute function public.fn_block_update_delete();

-- TODO: se for necessario corrigir uma movimentacao lancada por engano no
-- futuro, o caminho correto e' lancar uma NOVA movimentacao de 'ajuste'
-- compensatoria (ex.: quantidade negativa), nunca alterar/excluir o
-- registro original - preserva o historico exigido pelo documento mestre.

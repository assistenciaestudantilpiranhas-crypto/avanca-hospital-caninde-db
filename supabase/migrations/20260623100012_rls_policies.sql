-- Migration: seguranca inicial (RLS) - GSI Saude
-- Escopo: habilitar RLS, funcoes auxiliares e policies conservadoras por perfil/permissao.
-- Nao altera frontend, nao cria login, nao integra Supabase ao app.
-- Postura conservadora: bloquear por padrao, liberar apenas o minimo necessario.
-- Pontos que exigem refinamento futuro estao marcados com TODO.
--
-- Revisao: todas as policies agora tem "drop policy if exists" antes do
-- "create policy", para tornar a migration robusta a reaplicacao manual
-- isolada durante desenvolvimento local (sem precisar de supabase db reset
-- completo). Nenhuma logica de policy foi alterada nesta revisao.

-- =========================================================================
-- 0. Perfis adicionais citados na lógica de policies, ausentes no seed v3.
--    Insercao idempotente (on conflict do nothing) - nao remove nem altera
--    os 8 perfis já existentes.
-- =========================================================================

insert into perfis_acesso (nome, descricao) values
  ('Gestão Hospitalar', 'Visualização de dados assistenciais e indicadores consolidados'),
  ('Leitura/Gestor', 'Perfil de leitura ampla, apenas dados consolidados/assistenciais permitidos')
on conflict (nome) do nothing;

-- TODO: revisar com a coordenação se "Auditoria/Faturamento" deve ser perfil
-- distinto de "Auditoria" (ja existente) antes que faturamento_sus seja implementado.

-- =========================================================================
-- 1. Funcoes auxiliares (schema public, SECURITY DEFINER, stable)
-- =========================================================================

create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

comment on function public.current_user_id() is 'Retorna o uuid do usuario autenticado (auth.uid()). Nulo se anonimo.';

create or replace function public.is_linked_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from usuarios u
    join usuario_perfil up on up.usuario_id = u.id
    where u.id = auth.uid()
      and u.ativo = true
  );
$$;

comment on function public.is_linked_user() is 'TRUE somente se o usuario autenticado tem registro ativo em usuarios E ao menos um vinculo em usuario_perfil. Base de bloqueio para usuario nao vinculado.';

create or replace function public.has_perfil(perfil_codigo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from usuario_perfil up
    join perfis_acesso pa on pa.id = up.perfil_id
    join usuarios u on u.id = up.usuario_id
    where up.usuario_id = auth.uid()
      and u.ativo = true
      and pa.nome = perfil_codigo
  );
$$;

comment on function public.has_perfil(text) is 'TRUE se o usuario autenticado possui o perfil informado (nome exato em perfis_acesso.nome), e o usuario esta ativo.';

create or replace function public.has_permission(permission_codigo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from usuario_perfil up
    join perfil_permissao pp on pp.perfil_id = up.perfil_id
    join permissoes p on p.id = pp.permissao_id
    join usuarios u on u.id = up.usuario_id
    where up.usuario_id = auth.uid()
      and u.ativo = true
      and p.chave = permission_codigo
  );
$$;

comment on function public.has_permission(text) is 'TRUE se o usuario autenticado possui, via algum perfil vinculado, a permissao com a chave informada.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_perfil('Administração');
$$;

create or replace function public.is_auditoria()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_perfil('Auditoria');
$$;

-- TODO: avaliar se is_admin()/is_auditoria() devem aceitar tambem
-- "Auditoria/Faturamento" quando esse perfil for formalizado.

-- =========================================================================
-- 2. Tabelas de dominio: leitura liberada a qualquer autenticado vinculado;
--    escrita restrita a Administracao.
-- =========================================================================

do $$
declare
  dom_table text;
begin
  for dom_table in select unnest(array[
    'dom_status_atendimento', 'dom_desfechos', 'dom_classificacao_risco',
    'dom_tipos_observacao', 'dom_status_transferencia', 'dom_status_prescricao',
    'dom_status_exame'
  ])
  loop
    execute format('alter table %I enable row level security;', dom_table);

    execute format('drop policy if exists %I on %I;', dom_table || '_select_linked', dom_table);
    execute format($f$
      create policy %I on %I
        for select
        to authenticated
        using (public.is_linked_user());
    $f$, dom_table || '_select_linked', dom_table);

    execute format('drop policy if exists %I on %I;', dom_table || '_admin_all', dom_table);
    execute format($f$
      create policy %I on %I
        for all
        to authenticated
        using (public.is_admin())
        with check (public.is_admin());
    $f$, dom_table || '_admin_all', dom_table);
  end loop;
end $$;

-- =========================================================================
-- 3. usuarios, perfis_acesso, permissoes, perfil_permissao, usuario_perfil
-- =========================================================================

alter table usuarios enable row level security;
alter table perfis_acesso enable row level security;
alter table permissoes enable row level security;
alter table perfil_permissao enable row level security;
alter table usuario_perfil enable row level security;

-- usuarios: cada usuario ve o proprio registro; admin/auditoria veem todos.
drop policy if exists usuarios_select_self_or_admin on usuarios;
create policy usuarios_select_self_or_admin on usuarios
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin() or public.is_auditoria());

-- Apenas Administracao cria/altera/remove usuarios (vinculo com auth.users
-- e' gerenciado fora desta migration - nao ha tela de login/cadastro ainda).
drop policy if exists usuarios_admin_write on usuarios;
create policy usuarios_admin_write on usuarios
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- perfis_acesso / permissoes: catalogo de leitura para qualquer usuario
-- vinculado (a aplicacao precisa saber quais perfis/permissoes existem);
-- escrita restrita a Administracao.
drop policy if exists perfis_acesso_select_linked on perfis_acesso;
create policy perfis_acesso_select_linked on perfis_acesso
  for select to authenticated using (public.is_linked_user());
drop policy if exists perfis_acesso_admin_write on perfis_acesso;
create policy perfis_acesso_admin_write on perfis_acesso
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists permissoes_select_linked on permissoes;
create policy permissoes_select_linked on permissoes
  for select to authenticated using (public.is_linked_user());
drop policy if exists permissoes_admin_write on permissoes;
create policy permissoes_admin_write on permissoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists perfil_permissao_select_linked on perfil_permissao;
create policy perfil_permissao_select_linked on perfil_permissao
  for select to authenticated using (public.is_linked_user());
drop policy if exists perfil_permissao_admin_write on perfil_permissao;
create policy perfil_permissao_admin_write on perfil_permissao
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- usuario_perfil: usuario ve os proprios vinculos; admin ve/gerencia todos.
drop policy if exists usuario_perfil_select_self_or_admin on usuario_perfil;
create policy usuario_perfil_select_self_or_admin on usuario_perfil
  for select
  to authenticated
  using (usuario_id = auth.uid() or public.is_admin());

drop policy if exists usuario_perfil_admin_write on usuario_perfil;
create policy usuario_perfil_admin_write on usuario_perfil
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- TODO: avaliar policy de auto-leitura para usuario_perfil quando o
-- onboarding de novos usuarios for desenhado (hoje so' admin vincula).

-- =========================================================================
-- 4. Pacientes e dados clinicos persistentes do paciente
-- =========================================================================

alter table pacientes enable row level security;
alter table paciente_alergias enable row level security;
alter table paciente_comorbidades enable row level security;
alter table paciente_medicamentos_continuos enable row level security;
alter table paciente_alertas_clinicos enable row level security;

-- Leitura: qualquer usuario vinculado e ativo (consulta, enfermagem,
-- observacao, estabilizacao, farmacia, regulacao, diagnostico, gestao,
-- auditoria - todos precisam ver dados do paciente em algum momento).
drop policy if exists pacientes_select_linked on pacientes;
create policy pacientes_select_linked on pacientes
  for select to authenticated using (public.is_linked_user());

drop policy if exists pacientes_insert_recepcao_admin on pacientes;
create policy pacientes_insert_recepcao_admin on pacientes
  for insert to authenticated
  with check (public.has_permission('paciente.criar') or public.is_admin());

drop policy if exists pacientes_update_clinico_admin on pacientes;
create policy pacientes_update_clinico_admin on pacientes
  for update to authenticated
  using (public.has_permission('paciente.criar') or public.is_admin())
  with check (public.has_permission('paciente.criar') or public.is_admin());

-- DELETE: somente Administracao, com cautela. Preferir soft delete futuro.
drop policy if exists pacientes_delete_admin_only on pacientes;
create policy pacientes_delete_admin_only on pacientes
  for delete to authenticated
  using (public.is_admin());

-- TODO: substituir DELETE fisico por soft delete (campo ativo/excluido_em)
-- antes de uso real - hoje permitido apenas por cautela tecnica, nao por
-- recomendacao de produto.

do $$
declare
  clinico_table text;
begin
  for clinico_table in select unnest(array[
    'paciente_alergias', 'paciente_comorbidades',
    'paciente_medicamentos_continuos', 'paciente_alertas_clinicos'
  ])
  loop
    execute format('drop policy if exists %I on %I;', clinico_table || '_select_linked', clinico_table);
    execute format($f$
      create policy %I on %I
        for select to authenticated using (public.is_linked_user());
    $f$, clinico_table || '_select_linked', clinico_table);

    execute format('drop policy if exists %I on %I;', clinico_table || '_insert_clinico', clinico_table);
    execute format($f$
      create policy %I on %I
        for insert to authenticated
        with check (
          public.has_permission('paciente.alergia.registrar')
          or public.has_permission('paciente.comorbidade.registrar')
          or public.is_admin()
        );
    $f$, clinico_table || '_insert_clinico', clinico_table);

    execute format('drop policy if exists %I on %I;', clinico_table || '_update_clinico', clinico_table);
    execute format($f$
      create policy %I on %I
        for update to authenticated
        using (
          public.has_permission('paciente.alergia.registrar')
          or public.has_permission('paciente.comorbidade.registrar')
          or public.is_admin()
        )
        with check (
          public.has_permission('paciente.alergia.registrar')
          or public.has_permission('paciente.comorbidade.registrar')
          or public.is_admin()
        );
    $f$, clinico_table || '_update_clinico', clinico_table);

    execute format('drop policy if exists %I on %I;', clinico_table || '_delete_admin_only', clinico_table);
    execute format($f$
      create policy %I on %I
        for delete to authenticated
        using (public.is_admin());
    $f$, clinico_table || '_delete_admin_only', clinico_table);
  end loop;
end $$;

-- TODO: permissoes paciente.alergia.registrar / paciente.comorbidade.registrar
-- estao sendo usadas tambem para medicamentos continuos e alertas clinicos.
-- Avaliar criar permissoes especificas (paciente.medicamento.registrar,
-- paciente.alerta.registrar) se o nivel de granularidade exigir no futuro.

-- =========================================================================
-- 5. Atendimentos e chamadas
-- =========================================================================

alter table atendimentos enable row level security;
alter table chamadas enable row level security;

drop policy if exists atendimentos_select_linked on atendimentos;
create policy atendimentos_select_linked on atendimentos
  for select to authenticated using (public.is_linked_user());

drop policy if exists atendimentos_insert_recepcao_admin on atendimentos;
create policy atendimentos_insert_recepcao_admin on atendimentos
  for insert to authenticated
  with check (public.has_permission('atendimento.abrir') or public.is_admin());

-- UPDATE amplo para perfis assistenciais que avancam o fluxo. RLS e' a
-- nivel de linha, nao de coluna - ver TODO abaixo sobre restricao por campo.
drop policy if exists atendimentos_update_assistencial on atendimentos;
create policy atendimentos_update_assistencial on atendimentos
  for update to authenticated
  using (
    public.has_perfil('Enfermagem')
    or public.has_perfil('Médico')
    or public.has_perfil('Regulação/Transferências')
    or public.is_admin()
  )
  with check (
    public.has_perfil('Enfermagem')
    or public.has_perfil('Médico')
    or public.has_perfil('Regulação/Transferências')
    or public.is_admin()
  );

drop policy if exists atendimentos_delete_admin_only on atendimentos;
create policy atendimentos_delete_admin_only on atendimentos
  for delete to authenticated using (public.is_admin());

-- TODO critico: RLS nao restringe COLUNAS. Hoje qualquer perfil com UPDATE
-- liberado (Enfermagem/Médico/Regulação) pode tecnicamente alterar QUALQUER
-- campo da linha, incluindo desfecho_id ou classificacao_risco_id, mesmo
-- que a regra de negocio (documento mestre) preveja que so' a triagem
-- confirma classificacao e so' a conduta/transferencia define desfecho.
-- Refinamento necessario via: (a) views especificas por modulo com colunas
-- restritas, (b) triggers de validacao de transicao de status, ou (c)
-- funcoes RPC dedicadas no lugar de UPDATE direto na tabela. Resolvido
-- parcialmente pelo trigger fn_validate_atendimento_transicao (migration
-- 20260623100015), que cobre as colunas mais sensiveis (status, desfecho,
-- classificacao, timestamps).

drop policy if exists chamadas_select_linked on chamadas;
create policy chamadas_select_linked on chamadas
  for select to authenticated using (public.is_linked_user());

drop policy if exists chamadas_insert_assistencial on chamadas;
create policy chamadas_insert_assistencial on chamadas
  for insert to authenticated
  with check (
    public.has_permission('atendimento.abrir')
    or public.has_perfil('Enfermagem')
    or public.has_perfil('Médico')
    or public.is_admin()
  );

drop policy if exists chamadas_delete_admin_only on chamadas;
create policy chamadas_delete_admin_only on chamadas
  for delete to authenticated using (public.is_admin());

-- =========================================================================
-- 6. Triagens, consultas, evolucoes_enfermagem, observacoes,
--    reavaliacoes_observacao, estabilizacoes, checklist_estabilizacao_itens
-- =========================================================================

alter table triagens enable row level security;
alter table consultas enable row level security;
alter table evolucoes_enfermagem enable row level security;
alter table observacoes enable row level security;
alter table reavaliacoes_observacao enable row level security;
alter table estabilizacoes enable row level security;
alter table checklist_estabilizacao_itens enable row level security;

drop policy if exists triagens_select_linked on triagens;
create policy triagens_select_linked on triagens
  for select to authenticated using (public.is_linked_user());
drop policy if exists triagens_write_enfermagem_admin on triagens;
create policy triagens_write_enfermagem_admin on triagens
  for all to authenticated
  using (public.has_permission('triagem.classificar') or public.has_perfil('Enfermagem') or public.is_admin())
  with check (public.has_permission('triagem.classificar') or public.has_perfil('Enfermagem') or public.is_admin());

drop policy if exists consultas_select_linked on consultas;
create policy consultas_select_linked on consultas
  for select to authenticated using (public.is_linked_user());
drop policy if exists consultas_write_medico_admin on consultas;
create policy consultas_write_medico_admin on consultas
  for all to authenticated
  using (public.has_permission('consulta.iniciar') or public.has_permission('consulta.registrar_conduta') or public.is_admin())
  with check (public.has_permission('consulta.iniciar') or public.has_permission('consulta.registrar_conduta') or public.is_admin());

drop policy if exists evolucoes_enfermagem_select_linked on evolucoes_enfermagem;
create policy evolucoes_enfermagem_select_linked on evolucoes_enfermagem
  for select to authenticated using (public.is_linked_user());
drop policy if exists evolucoes_enfermagem_write_enfermagem_admin on evolucoes_enfermagem;
create policy evolucoes_enfermagem_write_enfermagem_admin on evolucoes_enfermagem
  for all to authenticated
  using (public.has_permission('enfermagem.evolucao.registrar') or public.is_admin())
  with check (public.has_permission('enfermagem.evolucao.registrar') or public.is_admin());

drop policy if exists observacoes_select_linked on observacoes;
create policy observacoes_select_linked on observacoes
  for select to authenticated using (public.is_linked_user());
drop policy if exists observacoes_write_clinico_admin on observacoes;
create policy observacoes_write_clinico_admin on observacoes
  for all to authenticated
  using (public.has_perfil('Enfermagem') or public.has_perfil('Médico') or public.is_admin())
  with check (public.has_perfil('Enfermagem') or public.has_perfil('Médico') or public.is_admin());

drop policy if exists reavaliacoes_observacao_select_linked on reavaliacoes_observacao;
create policy reavaliacoes_observacao_select_linked on reavaliacoes_observacao
  for select to authenticated using (public.is_linked_user());
drop policy if exists reavaliacoes_observacao_write_clinico_admin on reavaliacoes_observacao;
create policy reavaliacoes_observacao_write_clinico_admin on reavaliacoes_observacao
  for all to authenticated
  using (public.has_permission('observacao.reavaliar') or public.is_admin())
  with check (public.has_permission('observacao.reavaliar') or public.is_admin());

drop policy if exists estabilizacoes_select_linked on estabilizacoes;
create policy estabilizacoes_select_linked on estabilizacoes
  for select to authenticated using (public.is_linked_user());
drop policy if exists estabilizacoes_write_enfermagem_admin on estabilizacoes;
create policy estabilizacoes_write_enfermagem_admin on estabilizacoes
  for all to authenticated
  using (public.has_perfil('Enfermagem') or public.has_perfil('Médico') or public.is_admin())
  with check (public.has_perfil('Enfermagem') or public.has_perfil('Médico') or public.is_admin());

drop policy if exists checklist_estabilizacao_itens_select_linked on checklist_estabilizacao_itens;
create policy checklist_estabilizacao_itens_select_linked on checklist_estabilizacao_itens
  for select to authenticated using (public.is_linked_user());
drop policy if exists checklist_estabilizacao_itens_write_enfermagem_admin on checklist_estabilizacao_itens;
create policy checklist_estabilizacao_itens_write_enfermagem_admin on checklist_estabilizacao_itens
  for all to authenticated
  using (public.has_permission('estabilizacao.checklist_item') or public.is_admin())
  with check (public.has_permission('estabilizacao.checklist_item') or public.is_admin());

-- Nenhuma policy de DELETE explicita nestas 7 tabelas: por padrao (RLS
-- bloqueia tudo que nao tem policy), DELETE fica negado para todos os
-- perfis, inclusive Administracao. TODO: decidir se Administracao deve
-- ter DELETE com cautela, igual ao padrao usado em pacientes/atendimentos,
-- ou se estas tabelas devem permanecer imutaveis (recomendado para
-- preservar rastreabilidade clinica do documento mestre).

-- =========================================================================
-- 7. Exames
-- =========================================================================

alter table exames enable row level security;

drop policy if exists exames_select_linked on exames;
create policy exames_select_linked on exames
  for select to authenticated using (public.is_linked_user());

drop policy if exists exames_insert_medico_admin on exames;
create policy exames_insert_medico_admin on exames
  for insert to authenticated
  with check (public.has_permission('exame.solicitar') or public.is_admin());

drop policy if exists exames_update_diagnostico_admin on exames;
create policy exames_update_diagnostico_admin on exames
  for update to authenticated
  using (
    public.has_permission('exame.liberar_resultado')
    or public.has_permission('exame.marcar_critico')
    or public.is_admin()
  )
  with check (
    public.has_permission('exame.liberar_resultado')
    or public.has_permission('exame.marcar_critico')
    or public.is_admin()
  );

-- Sem policy de DELETE: exames nunca sao removidos (alimentam indicadores).

-- =========================================================================
-- 8. Estoque
-- =========================================================================

alter table estoque_itens enable row level security;
alter table estoque_movimentacoes enable row level security;

drop policy if exists estoque_itens_select_linked on estoque_itens;
create policy estoque_itens_select_linked on estoque_itens
  for select to authenticated using (public.is_linked_user());

drop policy if exists estoque_itens_write_farmacia_admin on estoque_itens;
create policy estoque_itens_write_farmacia_admin on estoque_itens
  for all to authenticated
  using (public.has_permission('estoque.movimentar') or public.is_admin())
  with check (public.has_permission('estoque.movimentar') or public.is_admin());

-- TODO critico (reforco do que ja' esta' no comentario da tabela): mesmo com
-- a policy permitindo UPDATE de estoque_itens por Farmacia/Admin, a regra
-- de produto e' que quantidade_atual NUNCA deve ser editada diretamente -
-- toda alteracao deve passar por estoque_movimentacoes. Resolvido pelo
-- trigger fn_estoque_itens_protect_quantidade (migration 20260623100014).

drop policy if exists estoque_movimentacoes_select_linked on estoque_movimentacoes;
create policy estoque_movimentacoes_select_linked on estoque_movimentacoes
  for select to authenticated using (public.is_linked_user());

drop policy if exists estoque_movimentacoes_insert_farmacia_admin on estoque_movimentacoes;
create policy estoque_movimentacoes_insert_farmacia_admin on estoque_movimentacoes
  for insert to authenticated
  with check (public.has_permission('estoque.movimentar') or public.is_admin());

-- Sem policy de UPDATE/DELETE: movimentacao de estoque e' lancamento
-- contabil - uma vez criada, nao deve ser alterada nem removida.

-- =========================================================================
-- 9. Prescricoes e prescricao_itens
-- =========================================================================

alter table prescricoes enable row level security;
alter table prescricao_itens enable row level security;

drop policy if exists prescricoes_select_linked on prescricoes;
create policy prescricoes_select_linked on prescricoes
  for select to authenticated using (public.is_linked_user());

drop policy if exists prescricoes_insert_medico_admin on prescricoes;
create policy prescricoes_insert_medico_admin on prescricoes
  for insert to authenticated
  with check (public.has_permission('prescricao.criar') or public.is_admin());

drop policy if exists prescricoes_update_medico_admin on prescricoes;
create policy prescricoes_update_medico_admin on prescricoes
  for update to authenticated
  using (public.has_permission('prescricao.criar') or public.is_admin())
  with check (public.has_permission('prescricao.criar') or public.is_admin());

drop policy if exists prescricao_itens_select_linked on prescricao_itens;
create policy prescricao_itens_select_linked on prescricao_itens
  for select to authenticated using (public.is_linked_user());

drop policy if exists prescricao_itens_insert_medico_admin on prescricao_itens;
create policy prescricao_itens_insert_medico_admin on prescricao_itens
  for insert to authenticated
  with check (public.has_permission('prescricao.criar') or public.is_admin());

-- Farmacia atualiza status do item (dispensar/em falta/administrado).
drop policy if exists prescricao_itens_update_farmacia_admin on prescricao_itens;
create policy prescricao_itens_update_farmacia_admin on prescricao_itens
  for update to authenticated
  using (public.has_permission('prescricao.dispensar') or public.is_admin())
  with check (public.has_permission('prescricao.dispensar') or public.is_admin());

-- Sem policy de DELETE em prescricoes/prescricao_itens: historico de
-- prescricao e' assistencial, nao deve ser removido.

-- =========================================================================
-- 10. Transferencias e checklist_transferencia_itens
-- =========================================================================

alter table transferencias enable row level security;
alter table checklist_transferencia_itens enable row level security;

drop policy if exists transferencias_select_linked on transferencias;
create policy transferencias_select_linked on transferencias
  for select to authenticated using (public.is_linked_user());

drop policy if exists transferencias_insert_medico_regulacao_admin on transferencias;
create policy transferencias_insert_medico_regulacao_admin on transferencias
  for insert to authenticated
  with check (public.has_permission('transferencia.solicitar') or public.is_admin());

drop policy if exists transferencias_update_regulacao_admin on transferencias;
create policy transferencias_update_regulacao_admin on transferencias
  for update to authenticated
  using (
    public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_saida')
    or public.is_admin()
  )
  with check (
    public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_saida')
    or public.is_admin()
  );

drop policy if exists checklist_transferencia_itens_select_linked on checklist_transferencia_itens;
create policy checklist_transferencia_itens_select_linked on checklist_transferencia_itens
  for select to authenticated using (public.is_linked_user());

drop policy if exists checklist_transferencia_itens_write_regulacao_admin on checklist_transferencia_itens;
create policy checklist_transferencia_itens_write_regulacao_admin on checklist_transferencia_itens
  for all to authenticated
  using (
    public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_saida')
    or public.is_admin()
  )
  with check (
    public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_saida')
    or public.is_admin()
  );

-- Sem policy de DELETE: transferencias concluidas permanecem para
-- historico/indicadores (regra explicita do documento mestre).

-- =========================================================================
-- 11. audit_log: somente INSERT e SELECT (admin/auditoria); UPDATE/DELETE
--     bloqueados estruturalmente, nao apenas por ausencia de policy.
-- =========================================================================

alter table audit_log enable row level security;

drop policy if exists audit_log_select_admin_auditoria on audit_log;
create policy audit_log_select_admin_auditoria on audit_log
  for select to authenticated
  using (public.is_admin() or public.is_auditoria());

-- INSERT liberado a qualquer usuario vinculado, pois (nesta fase) a
-- gravacao ainda e' manual/aplicacao - os triggers automaticos de
-- auditoria ficam para migration futura (regra 6 do escopo aprovado).
-- NOTA: esta policy e' removida na migration 20260623100013, quando o
-- trigger automatico de auditoria passa a ser a unica via de escrita.
drop policy if exists audit_log_insert_linked on audit_log;
create policy audit_log_insert_linked on audit_log
  for insert to authenticated
  with check (public.is_linked_user());

-- Bloqueio estrutural extra (alem da ausencia de policy de UPDATE/DELETE):
-- revoga o privilegio no nivel de GRANT, valido inclusive contra novas
-- policies criadas erroneamente no futuro sem revisao.
revoke update, delete on audit_log from authenticated;
revoke update, delete on audit_log from anon;

-- TODO: quando os triggers de auditoria (regra 6) forem criados, considerar
-- restringir audit_log_insert_linked para que so' a propria funcao de
-- trigger (security definer, owner do banco) grave em audit_log, e revogar
-- o INSERT direto de "authenticated" nesta tabela.

-- =========================================================================
-- 12. Bloqueio de acesso anonimo (reforco explicito)
-- =========================================================================

-- Por padrao, RLS sem policy para o role "anon" ja' nega acesso. Reforco
-- explicito via REVOKE para garantir que nenhuma policy futura "to public"
-- abra acesso anonimo as tabelas assistenciais por engano.
do $$
declare
  protected_table text;
begin
  for protected_table in select unnest(array[
    'usuarios', 'perfis_acesso', 'permissoes', 'perfil_permissao', 'usuario_perfil',
    'pacientes', 'paciente_alergias', 'paciente_comorbidades',
    'paciente_medicamentos_continuos', 'paciente_alertas_clinicos',
    'atendimentos', 'chamadas', 'triagens', 'consultas', 'evolucoes_enfermagem',
    'observacoes', 'reavaliacoes_observacao', 'estabilizacoes',
    'checklist_estabilizacao_itens', 'exames', 'estoque_itens',
    'estoque_movimentacoes', 'prescricoes', 'prescricao_itens',
    'transferencias', 'checklist_transferencia_itens', 'audit_log'
  ])
  loop
    execute format('revoke all on %I from anon;', protected_table);
  end loop;
end $$;

-- TODO geral de refinamento futuro (fora do escopo desta migration):
-- 1. Restricao por coluna (ver TODO da secao 5 sobre atendimentos) - ja
--    parcialmente resolvido pela migration 20260623100015.
-- 2. Trigger que impede UPDATE direto de estoque_itens.quantidade_atual -
--    ja resolvido pela migration 20260623100014.
-- 3. Avaliar escopo de "Gestão Hospitalar" e "Leitura/Gestor" - hoje estes
--    perfis existem em perfis_acesso mas NAO tem policies proprias nesta
--    migration; precisam de permissoes dedicadas (ex.: indicadores.visualizar)
--    antes de serem operacionais. Atualmente um usuario com apenas esses
--    perfis so' teria acesso de leitura aos dominios (is_linked_user) e
--    nao a tabelas assistenciais, pois nenhuma policy de SELECT restrita a
--    esses perfis foi criada alem da generica is_linked_user() - ou seja,
--    eles HERDAM a leitura ampla dada a qualquer usuario vinculado. Avaliar
--    se isso e' o comportamento desejado ou se deve ser mais restrito.
-- 4. Trigger de auditoria automatica (regra 6 do escopo aprovado) - ja
--    resolvido pela migration 20260623100013.
-- 5. Soft delete em pacientes/atendimentos no lugar de DELETE fisico.

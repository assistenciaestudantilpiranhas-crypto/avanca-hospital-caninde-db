-- Rollback: 20260809000001_pp3b2_patient_clinical_permissions_and_rls_rollback
-- GSI ONE | PP3-B.2 — Desfaz exatamente o que a migration criou.
--
-- O que este rollback faz:
--   R1. Restaura as 4 SELECT policies ao baseline exato (is_linked_user()).
--   R2. Restaura as 4 INSERT/UPDATE policies de medicamentos_continuos e
--       alertas_clinicos ao baseline exato (proxy alergia/comorbidade).
--   R3. Remove vinculos perfil_permissao criados nesta migration.
--   R4. Remove as 6 permissoes criadas nesta migration.
--
-- O que este rollback NAO faz:
--   - Nao altera tabelas, colunas, sequences, triggers, funcoes.
--   - Nao altera grants.
--   - Nao altera policies de alergias/comorbidades INSERT/UPDATE (preservadas).
--   - Nao remove permissoes existentes antes desta migration.
--   - Nao apaga dados clinicos.
--
-- Guardioes:
--   R-G1. Confirma que as novas SELECT policies existem antes de removê-las.
--   R-G2. Confirma que as novas INSERT/UPDATE policies existem antes de remover.
--   R-G3. Confirma que as 6 permissoes novas existem antes de remover vinculos/perms.
--
-- AVISO: este rollback recria as policies com is_linked_user(), que foi
-- identificado como inseguro (acesso amplo). Executar somente em ambientes
-- de desenvolvimento; nunca em producao sem autorizacao expressa.

-- =========================================================================
-- GUARDIAO DE ROLLBACK
-- =========================================================================

do $rguard$
declare
  v_pol               text;
  v_perm              text;
  v_unexpected_count  integer;
  v_tbls_sel text[] := array[
    'paciente_alergias',
    'paciente_comorbidades',
    'paciente_medicamentos_continuos',
    'paciente_alertas_clinicos'
  ];
  v_pols_sel text[] := array[
    'paciente_alergias_select_clinico',
    'paciente_comorbidades_select_clinico',
    'paciente_medicamentos_continuos_select_clinico',
    'paciente_alertas_clinicos_select_clinico'
  ];
  v_tbls_dml text[] := array[
    'paciente_medicamentos_continuos',
    'paciente_medicamentos_continuos',
    'paciente_alertas_clinicos',
    'paciente_alertas_clinicos'
  ];
  v_pols_dml text[] := array[
    'paciente_medicamentos_continuos_insert_clinico',
    'paciente_medicamentos_continuos_update_clinico',
    'paciente_alertas_clinicos_insert_clinico',
    'paciente_alertas_clinicos_update_clinico'
  ];
  v_new_perms text[] := array[
    'paciente.alergia.visualizar',
    'paciente.comorbidade.visualizar',
    'paciente.medicamento_continuo.visualizar',
    'paciente.alerta_clinico.visualizar',
    'paciente.medicamento_continuo.registrar',
    'paciente.alerta_clinico.registrar'
  ];
  v_i integer;
begin
  -- R-G1: SELECT policies novas devem existir — fail-closed
  for v_i in 1..array_length(v_tbls_sel, 1) loop
    if not exists(
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename  = v_tbls_sel[v_i]
        and policyname = v_pols_sel[v_i]
    ) then
      raise exception
        'pp3b2_rollback_guard: SELECT policy % nao encontrada em %. '
        'Estado inconsistente — esta migration pode nao ter sido aplicada ou '
        'ja foi revertida. Nao prosseguir sem investigacao.',
        v_pols_sel[v_i], v_tbls_sel[v_i];
    end if;
  end loop;

  -- R-G2: DML policies novas devem existir — fail-closed
  for v_i in 1..array_length(v_tbls_dml, 1) loop
    if not exists(
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename  = v_tbls_dml[v_i]
        and policyname = v_pols_dml[v_i]
    ) then
      raise exception
        'pp3b2_rollback_guard: DML policy % nao encontrada em %. '
        'Estado inconsistente — nao prosseguir sem investigacao.',
        v_pols_dml[v_i], v_tbls_dml[v_i];
    end if;
  end loop;

  -- R-G3: vinculos inesperados (perfis fora da matriz aprovada B2)
  -- Antes de remover permissoes, confirma que nao ha bindings de perfis
  -- desconhecidos. Se houver, a remocao apagaria permissoes que outro perfil
  -- nao solicitou — necessita investigacao antes de prosseguir.
  select count(*) into v_unexpected_count
  from public.perfil_permissao pp
  join public.permissoes pe on pe.id = pp.permissao_id
  join public.perfis_acesso pa on pa.id = pp.perfil_id
  where pe.chave = any(v_new_perms)
    and pa.nome not in (
      'Técnico em Enfermagem',
      'Enfermeiro',
      'Médico',
      'Farmácia'
    );

  if v_unexpected_count > 0 then
    raise exception
      'pp3b2_rollback_guard: % vínculo(s) para perfis fora da matriz aprovada detectados. '
      'As permissoes B2 foram atribuidas a perfis nao previstos — '
      'investigar antes de prosseguir com rollback.',
      v_unexpected_count;
  end if;

  raise notice 'pp3b2_rollback_guard: validacoes R-G1..R-G3 passaram, prosseguindo.';
end $rguard$;

-- =========================================================================
-- R1: RESTAURAR AS 4 SELECT POLICIES (baseline: is_linked_user())
-- =========================================================================

drop policy if exists paciente_alergias_select_clinico on public.paciente_alergias;

create policy paciente_alergias_select_linked on public.paciente_alergias
  for select to authenticated
  using (public.is_linked_user());

comment on policy paciente_alergias_select_linked on public.paciente_alergias is
  'Rollback PP3-B.2 (20260809000001): restaurada para baseline is_linked_user(). '
  'Requer nova aplicacao da migration para acesso por permissao especifica.';

-- ---

drop policy if exists paciente_comorbidades_select_clinico on public.paciente_comorbidades;

create policy paciente_comorbidades_select_linked on public.paciente_comorbidades
  for select to authenticated
  using (public.is_linked_user());

comment on policy paciente_comorbidades_select_linked on public.paciente_comorbidades is
  'Rollback PP3-B.2 (20260809000001): restaurada para baseline is_linked_user().';

-- ---

drop policy if exists paciente_medicamentos_continuos_select_clinico on public.paciente_medicamentos_continuos;

create policy paciente_medicamentos_continuos_select_linked on public.paciente_medicamentos_continuos
  for select to authenticated
  using (public.is_linked_user());

comment on policy paciente_medicamentos_continuos_select_linked on public.paciente_medicamentos_continuos is
  'Rollback PP3-B.2 (20260809000001): restaurada para baseline is_linked_user().';

-- ---

drop policy if exists paciente_alertas_clinicos_select_clinico on public.paciente_alertas_clinicos;

create policy paciente_alertas_clinicos_select_linked on public.paciente_alertas_clinicos
  for select to authenticated
  using (public.is_linked_user());

comment on policy paciente_alertas_clinicos_select_linked on public.paciente_alertas_clinicos is
  'Rollback PP3-B.2 (20260809000001): restaurada para baseline is_linked_user().';

-- =========================================================================
-- R2: RESTAURAR INSERT/UPDATE DE MEDICAMENTOS E ALERTAS (baseline: proxy)
-- =========================================================================

-- paciente_medicamentos_continuos — INSERT
drop policy if exists paciente_medicamentos_continuos_insert_clinico on public.paciente_medicamentos_continuos;

create policy paciente_medicamentos_continuos_insert_clinico on public.paciente_medicamentos_continuos
  for insert to authenticated
  with check (
    public.has_permission('paciente.alergia.registrar')
    or public.has_permission('paciente.comorbidade.registrar')
    or public.is_admin()
  );

comment on policy paciente_medicamentos_continuos_insert_clinico on public.paciente_medicamentos_continuos is
  'Rollback PP3-B.2 (20260809000001): restaurado ao proxy original (alergia/comorbidade.registrar). '
  'Este predicado e semanticamente incorreto para esta tabela — usar apenas em rollback.';

-- paciente_medicamentos_continuos — UPDATE
drop policy if exists paciente_medicamentos_continuos_update_clinico on public.paciente_medicamentos_continuos;

create policy paciente_medicamentos_continuos_update_clinico on public.paciente_medicamentos_continuos
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

comment on policy paciente_medicamentos_continuos_update_clinico on public.paciente_medicamentos_continuos is
  'Rollback PP3-B.2 (20260809000001): restaurado ao proxy original.';

-- paciente_alertas_clinicos — INSERT
drop policy if exists paciente_alertas_clinicos_insert_clinico on public.paciente_alertas_clinicos;

create policy paciente_alertas_clinicos_insert_clinico on public.paciente_alertas_clinicos
  for insert to authenticated
  with check (
    public.has_permission('paciente.alergia.registrar')
    or public.has_permission('paciente.comorbidade.registrar')
    or public.is_admin()
  );

comment on policy paciente_alertas_clinicos_insert_clinico on public.paciente_alertas_clinicos is
  'Rollback PP3-B.2 (20260809000001): restaurado ao proxy original.';

-- paciente_alertas_clinicos — UPDATE
drop policy if exists paciente_alertas_clinicos_update_clinico on public.paciente_alertas_clinicos;

create policy paciente_alertas_clinicos_update_clinico on public.paciente_alertas_clinicos
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

comment on policy paciente_alertas_clinicos_update_clinico on public.paciente_alertas_clinicos is
  'Rollback PP3-B.2 (20260809000001): restaurado ao proxy original.';

-- =========================================================================
-- R3: REMOVER VINCULOS perfil_permissao DAS 6 NOVAS PERMISSOES
-- =========================================================================

delete from public.perfil_permissao
where permissao_id in (
  select id from public.permissoes
  where chave in (
    'paciente.alergia.visualizar',
    'paciente.comorbidade.visualizar',
    'paciente.medicamento_continuo.visualizar',
    'paciente.alerta_clinico.visualizar',
    'paciente.medicamento_continuo.registrar',
    'paciente.alerta_clinico.registrar'
  )
);

-- =========================================================================
-- R4: REMOVER AS 6 NOVAS PERMISSOES
-- =========================================================================
-- Seguro: vinculos ja removidos em R3. Nenhuma policy referencia essas
-- permissoes apos R1 e R2 (as policies foram substituidas pelo baseline).

delete from public.permissoes
where chave in (
  'paciente.alergia.visualizar',
  'paciente.comorbidade.visualizar',
  'paciente.medicamento_continuo.visualizar',
  'paciente.alerta_clinico.visualizar',
  'paciente.medicamento_continuo.registrar',
  'paciente.alerta_clinico.registrar'
);

-- =========================================================================
-- FIM DO ROLLBACK 20260809000001
-- SELECT policies restauradas: 4 (is_linked_user())
-- INSERT/UPDATE policies restauradas: 4 (proxy alergia/comorbidade)
-- Vinculos perfil_permissao removidos: ate 16
-- Permissoes removidas: 6
-- =========================================================================

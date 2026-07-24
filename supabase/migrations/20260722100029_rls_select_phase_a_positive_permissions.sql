-- Migration: Fase A de restricao de leitura RLS — listas positivas de permissoes
-- GSI ONE | Etapa 5B.8.5D
--
-- Contexto:
--   As 17 policies SELECT das tabelas clinicas/operacionais usavam
--   is_linked_user() como unico predicado, concedendo leitura ampla a qualquer
--   usuario com perfil ativo, independente do perfil. Esta migration substitui
--   esse predicado por listas positivas baseadas em has_permission(), is_admin()
--   e is_auditoria(), alinhando o banco com a Matriz de Leitura documentada em
--   docs/GSI_ONE_MATRIZ_LEITURA_PERFIL_MODULO_5B8_5A.md e validada em
--   docs/GSI_ONE_RLS_FASE_A_DEPENDENCIAS_FRONTEND_5B8_5C.md.
--
-- O que esta migration faz:
--   - Substitui SOMENTE policies SELECT das 17 tabelas-alvo listadas abaixo.
--   - Nao altera INSERT, UPDATE, DELETE ou ALL em nenhuma tabela.
--   - Nao altera funcoes auxiliares (is_linked_user, has_permission, etc.).
--   - Nao altera grants, RLS enable/disable, tabelas, colunas ou sequences.
--   - Nao cria views, RPCs ou triggers.
--   - Nao altera audit_log, configuracoes_sistema, usuarios, perfis_acesso,
--     permissoes, perfil_permissao, usuario_perfil nem tabelas dom_*.
--
-- Tabelas alteradas (17):
--   1.  pacientes                     — pacientes_select_operacional
--   2.  atendimentos                  — atendimentos_select_operacional
--   3.  chamadas                      — chamadas_select_operacional
--   4.  triagens                      — triagens_select_clinico
--   5.  consultas                     — consultas_select_clinico
--   6.  evolucoes_enfermagem          — evolucoes_enfermagem_select_clinico
--   7.  observacoes                   — observacoes_select_clinico
--   8.  reavaliacoes_observacao       — reavaliacoes_observacao_select_clinico
--   9.  estabilizacoes                — estabilizacoes_select_clinico
--   10. checklist_estabilizacao_itens — checklist_estabilizacao_itens_select_clinico
--   11. prescricoes                   — prescricoes_select_farmacia_clinico
--   12. prescricao_itens              — prescricao_itens_select_farmacia_clinico
--   13. exames                        — exames_select_diagnostico
--   14. transferencias                — transferencias_select_operacional
--   15. checklist_transferencia_itens — checklist_transferencia_itens_select_operacional
--   16. estoque_itens                 — estoque_itens_select_farmacia
--   17. estoque_movimentacoes         — estoque_movimentacoes_select_farmacia
--
-- Impacto por perfil (leitura apos esta migration):
--   Recepção         : pacientes, atendimentos, chamadas              (bloqueado: clinico)
--   Tecnico Enf.     : pacientes, atendimentos, chamadas, triagens,
--                      evolucoes_enfermagem, observacoes,
--                      reavaliacoes_observacao, estabilizacoes,
--                      checklist_estabilizacao_itens, consultas       (bloqueado: prescricoes, exames, transferencias, estoque)
--   Enfermeiro       : idem Tecnico Enf. + transferencias,
--                      checklist_transferencia_itens
--   Medico           : todos os campos clinicos                        (bloqueado: estoque)
--   Farmacia         : pacientes, atendimentos, prescricoes,
--                      prescricao_itens, estoque_itens,
--                      estoque_movimentacoes                           (bloqueado: clinico)
--   Regulacao        : pacientes, atendimentos, transferencias,
--                      checklist_transferencia_itens                   (bloqueado: clinico)
--   Diagnostico/Exames: pacientes, atendimentos, exames               (bloqueado: clinico, estoque)
--   Gestao Hospitalar: nenhuma tabela desta lista                      (intencional — sem permissoes)
--   Leitura/Gestor   : nenhuma tabela desta lista                      (intencional — sem permissoes)
--   Administracao    : todas (via is_admin())
--   Auditoria        : todas (via is_auditoria())
--   Sem perfil/inativo: nenhuma (is_linked_user() negado, has_permission() negado)
--
-- Rollback:
--   supabase/rollback/20260722100029_rls_select_phase_a_positive_permissions_rollback.sql
--
-- Dependencias:
--   - Exige migrations 20260623100004 (permissoes seed) ate 20260623100028 ja aplicadas.
--   - Nao depende de nenhuma nova permissao: usa apenas as chaves do seed original.
--   - Idempotente: DROP IF EXISTS + CREATE para cada policy.
--
-- Fases futuras (fora do escopo desta migration):
--   Fase B: restricao por permissao mais granular (ex: exame.solicitar vs exame.visualizar)
--   Fase C: restricao por setor (usuario_perfil.setor)
--   Fase D: restricao por atendimento/profissional (profissional_responsavel_id)
--   Fase E: auditoria de leitura

-- =========================================================================
-- 1. pacientes
--    Antes: pacientes_select_linked (is_linked_user())
--    Depois: pacientes_select_operacional (lista positiva de permissoes)
--
--    Perfis cobertos:
--      Recepção         → paciente.criar, atendimento.abrir
--      Tecnico Enf.     → triagem.classificar
--      Enfermeiro       → triagem.classificar
--      Medico           → consulta.iniciar
--      Farmacia         → prescricao.dispensar (identificacao minima)
--      Regulacao        → transferencia.aprovar_vaga (para contexto da transferencia)
--      Diagnostico/Exames → exame.visualizar
--      Administracao    → is_admin()
--      Auditoria        → is_auditoria()
-- =========================================================================

drop policy if exists pacientes_select_linked      on public.pacientes;
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
  'Fase A RLS (20260722100029): leitura restrita a perfis com permissao operacional. '
  'Bloqueia Gestao Hospitalar, Leitura/Gestor e usuarios sem permissao. '
  'Substitui pacientes_select_linked (is_linked_user()).';

-- =========================================================================
-- 2. atendimentos
--    Antes: atendimentos_select_linked (is_linked_user())
--    Depois: atendimentos_select_operacional (lista positiva)
--
--    Perfis cobertos: idem pacientes + Diagnostico/Exames (exame.visualizar)
--    para identificacao do atendimento ao qual um exame pertence.
-- =========================================================================

drop policy if exists atendimentos_select_linked      on public.atendimentos;
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
  'Fase A RLS (20260722100029): leitura restrita a perfis operacionais. '
  'Nota: loadAtendimentosReais() usa join embed com pacientes(nome,cpf,cartao_sus) — '
  'ambas as tabelas precisam de policy SELECT para o mesmo perfil. '
  'Consistencia verificada em 5B.8.5C. '
  'Substitui atendimentos_select_linked (is_linked_user()).';

-- =========================================================================
-- 3. chamadas
--    Antes: chamadas_select_linked (is_linked_user())
--    Depois: chamadas_select_operacional
--
--    Perfis: Recepção (atendimento.abrir), TEM/Enfermeiro (triagem.classificar),
--    Medico (consulta.iniciar). Farmacia e Regulacao nao gerenciam fila.
-- =========================================================================

drop policy if exists chamadas_select_linked      on public.chamadas;
drop policy if exists chamadas_select_operacional on public.chamadas;

create policy chamadas_select_operacional on public.chamadas
  for select to authenticated
  using (
    public.has_permission('atendimento.abrir')
    or public.has_permission('triagem.classificar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy chamadas_select_operacional on public.chamadas is
  'Fase A RLS (20260722100029): leitura do painel de chamadas restrita a Recepcao, '
  'Enfermagem e Medico. Substitui chamadas_select_linked (is_linked_user()).';

-- =========================================================================
-- 4. triagens
--    Antes: triagens_select_linked (is_linked_user())
--    Depois: triagens_select_clinico
--
--    Perfis: TEM/Enfermeiro (triagem.classificar), Medico (consulta.iniciar —
--    precisa ver classificacao de risco para contexto da consulta e reavaliacao).
--    Recepção nao ve triagens. Farmacia nao ve triagens.
-- =========================================================================

drop policy if exists triagens_select_linked  on public.triagens;
drop policy if exists triagens_select_clinico on public.triagens;

create policy triagens_select_clinico on public.triagens
  for select to authenticated
  using (
    public.has_permission('triagem.classificar')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy triagens_select_clinico on public.triagens is
  'Fase A RLS (20260722100029): leitura de triagens restrita a equipe clinica. '
  'Recepção, Farmacia, Regulacao e Diagnostico/Exames bloqueados. '
  'Substitui triagens_select_linked (is_linked_user()).';

-- =========================================================================
-- 5. consultas
--    Antes: consultas_select_linked (is_linked_user())
--    Depois: consultas_select_clinico
--
--    Perfis: Medico (consulta.iniciar / registrar_conduta), TEM e Enfermeiro
--    via observacao.reavaliar (precisam ver a conduta medica para cuidar do
--    paciente em observacao/estabilizacao).
-- =========================================================================

drop policy if exists consultas_select_linked  on public.consultas;
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
  'Fase A RLS (20260722100029): leitura de consultas restrita a equipe medica e de '
  'observacao (TEM, Enfermeiro via observacao.reavaliar). '
  'Recepção, Farmacia, Regulacao, Diagnostico/Exames bloqueados. '
  'Substitui consultas_select_linked (is_linked_user()).';

-- =========================================================================
-- 6. evolucoes_enfermagem
--    Antes: evolucoes_enfermagem_select_linked (is_linked_user())
--    Depois: evolucoes_enfermagem_select_clinico
--
--    Perfis: TEM/Enfermeiro (enfermagem.evolucao.registrar), Medico
--    (consulta.iniciar — precisa ver evolucoes para contexto clinico).
-- =========================================================================

drop policy if exists evolucoes_enfermagem_select_linked  on public.evolucoes_enfermagem;
drop policy if exists evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem;

create policy evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem
  for select to authenticated
  using (
    public.has_permission('enfermagem.evolucao.registrar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy evolucoes_enfermagem_select_clinico on public.evolucoes_enfermagem is
  'Fase A RLS (20260722100029): leitura restrita a quem produz ou consome evolucoes clinicas. '
  'Substitui evolucoes_enfermagem_select_linked (is_linked_user()).';

-- =========================================================================
-- 7. observacoes
--    Antes: observacoes_select_linked (is_linked_user())
--    Depois: observacoes_select_clinico
--
--    Perfis: TEM/Enfermeiro/Medico (observacao.reavaliar / consulta.iniciar).
-- =========================================================================

drop policy if exists observacoes_select_linked  on public.observacoes;
drop policy if exists observacoes_select_clinico on public.observacoes;

create policy observacoes_select_clinico on public.observacoes
  for select to authenticated
  using (
    public.has_permission('observacao.reavaliar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy observacoes_select_clinico on public.observacoes is
  'Fase A RLS (20260722100029): leitura de registros de observacao restrita a equipe clinica. '
  'Substitui observacoes_select_linked (is_linked_user()).';

-- =========================================================================
-- 8. reavaliacoes_observacao
--    Antes: reavaliacoes_observacao_select_linked (is_linked_user())
--    Depois: reavaliacoes_observacao_select_clinico
-- =========================================================================

drop policy if exists reavaliacoes_observacao_select_linked  on public.reavaliacoes_observacao;
drop policy if exists reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao;

create policy reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao
  for select to authenticated
  using (
    public.has_permission('observacao.reavaliar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy reavaliacoes_observacao_select_clinico on public.reavaliacoes_observacao is
  'Fase A RLS (20260722100029): leitura de reavaliacoes restrita a equipe de observacao. '
  'Substitui reavaliacoes_observacao_select_linked (is_linked_user()).';

-- =========================================================================
-- 9. estabilizacoes
--    Antes: estabilizacoes_select_linked (is_linked_user())
--    Depois: estabilizacoes_select_clinico
--
--    Perfis: TEM/Enfermeiro (estabilizacao.checklist_item), Medico
--    (consulta.iniciar — dirige a sala de estabilizacao).
-- =========================================================================

drop policy if exists estabilizacoes_select_linked  on public.estabilizacoes;
drop policy if exists estabilizacoes_select_clinico on public.estabilizacoes;

create policy estabilizacoes_select_clinico on public.estabilizacoes
  for select to authenticated
  using (
    public.has_permission('estabilizacao.checklist_item')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy estabilizacoes_select_clinico on public.estabilizacoes is
  'Fase A RLS (20260722100029): leitura de estabilizacoes restrita a equipe da sala vermelha. '
  'Substitui estabilizacoes_select_linked (is_linked_user()).';

-- =========================================================================
-- 10. checklist_estabilizacao_itens
--     Antes: checklist_estabilizacao_itens_select_linked (is_linked_user())
--     Depois: checklist_estabilizacao_itens_select_clinico
-- =========================================================================

drop policy if exists checklist_estabilizacao_itens_select_linked  on public.checklist_estabilizacao_itens;
drop policy if exists checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens;

create policy checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens
  for select to authenticated
  using (
    public.has_permission('estabilizacao.checklist_item')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy checklist_estabilizacao_itens_select_clinico on public.checklist_estabilizacao_itens is
  'Fase A RLS (20260722100029): leitura do checklist de estabilizacao restrita a sala vermelha. '
  'Substitui checklist_estabilizacao_itens_select_linked (is_linked_user()).';

-- =========================================================================
-- 11. prescricoes
--     Antes: prescricoes_select_linked (is_linked_user())
--     Depois: prescricoes_select_farmacia_clinico
--
--     Perfis: Medico (prescricao.criar), Farmacia (prescricao.dispensar).
--     TEM e Enfermeiro nao criam nem dispensam prescricoes nesta fase.
-- =========================================================================

drop policy if exists prescricoes_select_linked            on public.prescricoes;
drop policy if exists prescricoes_select_farmacia_clinico  on public.prescricoes;

create policy prescricoes_select_farmacia_clinico on public.prescricoes
  for select to authenticated
  using (
    public.has_permission('prescricao.criar')
    or public.has_permission('prescricao.dispensar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy prescricoes_select_farmacia_clinico on public.prescricoes is
  'Fase A RLS (20260722100029): leitura de prescricoes restrita a quem prescreve ou dispensa. '
  'Recepção, TEM, Enfermeiro, Regulacao, Diagnostico/Exames bloqueados. '
  'Substitui prescricoes_select_linked (is_linked_user()).';

-- =========================================================================
-- 12. prescricao_itens
--     Antes: prescricao_itens_select_linked (is_linked_user())
--     Depois: prescricao_itens_select_farmacia_clinico
-- =========================================================================

drop policy if exists prescricao_itens_select_linked           on public.prescricao_itens;
drop policy if exists prescricao_itens_select_farmacia_clinico on public.prescricao_itens;

create policy prescricao_itens_select_farmacia_clinico on public.prescricao_itens
  for select to authenticated
  using (
    public.has_permission('prescricao.criar')
    or public.has_permission('prescricao.dispensar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy prescricao_itens_select_farmacia_clinico on public.prescricao_itens is
  'Fase A RLS (20260722100029): leitura de itens de prescricao restrita a prescritores e Farmacia. '
  'Substitui prescricao_itens_select_linked (is_linked_user()).';

-- =========================================================================
-- 13. exames
--     Antes: exames_select_linked (is_linked_user())
--     Depois: exames_select_diagnostico
--
--     Perfis: Medico (exame.solicitar / exame.visualizar), Diagnostico/Exames
--     (exame.visualizar / exame.liberar_resultado / exame.marcar_critico),
--     Auditoria (via is_auditoria() — exame.visualizar tambem coberto, mas
--     is_auditoria() e' mais explicito).
--     Nota: "Tecnico em RX" e o alias visual de "Diagnostico/Exames" no frontend.
--     O perfil real e' 'Diagnostico/Exames' (migration 20260623100004) com
--     exame.visualizar — coberto por has_permission('exame.visualizar').
-- =========================================================================

drop policy if exists exames_select_linked      on public.exames;
drop policy if exists exames_select_diagnostico on public.exames;

create policy exames_select_diagnostico on public.exames
  for select to authenticated
  using (
    public.has_permission('exame.solicitar')
    or public.has_permission('exame.visualizar')
    or public.has_permission('exame.liberar_resultado')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy exames_select_diagnostico on public.exames is
  'Fase A RLS (20260722100029): leitura de exames restrita a Medico e Diagnostico/Exames. '
  'Perfil real "Diagnostico/Exames" cobre o alias UI "Tecnico em RX" via exame.visualizar. '
  'Substitui exames_select_linked (is_linked_user()).';

-- =========================================================================
-- 14. transferencias
--     Antes: transferencias_select_linked (is_linked_user())
--     Depois: transferencias_select_operacional
--
--     Perfis: Medico (transferencia.solicitar), Regulacao (transferencia.aprovar_vaga),
--     Enfermeiro (transferencia.confirmar_checklist / transferencia.confirmar_saida).
--     TEM nao participa do fluxo de transferencia (validado em 5B.8.5C).
--     Farmacia e Recepção nao veem transferencias.
-- =========================================================================

drop policy if exists transferencias_select_linked      on public.transferencias;
drop policy if exists transferencias_select_operacional on public.transferencias;

create policy transferencias_select_operacional on public.transferencias
  for select to authenticated
  using (
    public.has_permission('transferencia.solicitar')
    or public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_checklist')
    or public.has_permission('transferencia.confirmar_saida')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy transferencias_select_operacional on public.transferencias is
  'Fase A RLS (20260722100029): leitura de transferencias restrita a Medico, Regulacao e Enfermeiro. '
  'TEM nao tem permissao de transferencia — bloqueado corretamente. '
  'Substitui transferencias_select_linked (is_linked_user()).';

-- =========================================================================
-- 15. checklist_transferencia_itens
--     Antes: checklist_transferencia_itens_select_linked (is_linked_user())
--     Depois: checklist_transferencia_itens_select_operacional
--
--     Perfis: Enfermeiro (transferencia.confirmar_checklist), Regulacao
--     (transferencia.aprovar_vaga — precisa ver o checklist para verificar
--     o status antes de aprovar saida).
-- =========================================================================

drop policy if exists checklist_transferencia_itens_select_linked      on public.checklist_transferencia_itens;
drop policy if exists checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens;

create policy checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens
  for select to authenticated
  using (
    public.has_permission('transferencia.confirmar_checklist')
    or public.has_permission('transferencia.aprovar_vaga')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy checklist_transferencia_itens_select_operacional on public.checklist_transferencia_itens is
  'Fase A RLS (20260722100029): leitura do checklist de transferencia restrita a Enfermeiro e Regulacao. '
  'Substitui checklist_transferencia_itens_select_linked (is_linked_user()).';

-- =========================================================================
-- 16. estoque_itens
--     Antes: estoque_itens_select_linked (is_linked_user())
--     Depois: estoque_itens_select_farmacia
--
--     Perfis: Farmacia (prescricao.dispensar / estoque.movimentar),
--     Administracao (is_admin() — inclui estoque.movimentar no seed).
--     Nenhum outro perfil precisa de acesso a estoque nesta fase.
-- =========================================================================

drop policy if exists estoque_itens_select_linked   on public.estoque_itens;
drop policy if exists estoque_itens_select_farmacia on public.estoque_itens;

create policy estoque_itens_select_farmacia on public.estoque_itens
  for select to authenticated
  using (
    public.has_permission('prescricao.dispensar')
    or public.has_permission('estoque.movimentar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy estoque_itens_select_farmacia on public.estoque_itens is
  'Fase A RLS (20260722100029): leitura de estoque restrita a Farmacia e Administracao. '
  'Confirmado em 5B.8.5C: frontend usa GsiApi para estoque, impacto zero no frontend. '
  'Substitui estoque_itens_select_linked (is_linked_user()).';

-- =========================================================================
-- 17. estoque_movimentacoes
--     Antes: estoque_movimentacoes_select_linked (is_linked_user())
--     Depois: estoque_movimentacoes_select_farmacia
-- =========================================================================

drop policy if exists estoque_movimentacoes_select_linked   on public.estoque_movimentacoes;
drop policy if exists estoque_movimentacoes_select_farmacia on public.estoque_movimentacoes;

create policy estoque_movimentacoes_select_farmacia on public.estoque_movimentacoes
  for select to authenticated
  using (
    public.has_permission('prescricao.dispensar')
    or public.has_permission('estoque.movimentar')
    or public.is_admin()
    or public.is_auditoria()
  );

comment on policy estoque_movimentacoes_select_farmacia on public.estoque_movimentacoes is
  'Fase A RLS (20260722100029): leitura de movimentacoes de estoque restrita a Farmacia. '
  'Substitui estoque_movimentacoes_select_linked (is_linked_user()).';

-- =========================================================================
-- FIM DA MIGRATION 20260722100029
-- Rollback: supabase/rollback/20260722100029_rls_select_phase_a_positive_permissions_rollback.sql
-- Validacao: npx.cmd supabase db reset && npx.cmd vitest run tests/security
-- =========================================================================

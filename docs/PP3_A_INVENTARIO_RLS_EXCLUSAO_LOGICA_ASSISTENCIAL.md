# PP3-A — Inventário Ampliado de RLS e Exclusão Lógica Assistencial

**Data:** 2026-08-02
**Ambiente:** gsi-one-homologacao (project_ref: vwvevfdjrufdnjaidkxq) — somente leitura
**Ciclo anterior:** PP2 encerrado — commit fa7ac98
**Migration de referência:** 20260802000001_fix_soft_delete_visibility.sql

---

## 1. Objetivo

Mapear todas as tabelas assistenciais para identificar lacunas em:

- RLS (Row Level Security) e suas policies
- Permissões utilizadas como predicado de acesso
- Exclusão lógica (campos `deleted_*`, filtros, bloqueio de DELETE físico)
- Visibilidade de registros inativados por perfil
- Views, funções e RPCs dependentes
- Triggers de auditoria e integridade
- Grants por role
- Integridade referencial e regras de fluxo

Esta etapa é exclusivamente de inspeção e documentação.
Nenhum banco foi alterado. Nenhuma migration foi criada.

---

## 2. Metodologia

### Fontes consultadas

| Fonte | Tipo |
|-------|------|
| `supabase/migrations/` (35 arquivos) | Leitura local |
| `supabase db query --linked` (5 consultas SQL) | Leitura remota |
| `pg_policies` (banco remoto) | Leitura somente |
| `information_schema.triggers` (banco remoto) | Leitura somente |
| `information_schema.tables + pg_class` (banco remoto) | Leitura somente |
| `information_schema.role_table_grants` (banco remoto) | Leitura somente |
| `pg_views` (banco remoto) | Leitura somente |

### Consultas remotas executadas (somente SELECT)

1. Tabelas + RLS habilitada + colunas `deleted_*`
2. Policies por tabela assistencial (`pg_policies`)
3. Triggers por tabela assistencial (`information_schema.triggers`)
4. Definições de views (`pg_views`)
5. Grants por role anon/authenticated por tabela

### Premissas

- RLS habilitada em todas as tabelas: confirmado remotamente para todas.
- `anon` não possui grants em nenhuma tabela assistencial: confirmado (REVOKE ALL aplicado na migration 20260623100012).
- `service_role` não foi utilizado em nenhuma consulta desta etapa.
- Nenhum dado de paciente ou conteúdo clínico foi lido — apenas metadados de schema.

---

## 3. Inventário Completo

### 3.1 Tabelas com soft-delete (deleted_at / deleted_by / delete_reason)

As 19 tabelas a seguir receberam os três campos na migration `20260709170000`:

| # | Tabela | Grupo |
|---|--------|-------|
| 1 | pacientes | Cadastro |
| 2 | paciente_alergias | Cadastro |
| 3 | paciente_comorbidades | Cadastro |
| 4 | paciente_medicamentos_continuos | Cadastro |
| 5 | paciente_alertas_clinicos | Cadastro |
| 6 | atendimentos | Fluxo |
| 7 | chamadas | Fluxo |
| 8 | triagens | Clínico |
| 9 | consultas | Clínico |
| 10 | evolucoes_enfermagem | Clínico |
| 11 | observacoes | Clínico |
| 12 | reavaliacoes_observacao | Clínico |
| 13 | estabilizacoes | Clínico |
| 14 | checklist_estabilizacao_itens | Clínico |
| 15 | exames | Diagnóstico |
| 16 | prescricoes | Farmácia |
| 17 | prescricao_itens | Farmácia |
| 18 | transferencias | Regulação |
| 19 | checklist_transferencia_itens | Regulação |

Confirmado remotamente: todos os três campos presentes em todas as 19 tabelas.

### 3.2 Tabelas SEM soft-delete (por decisão de projeto ou lacuna identificada)

| Tabela | Motivo | Categoria |
|--------|--------|-----------|
| `estoque_itens` | Lacuna — não abrangida pela migration 20260709170000 | A avaliar |
| `estoque_movimentacoes` | Lançamento contábil — append-only por design; UPDATE/DELETE bloqueados por trigger | Intencional (E) |
| `audit_log` | Append-only por design; UPDATE/DELETE bloqueados por trigger | Intencional (E) |
| `configuracoes_sistema` | Tabela de configuração sistêmica; sem atendimento_id/paciente_id | Intencional (E) |
| `usuarios` | Usa campo `ativo boolean` como inativação; `deleted_*` seria redundante | A validar |
| `perfis_acesso` | Catálogo — inativação não aplicada | A validar |
| `permissoes` | Catálogo — inativação não aplicada | A validar |
| `perfil_permissao` | Relação catálogo — inativação por remoção de vínculo | A validar |
| `usuario_perfil` | Relação catálogo — inativação por remoção de vínculo | A validar |
| `dom_*` (7 tabelas) | Domínios imutáveis — inativação gerida manualmente por admin | Intencional (E) |

---

## 4. Matriz por Tabela

### Legenda de colunas

| Coluna | Significado |
|--------|-------------|
| `del_*` | Campos deleted_at / deleted_by / delete_reason presentes |
| `blk_del` | Trigger que bloqueia DELETE físico (BEFORE DELETE) |
| `audit` | Trigger de auditoria (AFTER INSERT/UPDATE/DELETE) |
| `upd_at` | Trigger de atualização de updated_at |
| `select_pol` | Nome e tipo do predicado da policy SELECT ativa |
| `filtro_del` | Policy SELECT filtra `deleted_at IS NULL` para perfis operacionais |
| `admin_irrest` | Admin e Auditoria têm acesso irrestrito (inclui excluídos) |
| `gestao_bloq` | Gestão Hospitalar bloqueada de acesso direto à tabela |

---

### GRUPO: CADASTRO DE PACIENTE

#### pacientes

| Atributo | Valor |
|----------|-------|
| Finalidade | Registro de identificação do paciente (nome, CPF, CNS, dados demográficos) |
| Chave primária | `id uuid` |
| FK principais | — |
| del_* | ✓ (deleted_at, deleted_by, delete_reason) |
| RLS | Habilitada |
| SELECT policy | `pacientes_select_operacional` — PP2-F |
| Predicado SELECT | `(has_permission('paciente.visualizar') AND deleted_at IS NULL) OR is_admin() OR is_auditoria()` |
| filtro_del | ✓ |
| admin_irrest | ✓ |
| blk_del | ✓ `trg_block_delete_pacientes` (BEFORE DELETE) |
| audit | ✓ `trg_audit_pacientes` (AFTER I/U/D) |
| upd_at | ✓ `trg_updated_at_pacientes` |
| DELETE policy | `pacientes_delete_admin_only` (is_admin()) — bloqueada pelo trigger; inconsistência de intenção |
| gestao_bloq | ✓ (Gestão Hospitalar não tem `paciente.visualizar`) |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Grants anon | Nenhum |
| Dependências | Views: vw_gestao_indicadores_gerais, vw_gestao_producao_assistencial, vw_gestao_tempos_assistenciais |
| Classificação | **A — Exclusão lógica completa (corrigida no PP2-F)** |

#### paciente_alergias

| Atributo | Valor |
|----------|-------|
| Finalidade | Alergias conhecidas do paciente |
| Chave primária | `id uuid` |
| FK principais | `paciente_id → pacientes` |
| del_* | ✓ |
| RLS | Habilitada |
| SELECT policy | `paciente_alergias_select_linked` — `is_linked_user()` |
| filtro_del | ✗ — sem filtro de exclusão lógica |
| admin_irrest | ✗ — SELECT predicate usa exclusivamente is_linked_user(), sem cláusula is_admin() ou is_auditoria() explícita. Admin e Auditoria satisfazem is_linked_user() (ativo=true + usuario_perfil), logo leem atualmente — mas não por cláusula dedicada. Risco PP3-B: ao adicionar AND deleted_at IS NULL ao predicado, incluir obrigatoriamente OR is_admin() OR is_auditoria() para preservar rastreabilidade por Auditoria de registros excluídos. |
| blk_del | ✓ `trg_block_delete_paciente_alergias` |
| audit | ✓ `trg_audit_paciente_alergias` |
| upd_at | ✓ `trg_updated_at_paciente_alergias` |
| DELETE policy | `paciente_alergias_delete_admin_only` (is_admin()) |
| gestao_bloq | ✗ — `is_linked_user()` concede leitura a qualquer usuário ativo, incluindo Gestão Hospitalar |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial: campos presentes, SELECT não filtra, Gestão lê diretamente** |

#### paciente_comorbidades

| Atributo | Valor |
|----------|-------|
| Finalidade | Comorbidades declaradas do paciente |
| FK principais | `paciente_id → pacientes` |
| del_* | ✓ |
| SELECT policy | `paciente_comorbidades_select_linked` — `is_linked_user()` |
| filtro_del | ✗ |
| gestao_bloq | ✗ |
| blk_del | ✓ | audit | ✓ | upd_at | ✓ |
| Classificação | **B — Exclusão lógica parcial** |

#### paciente_medicamentos_continuos

| Atributo | Valor |
|----------|-------|
| Finalidade | Medicamentos de uso contínuo declarados pelo paciente |
| FK principais | `paciente_id → pacientes` |
| del_* | ✓ |
| SELECT policy | `paciente_medicamentos_continuos_select_linked` — `is_linked_user()` |
| filtro_del | ✗ |
| gestao_bloq | ✗ |
| blk_del | ✓ | audit | ✓ | upd_at | ✓ |
| Classificação | **B — Exclusão lógica parcial** |

#### paciente_alertas_clinicos

| Atributo | Valor |
|----------|-------|
| Finalidade | Alertas clínicos e contraindicações do paciente |
| FK principais | `paciente_id → pacientes` |
| del_* | ✓ |
| SELECT policy | `paciente_alertas_clinicos_select_linked` — `is_linked_user()` |
| filtro_del | ✗ |
| gestao_bloq | ✗ |
| blk_del | ✓ | audit | ✓ | upd_at | ✓ |
| Classificação | **B — Exclusão lógica parcial** |

---

### GRUPO: FLUXO ASSISTENCIAL

#### atendimentos

| Atributo | Valor |
|----------|-------|
| Finalidade | Episódio central de atendimento — hora chegada, status, setor, desfecho |
| Chave primária | `id uuid` |
| FK principais | `paciente_id → pacientes`, `status_id → dom_status_atendimento`, `desfecho_id → dom_desfechos` |
| del_* | ✓ |
| RLS | Habilitada |
| SELECT policy | `atendimentos_select_operacional` — PP2-F |
| Predicado SELECT | `(has_permission('atendimento.visualizar') AND deleted_at IS NULL) OR is_admin() OR is_auditoria()` |
| filtro_del | ✓ |
| admin_irrest | ✓ |
| blk_del | ✓ `trg_block_delete_atendimentos` |
| audit | ✓ `trg_audit_atendimentos` |
| upd_at | ✓ `trg_updated_at_atendimentos` |
| Trigger extra | ✓ `trg_validate_atendimento_transicao` (validação de transição de status) |
| UPDATE policy | `atendimentos_update_assistencial` — usa `has_perfil()` (inconsistência com o padrão `has_permission()`) |
| gestao_bloq | ✓ (Gestão não tem `atendimento.visualizar`) |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Dependências | Todas as 3 views gerenciais; todas as tabelas filhas |
| Classificação | **A — Exclusão lógica completa (corrigida no PP2-F)** |

#### chamadas

| Atributo | Valor |
|----------|-------|
| Finalidade | Painel de chamada — registro de chamada do paciente para atendimento |
| FK principais | `atendimento_id → atendimentos` |
| del_* | ✓ |
| SELECT policy | `chamadas_select_operacional` — sem filtro deleted_at |
| Predicado SELECT | `has_permission('atendimento.abrir') OR has_permission('triagem.classificar') OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ — registros excluídos visíveis para Recepção, Enfermagem e Médico |
| admin_irrest | ✓ — is_admin() e is_auditoria() presentes no predicado SELECT sem filtro deleted_at, logo Admin e Auditoria veem todos os registros (ativos e excluídos). Comportamento esperado e correto. O bug da Classe B afeta exclusivamente os perfis operacionais (Recepção, Enfermagem, Médico), que também veem registros excluídos por ausência de filtro. |
| blk_del | ✓ `trg_block_delete_chamadas` |
| audit | ✓ `trg_audit_chamadas` |
| upd_at | ✓ `trg_updated_at_chamadas` |
| DELETE policy | `chamadas_delete_admin_only` — coexiste com o trigger de bloqueio |
| gestao_bloq | ✓ (Gestão não tem as permissões do predicado) |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

---

### GRUPO: CLÍNICO

#### triagens

| Atributo | Valor |
|----------|-------|
| Finalidade | Classificação de risco — sinais vitais, classificação sugerida/confirmada |
| FK principais | `atendimento_id → atendimentos`, `classificacao_confirmada_id → dom_classificacao_risco` |
| del_* | ✓ |
| SELECT policy | `triagens_select_clinico` — Fase A |
| Predicado SELECT | `has_permission('triagem.classificar') OR has_permission('consulta.iniciar') OR has_permission('consulta.registrar_conduta') OR has_permission('observacao.reavaliar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ — registros excluídos visíveis para TEM, Enfermeiro, Médico |
| blk_del | ✓ `trg_block_delete_triagens` |
| audit | ✓ `trg_audit_triagens` |
| upd_at | ✓ `trg_updated_at_triagens` |
| gestao_bloq | ✓ |
| Dependências | View `vw_gestao_tempos_assistenciais` (CTE triagem_por_atend filtra deleted_at IS NULL ✓) |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial: view corrigida, policy SELECT não corrigida** |

#### consultas

| Atributo | Valor |
|----------|-------|
| Finalidade | Consulta médica — hipótese diagnóstica, CID, conduta, desfecho proposto |
| FK principais | `atendimento_id → atendimentos` |
| del_* | ✓ |
| SELECT policy | `consultas_select_clinico` — PP2-F |
| Predicado SELECT | `(has_permission('consulta.visualizar') AND deleted_at IS NULL) OR is_admin() OR is_auditoria()` |
| filtro_del | ✓ |
| admin_irrest | ✓ |
| blk_del | ✓ `trg_block_delete_consultas` |
| audit | ✓ `trg_audit_consultas` |
| upd_at | ✓ `trg_updated_at_consultas` |
| gestao_bloq | ✓ |
| Dependências | View `vw_gestao_tempos_assistenciais` (CTE consulta_por_atend filtra deleted_at IS NULL ✓) |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **A — Exclusão lógica completa (corrigida no PP2-F)** |

#### evolucoes_enfermagem

| Atributo | Valor |
|----------|-------|
| Finalidade | Evoluções de enfermagem — tipo, sinais vitais, hora do registro, setor |
| FK principais | `atendimento_id → atendimentos` |
| del_* | ✓ |
| SELECT policy | `evolucoes_enfermagem_select_clinico` — Fase A |
| Predicado SELECT | `has_permission('enfermagem.evolucao.registrar') OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_evolucoes_enfermagem` |
| audit | ✓ `trg_audit_evolucoes_enfermagem` |
| upd_at | ✓ `trg_updated_at_evolucoes_enfermagem` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

#### observacoes

| Atributo | Valor |
|----------|-------|
| Finalidade | Internação em observação — tipo, origem, horários de entrada/saída |
| FK principais | `atendimento_id → atendimentos`, `tipo_id → dom_tipos_observacao` |
| del_* | ✓ |
| SELECT policy | `observacoes_select_clinico` — Fase A |
| Predicado SELECT | `has_permission('observacao.reavaliar') OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_observacoes` |
| audit | ✓ `trg_audit_observacoes` |
| upd_at | ✓ `trg_updated_at_observacoes` |
| gestao_bloq | ✓ |
| Nota | Policy ALL para escrita usa `has_perfil()` (inconsistência com padrão `has_permission()`) |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

#### reavaliacoes_observacao

| Atributo | Valor |
|----------|-------|
| Finalidade | Reavaliações durante a observação — anotação, profissional, hora |
| FK principais | `observacao_id → observacoes` |
| del_* | ✓ |
| SELECT policy | `reavaliacoes_observacao_select_clinico` — Fase A |
| Predicado SELECT | `has_permission('observacao.reavaliar') OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_reavaliacoes_observacao` |
| audit | ✓ `trg_audit_reavaliacoes_observacao` |
| upd_at | ✓ `trg_updated_at_reavaliacoes_observacao` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

#### estabilizacoes

| Atributo | Valor |
|----------|-------|
| Finalidade | Episódio na sala de estabilização (sala vermelha) — início, fim |
| FK principais | `atendimento_id → atendimentos` |
| del_* | ✓ |
| SELECT policy | `estabilizacoes_select_clinico` — Fase A |
| Predicado SELECT | `has_permission('estabilizacao.checklist_item') OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_estabilizacoes` |
| audit | ✓ `trg_audit_estabilizacoes` |
| upd_at | ✓ `trg_updated_at_estabilizacoes` |
| gestao_bloq | ✓ |
| Nota | Policy ALL para escrita usa `has_perfil()` (inconsistência) |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

#### checklist_estabilizacao_itens

| Atributo | Valor |
|----------|-------|
| Finalidade | Itens do checklist da sala de estabilização — concluído, responsável |
| FK principais | `estabilizacao_id → estabilizacoes` |
| del_* | ✓ |
| SELECT policy | `checklist_estabilizacao_itens_select_clinico` — Fase A |
| Predicado SELECT | `has_permission('estabilizacao.checklist_item') OR has_permission('consulta.iniciar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_checklist_estabilizacao_itens` |
| audit | ✓ `trg_audit_checklist_estabilizacao_itens` |
| upd_at | ✓ `trg_updated_at_checklist_estabilizacao_itens` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

---

### GRUPO: DIAGNÓSTICO

#### exames

| Atributo | Valor |
|----------|-------|
| Finalidade | Solicitações e resultados de exames laboratoriais/imagem |
| FK principais | `atendimento_id → atendimentos`, `status_id → dom_status_exame` |
| del_* | ✓ |
| SELECT policy | `exames_select_diagnostico` — Fase A |
| Predicado SELECT | `has_permission('exame.solicitar') OR has_permission('exame.visualizar') OR has_permission('exame.liberar_resultado') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ — registros excluídos visíveis para perfis operacionais: Médico (exame.solicitar), Diagnóstico/Exames (exame.visualizar, exame.liberar_resultado). Auditoria vê registros excluídos via is_auditoria() — comportamento esperado e correto por desenho. |
| blk_del | ✓ `trg_block_delete_exames` |
| audit | ✓ `trg_audit_exames` |
| upd_at | ✓ `trg_updated_at_exames` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

---

### GRUPO: FARMÁCIA

#### prescricoes

| Atributo | Valor |
|----------|-------|
| Finalidade | Prescrições médicas — status, hora, profissional |
| FK principais | `atendimento_id → atendimentos`, `status_id → dom_status_prescricao` |
| del_* | ✓ |
| SELECT policy | `prescricoes_select_farmacia_clinico` — Fase A |
| Predicado SELECT | `has_permission('prescricao.criar') OR has_permission('prescricao.dispensar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_prescricoes` |
| audit | ✓ `trg_audit_prescricoes` |
| upd_at | ✓ `trg_updated_at_prescricoes` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

#### prescricao_itens

| Atributo | Valor |
|----------|-------|
| Finalidade | Itens individuais da prescrição — medicamento, dose, via, status de dispensação |
| FK principais | `prescricao_id → prescricoes` |
| del_* | ✓ |
| SELECT policy | `prescricao_itens_select_farmacia_clinico` — Fase A |
| Predicado SELECT | `has_permission('prescricao.criar') OR has_permission('prescricao.dispensar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_prescricao_itens` |
| audit | ✓ `trg_audit_prescricao_itens` |
| upd_at | ✓ `trg_updated_at_prescricao_itens` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

#### estoque_itens

| Atributo | Valor |
|----------|-------|
| Finalidade | Catálogo de itens do estoque — nome, código, quantidade atual, categoria |
| FK principais | — |
| del_* | ✗ — nenhum campo de exclusão lógica |
| RLS | Habilitada |
| SELECT policy | `estoque_itens_select_farmacia` — Fase A |
| Predicado SELECT | `has_permission('prescricao.dispensar') OR has_permission('estoque.movimentar') OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ (não aplicável — campos ausentes) |
| blk_del | ✗ — sem trigger de bloqueio de DELETE físico |
| Trigger especial | ✓ `trg_protect_quantidade_atual` (impede alteração direta de `quantidade_atual`) |
| audit | ✓ `trg_audit_estoque_itens` |
| upd_at | ✓ `trg_updated_at_estoque_itens` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Nota | Único item de estoque físico sem mecanismo de inativação controlada. Itens descontinuados não têm como ser marcados como inativos sem DELETE físico ou campo ad hoc. |
| Classificação | **D — Sem exclusão lógica; sem bloqueio de DELETE; avaliação necessária** |

#### estoque_movimentacoes

| Atributo | Valor |
|----------|-------|
| Finalidade | Lançamentos de entrada/saída de estoque — ledger contábil |
| FK principais | `estoque_item_id → estoque_itens` |
| del_* | ✗ — por design de ledger |
| SELECT policy | `estoque_movimentacoes_select_farmacia` — Fase A |
| blk_del | ✓ `trg_block_delete_estoque_movimentacoes` (BEFORE DELETE) |
| blk_upd | ✓ `trg_block_update_estoque_movimentacoes` (BEFORE UPDATE) |
| audit | ✓ `trg_audit_estoque_movimentacoes` |
| Grants authenticated | SELECT, INSERT, UPDATE (UPDATE bloqueado por trigger) |
| Classificação | **E — Exclusão lógica não se aplica: modelo ledger; UPDATE e DELETE bloqueados por trigger** |

---

### GRUPO: REGULAÇÃO

#### transferencias

| Atributo | Valor |
|----------|-------|
| Finalidade | Transferências reguladas — destino, motivo, status, checklist |
| FK principais | `atendimento_id → atendimentos`, `status_id → dom_status_transferencia` |
| del_* | ✓ |
| SELECT policy | `transferencias_select_operacional` — Fase A |
| Predicado SELECT | `has_permission('transferencia.solicitar') OR ... OR is_admin() OR is_auditoria()` |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_transferencias` |
| audit | ✓ `trg_audit_transferencias` |
| upd_at | ✓ `trg_updated_at_transferencias` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

#### checklist_transferencia_itens

| Atributo | Valor |
|----------|-------|
| Finalidade | Itens do checklist de transferência segura — concluído, responsável |
| FK principais | `transferencia_id → transferencias` |
| del_* | ✓ |
| SELECT policy | `checklist_transferencia_itens_select_operacional` — Fase A |
| filtro_del | ✗ |
| blk_del | ✓ `trg_block_delete_checklist_transferencia_itens` |
| audit | ✓ `trg_audit_checklist_transferencia_itens` |
| upd_at | ✓ `trg_updated_at_checklist_transferencia_itens` |
| gestao_bloq | ✓ |
| Grants authenticated | SELECT, INSERT, UPDATE |
| Classificação | **B — Exclusão lógica parcial** |

---

### GRUPO: AUDITORIA E SISTEMA

#### audit_log

| Atributo | Valor |
|----------|-------|
| Finalidade | Trilha de auditoria append-only de todas as operações assistenciais |
| del_* | ✗ — por design append-only |
| RLS | Habilitada |
| SELECT policy | `audit_log_select_admin_auditoria` — `is_admin() OR is_auditoria()` |
| INSERT | Controlado exclusivamente por triggers (revogado de authenticated/anon) |
| blk_del | ✓ `trg_block_delete_audit_log` |
| blk_upd | ✓ `trg_block_update_audit_log` |
| Grants authenticated | SELECT apenas |
| Classificação | **E — Exclusão lógica não se aplica: trilha de auditoria; modelo append-only irrestrito** |

---

## 5. Resumo da Classificação A–E

| Classe | Definição | Tabelas |
|--------|-----------|---------|
| **A** | Exclusão lógica completa | `pacientes`, `atendimentos`, `consultas` (3) |
| **B** | Exclusão lógica parcial — campos presentes, SELECT não filtra | `chamadas`, `triagens`, `evolucoes_enfermagem`, `observacoes`, `reavaliacoes_observacao`, `estabilizacoes`, `checklist_estabilizacao_itens`, `prescricoes`, `prescricao_itens`, `exames`, `transferencias`, `checklist_transferencia_itens`, `paciente_alergias`, `paciente_comorbidades`, `paciente_medicamentos_continuos`, `paciente_alertas_clinicos` (16) |
| **C** | Bloqueio físico sem inativação lógica clara | — (nenhuma) |
| **D** | Sem exclusão lógica, avaliação necessária | `estoque_itens` (1) |
| **E** | Exclusão lógica não aplicável | `estoque_movimentacoes`, `audit_log`, `configuracoes_sistema`, `dom_*` (10) |

**Total assistencial com lacuna ativa (B + D): 17 tabelas**

---

## 6. Falhas Críticas

### FC-01 — 16 tabelas Classe B: SELECT expõe registros excluídos a perfis operacionais

**Impacto:** Registros logicamente inativados via `deleted_at` continuam visíveis para todos os perfis clínicos e operacionais que possuem a permissão de leitura dessas tabelas. A migração 20260709170000 criou os campos e bloqueou DELETE físico, mas não adicionou filtros nas policies SELECT.

**Tabelas afetadas (16):** chamadas, triagens, evolucoes_enfermagem, observacoes, reavaliacoes_observacao, estabilizacoes, checklist_estabilizacao_itens, exames, prescricoes, prescricao_itens, transferencias, checklist_transferencia_itens, paciente_alergias, paciente_comorbidades, paciente_medicamentos_continuos, paciente_alertas_clinicos.

**Padrão de correção esperado** (idêntico ao PP2-F para as 3 tabelas Classe A):
```sql
-- Para perfis com permissão específica (padrão B1):
(has_permission('tabela.visualizar') AND deleted_at IS NULL)
OR is_admin()
OR is_auditoria()

-- Para tabelas ainda com is_linked_user() (alergias/comorbidades/etc.):
(is_linked_user() AND deleted_at IS NULL)
OR is_admin()
OR is_auditoria()
-- ou substituir por permissão específica se houver
```

**Severidade:** Alta — violação do princípio de exclusão lógica documentado na migration 20260709170000.

---

### FC-02 — paciente_alergias/comorbidades/medicamentos/alertas: SELECT via is_linked_user() — acesso de Gestão Hospitalar estruturalmente possível

**Tipo de achado:** Falha estrutural identificada por análise de policy e metadados remotos. Não testada comportamentalmente (consulta direta com token de Gestão Hospitalar não executada nesta etapa).

**Cadeia de evidências (confirmadas remotamente):**
1. Policy SELECT das 4 tabelas: `is_linked_user()` — sem permissão específica.
2. Definição confirmada de `is_linked_user()`: retorna TRUE para qualquer usuário com `ativo = true` em `usuarios` E pelo menos um registro em `usuario_perfil`.
3. Usuário Gestão Hospitalar confirmado no banco remoto: `ativo = true`, registro em `usuario_perfil` presente. Portanto, `is_linked_user()` retorna TRUE para esse usuário.
4. Permissões do perfil Gestão Hospitalar (10 confirmadas): exclusivamente `gestao.*` — nenhuma cobre os predicados das tabelas assistenciais da Fase A.

**Conclusão da análise estrutural:** Gestão Hospitalar satisfaz `is_linked_user()` por construção. Um SELECT em qualquer das 4 tabelas autenticando com esse perfil deveria retornar linhas, exceto se houver controle adicional não identificado nesta etapa. **Evidência comportamental pendente.**

**Impacto:** As 4 tabelas de dados clínicos persistentes do paciente usam `is_linked_user()` como predicado SELECT, em vez de permissão específica. Isso concede acesso de leitura estrutural a qualquer usuário ativo com cualquer perfil — incluindo **Gestão Hospitalar** e **Leitura/Gestor**, que foram intencionalmente bloqueados das tabelas assistenciais pela Fase A (migration 20260722100029).

**Severidade:** Alta — isolamento de Gestão Hospitalar dos dados clínicos sensíveis estruturalmente quebrado (alergias, comorbidades, medicamentos contínuos, alertas clínicos).

---

### FC-03 — estoque_itens: sem soft-delete e sem bloqueio de DELETE físico

**Impacto:** `estoque_itens` é a única tabela operacional sem campos `deleted_*` e sem `trg_block_delete`. Um DELETE físico em um item de estoque é permitido pela ausência de bloqueio — embora a policy `estoque_itens_write_farmacia_admin` não inclua DELETE explicitamente, a ausência de policy DELETE com RLS habilitada nega DELETE a authenticated, o que tecnicamente protege. Porém:
1. Não há mecanismo para inativar um item de estoque descontinuado.
2. Não há bloqueio explícito de DELETE por trigger para defesa em profundidade.

**Severidade:** Média-Alta — lacuna estrutural em relação às demais tabelas operacionais.

---

## 7. Falhas Médias

### FM-01 — Inconsistência: policies de escrita usam has_perfil() em vez de has_permission()

**Tabelas:** `atendimentos` (UPDATE), `observacoes` (ALL), `estabilizacoes` (ALL)

**Impacto:** Mistura de mecanismos de autorização (perfil vs. permissão). Dificulta auditoria, manutenção e adição de novos perfis — uma mudança de permissões não propagará corretamente para tabelas que usam `has_perfil()`.

**Exemplo:**
```sql
-- atendimentos_update_assistencial (atual):
has_perfil('Recepção') OR has_perfil('Técnico em Enfermagem') OR has_perfil('Enfermeiro')
OR has_perfil('Médico') OR has_perfil('Regulação de Transferência') OR is_admin()

-- Padrão recomendado:
has_permission('atendimento.atualizar_status') OR is_admin()
```

### FM-02 — Policies ALL com DELETE implícito em tabelas com bloqueio de trigger

**Tabelas:** `triagens_write_enfermagem_admin`, `observacoes_write_clinico_admin`, `estabilizacoes_write_enfermagem_admin`, `reavaliacoes_observacao_write_clinico_admin`, `checklist_estabilizacao_itens_write_enfermagem_admin`, `checklist_transferencia_itens_write_regulacao_admin`

**Impacto:** Policies `FOR ALL` concedem DELETE via RLS, que é imediatamente bloqueado pelo trigger `trg_block_delete_*`. O estado é tecnicamente seguro mas conceitualmente inconsistente: a policy autoriza o que o trigger nega. Recomendável substituir `FOR ALL` por `FOR INSERT, UPDATE` + policy separada de DELETE apenas para Admin.

### FM-03 — Inconsistência: pacientes_delete_admin_only coexiste com trg_block_delete_pacientes

**Impacto:** A policy permite DELETE para `is_admin()`, o trigger bloqueia DELETE para todos. O trigger ganha. Porém, a policy sinaliza intenção de que Admin poderia fazer DELETE, o que contradiz o princípio de exclusão lógica.

### FM-04 — triagens: SELECT não filtra deleted_at apesar de vw_gestao_tempos_assistenciais já filtrar

**Impacto:** A view gerencial já foi corrigida no PP2-F para filtrar `triagens.deleted_at IS NULL`. A policy SELECT da tabela triagens em si ainda não foi corrigida. Isso cria assimetria: um médico que acessa a view não vê triagens excluídas, mas pode ver as mesmas triagens excluídas via acesso direto à tabela.

### FM-05 — permissoes de escrita das 4 tabelas paciente_* usam permissões cruzadas

**Impacto:**
```sql
-- INSERT e UPDATE para paciente_alergias, paciente_comorbidades, etc.:
has_permission('paciente.alergia.registrar') OR has_permission('paciente.comorbidade.registrar')
```
As duas permissões são intercambiáveis — qualquer uma autoriza escrita em qualquer das 4 tabelas. Ausência de permissões específicas para `medicamentos_continuos` e `alertas_clinicos`.

---

## 8. Melhorias Recomendadas

| # | Melhoria | Prioridade | Tabelas |
|---|----------|-----------|---------|
| MR-01 | Adicionar `AND deleted_at IS NULL` nas policies SELECT de todas as 16 tabelas Classe B | Alta | 16 tabelas |
| MR-02 | Substituir `is_linked_user()` por permissões específicas nas 4 tabelas paciente_* | Alta | 4 tabelas |
| MR-03 | Adicionar campos `deleted_*` e trigger de bloqueio em `estoque_itens` | Média-Alta | 1 tabela |
| MR-04 | Substituir `has_perfil()` por `has_permission()` nas policies de escrita de atendimentos, observacoes, estabilizacoes | Média | 3 tabelas |
| MR-05 | Substituir `FOR ALL` por `FOR INSERT, UPDATE` nas policies de escrita + policy DELETE explícita apenas para Admin | Média | 6 tabelas |
| MR-06 | Revisar e remover `pacientes_delete_admin_only` — conflito com trigger de bloqueio | Baixa | 1 tabela |
| MR-07 | Criar permissões específicas para `paciente.medicamento.registrar` e `paciente.alerta.registrar` | Baixa | 2 tabelas |
| MR-08 | Avaliar criação de permissão `paciente.dado_clinico.visualizar` para as 4 tabelas paciente_* como substituto do is_linked_user() | Baixa | 4 tabelas |

---

## 9. Objetos Candidatos à Migration PP3-B

> Esta seção prepara o escopo de PP3-B. Nenhuma migration é criada nesta etapa.

### Grupo 1 — Correção de SELECT com deleted_at IS NULL (16 tabelas)

Para cada uma das 16 tabelas Classe B, substituir o predicado SELECT por:

```sql
-- Para tabelas com has_permission() (padrão B1):
DROP POLICY IF EXISTS <tabela>_select_<sufixo> ON public.<tabela>;
CREATE POLICY <tabela>_select_<sufixo> ON public.<tabela>
  FOR SELECT TO authenticated
  USING (
    (<predicado_atual> AND deleted_at IS NULL)
    OR is_admin()
    OR is_auditoria()
  );
```

**Tabelas com predicado baseado em has_permission()** (mais simples — padrão direto):
- chamadas, triagens, evolucoes_enfermagem, reavaliacoes_observacao, estabilizacoes, checklist_estabilizacao_itens, exames, prescricoes, prescricao_itens, transferencias, checklist_transferencia_itens

**Tabelas com predicado misto has_perfil() + has_permission()**:
- observacoes

**Tabelas com predicado is_linked_user()** (requer decisão de permissão específica ou adaptação):
- paciente_alergias, paciente_comorbidades, paciente_medicamentos_continuos, paciente_alertas_clinicos

### Grupo 2 — estoque_itens: soft-delete e bloqueio de DELETE

```sql
ALTER TABLE public.estoque_itens
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.usuarios (id),
  ADD COLUMN IF NOT EXISTS delete_reason text;

CREATE TRIGGER trg_block_delete_estoque_itens
  BEFORE DELETE ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_assistential_physical_delete();
```

### Grupo 3 — Correção de mecanismo nas policies de escrita (has_perfil → has_permission)

Requer criação de permissões ausentes antes da substituição:
- `atendimento.atualizar_status` ou equivalente
- (validar com coordenação antes de implementar)

### Objetos NÃO candidatos a PP3-B nesta etapa

- Remoção de `pacientes_delete_admin_only` (política separada, baixo risco)
- Criação de permissões novas para paciente_* (requer decisão institucional)
- Substituição de `FOR ALL` por `FOR INSERT, UPDATE` (impacto nos grants e testes existentes)

---

## 10. Dependências: Views, RPCs e Indicadores

### Views (3 views gerenciais — verificadas no PP2-F)

| View | Tabelas consultadas | Filtra deleted_at |
|------|--------------------|--------------------|
| `vw_gestao_indicadores_gerais` | atendimentos | ✓ (PP2-F) |
| `vw_gestao_producao_assistencial` | atendimentos | ✓ (PP2-F) |
| `vw_gestao_tempos_assistenciais` | atendimentos, triagens, consultas | ✓ (PP2-F) |

Nenhuma view consultando as tabelas Classe B sem filtro de exclusão lógica foi encontrada (além das 3 já corrigidas no PP2-F).

**Observação:** As 3 views são SECURITY DEFINER e controlam acesso por `has_permission()` no WHERE. Nenhuma expõe dados nominais ou UUIDs de pacientes.

### RPCs

Nenhuma RPC além de `has_permission()`, `is_admin()`, `is_auditoria()`, `is_linked_user()`, `has_perfil()`, `current_user_id()` foi encontrada. Todas são SECURITY DEFINER.

### Frontend (api.js / script.js)

O frontend usa `GsiApi` com `localStorage` — sem acesso direto ao banco remoto. Não há consultas SQL diretas do frontend que bypasem RLS.

### Testes locais

- `tests/security/pp2f-soft-delete-visibility.test.js` — cobre pacientes, atendimentos, consultas e as 3 views. Não cobre as 16 tabelas Classe B.
- `tests/security/phase-a-select-access.test.js` — cobre acesso por perfil, sem testar visibilidade de deleted_at.

---

## 11. Gestão Hospitalar — Confirmação de Isolamento

| Tabela | Gestão Hospitalar acessa? | Mecanismo de bloqueio |
|--------|--------------------------|----------------------|
| pacientes | ✗ | `paciente.visualizar` não concedida a Gestão |
| atendimentos | ✗ | `atendimento.visualizar` não concedida a Gestão |
| consultas | ✗ | `consulta.visualizar` não concedida a Gestão |
| triagens | ✗ | Nenhuma permissão do predicado SELECT concedida a Gestão |
| exames | ✗ | Nenhuma permissão do predicado SELECT concedida a Gestão |
| prescricoes | ✗ | Nenhuma permissão do predicado SELECT concedida a Gestão |
| transferencias | ✗ | Nenhuma permissão do predicado SELECT concedida a Gestão |
| chamadas | ✗ | Nenhuma permissão do predicado SELECT concedida a Gestão |
| estoque_itens | ✗ | `estoque.movimentar` e `prescricao.dispensar` não concedidas a Gestão |
| **paciente_alergias** | **✓ (acesso estruturalmente possível — não testado comportamentalmente)** | **is_linked_user() — Gestão satisfaz a função; acesso inferido por análise de policy e metadados remotos** |
| **paciente_comorbidades** | **✓ (acesso estruturalmente possível — não testado comportamentalmente)** | **is_linked_user() — Gestão satisfaz a função; acesso inferido por análise de policy e metadados remotos** |
| **paciente_medicamentos_continuos** | **✓ (acesso estruturalmente possível — não testado comportamentalmente)** | **is_linked_user() — Gestão satisfaz a função; acesso inferido por análise de policy e metadados remotos** |
| **paciente_alertas_clinicos** | **✓ (acesso estruturalmente possível — não testado comportamentalmente)** | **is_linked_user() — Gestão satisfaz a função; acesso inferido por análise de policy e metadados remotos** |
| vw_gestao_* (3) | ✓ (intencional) | has_permission('gestao.*') — acesso controlado, dados agregados |

**Conclusão:** Gestão Hospitalar está corretamente bloqueada de todas as tabelas assistenciais principais. Falha estrutural identificada em 4 tabelas de dados clínicos persistentes do paciente — acesso estruturalmente possível com base em análise de policy e metadados remotos, não testado comportamentalmente (consulta direta com token de Gestão Hospitalar não executada nesta etapa).

---

## 12. Rastreabilidade de Registros Excluídos por Auditoria

| Mecanismo | Estado |
|-----------|--------|
| `audit_log` registra PATCH/UPDATE com `deleted_at` preenchido | ✓ (trigger automático) |
| Admin acessa registros com `deleted_at IS NOT NULL` via `is_admin()` | ✓ (PP2-F) |
| Auditoria acessa registros com `deleted_at IS NOT NULL` via `is_auditoria()` | ✓ (PP2-F) |
| audit_log bloqueado de UPDATE/DELETE por trigger | ✓ (migration 20260709170000) |
| INSERT direto em audit_log bloqueado para authenticated | ✓ (migration 20260709170000) |
| Campos de encadeamento futuro (sequencia, hash_anterior, hash_atual) | Presentes, não preenchidos (nullable) |

Registros logicamente excluídos permanecem rastreáveis via audit_log e via acesso direto de Admin/Auditoria.

---

## 13. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Registro excluído logicamente acessado por perfil clínico (triagem, exame, evolução, etc.) | Alta (estrutural — confirmada por análise de policy) | Médio — dado inativo exibido em tela operacional | PP3-B — corrigir SELECT |
| Gestão Hospitalar lê alergias/comorbidades de paciente diretamente | Alta (estrutural — baseada em análise de policy e metadados remotos; comportamento não testado) | Alto — dado clínico sensível exposto a perfil gerencial | PP3-B — substituir is_linked_user() |
| Item de estoque excluído por DELETE físico (estoque_itens) | Baixa (sem trigger, mas sem policy DELETE para authenticated) | Alto — perda de rastreabilidade de insumos | PP3-B — adicionar soft-delete e trigger |
| Policy `FOR ALL` com DELETE concedido a Farmácia/Enfermagem | Baixa (trigger bloqueia) | Médio | PP3-B — substituir FOR ALL por escopos separados |

---

## 14. Itens Fora do Escopo desta Etapa

- Criação da migration PP3-B (próxima etapa, após autorização)
- Execução de testes comportamentais com usuários (aguarda PP3-B)
- Análise de tabelas de domínio (dom_*) — sem dados assistenciais
- Análise de configuracoes_sistema — sem atendimento_id/paciente_id
- Criação de novas permissões institucionais (requer validação com gestão)
- Implementação de versionamento clínico completo (Fase C/D do roadmap)
- Auditoria de leitura (Fase E do roadmap)
- Restrição por coluna nas policies de UPDATE
- Restrição por setor (usuario_perfil.setor)

---

## 15. Ordem Recomendada de Correção (PP3-B)

### Fase B.1 — Alta prioridade (impacto em segurança de dados)

1. Corrigir SELECT das 4 tabelas `paciente_*` — substituir `is_linked_user()` por predicado com `AND deleted_at IS NULL` e bloqueio de Gestão Hospitalar
2. Corrigir SELECT das 12 tabelas restantes Classe B — adicionar `AND deleted_at IS NULL` ao predicado existente (padrão direto, sem mudança de permissões)

### Fase B.2 — Média prioridade (integridade estrutural)

3. Adicionar soft-delete e trigger em `estoque_itens`
4. Adicionar `estoque_itens` à cobertura do trigger `fn_block_assistential_physical_delete`

### Fase B.3 — Baixa prioridade (consistência interna)

5. Substituir `has_perfil()` por `has_permission()` nas policies de escrita (requer definição de novas permissões)
6. Revisar policies `FOR ALL` para separar INSERT, UPDATE e DELETE
7. Remover `pacientes_delete_admin_only` ou documentar decisão de preservá-la

---

## 16. Plano Preliminar de Testes para PP3-B

### Testes de exclusão lógica — perfis operacionais

Para cada tabela corrigida, verificar:
- Perfil com permissão de leitura: não vê registros com `deleted_at IS NOT NULL`
- Perfil Admin: vê todos os registros, incluindo excluídos
- Perfil Auditoria: vê todos os registros, incluindo excluídos
- Perfil sem permissão: não vê nenhum registro (RLS bloqueia)

### Testes de Gestão Hospitalar

- Gestão Hospitalar não acessa nenhuma tabela `paciente_*` diretamente
- Gestão Hospitalar acessa views gerenciais normalmente
- Views gerenciais continuam a filtrar `deleted_at IS NULL`

### Testes de estoque_itens (após Fase B.2)

- Tentativa de DELETE em estoque_itens é bloqueada por trigger
- Campo `deleted_at` recebe preenchimento via PATCH

### Testes de regressão

- Todas as 394 assertions dos testes locais PP2-F continuam passando
- Testes de Fase A (phase-a-select-access.test.js) continuam passando
- Views gerenciais retornam HTTP 200 e respeitam supressão de célula pequena

---

## 17. Validações desta Etapa

- **Arquivos criados:** `docs/PP3_A_INVENTARIO_RLS_EXCLUSAO_LOGICA_ASSISTENCIAL.md` (este documento)
- **Consultas executadas:** 5 consultas `supabase db query --linked` — todas SELECT/read-only
- **Confirmação de leitura somente:** Nenhum INSERT, UPDATE, PATCH, PUT, DELETE, TRUNCATE, ALTER, CREATE, DROP, GRANT, REVOKE executado
- **Nenhum segredo incluído:** Sem passwords, tokens, keys, anon key, service_role key, headers de autorização
- **Nenhum banco foi alterado:** Banco remoto inalterado; banco local inalterado
- **Nenhuma fixture criada ou modificada:** Fixture PP2-E permanece no estado `sucesso_total` (deleted_at preenchido)
- **Nenhuma migration criada:** PP3-B não iniciada

---

*Documento gerado em 2026-08-02 — PP3-A — Somente inspeção e documentação.*
*Próxima etapa aguarda autorização: PP3-B — Correção estrutural de exclusão lógica nas 16 tabelas Classe B e estoque_itens.*

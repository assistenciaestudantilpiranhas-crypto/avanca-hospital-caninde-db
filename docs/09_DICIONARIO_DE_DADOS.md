# 09 - Dicionário de Dados do Banco GSI ONE

**Projeto:** GSI ONE  
**Repositório:** avanca-hospital-caninde-db  
**Classificação:** Documentação técnica vigente  
**Status:** VIGENTE  
**Versão documental:** 1.0  
**Última revisão:** 10/08/2026  
**Responsável documental:** GSI HealthTech  
**Fonte principal:** migrations SQL versionadas no HEAD  
**HEAD de referência:** `1877caa690b187eba2dd4227a7e7bba7eca115a7`

# 1. Objetivo

Consolidar o dicionário técnico de dados do banco GSI ONE no estado oficial do HEAD, documentando tabelas, estruturas físicas, relacionamentos, RLS, functions, triggers, views, soft delete, auditoria e pendências locais não versionadas.

# 2. Escopo

Este documento cobre exclusivamente o banco PostgreSQL/Supabase do repositório `avanca-hospital-caninde-db`: 35 tabelas físicas, 18 functions, 77 triggers inferíveis das migrations, 3 views, 121 foreign keys e 88 policies RLS vigentes no HEAD.

# 3. Metodologia e fontes

A fonte primária são as migrations SQL rastreadas no HEAD. Levantamentos documentais anteriores foram usados como fonte secundária e validados contra SQL quando necessário. Migrations locais não rastreadas aparecem apenas em `Estado local pendente de versionamento`.

# 4. Convenções do dicionário

- `HEAD` significa estado oficialmente versionado em Git.
- `workspace local` significa arquivos existentes localmente, mas não rastreados.
- `ativo = false` não é sinônimo de `deleted_at IS NOT NULL`.
- `policy`, `grant`, `revoke`, `trigger` e `function` são camadas distintas.
- Constraints inline sem nome explícito no SQL não recebem nome inventado neste documento.

# 5. Visão geral do banco

| Item | Total |
| ---- | ----: |
| Tabelas físicas | 35 |
| Functions vigentes | 18 |
| Triggers vigentes inferíveis do SQL | 77 |
| Views vigentes | 3 |
| Foreign keys vigentes | 121 |
| Policies RLS vigentes | 88 |
| Tabelas com RLS habilitada | 35/35 |

Triggers e policies gerados dinamicamente foram expandidos documentalmente a partir das migrations.

# 6. Domínios

## `dom_status_atendimento`

**Schema:** public  
**Domínio:** Domínios  
**Finalidade:** Catalogar valores de domínio do sistema.  
**Migration de origem:** `20260623100001_dominios.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT `public.is_linked_user()`; ALL admin.  
**Auditoria:** sem trigger  
**Ciclo de vida:** ativo; não é soft delete.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| codigo | text | NOT NULL | - | UNIQUE |
| descricao | text | NOT NULL | - | - |
| ordem | int | NOT NULL | 0 | - |
| ativo | boolean | NOT NULL | true | - |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

Nenhum trigger vigente.

### Observações documentais

`ativo = false` não equivale a soft delete sem regra SQL específica.

## `dom_desfechos`

**Schema:** public  
**Domínio:** Domínios  
**Finalidade:** Catalogar valores de domínio do sistema.  
**Migration de origem:** `20260623100001_dominios.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT `public.is_linked_user()`; ALL admin.  
**Auditoria:** sem trigger  
**Ciclo de vida:** ativo; não é soft delete.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| codigo | text | NOT NULL | - | UNIQUE |
| descricao | text | NOT NULL | - | - |
| ordem | int | NOT NULL | 0 | - |
| ativo | boolean | NOT NULL | true | - |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

Nenhum trigger vigente.

### Observações documentais

`ativo = false` não equivale a soft delete sem regra SQL específica.

## `dom_classificacao_risco`

**Schema:** public  
**Domínio:** Domínios  
**Finalidade:** Catalogar valores de domínio do sistema.  
**Migration de origem:** `20260623100001_dominios.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT `public.is_linked_user()`; ALL admin.  
**Auditoria:** sem trigger  
**Ciclo de vida:** ativo; não é soft delete.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| codigo | text | NOT NULL | - | UNIQUE |
| descricao | text | NOT NULL | - | - |
| ordem | int | NOT NULL | 0 | - |
| ativo | boolean | NOT NULL | true | - |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

Nenhum trigger vigente.

### Observações documentais

`ativo = false` não equivale a soft delete sem regra SQL específica.

## `dom_tipos_observacao`

**Schema:** public  
**Domínio:** Domínios  
**Finalidade:** Catalogar valores de domínio do sistema.  
**Migration de origem:** `20260623100001_dominios.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT `public.is_linked_user()`; ALL admin.  
**Auditoria:** sem trigger  
**Ciclo de vida:** ativo; não é soft delete.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| codigo | text | NOT NULL | - | UNIQUE |
| descricao | text | NOT NULL | - | - |
| ordem | int | NOT NULL | 0 | - |
| ativo | boolean | NOT NULL | true | - |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

Nenhum trigger vigente.

### Observações documentais

`ativo = false` não equivale a soft delete sem regra SQL específica.

## `dom_status_transferencia`

**Schema:** public  
**Domínio:** Domínios  
**Finalidade:** Catalogar valores de domínio do sistema.  
**Migration de origem:** `20260623100001_dominios.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT `public.is_linked_user()`; ALL admin.  
**Auditoria:** sem trigger  
**Ciclo de vida:** ativo; não é soft delete.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| codigo | text | NOT NULL | - | UNIQUE |
| descricao | text | NOT NULL | - | - |
| ordem | int | NOT NULL | 0 | - |
| ativo | boolean | NOT NULL | true | - |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

Nenhum trigger vigente.

### Observações documentais

`ativo = false` não equivale a soft delete sem regra SQL específica.

## `dom_status_prescricao`

**Schema:** public  
**Domínio:** Domínios  
**Finalidade:** Catalogar valores de domínio do sistema.  
**Migration de origem:** `20260623100001_dominios.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT `public.is_linked_user()`; ALL admin.  
**Auditoria:** sem trigger  
**Ciclo de vida:** ativo; não é soft delete.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| codigo | text | NOT NULL | - | UNIQUE |
| descricao | text | NOT NULL | - | - |
| ordem | int | NOT NULL | 0 | - |
| ativo | boolean | NOT NULL | true | - |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

Nenhum trigger vigente.

### Observações documentais

`ativo = false` não equivale a soft delete sem regra SQL específica.

## `dom_status_exame`

**Schema:** public  
**Domínio:** Domínios  
**Finalidade:** Catalogar valores de domínio do sistema.  
**Migration de origem:** `20260623100001_dominios.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT `public.is_linked_user()`; ALL admin.  
**Auditoria:** sem trigger  
**Ciclo de vida:** ativo; não é soft delete.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| codigo | text | NOT NULL | - | UNIQUE |
| descricao | text | NOT NULL | - | - |
| ordem | int | NOT NULL | 0 | - |
| ativo | boolean | NOT NULL | true | - |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

Nenhum trigger vigente.

### Observações documentais

`ativo = false` não equivale a soft delete sem regra SQL específica.

# 7. Identidade, autenticação e acesso

Relacionamento físico comprovado: `auth.users -> usuarios -> usuario_perfil -> perfis_acesso -> perfil_permissao -> permissoes`.

## `usuarios`

**Schema:** public  
**Domínio:** Identidade, autenticação e acesso  
**Finalidade:** Vincular usuario técnico de autenticação a identidade operacional.  
**Migration de origem:** `20260623100002_usuarios.sql`  
**Chave primária:** id  
**RLS:** habilitada; ver Anexo E.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** ativo; não é soft delete.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | - | PK, FK |
| nome | text | NOT NULL | - | - |
| categoria_profissional | text | NOT NULL | - | - |
| registro_profissional | text | NULL | - | - |
| email | text | NOT NULL | - | UNIQUE |
| ativo | boolean | NOT NULL | true | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `usuarios.id` -> `auth.users(id)` ON DELETE CASCADE.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at.

### Observações documentais

`ativo = false` não equivale a soft delete sem regra SQL específica.

## `perfis_acesso`

**Schema:** public  
**Domínio:** Identidade, autenticação e acesso  
**Finalidade:** Catalogar perfis de acesso.  
**Migration de origem:** `20260623100004_acesso.sql`  
**Chave primária:** id  
**RLS:** habilitada; ver Anexo E.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** ATIVO/INATIVO  
**Soft delete:** NÃO  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| nome | text | NOT NULL | - | UNIQUE |
| descricao | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at.

### Observações documentais

Sem observação adicional além dos anexos.

## `permissoes`

**Schema:** public  
**Domínio:** Identidade, autenticação e acesso  
**Finalidade:** Catalogar permissões por chave.  
**Migration de origem:** `20260623100004_acesso.sql`  
**Chave primária:** id  
**RLS:** habilitada; ver Anexo E.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** ATIVO/INATIVO  
**Soft delete:** NÃO  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| chave | text | NOT NULL | - | UNIQUE |
| modulo | text | NOT NULL | - | - |
| descricao | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at.

### Observações documentais

Sem observação adicional além dos anexos.

## `perfil_permissao`

**Schema:** public  
**Domínio:** Identidade, autenticação e acesso  
**Finalidade:** Associar perfis a permissões.  
**Migration de origem:** `20260623100004_acesso.sql`  
**Chave primária:** (perfil_id, permissao_id)  
**RLS:** habilitada; ver Anexo E.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** ATIVO/INATIVO  
**Soft delete:** NÃO  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| perfil_id | uuid | NOT NULL | - | FK |
| permissao_id | uuid | NOT NULL | - | FK |
| created_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria.

### Observações documentais

Sem observação adicional além dos anexos.

## `usuario_perfil`

**Schema:** public  
**Domínio:** Identidade, autenticação e acesso  
**Finalidade:** Associar usuarios a perfis.  
**Migration de origem:** `20260623100004_acesso.sql`  
**Chave primária:** (usuario_id, perfil_id)  
**RLS:** habilitada; ver Anexo E.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** ATIVO/INATIVO  
**Soft delete:** NÃO  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| usuario_id | uuid | NOT NULL | - | FK |
| perfil_id | uuid | NOT NULL | - | FK |
| setor | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria.

### Observações documentais

Sem observação adicional além dos anexos.

# 8. Auditoria

## `audit_log`

**Schema:** public  
**Domínio:** Auditoria  
**Finalidade:** Registrar alterações em tabelas auditadas por trigger.  
**Migration de origem:** `20260623100003_audit_log.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT admin/auditoria; escrita direta revogada.  
**Auditoria:** repositório central dos registros de auditoria gerados por `public.fn_audit_trigger()`.  
**Ciclo de vida:** APPEND-ONLY  
**Proteção:** UPDATE e DELETE diretos bloqueados por triggers específicos.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| usuario_id | uuid | NULL | - | FK |
| tabela_afetada | text | NOT NULL | - | - |
| registro_id | uuid | NOT NULL | - | - |
| acao | text | NOT NULL | - | CHECK (`INSERT`, `UPDATE`, `DELETE`) |
| dados_antes | jsonb | NULL | - | - |
| dados_depois | jsonb | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

Proteção contra UPDATE/DELETE direto.

### Observações documentais

`registro_id` e referência lógica, não FK física.

# 9. Pacientes

## `pacientes`

**Schema:** public  
**Domínio:** Pacientes  
**Finalidade:** Cadastro base do paciente.  
**Migration de origem:** `20260623100005_pacientes.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT operacional filtra deleted_at no HEAD; admin/auditoria preservados.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| nome | text | NOT NULL | - | - |
| data_nascimento | date | NOT NULL | - | - |
| cpf | text | NULL | - | - |
| cartao_sus | text | NULL | - | - |
| telefone | text | NULL | - | - |
| municipio | text | NOT NULL | - | - |
| perfil_residencia | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo A de soft delete: SELECT filtra `deleted_at` no HEAD.

# 10. Clínico longitudinal

As quatro tabelas longitudinais possuem RLS habilitada, SELECT `public.is_linked_user()`, classificacao POLICY SELECT GENERICA, não filtram `ativo`, não filtram `deleted_at`, possuem soft delete estrutural e bloqueio de DELETE físico.

## `paciente_alergias`

**Schema:** public  
**Domínio:** Clínico longitudinal  
**Finalidade:** Registrar alergias conhecidas do paciente no histórico clínico longitudinal.  
**Migration de origem:** `20260623100005_pacientes.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT public.is_linked_user(); POLICY SELECT GENERICA.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| paciente_id | uuid | NOT NULL | - | FK |
| descricao | text | NOT NULL | - | - |
| gravidade | text | NULL | - | - |
| origem_registro | text | NULL | - | - |
| registrado_por | uuid | NULL | - | FK |
| registrado_em_ts | timestamptz | NOT NULL | now() | - |
| ativo | boolean | NOT NULL | true | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `paciente_alergias.paciente_id` -> `pacientes(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo C de soft delete: SELECT genérica sem filtro `ativo`/`deleted_at`. `ativo = false` não equivale a soft delete sem regra SQL específica.

## `paciente_comorbidades`

**Schema:** public  
**Domínio:** Clínico longitudinal  
**Finalidade:** Registrar comorbidades do paciente no histórico clínico longitudinal.  
**Migration de origem:** `20260623100005_pacientes.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT public.is_linked_user(); POLICY SELECT GENERICA.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| paciente_id | uuid | NOT NULL | - | FK |
| descricao | text | NOT NULL | - | - |
| observacoes | text | NULL | - | - |
| registrado_por | uuid | NULL | - | FK |
| registrado_em_ts | timestamptz | NOT NULL | now() | - |
| ativo | boolean | NOT NULL | true | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `paciente_comorbidades.paciente_id` -> `pacientes(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo C de soft delete: SELECT genérica sem filtro `ativo`/`deleted_at`. `ativo = false` não equivale a soft delete sem regra SQL específica.

## `paciente_medicamentos_continuos`

**Schema:** public  
**Domínio:** Clínico longitudinal  
**Finalidade:** Registrar medicamentos de uso contínuo informados para o paciente no histórico clínico longitudinal.  
**Migration de origem:** `20260623100005_pacientes.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT public.is_linked_user(); POLICY SELECT GENERICA.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| paciente_id | uuid | NOT NULL | - | FK |
| medicamento | text | NOT NULL | - | - |
| dose | text | NULL | - | - |
| frequencia | text | NULL | - | - |
| registrado_por | uuid | NULL | - | FK |
| registrado_em_ts | timestamptz | NOT NULL | now() | - |
| ativo | boolean | NOT NULL | true | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `paciente_medicamentos_continuos.paciente_id` -> `pacientes(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo C de soft delete: SELECT genérica sem filtro `ativo`/`deleted_at`. `ativo = false` não equivale a soft delete sem regra SQL específica.

## `paciente_alertas_clinicos`

**Schema:** public  
**Domínio:** Clínico longitudinal  
**Finalidade:** Registrar alertas clínicos relevantes vinculados ao paciente no histórico clínico longitudinal.  
**Migration de origem:** `20260623100005_pacientes.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT public.is_linked_user(); POLICY SELECT GENERICA.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| paciente_id | uuid | NOT NULL | - | FK |
| tipo_alerta | text | NOT NULL | - | - |
| descricao | text | NULL | - | - |
| registrado_por | uuid | NULL | - | FK |
| registrado_em_ts | timestamptz | NOT NULL | now() | - |
| ativo | boolean | NOT NULL | true | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `paciente_alertas_clinicos.paciente_id` -> `pacientes(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo C de soft delete: SELECT genérica sem filtro `ativo`/`deleted_at`. `ativo = false` não equivale a soft delete sem regra SQL específica.

# 11. Atendimentos

## `atendimentos`

**Schema:** public  
**Domínio:** Atendimentos  
**Finalidade:** Eixo central do fluxo assistencial.  
**Migration de origem:** `20260623100006_atendimentos.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT operacional filtra deleted_at no HEAD; admin/auditoria preservados.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| paciente_id | uuid | NOT NULL | - | FK |
| status_id | uuid | NOT NULL | - | FK |
| classificacao_risco_id | uuid | NULL | - | FK |
| desfecho_id | uuid | NULL | - | FK |
| profissional_responsavel_id | uuid | NULL | - | FK |
| queixa_principal | text | NOT NULL | - | - |
| etapa_atual | text | NOT NULL | - | - |
| setor_atual | text | NULL | - | - |
| hora_chegada_ts | timestamptz | NOT NULL | - | - |
| hora_desfecho_ts | timestamptz | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `atendimentos.paciente_id` -> `pacientes(id)`.
- `atendimentos.status_id` -> `dom_status_atendimento(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico, validacao de transicao.

### Observações documentais

Grupo A de soft delete: SELECT filtra `deleted_at` no HEAD.

## `chamadas`

**Schema:** public  
**Domínio:** Atendimentos  
**Finalidade:** Registrar chamadas vinculadas ao atendimento.  
**Migration de origem:** `20260623100006_atendimentos.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| tipo_chamada | text | NOT NULL | - | - |
| local_chamada | text | NULL | - | - |
| hora_chamada_ts | timestamptz | NOT NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

# 12. Triagem

## `triagens`

**Schema:** public  
**Domínio:** Triagem  
**Finalidade:** Registrar o processo de triagem do atendimento, incluindo horários, avaliação inicial, sinais vitais e classificações de risco.  
**Migration de origem:** `20260623100007_clinico.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| profissional_id | uuid | NULL | - | FK |
| classificacao_sugerida_id | uuid | NULL | - | FK |
| classificacao_confirmada_id | uuid | NULL | - | FK |
| hora_inicio_ts | timestamptz | NOT NULL | - | - |
| hora_fim_ts | timestamptz | NULL | - | - |
| historia_breve | text | NULL | - | - |
| sinais_vitais | jsonb | NULL | - | - |
| justificativa_classificacao | text | NULL | - | - |
| prioridade | text | NULL | - | - |
| orientacao_inicial | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `triagens.atendimento_id` -> `atendimentos(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

# 13. Consultas

## `consultas`

**Schema:** public  
**Domínio:** Consultas  
**Finalidade:** Registrar a consulta clínica vinculada ao atendimento, incluindo hipótese diagnóstica, CID, conduta, desfecho proposto e observações.  
**Migration de origem:** `20260623100007_clinico.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT operacional filtra deleted_at no HEAD; admin/auditoria preservados.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| profissional_id | uuid | NULL | - | FK |
| consultorio | text | NULL | - | - |
| hora_inicio_ts | timestamptz | NOT NULL | - | - |
| hora_fim_ts | timestamptz | NULL | - | - |
| hipotese_diagnostica | text | NULL | - | - |
| cid | text | NULL | - | - |
| conduta | text | NULL | - | - |
| desfecho_proposto | text | NULL | - | - |
| observacoes | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo A de soft delete: SELECT filtra `deleted_at` no HEAD.

# 14. Enfermagem

## `evolucoes_enfermagem`

**Schema:** public  
**Domínio:** Enfermagem  
**Finalidade:** Registrar evolucoes de enfermagem.  
**Migration de origem:** `20260623100007_clinico.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| profissional_id | uuid | NULL | - | FK |
| setor | text | NULL | - | - |
| tipo_registro | text | NOT NULL | - | - |
| descricao | text | NULL | - | - |
| sinais_vitais | jsonb | NULL | - | - |
| hora_registro_ts | timestamptz | NOT NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

# 15. Observação

## `observacoes`

**Schema:** public  
**Domínio:** Observação  
**Finalidade:** Registrar periodos de observação.  
**Migration de origem:** `20260623100007_clinico.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| tipo_id | uuid | NOT NULL | - | FK |
| origem | text | NULL | - | - |
| inicio_ts | timestamptz | NOT NULL | - | - |
| fim_ts | timestamptz | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

## `reavaliacoes_observacao`

**Schema:** public  
**Domínio:** Observação  
**Finalidade:** Registrar reavaliacoes de observação.  
**Migration de origem:** `20260623100007_clinico.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| observacao_id | uuid | NOT NULL | - | FK |
| profissional_id | uuid | NULL | - | FK |
| hora_ts | timestamptz | NOT NULL | - | - |
| anotacao | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

# 16. Estabilização

## `estabilizacoes`

**Schema:** public  
**Domínio:** Estabilização  
**Finalidade:** Registrar estabilização do atendimento.  
**Migration de origem:** `20260623100007_clinico.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| inicio_ts | timestamptz | NOT NULL | - | - |
| fim_ts | timestamptz | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

## `checklist_estabilizacao_itens`

**Schema:** public  
**Domínio:** Estabilização  
**Finalidade:** Registrar itens de checklist de estabilização.  
**Migration de origem:** `20260623100007_clinico.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| estabilizacao_id | uuid | NOT NULL | - | FK |
| item | text | NOT NULL | - | - |
| concluido | boolean | NOT NULL | false | - |
| concluido_em | timestamptz | NULL | - | - |
| concluido_por | uuid | NULL | - | FK |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

# 17. Exames

## `exames`

**Schema:** public  
**Domínio:** Exames  
**Finalidade:** Registrar solicitação, acompanhamento e resultado de exames vinculados ao atendimento.  
**Migration de origem:** `20260623100008_exames.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| status_id | uuid | NOT NULL | - | FK |
| solicitante_id | uuid | NULL | - | FK |
| exame | text | NOT NULL | - | - |
| tipo | text | NOT NULL | - | - |
| origem | text | NULL | - | - |
| prioridade | text | NULL | - | - |
| resultado | text | NULL | - | - |
| hora_solicitacao_ts | timestamptz | NOT NULL | - | - |
| hora_liberacao_ts | timestamptz | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

# 18. Prescrições

## `prescricoes`

**Schema:** public  
**Domínio:** Prescrições  
**Finalidade:** Cabecalho de prescrição vinculada ao atendimento.  
**Migration de origem:** `20260623100010_prescricoes.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| prescritor_id | uuid | NULL | - | FK |
| hora_prescricao_ts | timestamptz | NOT NULL | - | - |
| observacoes_gerais | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `prescricoes.atendimento_id` -> `atendimentos(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

## `prescricao_itens`

**Schema:** public  
**Domínio:** Prescrições  
**Finalidade:** Itens de prescrição e relação opcional com estoque.  
**Migration de origem:** `20260623100010_prescricoes.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| prescricao_id | uuid | NOT NULL | - | FK |
| status_id | uuid | NOT NULL | - | FK |
| medicamento_id | uuid | NULL | - | FK |
| medicamento_nome | text | NOT NULL | - | - |
| dose | text | NULL | - | - |
| via | text | NULL | - | - |
| hora_administracao_ts | timestamptz | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `prescricao_itens.prescricao_id` -> `prescricoes(id)`.
- `prescricao_itens.medicamento_id` -> `estoque_itens(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.
# 19. Estoque

## `estoque_itens`

**Schema:** public  
**Domínio:** Estoque  
**Finalidade:** Catalogar itens de estoque e manter o saldo corrente, cuja alteração é protegida e derivada das movimentações.  
**Migration de origem:** `20260623100009_estoque.sql`  
**Chave primária:** id  
**RLS:** habilitada; ver Anexo E.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** ATIVO/INATIVO  
**Soft delete:** NÃO  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| nome | text | NOT NULL | - | - |
| quantidade_atual | numeric | NOT NULL | 0 | - |
| quantidade_minima | numeric | NOT NULL | 0 | - |
| validade | date | NULL | - | - |
| local | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, proteção de quantidade_atual.

### Observações documentais

Sem observação adicional além dos anexos.

## `estoque_movimentacoes`

**Schema:** public  
**Domínio:** Estoque  
**Finalidade:** Histórico imutável de movimentações de estoque.  
**Migration de origem:** `20260623100009_estoque.sql`  
**Chave primária:** id  
**RLS:** habilitada; ver Anexo E.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** APPEND-ONLY operacional; UPDATE e DELETE bloqueados por trigger.  
**Soft delete:** NÃO  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| item_id | uuid | NOT NULL | - | FK |
| responsavel_id | uuid | NULL | - | FK |
| prescricao_item_id | uuid | NULL | - | FK `prescricao_itens(id)` |
| tipo_movimentacao | text | NOT NULL | - | CHECK (`entrada`, `saida`, `ajuste`) |
| quantidade | numeric | NOT NULL | - | - |
| hora_movimentacao_ts | timestamptz | NOT NULL | - | - |
| motivo | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, aplicar movimentacao e bloqueio UPDATE/DELETE.

### Observações documentais

Sem observação adicional além dos anexos.


# 20. Transferências

## `transferencias`

**Schema:** public  
**Domínio:** Transferências  
**Finalidade:** Registrar solicitação e evolução de transferência.  
**Migration de origem:** `20260623100011_transferencias.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| atendimento_id | uuid | NOT NULL | - | FK |
| status_id | uuid | NOT NULL | - | FK |
| motivo | text | NOT NULL | - | - |
| destino | text | NOT NULL | - | - |
| acompanhante | text | NULL | - | - |
| tipo_transporte | text | NULL | - | - |
| usou_ambulancia | boolean | NULL | - | - |
| hora_solicitacao_ts | timestamptz | NOT NULL | - | - |
| hora_aprovacao_vaga_ts | timestamptz | NULL | - | - |
| hora_saida_ts | timestamptz | NULL | - | - |
| checklist_confirmado_em | timestamptz | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

- `transferencias.atendimento_id` -> `atendimentos(id)`.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

## `checklist_transferencia_itens`

**Schema:** public  
**Domínio:** Transferências  
**Finalidade:** Registrar itens de checklist de transferência.  
**Migration de origem:** `20260623100011_transferencias.sql`  
**Chave primária:** id  
**RLS:** habilitada; SELECT no HEAD não filtra deleted_at.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** SOFT DELETE  
**DELETE físico:** BLOQUEADO POR TRIGGER  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| transferencia_id | uuid | NOT NULL | - | FK |
| item | text | NOT NULL | - | - |
| concluido | boolean | NOT NULL | false | - |
| concluido_em | timestamptz | NULL | - | - |
| concluido_por | uuid | NULL | - | FK |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |
| deleted_at | timestamptz | NULL | - | soft delete |
| deleted_by | uuid | NULL | - | FK usuarios(id) |
| delete_reason | text | NULL | - | soft delete |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at, bloqueio de DELETE físico.

### Observações documentais

Grupo B de soft delete: SELECT vigente no HEAD não filtra `deleted_at`; migration local pendente propõe filtro.

# 21. Configurações do sistema

## `configuracoes_sistema`

**Schema:** public  
**Domínio:** Configurações do sistema  
**Finalidade:** Armazenar configurações parametrizáveis do sistema.  
**Migration de origem:** `20260623100019_configuracoes_sistema.sql`  
**Chave primária:** id  
**RLS:** habilitada; ver Anexo E.  
**Auditoria:** SIM, via trigger de auditoria e `public.fn_audit_trigger()`.  
**Ciclo de vida:** ATIVO/INATIVO  
**Soft delete:** NÃO  
**DELETE físico:** privilégio DELETE revogado de `authenticated`; existe policy DELETE vigente, mas não há trigger específico de bloqueio.  
**Status documental:** VIGENTE

### Estrutura física

| Coluna | Tipo | Nullability | Default | Constraints |
| ------ | ---- | ----------- | ------- | ----------- |
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| chave | text | NOT NULL | - | UNIQUE |
| modulo | text | NOT NULL | 'sistema' | - |
| descricao | text | NULL | - | - |
| valor | jsonb | NOT NULL | '{}'::jsonb | - |
| ativo | boolean | NOT NULL | true | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| created_by | uuid | NULL | - | FK |
| updated_by | uuid | NULL | - | FK |

### Relacionamentos

Ver matriz consolidada no Anexo D; esta ficha registra somente a síntese da tabela.

### Policies principais

Ver Anexo E para expressões completas e histórico de recriação/substituição.

### Triggers

auditoria, updated_at.

### Observações documentais

Existe policy DELETE vigente e há `REVOKE DELETE` posterior para `authenticated`; policy RLS e privilégio SQL são camadas distintas. `ativo = false` não equivale a soft delete por `deleted_at`.

# 22. Ciclo de vida, ativo e soft delete

`ativo = false` não e equivalente a `deleted_at IS NOT NULL` quando não houver regra SQL que os equipare.

## Grupo A — soft delete vigente e filtrado no HEAD

- `pacientes`
- `atendimentos`
- `consultas`

## Grupo B — soft delete vigente, SELECT sem filtro no HEAD

- `chamadas`
- `triagens`
- `evolucoes_enfermagem`
- `observacoes`
- `reavaliacoes_observacao`
- `estabilizacoes`
- `checklist_estabilizacao_itens`
- `exames`
- `prescricoes`
- `prescricao_itens`
- `transferencias`
- `checklist_transferencia_itens`

## Grupo C — soft delete vigente, SELECT genérica sem filtro no HEAD

- `paciente_alergias`
- `paciente_comorbidades`
- `paciente_medicamentos_continuos`
- `paciente_alertas_clinicos`

# 23. Resumo de segurança e RLS

Todas as 35 tabelas possuem RLS habilitada. O HEAD possui 88 policies: 35 SELECT, 13 INSERT, 11 UPDATE, 8 DELETE e 21 ALL. RLS e grants/revokes são camadas distintas.

# 24. Estado local pendente de versionamento

`supabase/migrations/20260807000001_rls_phase_b1_soft_delete_select_filter.sql` existe no workspace local e não integra o HEAD. Ela afeta 12 policies SELECT, propõe filtro `deleted_at is null`, preserva admin/auditoria e não afeta as quatro longitudinais. Rollback e teste relacionados tambem estao não rastreados.

# Anexo A — Inventário Consolidado de Functions PostgreSQL

```text
Functions vigentes: 18
SECURITY DEFINER: 11
search_path = public: 15
Trigger functions: 8
Helpers RLS/autorizacao: 6
```

Auth/RLS: `current_user_id`, `is_linked_user`, `has_perfil`, `has_permission`, `is_admin`, `is_auditoria`. Auditoria: `audit_text_to_uuid`, `fn_audit_trigger`. Updated_at: `fn_set_updated_at`. Estoque: `fn_estoque_itens_protect_quantidade`, `fn_estoque_aplicar_movimentacao`, `fn_block_update_delete`. Domínio/fluxo: `dom_codigo`, `dom_ordem`, `fn_validate_atendimento_transicao`. Bootstrap: `bootstrap_primeiro_admin`. Protecoes: `fn_block_assistential_physical_delete`, `fn_block_audit_log_update_delete`.

# Anexo B — Inventário Consolidado de Triggers PostgreSQL

```text
Triggers vigentes: 77
Auditoria: 27
updated_at: 24
Estoque: 4
Fluxo assistencial: 1
Bloqueio DELETE assistencial: 19
Protecao audit_log: 2
Tabelas com trigger: 28
Tabelas sem trigger: 7
```

A maioria dos triggers e gerada dinamicamente. As 7 tabelas sem trigger são as tabelas `dom_*`.

# Anexo C — Inventário Consolidado de Views PostgreSQL

Views vigentes: 3, todas com definição vigente em `20260803000001_filter_deleted_at_management_views.sql`.

- `public.vw_gestao_indicadores_gerais`: indicadores semanais por atendimento, com `a.deleted_at is null`.
- `public.vw_gestao_producao_assistencial`: produção semanal por setor, com supressão n < 5 e `a.deleted_at is null`.
- `public.vw_gestao_tempos_assistenciais`: tempos assistenciais semanais; filtra `deleted_at` em atendimentos, triagens e consultas.

# Anexo D — Síntese da Matriz Global de Relacionamentos e Foreign Keys

```text
FKs vigentes: 121
FKs ON DELETE CASCADE: 23
FKs nullable: 92
FKs NOT NULL: 29
```

Mapa sintetico: `auth.users -> usuarios -> usuario_perfil -> perfis_acesso -> perfil_permissao -> permissoes`; `pacientes -> atendimentos -> registros assistenciais`; `atendimentos -> prescricoes -> prescricao_itens`; `estoque_itens -> estoque_movimentacoes`; `transferencias -> checklist_transferencia_itens`. `audit_log.registro_id` e referência lógica. Ha combinação documental de FKs `ON DELETE CASCADE` com triggers posteriores de bloqueio de DELETE físico.

# Anexo E — Síntese Consolidada de RLS e Policies

```text
Tabelas com RLS: 35/35
Policies vigentes: 88
SELECT: 35
INSERT: 13
UPDATE: 11
DELETE: 8
ALL: 21
has_permission: 49 policies
has_perfil: 5
is_linked_user: 14
is_admin: 74
is_auditoria: 19
```

Domínios usam SELECT `is_linked_user` e ALL admin. Pacientes, atendimentos e consultas filtram `deleted_at` no HEAD. As 12 tabelas Grupo B ainda não filtram `deleted_at` no HEAD. As 4 longitudinais usam SELECT genérica `is_linked_user`. `audit_log` e `configuracoes_sistema` demonstram que RLS e grants/revokes precisam ser lidos em conjunto.

# Controle documental

**Status atual:** VIGENTE  
**Última revisão:** 10/08/2026  
**Motivo da Última revisão:** revisão humana integral, correção estrutural, editorial e de consistência técnica do Dicionário de Dados.  
**Fontes utilizadas:** migrations SQL versionadas no HEAD e levantamentos documentais consolidados.  
**Pendências documentais:** decisão futura sobre os arquivos locais não rastreados relacionados à migration `20260807000001`.  
**Substitui:** versão consolidada anterior não versionada do próprio `09_DICIONARIO_DE_DADOS.md`.  
**Substituído por:** —

## Achados documentais consolidados

### ACHADO DOC-LONG-001

As quatro tabelas longitudinais possuem SELECT genérica por `public.is_linked_user()`, sem filtro `ativo`, sem filtro `deleted_at` e sem escopo por paciente/linha.

### ACHADO DOC-CONFIG-001

`configuracoes_sistema` possui policy DELETE vigente, mas DELETE físico para `authenticated` e bloqueado efetivamente por GRANT/REVOKE.

### ACHADO DOC-TRG-001

Triggers dinamicos exigem expansao documental; busca simples por `CREATE TRIGGER` subconta o total real.

### ACHADO DOC-VIEW-001

As tres views gerenciais vigentes estao em `20260803000001_filter_deleted_at_management_views.sql`.

### ACHADO DOC-VIEW-002

Nao foram identificadas opções explícitas `security_invoker` ou `security_barrier` nas views.

### ACHADO DOC-FK-001

`deleted_by` em 19 tabelas assistenciais e FK física para `usuarios(id)` adicionada dinamicamente.

### ACHADO DOC-FK-002

`audit_log.registro_id` e UUID sem FK física para a tabela afetada.

### ACHADO DOC-FK-003

Ha combinação de FKs `ON DELETE CASCADE` com triggers posteriores de bloqueio de DELETE físico.

### ACHADO DOC-RLS-001

Doze policies SELECT de tabelas assistenciais Grupo B não filtram `deleted_at` no HEAD; migration local não esta versionada.

### ACHADO DOC-RLS-002

As quatro tabelas clinicas longitudinais usam SELECT genérica sem filtro de soft delete ou `ativo`.

### ACHADO DOC-RLS-003

RLS e grants/revokes divergem em tabelas como `audit_log` e `configuracoes_sistema`; são camadas distintas.

## Status

Documento consolidado para revisao humana. Nenhuma migration local não rastreada foi incorporada como estado vigente do HEAD.

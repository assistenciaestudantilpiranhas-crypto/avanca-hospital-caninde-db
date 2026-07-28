# GSI ONE - Fase 2.6: Matriz de Dados Agregados e Anonimizados

**Fase:** 2.6 - Especificação de views e acesso gerencial
**Data:** 2026-07-28
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto:** gsi-one-homologacao
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Especificação — sem migration, sem views, sem policies, sem alteração de banco

---

## 1. Objetivo

Esta matriz classifica cada campo candidato a aparecer nas views gerenciais segundo seu nível de sensibilidade e tratamento exigido antes da exposição.

A classificação orienta o desenvolvimento de cada view, garantindo que nenhum dado proibido ou identificável seja exposto aos perfis `Gestão Hospitalar` e `Leitura/Gestor`.

---

## 2. Legenda de classificação

| Classificação | Definição |
| --- | --- |
| **AGREGADO** | Dado resultante de operação de agrupamento (COUNT, SUM, AVG, percentil) sobre múltiplos registros. Não representa um indivíduo específico. |
| **ANONIMIZADO** | Dado do qual foram removidos ou substituídos todos os identificadores diretos e indiretos que permitiriam reidentificação. Irreversível. |
| **PSEUDONIMIZADO** | Dado em que o identificador foi substituído por um token ou hash opaco. Reversível apenas com a chave, que não é exposta na view. |
| **NOMINAL** | Dado que identifica diretamente um indivíduo (nome, CPF, CNS). Não permitido nas views gerenciais desta fase. |
| **PROIBIDO** | Dado que não deve aparecer em nenhuma view gerencial, independentemente de tratamento. |

---

## 3. Campos das tabelas de origem — classificação por view gerencial

### 3.1 Tabela `atendimentos`

| Campo | Tipo original | Classificação nas views gerenciais | Tratamento necessário | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO como identificador | Nunca expor o UUID individual | Nenhuma |
| `paciente_id` | UUID (FK) | PROIBIDO | Não expor; agregar sem referenciar | Nenhuma |
| `setor` | texto/enum | AGREGADO | Usado como dimensão de agrupamento | Todas `vw_gestao_*` e `vw_leitura_*` |
| `status` | enum | AGREGADO | Usado como dimensão de agrupamento | `vw_gestao_fluxos`, `vw_gestao_setores` |
| `created_at` | timestamptz | AGREGADO | Truncado para dia/semana/mês; nunca exposto individualmente | Todas |
| `updated_at` | timestamptz | PROIBIDO individualmente | Só em agregação temporal | Nenhuma diretamente |
| `queixa_principal` | texto livre | PROIBIDO | Dado clínico individual — nunca exposto | Nenhuma |
| `tipo_desfecho` | enum | AGREGADO | Usado em contagem por tipo | `vw_gestao_producao`, `vw_leitura_relatorios` |
| `created_by` | UUID (FK) | PROIBIDO como nominal | `total_usuarios_distintos` (contagem, não UUID) | `vw_gestao_auditoria_agregada` apenas como COUNT |

### 3.2 Tabela `pacientes`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO | Nenhuma view gerencial usa UUID de paciente | Nenhuma |
| `nome` | texto | NOMINAL — PROIBIDO | Nunca exposto | Nenhuma |
| `cpf` | texto | NOMINAL — PROIBIDO | Nunca exposto | Nenhuma |
| `cns` | texto | NOMINAL — PROIBIDO | Nunca exposto | Nenhuma |
| `data_nascimento` | date | NOMINAL — PROIBIDO direto | Pode ser usado como faixa etária agregada em fase futura, mediante aprovação | Nenhuma nesta fase |
| `telefone` | texto | NOMINAL — PROIBIDO | Nunca exposto | Nenhuma |
| `endereco` | texto | NOMINAL — PROIBIDO | Nunca exposto | Nenhuma |
| `sexo` | enum | PROIBIDO nesta fase | Em fase futura, apenas como dimensão agregada (M/F/total), mediante aprovação | Nenhuma nesta fase |
| `created_at` | timestamptz | PROIBIDO individual | Não utilizado nas views gerenciais | Nenhuma |

### 3.3 Tabela `triagens`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO | Não expor UUID individual | Nenhuma |
| `atendimento_id` | UUID | PROIBIDO | Não expor UUID individual | Nenhuma |
| `classificacao_risco` | enum | AGREGADO | Contagem por classificação, sem nome | `vw_gestao_producao`, `vw_gestao_fluxos` |
| `tempo_espera_min` | integer | AGREGADO | Média, percentil — nunca linha individual | `vw_gestao_tempos` |
| `created_at` | timestamptz | AGREGADO | Truncado para período | `vw_gestao_tempos` |
| `observacoes_triagem` | texto livre | PROIBIDO | Dado clínico individual | Nenhuma |
| `classificado_por` | UUID (FK) | PROIBIDO | Nunca expor quem classificou individualmente | Nenhuma |

### 3.4 Tabela `consultas`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO | Não expor | Nenhuma |
| `atendimento_id` | UUID | PROIBIDO | Não expor | Nenhuma |
| `hipotese_diagnostica` | texto livre | PROIBIDO | Dado clínico sensível | Nenhuma |
| `cid` | código | PROIBIDO individual; AGREGADO por grupo CID em fase futura | Contagem por grupo CID sem nome, mediante aprovação futura | Nenhuma nesta fase |
| `conduta` | texto livre | PROIBIDO | Dado clínico sensível | Nenhuma |
| `medico_id` | UUID | PROIBIDO | Nunca expor UUID de profissional individual | Nenhuma |
| `created_at` | timestamptz | AGREGADO em contagem | Truncado para período | `vw_gestao_producao` (contagem de consultas) |

### 3.5 Tabela `observacoes`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO | Não expor | Nenhuma |
| `atendimento_id` | UUID | PROIBIDO | Não expor | Nenhuma |
| `setor` | texto/enum | AGREGADO | Usado como dimensão | `vw_gestao_ocupacao`, `vw_gestao_fluxos`, `vw_gestao_setores` |
| `status` | enum | AGREGADO | Contagem por status | `vw_gestao_fluxos`, `vw_gestao_setores` |
| `evolucao` | texto livre | PROIBIDO | Dado clínico individual | Nenhuma |
| `created_at` | timestamptz | AGREGADO | Truncado para período/turno | `vw_gestao_ocupacao` |
| `leito` | texto | PROIBIDO individual | Contagem de leitos ocupados, sem identificar o leito e o ocupante simultaneamente | `vw_gestao_ocupacao` como COUNT |

### 3.6 Tabela `transferencias`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO | Não expor | Nenhuma |
| `atendimento_id` | UUID | PROIBIDO | Não expor | Nenhuma |
| `status` | enum | AGREGADO | Contagem por status | `vw_gestao_fluxos`, `vw_gestao_producao` |
| `destino` | texto | AGREGADO | Contagem por destino/região, sem nome de paciente | `vw_gestao_producao` |
| `motivo` | texto livre | PROIBIDO | Pode conter dado clínico | Nenhuma |
| `created_at` | timestamptz | AGREGADO | Truncado para período | `vw_gestao_producao`, `vw_gestao_tempos` |
| `tempo_transferencia_h` | calculado | AGREGADO | Média, percentil | `vw_gestao_tempos` |

### 3.7 Tabela `prescricoes`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| Todos os campos | — | PROIBIDO | Prescrições não aparecem em nenhuma view gerencial nesta fase | Nenhuma |

### 3.8 Tabela `exames`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO | Não expor | Nenhuma |
| `tipo_exame` | texto/enum | PROIBIDO nesta fase | Em fase futura, contagem por tipo, sem nome de paciente, mediante aprovação | Nenhuma nesta fase |
| `resultado` | texto livre | PROIBIDO | Dado clínico individual | Nenhuma |
| `status` | enum | PROIBIDO nesta fase | Pode ser contagem agregada em fase futura | Nenhuma nesta fase |

### 3.9 Tabela `audit_log`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO individual | Não expor UUID do evento | Nenhuma |
| `usuario_id` | UUID (FK) | PROIBIDO individual | `total_usuarios_distintos` como COUNT DISTINCT | `vw_gestao_auditoria_agregada` |
| `tabela_afetada` | texto | AGREGADO | Dimensão de agrupamento | `vw_gestao_auditoria_agregada` |
| `registro_id` | UUID | PROIBIDO | Não expor UUID do registro afetado | Nenhuma |
| `acao` | enum | AGREGADO | Dimensão de agrupamento | `vw_gestao_auditoria_agregada` |
| `dados_antes` | jsonb | PROIBIDO | Conteúdo clínico potencialmente sensível | Nenhuma |
| `dados_depois` | jsonb | PROIBIDO | Conteúdo clínico potencialmente sensível | Nenhuma |
| `created_at` | timestamptz | AGREGADO | Truncado para dia ou semana | `vw_gestao_auditoria_agregada` |

### 3.10 Tabela `usuarios`

| Campo | Tipo original | Classificação | Tratamento | Views que podem usar |
| --- | --- | --- | --- | --- |
| `id` | UUID | PROIBIDO como identificador para gerencial | Não expor UUID | Nenhuma |
| `nome` | texto | NOMINAL | Exposto apenas em `vw_gestao_usuarios` como nome funcional (não dado clínico); Leitura/Gestor não acessa | `vw_gestao_usuarios` |
| `email` | texto | NOMINAL — PROIBIDO | Não expor em nenhuma view gerencial | Nenhuma |
| `cpf` | texto (se presente) | NOMINAL — PROIBIDO | Nunca exposto | Nenhuma |
| `categoria_profissional` | texto/enum | NOMINAL — exposição controlada | Apenas em `vw_gestao_usuarios`, sem dado pessoal adicional | `vw_gestao_usuarios` |
| `registro_profissional` | texto | PSEUDONIMIZADO ou PROIBIDO | A definir — pode ser suprimido na view gerencial | `vw_gestao_usuarios` — decisão pendente DP-07 |
| `ativo` | boolean | AGREGADO / NOMINAL controlado | Exposto em `vw_gestao_usuarios` como status funcional | `vw_gestao_usuarios` |
| `created_at` | timestamptz | NOMINAL controlado | Truncado para mês/ano em `vw_gestao_usuarios` | `vw_gestao_usuarios` |

---

## 4. Campos calculados necessários

| Campo calculado | Fórmula base | Classificação | View |
| --- | --- | --- | --- |
| `tempo_medio_espera_min` | `AVG(triagens.tempo_espera_min)` agrupado por setor/período | AGREGADO | `vw_gestao_tempos`, `vw_gestao_indicadores`, `vw_leitura_indicadores` |
| `tempo_medio_atendimento_min` | Diferença entre status de atendimento por período | AGREGADO | `vw_gestao_tempos`, `vw_gestao_indicadores` |
| `percentil_90_espera_min` | `PERCENTILE_CONT(0.9)` sobre `tempo_espera_min` por setor | AGREGADO | `vw_gestao_tempos` |
| `taxa_ocupacao_pct` | `(COUNT ativos / capacidade_referencia) * 100` | AGREGADO | `vw_gestao_ocupacao`, `vw_gestao_indicadores`, `vw_leitura_indicadores`, `vw_leitura_paineis` |
| `total_usuarios_distintos` | `COUNT(DISTINCT usuario_id)` por ação/período | AGREGADO | `vw_gestao_auditoria_agregada` |
| `alertas_operacionais_count` | COUNT de atendimentos com `tempo_espera > limiar` | AGREGADO | `vw_gestao_setores`, `vw_leitura_paineis` |

---

## 5. Regras de supressão de célula pequena

### 5.1 Regra padrão

Toda célula de contagem com valor `n < 5` deve ser substituída pelo marcador `<5` antes de exibição ou exportação.

### 5.2 Regra estrita (para views de maior risco)

Para `vw_gestao_ocupacao`, `vw_gestao_fluxos` e `vw_gestao_setores`, o limiar é `n < 10` quando o total geral do setor no período for inferior a 20 registros.

### 5.3 Implementação

A supressão pode ser implementada diretamente na view via `CASE WHEN`:

```sql
CASE WHEN COUNT(*) < 5 THEN NULL ELSE COUNT(*) END AS total_suprimido
```

A camada de apresentação deve exibir `<5` ou `*` quando o campo for `NULL` por supressão.

### 5.4 Proibição de combinação reveladora

Nenhuma view deve permitir a combinação de `setor` + `data` + `status` com cardinalidade suficientemente pequena para revelar um paciente específico por exclusão. A revisão de cada view deve incluir análise do pior caso de cardinalidade.

---

## 6. Campos que nunca aparecem em nenhuma view gerencial

A tabela abaixo lista campos de qualquer tabela que estão permanentemente proibidos nas views gerenciais, sem exceção e sem revisão nesta fase:

| Campo | Tabela | Razão |
| --- | --- | --- |
| `nome` | `pacientes` | Identificador nominal direto |
| `cpf` | `pacientes` | Identificador legal irrestrito |
| `cns` | `pacientes` | Identificador de saúde |
| `telefone` | `pacientes` | Dado de contato pessoal |
| `endereco` | `pacientes` | Dado de localização pessoal |
| `queixa_principal` | `atendimentos` | Dado clínico individual |
| `hipotese_diagnostica` | `consultas` | Dado clínico sensível |
| `conduta` | `consultas` | Dado clínico sensível |
| `cid` | `consultas` | Código de diagnóstico individual |
| `evolucao` | `observacoes` | Anotação clínica individual |
| `resultado` | `exames` | Resultado clínico individual |
| `dados_antes` | `audit_log` | Conteúdo potencialmente clínico |
| `dados_depois` | `audit_log` | Conteúdo potencialmente clínico |
| `email` | `usuarios` | Dado pessoal de autenticação |
| `registro_id` | `audit_log` | UUID que permite rastrear registro individual |
| `usuario_id` individual | `audit_log`, `atendimentos` | UUID de usuário — apenas COUNT DISTINCT permitido |
| `paciente_id` | `atendimentos` | UUID que permite rastrear paciente |
| Qualquer coluna de `auth.users` | `auth` schema | Dados de autenticação — fora do escopo gerencial |

---

## 7. Decisão pendente: pseudonimização vs. supressão

Para campos como `leito` em observações e `destino` em transferências, a escolha entre pseudonimização (hash opaco) e supressão total depende da necessidade de cruzamento futuro de dados.

| Campo | Opção 1: Supressão | Opção 2: Pseudonimização | Decisão |
| --- | --- | --- | --- |
| `leito` em `observacoes` | COUNT de leitos ocupados sem identificar leito | Hash do leito para rastrear ocupação sem revelar paciente | PENDENTE — DP-08 |
| `destino` em `transferencias` | Nome da cidade/hospital como dado público | — (destino não é sensível) | Expor como dado público aggregado |

---

## 8. Referências

- `docs/GSI_ONE_FASE_2_6_ESPECIFICACAO_VIEWS_GERENCIAIS.md`
- `docs/GSI_ONE_FASE_2_6_PLANO_TESTES_VIEWS_E_POLICIES.md`
- `supabase/migrations/20260623100004_acesso.sql` — estrutura de `permissoes`, `perfis_acesso`, `perfil_permissao`
- `supabase/migrations/20260623100005_pacientes.sql` — estrutura de `pacientes`
- `supabase/migrations/20260623100006_atendimentos.sql` — estrutura de `atendimentos`
- `supabase/migrations/20260623100007_clinico.sql` — estrutura de `consultas`, `triagens`, `observacoes`
- `supabase/migrations/20260623100003_audit_log.sql` — estrutura de `audit_log`

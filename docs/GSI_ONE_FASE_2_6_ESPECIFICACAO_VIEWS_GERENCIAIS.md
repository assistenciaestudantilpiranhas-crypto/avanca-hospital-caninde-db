# GSI ONE - Fase 2.6: Especificação Técnica de Views Gerenciais

**Fase:** 2.6 - Especificação de views e acesso gerencial
**Data:** 2026-07-28
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto:** gsi-one-homologacao
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Especificação técnica — sem migration, sem views, sem policies, sem alteração de banco

---

## 1. Contexto

Este documento especifica as views gerenciais a serem criadas na Fase 2.6, com base nas permissões aprovadas e aplicadas na Fase 2.5.

As permissões `gestao.*` e `leitura.*` existem no banco, mas **não concedem acesso efetivo** enquanto não existirem views e policies de RLS correspondentes. Este documento define o que será criado, como e com quais restrições.

Nenhuma view, policy, grant ou migration é criada por este documento.

Estado de referência:

| Item | Estado |
| --- | --- |
| Permissões gerenciais | Aplicadas — 10 `gestao.*` + 3 `leitura.*` |
| Views gerenciais | Nenhuma criada |
| Policies gerenciais | Nenhuma criada |
| Usuários fictícios | Nenhum criado |
| RLS das tabelas clínicas | Inalterada — policies da Fase B1 vigentes |

---

## 2. Princípios de design das views

### 2.1 Restrições absolutas

Nenhuma view gerencial deve expor, direta ou indiretamente:

- nome de paciente;
- CPF, CNS ou qualquer identificador pessoal;
- telefone, endereço ou dados de contato;
- prontuário, evolução clínica ou anotações assistenciais;
- prescrições individuais;
- resultados individuais de exames;
- hipótese diagnóstica, CID ou conduta clínica;
- UUIDs de pacientes ou atendimentos em contexto que permita rastreamento individual;
- qualquer combinação de campos que permita reidentificação por agrupamentos muito pequenos.

### 2.2 Limiar mínimo de agregação

Toda view que apresente contagens por categoria deve aplicar supressão de células pequenas:

- células com valor `< 5` devem ser substituídas por `< 5` ou `*` na camada de apresentação;
- a especificação de cada view define o limiar aplicável ao seu contexto;
- o limiar padrão é **n < 5**; views de maior risco podem exigir n < 10.

### 2.3 Granularidade temporal

A granularidade dos dados por período deve ser definida pelo risco de reidentificação:

| Contexto | Granularidade mínima aprovada |
| --- | --- |
| Indicadores gerais | Dia, semana ou mês |
| Tempos assistenciais | Hora (agregada), sem marcação nominal |
| Produção | Dia ou semana |
| Ocupação | Hora ou turno (sem identificação do ocupante) |
| Fluxos | Hora ou turno |
| Auditoria agregada | Dia ou semana |

### 2.4 Acesso por views, não por tabelas

Os perfis `Gestão Hospitalar` e `Leitura/Gestor` **nunca** devem receber `SELECT` direto em tabelas clínicas (`pacientes`, `atendimentos`, `consultas`, `triagens`, `prescricoes`, `exames`, `observacoes`, etc.).

O acesso deve ocorrer exclusivamente por views específicas, controladas por:
- `SECURITY INVOKER` (padrão preferido — propaga restrições de RLS do usuário);
- ou `SECURITY DEFINER` apenas quando a view precisar acessar tabelas que o usuário não alcança via RLS, com isolamento explícito de escopo.

---

## 3. Especificação das views

---

### VIEW 01 — `vw_gestao_indicadores`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_gestao_indicadores` |
| **Objetivo** | Indicadores operacionais e institucionais agregados: taxa de ocupação, média de permanência, tempo médio de espera, produção total, desfechos por período |
| **Perfil autorizado** | Gestão Hospitalar |
| **Permissão exigida** | `gestao.indicadores.visualizar` |
| **Fonte de dados** | `atendimentos`, `transferencias`, `observacoes` — via agregação por período, sem JOIN nominal |
| **Colunas previstas** | `periodo` (semana/mês), `total_atendimentos`, `total_altas`, `total_transferencias`, `total_obitos`, `tempo_medio_espera_min`, `tempo_medio_atendimento_min`, `taxa_ocupacao_pct` |
| **Dados proibidos** | Qualquer identificador de paciente, nome, CPF, UUID de atendimento individual |
| **Nível de agregação** | Semanal ou mensal — sem granularidade individual |
| **Anonimização** | Não necessária — não há dado individual |
| **Risco de reidentificação** | Baixo |
| **`security_invoker`** | Sim — a view deve herdar as restrições de RLS do usuário autenticado |
| **RLS nas tabelas de origem** | Sim — tabelas já têm RLS; a view não contorna |
| **Policy necessária** | Sim — `SELECT` para usuários com `gestao.indicadores.visualizar` |
| **Frequência de atualização** | Calculada em tempo real via query; sem materialização nesta fase |
| **Exportação** | Sim — via permissão `gestao.exportar_agregado` |
| **Formato de exportação** | CSV e PDF |
| **Auditoria** | Exportação deve registrar usuário, data/hora e filtros em `audit_log` |
| **Testes obrigatórios** | Gestão Hospitalar acessa; Leitura/Gestor não acessa; perfis clínicos não veem via esta view; nenhum campo nominal retornado |

---

### VIEW 02 — `vw_gestao_producao`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_gestao_producao` |
| **Objetivo** | Produção assistencial por setor, equipe e período: contagens de atendimentos, consultas, procedimentos e desfechos |
| **Perfil autorizado** | Gestão Hospitalar |
| **Permissão exigida** | `gestao.producao.visualizar` |
| **Fonte de dados** | `atendimentos`, `consultas`, `triagens` — via contagem e agrupamento por `setor`, `periodo`, `tipo_desfecho` |
| **Colunas previstas** | `setor`, `periodo` (semana/mês), `total_atendimentos`, `total_consultas`, `total_triagens`, `total_altas`, `total_transferencias`, `total_obitos`, `total_evasoes` |
| **Dados proibidos** | Nome, CPF, UUID de paciente ou atendimento individual, diagnóstico, conduta |
| **Nível de agregação** | Por setor e período — sem linha por atendimento |
| **Anonimização** | Não necessária — sem dado individual |
| **Risco de reidentificação** | Baixo |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim |
| **Policy necessária** | Sim — `SELECT` para `gestao.producao.visualizar` |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Sim — via `gestao.exportar_agregado` |
| **Formato de exportação** | CSV e PDF |
| **Auditoria** | Exportação auditada |
| **Testes obrigatórios** | Contagens corretas; nenhum campo individual presente; isolamento de perfil |

---

### VIEW 03 — `vw_gestao_tempos`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_gestao_tempos` |
| **Objetivo** | Tempos assistenciais agregados: tempo de espera na triagem, tempo de consulta, tempo de permanência em observação, tempo de transferência |
| **Perfil autorizado** | Gestão Hospitalar |
| **Permissão exigida** | `gestao.tempos.visualizar` |
| **Fonte de dados** | `atendimentos`, `triagens`, `observacoes`, `transferencias` — campos de `created_at` e status para cálculo de intervalos, agregados por setor e período |
| **Colunas previstas** | `setor`, `periodo`, `tempo_medio_espera_min`, `tempo_medio_consulta_min`, `tempo_medio_observacao_h`, `tempo_medio_transferencia_h`, `percentil_90_espera_min` |
| **Dados proibidos** | Identificador nominal de paciente; UUID de atendimento individual em contexto isolado |
| **Nível de agregação** | Por setor e período; percentis calculados sobre o conjunto, não por linha |
| **Anonimização** | Limiar mínimo de n ≥ 5 por célula de setor/período |
| **Risco de reidentificação** | Baixo a médio — percentis podem revelar outlier em setores de baixo volume |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim |
| **Policy necessária** | Sim — `SELECT` para `gestao.tempos.visualizar` |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Sim — via `gestao.exportar_agregado` |
| **Formato de exportação** | CSV e PDF |
| **Auditoria** | Exportação auditada |
| **Testes obrigatórios** | Célula com n < 5 retorna valor suprimido; nenhum UUID ou nome retornado; percentis calculados corretamente |

---

### VIEW 04 — `vw_gestao_ocupacao`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_gestao_ocupacao` |
| **Objetivo** | Ocupação hospitalar agregada: taxa de ocupação por setor, tipo de leito e período; disponibilidade e histórico |
| **Perfil autorizado** | Gestão Hospitalar |
| **Permissão exigida** | `gestao.ocupacao.visualizar` |
| **Fonte de dados** | `atendimentos` (status e setor), `observacoes` — contagem de registros ativos por setor e turno |
| **Colunas previstas** | `setor`, `data`, `turno`, `total_ocupados`, `capacidade_referencia`, `taxa_ocupacao_pct` |
| **Dados proibidos** | Nome, CPF, UUID de paciente |
| **Nível de agregação** | Por setor, data e turno — sem linha por paciente |
| **Anonimização** | Supressão se n < 5 em setor de baixo volume |
| **Risco de reidentificação** | Médio — setores muito pequenos podem revelar paciente por exclusão |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim |
| **Policy necessária** | Sim — `SELECT` para `gestao.ocupacao.visualizar` |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Sim — via `gestao.exportar_agregado` |
| **Formato de exportação** | CSV e PDF |
| **Auditoria** | Exportação auditada |
| **Testes obrigatórios** | Taxa calculada corretamente; supressão de célula pequena aplicada; nenhum identificador nominal presente |

---

### VIEW 05 — `vw_gestao_fluxos`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_gestao_fluxos` |
| **Objetivo** | Status agregado dos fluxos hospitalares e filas operacionais: triagem, observação, sala de estabilização, transferências em andamento |
| **Perfil autorizado** | Gestão Hospitalar |
| **Permissão exigida** | `gestao.fluxos.visualizar` |
| **Fonte de dados** | `atendimentos`, `triagens`, `observacoes`, `transferencias` — contagens por status e setor |
| **Colunas previstas** | `setor`, `status`, `total`, `data_hora_referencia` |
| **Dados proibidos** | Nome, CPF, UUID individual de paciente ou atendimento |
| **Nível de agregação** | Por setor e status — contagem, sem linha por paciente |
| **Anonimização** | Supressão se n < 5 |
| **Risco de reidentificação** | Médio — fila de 1 paciente pode identificar por contexto |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim |
| **Policy necessária** | Sim — `SELECT` para `gestao.fluxos.visualizar` |
| **Frequência de atualização** | Tempo real — dados operacionais correntes |
| **Exportação** | Não recomendada para snapshot em tempo real; admitida como histórico agregado via `gestao.exportar_agregado` |
| **Formato de exportação** | CSV apenas para histórico |
| **Auditoria** | Exportação auditada |
| **Testes obrigatórios** | Contagem correta por status; supressão aplicada em setores de baixo volume; nenhum campo nominal |

---

### VIEW 06 — `vw_gestao_setores`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_gestao_setores` |
| **Objetivo** | Visão gerencial por setor: atividade atual, indicadores de desempenho, alertas operacionais por área |
| **Perfil autorizado** | Gestão Hospitalar |
| **Permissão exigida** | `gestao.setores.visualizar` |
| **Fonte de dados** | `atendimentos`, `triagens`, `observacoes` — agrupados por `setor` |
| **Colunas previstas** | `setor`, `ativos_agora`, `media_tempo_espera_atual_min`, `total_hoje`, `alertas_operacionais` (contagem de atrasos/gargalos, sem nominal) |
| **Dados proibidos** | Nome, CPF, UUID de paciente; detalhes clínicos individuais |
| **Nível de agregação** | Por setor — sem linha por paciente |
| **Anonimização** | Supressão se n < 5 por setor |
| **Risco de reidentificação** | Médio em setores de muito baixo volume |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim |
| **Policy necessária** | Sim — `SELECT` para `gestao.setores.visualizar` |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Não — visão operacional em tempo real, sem exportação desta view |
| **Formato de exportação** | Não aplicável |
| **Auditoria** | Não obrigatória para consulta; obrigatória se exportação vier a ser aprovada |
| **Testes obrigatórios** | Contagem correta; sem dado clínico individual; alertas não revelam identidade |

---

### VIEW 07 — `vw_gestao_usuarios`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_gestao_usuarios` |
| **Objetivo** | Lista básica de usuários cadastrados e seus perfis, para fins de acompanhamento gerencial — não para administração |
| **Perfil autorizado** | Gestão Hospitalar |
| **Permissão exigida** | `gestao.usuarios.visualizar` |
| **Fonte de dados** | `usuarios`, `usuario_perfil`, `perfis_acesso` |
| **Colunas previstas** | `nome_usuario`, `categoria_profissional`, `perfil`, `ativo`, `data_criacao` (mês/ano) |
| **Dados proibidos** | CPF, CNS, e-mail, telefone, endereço, senha, hash, UUID de `auth.users`, tokens, qualquer dado de autenticação |
| **Nível de agregação** | Linha por usuário ativo — dados mínimos de identificação funcional |
| **Anonimização** | Não aplicável para nome funcional; e-mail e dados pessoais excluídos |
| **Risco de reidentificação** | Baixo — nome e perfil são dados funcionais esperados neste contexto |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim — `usuarios` tem RLS; policy da view deve ser aditiva, não substitutiva |
| **Policy necessária** | Sim — `SELECT` para `gestao.usuarios.visualizar` |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Não aprovada — lista de usuários não deve ser exportada nesta fase |
| **Formato de exportação** | Não aplicável |
| **Auditoria** | Obrigatória — toda consulta a dados de usuários deve ser registrada |
| **Testes obrigatórios** | Nenhum campo de autenticação presente; e-mail ausente; UUID de auth ausente; Leitura/Gestor não acessa |

---

### VIEW 08 — `vw_gestao_auditoria_agregada`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_gestao_auditoria_agregada` |
| **Objetivo** | Trilha de auditoria com recorte agregado e institucional: contagem de eventos por tipo de ação, tabela afetada e período — sem detalhe individual de registro |
| **Perfil autorizado** | Gestão Hospitalar |
| **Permissão exigida** | `gestao.auditoria_agregada.visualizar` |
| **Fonte de dados** | `audit_log` — agrupado por `acao`, `tabela_afetada`, `data` (dia ou semana) |
| **Colunas previstas** | `periodo`, `tabela_afetada`, `acao`, `total_eventos`, `total_usuarios_distintos` |
| **Dados proibidos** | UUID de usuário individual, UUID de registro afetado, `dados_antes`, `dados_depois`, qualquer dado clínico da trilha |
| **Nível de agregação** | Por ação, tabela e período — contagem, sem linha por evento |
| **Anonimização** | `total_usuarios_distintos` sem identificação dos usuários |
| **Risco de reidentificação** | Médio — combinação de ação + tabela + período pode revelar comportamento de usuário específico |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim — `audit_log` tem RLS append-only |
| **Policy necessária** | Sim — `SELECT` para `gestao.auditoria_agregada.visualizar`; proibir acesso a `dados_antes`/`dados_depois` na view |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Sim — via `gestao.exportar_agregado`, apenas dados agregados |
| **Formato de exportação** | CSV e PDF |
| **Auditoria** | Exportação auditada com registro no próprio `audit_log` (ação específica: `gestao_exportacao`) |
| **Testes obrigatórios** | Campos `dados_antes`/`dados_depois`/`usuario_id`/`registro_id` ausentes; contagem correta; Leitura/Gestor não acessa |

---

### VIEW 09 — `vw_leitura_indicadores`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_leitura_indicadores` |
| **Objetivo** | Indicadores institucionais e operacionais agregados para perfil estritamente consultivo |
| **Perfil autorizado** | Leitura/Gestor |
| **Permissão exigida** | `leitura.indicadores.visualizar` |
| **Fonte de dados** | Subconjunto de `vw_gestao_indicadores` ou query própria equivalente sobre `atendimentos` e `observacoes` |
| **Colunas previstas** | `periodo` (mês), `total_atendimentos`, `total_altas`, `total_transferencias`, `taxa_ocupacao_pct`, `tempo_medio_espera_min` |
| **Dados proibidos** | Qualquer campo nominal; qualquer UUID; dados clínicos |
| **Nível de agregação** | Mensal — granularidade mais grosseira que a de Gestão Hospitalar |
| **Anonimização** | Não necessária — sem dado individual |
| **Risco de reidentificação** | Baixo |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim |
| **Policy necessária** | Sim — `SELECT` para `leitura.indicadores.visualizar` |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Não — Leitura/Gestor não possui permissão de exportação |
| **Formato de exportação** | Não aplicável |
| **Auditoria** | Não obrigatória para consulta simples |
| **Testes obrigatórios** | Nenhum campo nominal; Gestão Hospitalar não depende desta view; usuários sem permissão não acessam |

---

### VIEW 10 — `vw_leitura_relatorios`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_leitura_relatorios` |
| **Objetivo** | Relatórios gerenciais e institucionais agregados para perfil consultivo: produção, tempos e desfechos por período |
| **Perfil autorizado** | Leitura/Gestor |
| **Permissão exigida** | `leitura.relatorios.visualizar` |
| **Fonte de dados** | `atendimentos`, `triagens`, `transferencias` — agrupados por mês |
| **Colunas previstas** | `periodo` (mês/ano), `setor`, `total_atendimentos`, `total_transferencias`, `total_altas`, `tempo_medio_min` |
| **Dados proibidos** | Nome, CPF, UUID de paciente; dados clínicos |
| **Nível de agregação** | Mensal e por setor |
| **Anonimização** | Supressão de células n < 5 |
| **Risco de reidentificação** | Baixo |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim |
| **Policy necessária** | Sim — `SELECT` para `leitura.relatorios.visualizar` |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Não |
| **Formato de exportação** | Não aplicável |
| **Auditoria** | Não obrigatória para consulta simples |
| **Testes obrigatórios** | Supressão de célula pequena; nenhum campo nominal; isolamento de perfil |

---

### VIEW 11 — `vw_leitura_paineis`

| Atributo | Definição |
| --- | --- |
| **Nome** | `vw_leitura_paineis` |
| **Objetivo** | Painéis institucionais consolidados: visão resumida de ocupação, produção e indicadores para consulta gerencial rápida |
| **Perfil autorizado** | Leitura/Gestor |
| **Permissão exigida** | `leitura.paineis.visualizar` |
| **Fonte de dados** | Agregação sobre `atendimentos`, `observacoes`, `transferencias` — totais do dia ou semana |
| **Colunas previstas** | `data_referencia`, `total_em_atendimento`, `total_em_observacao`, `total_transferencias_pendentes`, `taxa_ocupacao_atual_pct`, `alertas_operacionais_count` |
| **Dados proibidos** | Qualquer campo nominal; UUIDs |
| **Nível de agregação** | Diário ou semanal — painel de situação, sem histórico longo |
| **Anonimização** | Não necessária — sem dado individual; alertas são contagens |
| **Risco de reidentificação** | Baixo |
| **`security_invoker`** | Sim |
| **RLS nas tabelas de origem** | Sim |
| **Policy necessária** | Sim — `SELECT` para `leitura.paineis.visualizar` |
| **Frequência de atualização** | Tempo real |
| **Exportação** | Não |
| **Formato de exportação** | Não aplicável |
| **Auditoria** | Não obrigatória para consulta simples |
| **Testes obrigatórios** | Contagens corretas; nenhum campo nominal; Gestão Hospitalar não depende desta view para suas permissões próprias |

---

## 4. Mapa de permissão → view

| Permissão | View correspondente | Perfil |
| --- | --- | --- |
| `gestao.indicadores.visualizar` | `vw_gestao_indicadores` | Gestão Hospitalar |
| `gestao.producao.visualizar` | `vw_gestao_producao` | Gestão Hospitalar |
| `gestao.tempos.visualizar` | `vw_gestao_tempos` | Gestão Hospitalar |
| `gestao.ocupacao.visualizar` | `vw_gestao_ocupacao` | Gestão Hospitalar |
| `gestao.fluxos.visualizar` | `vw_gestao_fluxos` | Gestão Hospitalar |
| `gestao.setores.visualizar` | `vw_gestao_setores` | Gestão Hospitalar |
| `gestao.usuarios.visualizar` | `vw_gestao_usuarios` | Gestão Hospitalar |
| `gestao.auditoria_agregada.visualizar` | `vw_gestao_auditoria_agregada` | Gestão Hospitalar |
| `gestao.relatorios.visualizar` | Derivado de `vw_gestao_producao` + `vw_gestao_tempos` | Gestão Hospitalar |
| `gestao.exportar_agregado` | Todas as views `vw_gestao_*` com exportação aprovada | Gestão Hospitalar |
| `leitura.indicadores.visualizar` | `vw_leitura_indicadores` | Leitura/Gestor |
| `leitura.relatorios.visualizar` | `vw_leitura_relatorios` | Leitura/Gestor |
| `leitura.paineis.visualizar` | `vw_leitura_paineis` | Leitura/Gestor |

---

## 5. Impacto esperado em RLS

### 5.1 Premissa

As views usarão `SECURITY INVOKER` por padrão. O usuário autenticado que acessar a view terá suas restrições de RLS aplicadas sobre as tabelas de origem. As policies das tabelas clínicas **não serão alteradas**.

### 5.2 Novas policies necessárias

Para cada view, uma policy `SELECT` deverá ser criada **na própria view** (não nas tabelas de origem):

```sql
-- Padrão de policy esperado para cada view gerencial:
create policy vw_gestao_indicadores_select on vw_gestao_indicadores
  for select to authenticated
  using (public.has_permission('gestao.indicadores.visualizar'));
```

### 5.3 Tabelas de origem — nenhuma alteração

| Tabela | Alteração nesta fase |
| --- | --- |
| `pacientes` | Nenhuma |
| `atendimentos` | Nenhuma |
| `consultas` | Nenhuma |
| `triagens` | Nenhuma |
| `observacoes` | Nenhuma |
| `transferencias` | Nenhuma |
| `prescricoes` | Nenhuma |
| `exames` | Nenhuma |
| `audit_log` | Nenhuma |
| `usuarios` | Nenhuma |

---

## 6. Ordem de implementação futura

A implementação deve seguir a ordem abaixo, do menor para o maior risco:

| Etapa | Ação | Risco | Pré-requisito |
| --- | --- | --- | --- |
| 1 | `vw_gestao_indicadores` e `vw_leitura_indicadores` | Baixo | Aprovação desta especificação |
| 2 | `vw_gestao_producao` e `vw_leitura_relatorios` | Baixo | Etapa 1 validada |
| 3 | `vw_gestao_tempos` | Baixo/médio | Etapa 2 validada + limiar de célula definido |
| 4 | `vw_gestao_ocupacao` e `vw_gestao_fluxos` | Médio | Etapa 3 validada + supressão implementada |
| 5 | `vw_gestao_setores` e `vw_leitura_paineis` | Médio | Etapa 4 validada |
| 6 | `vw_gestao_usuarios` | Baixo | Aprovação específica para acesso a `usuarios` |
| 7 | `vw_gestao_auditoria_agregada` | Médio | Aprovação específica + auditoria de exportação implementada |
| 8 | Policies de RLS para todas as views | — | Todas as views validadas |
| 9 | Exportação via `gestao.exportar_agregado` | Médio | Policies validadas + mecanismo de auditoria de exportação |
| 10 | Testes com usuários fictícios | — | Etapas 1-9 validadas |

---

## 7. Pontos de parada formais

| Ponto | Condição para avançar |
| --- | --- |
| Antes da criação de qualquer view | Aprovação desta especificação pelo responsável institucional |
| Antes da criação das policies | Todas as views da etapa correspondente validadas localmente |
| Antes de criar usuários fictícios | Views e policies validadas; ambiente de homologação confirmado |
| Antes de liberar exportação | Mecanismo de auditoria de exportação implementado e testado |
| Antes de aplicação remota | Suíte completa de testes aprovada sem falhas |

---

## 8. Riscos técnicos identificados

| Risco | Probabilidade | Impacto | Mitigação |
| --- | --- | --- | --- |
| `SECURITY INVOKER` não isolar adequadamente por falta de RLS na view | Médio | Alto | Criar policy explícita em cada view |
| View com `GROUP BY` muito granular permitindo reidentificação por célula pequena | Médio | Alto | Limiar n ≥ 5 obrigatório; validado em teste |
| `vw_gestao_usuarios` expor dado de autenticação via JOIN com `auth.users` | Baixo | Muito alto | JOIN exclusivamente com `public.usuarios`; proibir `auth.*` |
| Exportação sem registro de auditoria | Médio | Alto | Obrigar `audit_log` para toda exportação antes de liberar `gestao.exportar_agregado` |
| View de auditoria expondo `dados_antes`/`dados_depois` por engano | Baixo | Muito alto | Teste explícito de ausência desses campos na view |

---

## 9. Decisões pendentes antes da implementação

| Ref. | Decisão |
| --- | --- |
| DP-01 | Quais setores existem na base? A coluna `setor` em `atendimentos` é um enum, FK ou texto livre? |
| DP-02 | O campo `capacidade_referencia` de `vw_gestao_ocupacao` existe ou precisa ser parametrizado? |
| DP-03 | O mecanismo de exportação será frontend (botão) ou backend (função RPC)? |
| DP-04 | A função de auditoria de exportação será um trigger ou chamada explícita? |
| DP-05 | `vw_gestao_relatorios` será view própria ou composição de consultas sobre as views de produção e tempos? |
| DP-06 | Views serão materializadas ou em tempo real? (nesta fase: tempo real; revisão após avaliação de desempenho) |

---

## 10. Referências

- `docs/GSI_ONE_FASE_2_4_ESPECIFICACAO_TECNICA_PERMISSOES_GERENCIAIS.md`
- `docs/GSI_ONE_FASE_2_5_IMPLEMENTACAO_PERMISSOES_GERENCIAIS.md`
- `docs/GSI_ONE_FASE_2_6_MATRIZ_DADOS_AGREGADOS_E_ANONIMIZADOS.md`
- `docs/GSI_ONE_FASE_2_6_PLANO_TESTES_VIEWS_E_POLICIES.md`
- `supabase/migrations/20260728000001_create_gestao_permissions.sql`

# GSI ONE - Fase 2.4: Especificação Técnica das Permissões Gerenciais

**Fase:** 2.4 - Especificação técnica das permissões gerenciais
**Data:** 2026-07-28
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto:** gsi-one-homologacao
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Especificação técnica — sem migration, sem alteração de banco, sem criação de usuários

---

## 1. Contexto

Este documento descreve a especificação técnica das permissões gerenciais a serem implementadas em fase futura, com base na aprovação institucional registrada em `GSI_ONE_FASE_2_4_APROVACAO_PERFIS_GERENCIAIS.md`.

Nenhuma permissão é criada, alterada ou excluída por este documento. Nenhuma migration é executada. Nenhum grant é aplicado. Nenhuma policy é alterada.

Este documento serve como referência técnica para a Fase 2.5, que produzirá a migration e aplicará as mudanças mediante autorização expressa.

---

## 2. Premissas técnicas

- O banco de dados opera com Row Level Security (RLS) ativo em todas as tabelas do schema `public`.
- Permissões são armazenadas na tabela `permissoes` e vinculadas a perfis pela tabela `perfil_permissoes`.
- Perfis são definidos na tabela `perfis`.
- O controle de acesso é feito por combinação de perfil → permissão → RLS policy → função verificadora.
- Permissões gerenciais novas devem ter nomes que reflitam claramente o escopo gerencial, separados das permissões clínicas existentes.
- Permissões existentes com escopo clínico (`paciente.visualizar`, `atendimento.visualizar`, `consulta.visualizar`) não devem ser reutilizadas para escopo gerencial.

---

## 3. Permissões gerenciais a serem criadas

### 3.1 Tabela de permissões propostas

As permissões abaixo são propostas para criação futura em migration específica.

Para cada permissão, são definidos:

- **Finalidade:** objetivo institucional da permissão.
- **Perfil destinatário:** qual perfil recebe esta permissão.
- **Dados alcançados:** quais dados ficam acessíveis.
- **Dado nominal:** se a permissão permite acesso a dado individual identificável.
- **Exportação:** se a permissão permite exportação de dados.
- **Risco:** risco residual associado.
- **Justificativa:** razão institucional para criação.
- **Estado:** APROVADA / NÃO APROVADA / PENDENTE.

---

#### Permissão: `gestao.indicadores.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar a visualização de indicadores operacionais e institucionais agregados, como taxa de ocupação, média de permanência, tempo médio de atendimento e produção por setor. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Indicadores agregados por setor, período e fluxo. Sem dado clínico individual por padrão. |
| **Dado nominal** | Não |
| **Exportação** | Não por esta permissão. Exportação requer `gestao.exportar`. |
| **Risco** | Baixo. Dados agregados sem identificação individual. |
| **Justificativa** | Suporte à gestão operacional e estratégica do hospital. Evita reutilização de `indicador.visualizar` existente, cujo escopo pode ser clínico ou mais amplo. |
| **Estado** | APROVADA |

---

#### Permissão: `gestao.relatorios.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar a consulta de relatórios gerenciais e operacionais produzidos pelo sistema. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Relatórios institucionais e operacionais. Escopo nominal somente se relatório específico for autorizado separadamente. |
| **Dado nominal** | Não por padrão. Relatórios nominais requerem aprovação específica adicional. |
| **Exportação** | Não por esta permissão. Exportação requer `gestao.exportar`. |
| **Risco** | Médio. Relatórios podem conter dados operacionais sensíveis dependendo do escopo. Mitigado por filtro de tipo de relatório na RLS. |
| **Justificativa** | Suporte à gestão institucional. Separa leitura gerencial de relatórios clínicos individuais. |
| **Estado** | APROVADA |

---

#### Permissão: `gestao.producao.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar a visualização da produção hospitalar por setor, equipe e período, incluindo contagens de atendimentos, consultas, procedimentos e saídas. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Produção agregada por dimensão (setor, equipe, período, fluxo). Sem dado clínico individual. |
| **Dado nominal** | Não |
| **Exportação** | Não por esta permissão. Exportação requer `gestao.exportar`. |
| **Risco** | Baixo. Dados de produção são operacionais e agregados. |
| **Justificativa** | Monitoramento da capacidade produtiva e do desempenho institucional. |
| **Estado** | APROVADA |

---

#### Permissão: `gestao.tempos.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar a visualização dos tempos assistenciais agregados, como tempo de espera, tempo de atendimento, tempo de permanência em observação e tempo de transferência. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Tempos assistenciais agregados por fluxo, setor e período. Sem identificação nominal de pacientes por padrão. |
| **Dado nominal** | Não por padrão |
| **Exportação** | Não por esta permissão. Exportação requer `gestao.exportar`. |
| **Risco** | Baixo quando agregado. Médio se granularidade por paciente for introduzida futuramente — exigirá revisão. |
| **Justificativa** | Monitoramento da qualidade assistencial e dos fluxos operacionais. |
| **Estado** | APROVADA |

---

#### Permissão: `gestao.ocupacao.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar a visualização da ocupação hospitalar agregada, como taxa de ocupação de leitos, disponibilidade por setor e histórico de internações. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Dados de ocupação agregados por setor, tipo de leito e período. Sem identificação nominal de pacientes por padrão. |
| **Dado nominal** | Não por padrão |
| **Exportação** | Não por esta permissão. Exportação requer `gestao.exportar`. |
| **Risco** | Baixo quando agregado. Risco aumenta se mapa de leitos individuais for vinculado sem controle nominal. |
| **Justificativa** | Gestão da capacidade instalada e planejamento operacional. |
| **Estado** | APROVADA |

---

#### Permissão: `gestao.fluxos.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar o acompanhamento dos fluxos hospitalares e filas operacionais, incluindo status agregado de setores como triagem, observação, sala de estabilização e transferências. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Status agregado de fluxos e filas. Contagens por status, setor e período. Sem dado clínico individual por padrão. |
| **Dado nominal** | Não por padrão |
| **Exportação** | Não por esta permissão |
| **Risco** | Médio. Visão de fluxo pode revelar gargalos e padrões operacionais sensíveis. Mitigado por agregação. |
| **Justificativa** | Monitoramento operacional em tempo gerencial. Suporte à tomada de decisão da direção hospitalar. |
| **Estado** | APROVADA |

---

#### Permissão: `gestao.setores.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar o acompanhamento gerencial por setor, incluindo atividade, status operacional e indicadores por área. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Dados operacionais por setor: status, contagens, alertas e indicadores de desempenho. Sem dado clínico individual. |
| **Dado nominal** | Não |
| **Exportação** | Não por esta permissão |
| **Risco** | Baixo |
| **Justificativa** | Acompanhamento da operação hospitalar por área funcional. |
| **Estado** | APROVADA |

---

#### Permissão: `gestao.dados_nominais.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar o acesso excepcional a dados nominais de pacientes quando necessário para resolução de situações operacionais específicas e devidamente justificadas. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Dados nominais de pacientes em situações operacionais justificadas: nome, número de atendimento, setor, status. Não inclui dados clínicos detalhados (diagnóstico, prescrição, evolução). |
| **Dado nominal** | Sim — acesso condicional e não automático |
| **Exportação** | Não por esta permissão |
| **Risco** | Alto. Acesso nominal sempre exige justificativa, rastreabilidade e auditoria. Deve ser concedido individualmente, não em lote. |
| **Justificativa** | Situações excepcionais de gestão operacional podem exigir identificação de paciente específico. Separar esta permissão das permissões clínicas garante rastreabilidade e controle de concessão. |
| **Estado** | APROVADA CONDICIONAL — não atribuída automaticamente ao perfil; concedida caso a caso com aprovação institucional. |

---

#### Permissão: `gestao.auditoria.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar a consulta controlada da trilha de auditoria do sistema, com recorte institucional a ser definido. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | A definir: eventos de auditoria por período, por perfil ou por ação, conforme recorte institucional aprovado. |
| **Dado nominal** | Possivelmente — depende do recorte da trilha. |
| **Exportação** | Não por esta permissão |
| **Risco** | Médio a alto. A trilha de auditoria pode conter dados sensíveis sobre usuários e ações clínicas. Recorte precisa ser cuidadosamente definido. |
| **Justificativa** | Gestão hospitalar pode necessitar de visibilidade sobre ações do sistema para fins de governança. |
| **Estado** | PENDENTE — aguarda decisão sobre recorte e finalidade. |

---

#### Permissão: `gestao.exportar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Gestão Hospitalar a exportação de relatórios e indicadores para formatos externos (CSV, PDF ou equivalente), com escopo restrito a dados agregados e mediante registro auditável da exportação. |
| **Perfil destinatário** | Gestão Hospitalar |
| **Dados alcançados** | Relatórios e indicadores agregados previamente autorizados. Exportação nominal permanece pendente. |
| **Dado nominal** | Não por padrão. Exportação nominal segue pendente e exige decisão expressa separada. |
| **Exportação** | Sim — esta é a permissão que habilita exportação. Todo uso deve gerar registro auditável. |
| **Risco** | Médio. Exportação amplia o escopo de distribuição dos dados. Mitigado por restrição a dados agregados e por registro de auditoria. |
| **Justificativa** | Suporte à prestação de contas, relatórios para secretaria de saúde, auditorias externas e relatórios institucionais. |
| **Estado** | PENDENTE — aguarda decisão final sobre quais relatórios são exportáveis e quais controles são exigidos. |

---

#### Permissão: `leitura.indicadores.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Leitura/Gestor a visualização de indicadores institucionais e operacionais agregados. |
| **Perfil destinatário** | Leitura/Gestor |
| **Dados alcançados** | Indicadores agregados por setor, período e fluxo. Sem dado clínico individual. |
| **Dado nominal** | Não |
| **Exportação** | Não |
| **Risco** | Baixo |
| **Justificativa** | Suporte à função consultiva e de acompanhamento institucional do perfil Leitura/Gestor. |
| **Estado** | APROVADA |

---

#### Permissão: `leitura.relatorios.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Leitura/Gestor a consulta de relatórios gerenciais e institucionais agregados. |
| **Perfil destinatário** | Leitura/Gestor |
| **Dados alcançados** | Relatórios institucionais agregados. Sem dado clínico individual por padrão. |
| **Dado nominal** | Não por padrão |
| **Exportação** | Não |
| **Risco** | Baixo quando restrito a dados agregados. |
| **Justificativa** | Suporte à função consultiva do perfil Leitura/Gestor. |
| **Estado** | APROVADA |

---

#### Permissão: `leitura.paineis.visualizar`

| Atributo | Valor |
| --- | --- |
| **Finalidade** | Permitir ao perfil Leitura/Gestor a visualização de painéis institucionais, incluindo painéis de indicadores, painéis de produção e painéis de ocupação. |
| **Perfil destinatário** | Leitura/Gestor |
| **Dados alcançados** | Dados agregados apresentados em painéis. Sem dado clínico individual. |
| **Dado nominal** | Não |
| **Exportação** | Não |
| **Risco** | Baixo |
| **Justificativa** | Acesso mínimo necessário para cumprir a finalidade consultiva do perfil Leitura/Gestor. |
| **Estado** | APROVADA |

---

## 4. Resumo do estado das permissões propostas

| Permissão | Perfil destinatário | Estado | Dado nominal | Exportação |
| --- | --- | --- | --- | --- |
| `gestao.indicadores.visualizar` | Gestão Hospitalar | APROVADA | Não | Não |
| `gestao.relatorios.visualizar` | Gestão Hospitalar | APROVADA | Não por padrão | Não |
| `gestao.producao.visualizar` | Gestão Hospitalar | APROVADA | Não | Não |
| `gestao.tempos.visualizar` | Gestão Hospitalar | APROVADA | Não por padrão | Não |
| `gestao.ocupacao.visualizar` | Gestão Hospitalar | APROVADA | Não por padrão | Não |
| `gestao.fluxos.visualizar` | Gestão Hospitalar | APROVADA | Não por padrão | Não |
| `gestao.setores.visualizar` | Gestão Hospitalar | APROVADA | Não | Não |
| `gestao.dados_nominais.visualizar` | Gestão Hospitalar | APROVADA CONDICIONAL | Sim | Não |
| `gestao.auditoria.visualizar` | Gestão Hospitalar | PENDENTE | A definir | Não |
| `gestao.exportar` | Gestão Hospitalar | PENDENTE | Não por padrão | Sim |
| `leitura.indicadores.visualizar` | Leitura/Gestor | APROVADA | Não | Não |
| `leitura.relatorios.visualizar` | Leitura/Gestor | APROVADA | Não por padrão | Não |
| `leitura.paineis.visualizar` | Leitura/Gestor | APROVADA | Não | Não |

---

## 5. Vínculos perfil → permissão propostos

### 5.1 Gestão Hospitalar — permissões a vincular (atribuição padrão)

As seguintes permissões devem ser vinculadas ao perfil **Gestão Hospitalar** na migration futura:

| Permissão | Atribuição |
| --- | --- |
| `gestao.indicadores.visualizar` | Automática para todos os usuários do perfil |
| `gestao.relatorios.visualizar` | Automática para todos os usuários do perfil |
| `gestao.producao.visualizar` | Automática para todos os usuários do perfil |
| `gestao.tempos.visualizar` | Automática para todos os usuários do perfil |
| `gestao.ocupacao.visualizar` | Automática para todos os usuários do perfil |
| `gestao.fluxos.visualizar` | Automática para todos os usuários do perfil |
| `gestao.setores.visualizar` | Automática para todos os usuários do perfil |
| `gestao.dados_nominais.visualizar` | **NÃO AUTOMÁTICA** — concedida individualmente, caso a caso, com aprovação institucional registrada |
| `gestao.auditoria.visualizar` | **PENDENTE** — não vincular até decisão sobre recorte |
| `gestao.exportar` | **PENDENTE** — não vincular até decisão sobre escopo |

### 5.2 Leitura/Gestor — permissões a vincular

As seguintes permissões devem ser vinculadas ao perfil **Leitura/Gestor** na migration futura:

| Permissão | Atribuição |
| --- | --- |
| `leitura.indicadores.visualizar` | Automática para todos os usuários do perfil |
| `leitura.relatorios.visualizar` | Automática para todos os usuários do perfil |
| `leitura.paineis.visualizar` | Automática para todos os usuários do perfil |

### 5.3 Permissões que NÃO devem ser vinculadas a nenhum dos dois perfis

| Permissão | Proibição |
| --- | --- |
| `paciente.visualizar` | Não vincular automaticamente a nenhum dos dois perfis |
| `atendimento.visualizar` | Não vincular automaticamente a nenhum dos dois perfis |
| `consulta.visualizar` | Não vincular a nenhum dos dois perfis em nenhuma circunstância sem decisão expressa |
| Qualquer permissão de escrita (`INSERT`, `UPDATE`, `DELETE`) | Não vincular a nenhum dos dois perfis |

---

## 6. Impacto esperado em RLS

### 6.1 Premissa

As permissões gerenciais propostas devem ser respeitadas pelas policies de RLS. A implementação técnica deverá criar policies que:

- restrinjam `SELECT` em views ou tabelas gerenciais ao perfil que possui a permissão correspondente;
- garantam que `INSERT`, `UPDATE` e `DELETE` nunca sejam permitidos pelos perfis **Gestão Hospitalar** ou **Leitura/Gestor** em nenhuma tabela do schema `public`;
- verifiquem a permissão do usuário autenticado via função verificadora existente no banco;
- isolem os dados nominais, exigindo a permissão `gestao.dados_nominais.visualizar` para qualquer acesso nominal por parte de Gestão Hospitalar.

### 6.2 Avaliação de necessidade de novas policies

| Área | Nova policy necessária? | Observação |
| --- | --- | --- |
| Views agregadas de indicadores | Sim — policy `SELECT` para perfil Gestão Hospitalar e Leitura/Gestor | Dependente da criação das views agregadas |
| Views agregadas de relatórios | Sim — policy `SELECT` para perfil Gestão Hospitalar e Leitura/Gestor | Dependente da criação das views agregadas |
| Views agregadas de produção, tempos, ocupação, fluxos, setores | Sim — policy `SELECT` para Gestão Hospitalar | Dependente das views |
| Tabelas clínicas (`pacientes`, `atendimentos`, `consultas`, etc.) | Não alterar as policies existentes | Manter restrição atual; os dois perfis gerenciais não devem passar pela RLS dessas tabelas |
| Tabela `permissoes` | Não alterar | Apenas `SELECT` de leitura de metadados, se necessário |
| Tabela `perfil_permissoes` | Não alterar | Administração de vínculos permanece restrita a perfis administrativos |

### 6.3 Proibições técnicas em RLS

- Não criar policy que permita `INSERT`, `UPDATE` ou `DELETE` para Gestão Hospitalar ou Leitura/Gestor.
- Não ampliar policy existente de tabelas clínicas para incluir perfis gerenciais sem decisão expressa.
- Não remover ou enfraquecer políticas de RLS existentes.
- Não criar atalhos via `SECURITY DEFINER` que contornem a verificação de perfil.

---

## 7. Necessidade de views agregadas

Para que as permissões gerenciais funcionem com segurança, é esperada a criação de views específicas:

| View proposta | Dados | Dado nominal | Perfil |
| --- | --- | --- | --- |
| `vw_gestao_indicadores` | Indicadores operacionais agregados | Não | Gestão Hospitalar |
| `vw_gestao_producao` | Produção por setor, equipe e período | Não | Gestão Hospitalar |
| `vw_gestao_tempos` | Tempos assistenciais agregados | Não | Gestão Hospitalar |
| `vw_gestao_ocupacao` | Ocupação por setor e tipo de leito | Não | Gestão Hospitalar |
| `vw_gestao_fluxos` | Status de fluxos e filas | Não por padrão | Gestão Hospitalar |
| `vw_gestao_setores` | Atividade e status por setor | Não | Gestão Hospitalar |
| `vw_leitura_indicadores` | Indicadores agregados para perfil consultivo | Não | Leitura/Gestor |
| `vw_leitura_relatorios` | Relatórios agregados para perfil consultivo | Não | Leitura/Gestor |
| `vw_leitura_paineis` | Painéis consolidados para perfil consultivo | Não | Leitura/Gestor |

**Observação:** as views devem ser criadas com escopo mínimo e sem JOIN direto a dados clínicos individuais sensíveis. Cada view deverá ser validada antes da ativação das permissões correspondentes.

---

## 8. Necessidade de views anonimizadas

Para os casos em que um dado operacional pode conter referência a paciente, mas a finalidade gerencial não exige identificação, recomenda-se a criação de variantes anonimizadas:

| View anonimizada proposta | Dado substituído | Finalidade |
| --- | --- | --- |
| `vw_gestao_tempos_anonimizado` | Substitui identificador do paciente por hash ou token opaco | Tempos por atendimento sem identificação nominal |
| `vw_gestao_fluxos_anonimizado` | Substitui nome e CPF por token | Status de fila sem identificação nominal |

A necessidade real de views anonimizadas dependerá do design da migration e será avaliada na Fase 2.5.

---

## 9. Necessidade de testes

Os seguintes testes de segurança devem ser criados e executados antes da ativação das permissões em ambiente de homologação:

| Teste | Objetivo |
| --- | --- |
| Gestão Hospitalar não consegue executar `INSERT` em nenhuma tabela clínica | Validar restrição de escrita |
| Gestão Hospitalar não consegue executar `UPDATE` em nenhuma tabela clínica | Validar restrição de escrita |
| Gestão Hospitalar não consegue executar `DELETE` em nenhuma tabela | Validar proibição de exclusão |
| Gestão Hospitalar não acessa `paciente.visualizar` via permissão automática | Validar que a permissão não foi vinculada |
| Gestão Hospitalar não acessa `atendimento.visualizar` via permissão automática | Validar que a permissão não foi vinculada |
| Gestão Hospitalar não acessa `consulta.visualizar` | Validar proibição explícita |
| Gestão Hospitalar sem `gestao.dados_nominais.visualizar` não acessa dados nominais | Validar restrição da permissão condicional |
| Leitura/Gestor não consegue executar `INSERT`, `UPDATE` ou `DELETE` em nenhuma tabela | Validar restrição total de escrita |
| Leitura/Gestor não acessa dados nominais | Validar proibição por padrão |
| Leitura/Gestor não acessa `paciente.visualizar`, `atendimento.visualizar` ou `consulta.visualizar` | Validar que as permissões não foram vinculadas |
| Leitura/Gestor acessa `leitura.indicadores.visualizar` e obtém dados agregados | Validar que a permissão funciona |
| Views agregadas não expõem dado nominal sem permissão correspondente | Validar isolamento de dados |

---

## 10. Migration futura

A migration futura, a ser proposta na Fase 2.5, deverá:

1. Criar as permissões gerenciais na tabela `permissoes` com os nomes e finalidades definidos neste documento.
2. Vincular as permissões APROVADAS aos perfis correspondentes na tabela `perfil_permissoes`.
3. Não vincular as permissões PENDENTES.
4. Não vincular `gestao.dados_nominais.visualizar` automaticamente.
5. Criar as views agregadas necessárias.
6. Criar ou atualizar policies de RLS para as views, garantindo isolamento por perfil e permissão.
7. Não alterar nenhuma migration existente.
8. Não alterar policies de tabelas clínicas.

**Nome sugerido da migration:**

```
20260728000001_create_gestao_permissions.sql
```

ou conforme convenção de nomenclatura vigente no repositório.

---

## 11. Rollback futuro

O rollback da migration futura deverá:

1. Remover os vínculos da tabela `perfil_permissoes` criados pela migration.
2. Remover as permissões criadas na tabela `permissoes`.
3. Remover as views agregadas criadas.
4. Remover as policies de RLS criadas para as views.
5. Restaurar o estado anterior de todas as tabelas afetadas.
6. Não alterar dados clínicos, registros de auditoria ou migrations anteriores.

---

## 12. Critérios para usuários fictícios de teste

Nenhum usuário fictício deve ser criado antes da aprovação da migration e da conclusão dos testes de segurança.

Quando a criação de usuários fictícios for autorizada, os seguintes critérios devem ser observados:

| Critério | Regra |
| --- | --- |
| Nome | Fictício e explicitamente não-real (ex.: "Gestor Teste 01") |
| E-mail | Domínio fictício ou de teste (ex.: `@gsi-teste.local`) |
| CPF | Não incluir CPF real em nenhuma hipótese |
| Perfil | Vinculado ao perfil correto (Gestão Hospitalar ou Leitura/Gestor) |
| Dados clínicos | Nenhum dado clínico real associado |
| Finalidade | Exclusivamente para validação técnica de permissões e RLS |
| Ambiente | Somente em homologação, nunca em produção |
| Remoção | Usuários fictícios de teste devem ser removidos após validação, salvo autorização para manutenção |

---

## 13. Ordem de implementação recomendada

A ordem a seguir minimiza riscos e permite validação incremental:

| Etapa | Ação | Pré-requisito |
| --- | --- | --- |
| 1 | Criar permissões gerenciais APROVADAS na tabela `permissoes` | Aprovação da migration pela equipe técnica |
| 2 | Criar views agregadas sem dado nominal | Aprovação do design das views |
| 3 | Criar policies de RLS para as views (somente `SELECT`) | Views validadas |
| 4 | Vincular permissões APROVADAS aos perfis na tabela `perfil_permissoes` | Policies validadas |
| 5 | Criar usuários fictícios de teste nos dois perfis | Autorização expressa |
| 6 | Executar testes de segurança | Usuários criados |
| 7 | Validar que nenhuma permissão clínica foi atribuída automaticamente | Testes concluídos |
| 8 | Registrar resultado dos testes em documento de validação da Fase 2.5 | Testes concluídos |
| 9 | Avaliar permissões PENDENTES (`gestao.auditoria.visualizar`, `gestao.exportar`) | Decisão institucional |
| 10 | Implementar permissões PENDENTES se aprovadas | Aprovação expressa |

---

## 14. Riscos técnicos residuais

| Risco | Probabilidade | Impacto | Mitigação |
| --- | --- | --- | --- |
| View agregada com JOIN que expõe dado clínico individual não intencional | Médio | Alto | Revisar cada view antes de ativar a permissão correspondente |
| Policy de RLS criada com escopo mais amplo do que o necessário | Médio | Alto | Revisar cada policy com teste explícito de isolamento por perfil |
| Permissão `gestao.dados_nominais.visualizar` atribuída automaticamente por erro | Baixo | Alto | Verificação explícita na validação pós-migration |
| Permissão clínica vinculada por acidente ao perfil gerencial | Baixo | Muito alto | Teste obrigatório: verificar ausência de `paciente.visualizar`, `atendimento.visualizar` e `consulta.visualizar` |
| Views anonimizadas com anonimização insuficiente | Médio | Alto | Validar função de anonimização antes de ativação |
| Exportação habilitada sem controle de auditoria | Médio | Alto | Permissão `gestao.exportar` só será vinculada após decisão sobre escopo e controles |

---

## 15. Pontos de parada obrigatórios

Os seguintes pontos de parada devem ser respeitados durante a implementação futura:

| Ponto | Condição para continuar |
| --- | --- |
| Antes de criar qualquer permissão | Aprovação expressa da migration pela equipe técnica e pelo responsável institucional |
| Antes de criar qualquer view | Validação do design da view e do escopo dos dados |
| Antes de criar qualquer policy de RLS | Validação da view e aprovação do impacto em segurança |
| Antes de vincular qualquer permissão a perfil | Policies de RLS validadas |
| Antes de criar usuários fictícios | Autorização expressa e ambiente de homologação confirmado |
| Antes de implementar permissões PENDENTES | Decisão institucional expressa sobre cada permissão pendente |
| Antes de qualquer push | Autorização expressa do responsável institucional |

---

## 16. Referências

- `docs/GSI_ONE_FASE_2_3_MATRIZ_PERFIS_GERENCIAIS.md` — Matriz preliminar de perfis gerenciais
- `docs/GSI_ONE_FASE_2_4_APROVACAO_PERFIS_GERENCIAIS.md` — Aprovação definitiva dos perfis gerenciais
- `docs/GSI_ONE_FLUXO_ASSISTENCIAL_E_PERFIS.md` — Fluxo assistencial e estrutura de perfis
- `GHAES-SESSION.md` — Regras obrigatórias da sessão GHAES
- `CLAUDE.md` — Instruções do repositório para o agente

# GSI ONE - Fase 2.4: Aprovação Definitiva dos Perfis Gerenciais

**Fase:** 2.4 - Aprovação definitiva e registro formal dos perfis gerenciais
**Data:** 2026-07-28
**Repositório:** avanca-hospital-caninde-db
**Projeto remoto:** gsi-one-homologacao
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard
**Status:** Documento de aprovação institucional — sem migration, sem alteração de banco, sem criação de usuários

---

## 1. Contexto da aprovação

Este documento registra formalmente a aprovação definitiva da matriz institucional de perfis gerenciais elaborada na Fase 2.3.

A Fase 2.3 produziu a matriz preliminar dos perfis **Gestão Hospitalar** e **Leitura/Gestor**, com capacidades classificadas como APROVADO, NÃO APROVADO ou PENDENTE DE DECISÃO.

A Fase 2.4 consolida as decisões tomadas pelo responsável institucional e registra o estado definitivo de cada capacidade e permissão, habilitando a Fase 2.5 de especificação técnica completa e a Fase 2.6 de implementação.

Estado confirmado no momento da aprovação:

| Item | Estado |
| --- | --- |
| Ambiente | computador do trabalho |
| Branch | `main` limpa e sincronizada com `origin/main` |
| Commit base | `3daaa35 docs: remove trailing whitespace from managerial profile matrix` |
| Projeto remoto | `gsi-one-homologacao` validado |
| Fase 2.3 | publicada e aprovada pelo responsável |
| Usuários | nenhum usuário fictício criado |
| Dados clínicos | nenhum dado clínico presente |
| Stashes antigos | não aplicar |

---

## 2. Aprovação formal do perfil Gestão Hospitalar

### 2.1 Capacidades APROVADAS

O responsável institucional aprovou as seguintes capacidades para o perfil **Gestão Hospitalar**:

| Capacidade aprovada | Observação |
| --- | --- |
| Visualizar indicadores operacionais | Dados agregados por padrão |
| Visualizar relatórios gerenciais | Conforme escopo institucional |
| Visualizar produção por setor e período | Dados agregados por padrão |
| Visualizar tempos assistenciais | Dados agregados por padrão |
| Visualizar ocupação hospitalar | Dados agregados por padrão |
| Acompanhar fluxos e filas operacionais | Visão gerencial sem exposição nominal por padrão |
| Visualizar acompanhamento de setores | Somente leitura gerencial |

### 2.2 Capacidades NÃO APROVADAS

O responsável institucional confirma como NÃO APROVADAS as seguintes capacidades:

| Capacidade | Decisão | Justificativa |
| --- | --- | --- |
| Editar prontuário | NÃO APROVADO | Ação clínica exclusiva de profissional habilitado |
| Prescrever | NÃO APROVADO | Ação clínica exclusiva de médico/enfermeiro habilitado |
| Alterar conduta clínica | NÃO APROVADO | Ação clínica exclusiva de profissional habilitado |
| Inserir registros clínicos | NÃO APROVADO | Sem habilitação clínica no perfil gerencial |
| Alterar cadastro de paciente | NÃO APROVADO | Sem habilitação operacional de cadastro |
| Excluir registros fisicamente | NÃO APROVADO | Exclusão física proibida para todos os perfis gerenciais |
| Receber `consulta.visualizar` | NÃO APROVADO | Permissão clínica incompatível com perfil gerencial |
| Visualizar prescrições individuais | NÃO APROVADO | Dado clínico sensível sem necessidade gerencial aprovada |

### 2.3 Decisões tomadas sobre itens anteriormente PENDENTES

As seguintes decisões foram tomadas explicitamente pelo responsável institucional:

| Ref. | Decisão pendente (Fase 2.3) | Decisão tomada | Condição |
| --- | --- | --- | --- |
| D1 | Gestão Hospitalar poderá visualizar dados nominais? | APROVADO CONDICIONAL | Somente quando necessário para gestão operacional e mediante permissão específica. Não atribuído automaticamente. |
| D3 | Receberá `paciente.visualizar`? | NÃO APROVADO AUTOMATICAMENTE | Não recebe automaticamente. Poderá ser concedido caso a caso com decisão expressa. |
| D4 | Receberá `atendimento.visualizar`? | NÃO APROVADO AUTOMATICAMENTE | Não recebe automaticamente. Poderá ser concedido caso a caso com decisão expressa. |
| D5 | Visualizará exames clínicos individuais? | PENDENTE | Aguarda decisão específica sobre indicadores vs. dado individual. |
| D6 | Consultará auditoria? | PENDENTE | Aguarda decisão sobre recorte e finalidade do acesso à trilha. |
| D7 | Visualizará usuários/perfis sem administrá-los? | PENDENTE | Aguarda decisão sobre necessidade operacional. |
| D8 | Poderá alterar configurações operacionais não clínicas? | PENDENTE | Aguarda decisão sobre quais configurações e quais riscos. |
| D9 | Exportação será permitida? | PENDENTE | Exportação agregada poderá ser aprovada; exportação nominal segue pendente. |

### 2.4 Restrições confirmadas e permanentes

As seguintes restrições são permanentes para **Gestão Hospitalar** e não serão revisadas sem decisão institucional formal:

- `paciente.visualizar` não é atribuída automaticamente;
- `atendimento.visualizar` não é atribuída automaticamente;
- `consulta.visualizar` não é atribuída em nenhuma circunstância sem decisão expressa específica;
- exclusão física de qualquer registro está proibida;
- ações clínicas estão proibidas;
- acesso nominal requer permissão específica e justificativa registrada.

---

## 3. Aprovação formal do perfil Leitura/Gestor

### 3.1 Capacidades APROVADAS

O responsável institucional aprovou as seguintes capacidades para o perfil **Leitura/Gestor**:

| Capacidade aprovada | Observação |
| --- | --- |
| Visualizar indicadores | Preferencialmente dados agregados e anonimizados |
| Visualizar relatórios | Preferencialmente dados agregados e anonimizados |
| Visualizar painéis | Preferencialmente dados agregados e anonimizados |
| Leitura de dados agregados | Sem exposição nominal por padrão |
| Leitura de dados anonimizados ou pseudonimizados | Quando disponíveis, prioridade de uso |

### 3.2 Capacidades NÃO APROVADAS

O responsável institucional confirma como NÃO APROVADAS todas as seguintes capacidades para **Leitura/Gestor**:

| Capacidade | Decisão |
| --- | --- |
| Cadastrar qualquer registro | NÃO APROVADO |
| Editar qualquer registro | NÃO APROVADO |
| Configurar o sistema | NÃO APROVADO |
| Realizar ações clínicas | NÃO APROVADO |
| Excluir qualquer registro | NÃO APROVADO |
| Acesso nominal por padrão | NÃO APROVADO |
| Receber `paciente.visualizar` automaticamente | NÃO APROVADO |
| Receber `atendimento.visualizar` automaticamente | NÃO APROVADO |
| Receber `consulta.visualizar` | NÃO APROVADO |
| Gerir usuários ou perfis | NÃO APROVADO |
| Exportar dados nominais | NÃO APROVADO |

### 3.3 Decisões tomadas sobre itens anteriormente PENDENTES

| Ref. | Decisão pendente (Fase 2.3) | Decisão tomada | Condição |
| --- | --- | --- | --- |
| D2 | Leitura/Gestor poderá visualizar dados nominais? | NÃO APROVADO POR PADRÃO | Permanece somente leitura agregada/anonimizada. Acesso nominal exige aprovação expressa. |
| D3 | Receberá `paciente.visualizar`? | NÃO APROVADO AUTOMATICAMENTE | Não recebe automaticamente em nenhuma circunstância. |
| D4 | Receberá `atendimento.visualizar`? | NÃO APROVADO AUTOMATICAMENTE | Não recebe automaticamente em nenhuma circunstância. |
| D5 | Visualizará exames clínicos individuais? | NÃO APROVADO | Apenas indicadores agregados. |
| D6 | Consultará auditoria? | PENDENTE | Aguarda decisão sobre recorte e finalidade. |
| D9 | Exportação? | PENDENTE | Apenas exportação agregada poderá ser considerada; exportação nominal: NÃO APROVADO. |

### 3.4 Restrições confirmadas e permanentes

As seguintes restrições são permanentes para **Leitura/Gestor** e não serão revisadas sem decisão institucional formal:

- perfil estritamente somente leitura (`SELECT` apenas);
- `INSERT`, `UPDATE` e `DELETE` proibidos em qualquer tabela;
- `paciente.visualizar` não é atribuída automaticamente;
- `atendimento.visualizar` não é atribuída automaticamente;
- `consulta.visualizar` não é atribuída em nenhuma circunstância;
- dados nominais não são expostos por padrão;
- exportação nominal está proibida;
- ações clínicas, de configuração e de gestão de usuários estão proibidas.

---

## 4. Matriz definitiva perfil x capacidade

Legenda:

- **APROVADO:** capacidade formalmente aprovada para implementação na próxima fase técnica.
- **NÃO APROVADO:** capacidade formalmente negada; não deve ser implementada.
- **PENDENTE:** aguarda decisão institucional específica antes de qualquer implementação.
- **APROVADO CONDICIONAL:** aprovado apenas sob condição explicitamente registrada.

| Capacidade | Gestão Hospitalar | Leitura/Gestor |
| --- | --- | --- |
| Visualizar indicadores operacionais agregados | APROVADO | APROVADO |
| Visualizar relatórios gerenciais agregados | APROVADO | APROVADO |
| Visualizar produção por setor/período | APROVADO | APROVADO |
| Visualizar tempos assistenciais agregados | APROVADO | APROVADO |
| Visualizar ocupação agregada | APROVADO | APROVADO |
| Visualizar fluxos e filas operacionais | APROVADO | APROVADO |
| Visualizar acompanhamento de setores | APROVADO | APROVADO |
| Visualizar painéis institucionais | APROVADO | APROVADO |
| Visualizar dados nominais de pacientes | APROVADO CONDICIONAL | NÃO APROVADO por padrão |
| Receber `paciente.visualizar` | NÃO APROVADO automaticamente | NÃO APROVADO automaticamente |
| Receber `atendimento.visualizar` | NÃO APROVADO automaticamente | NÃO APROVADO automaticamente |
| Receber `consulta.visualizar` | NÃO APROVADO | NÃO APROVADO |
| Visualizar prescrições individuais | NÃO APROVADO | NÃO APROVADO |
| Visualizar exames clínicos individuais | PENDENTE | NÃO APROVADO |
| Inserir registros clínicos | NÃO APROVADO | NÃO APROVADO |
| Atualizar prontuário | NÃO APROVADO | NÃO APROVADO |
| Prescrever | NÃO APROVADO | NÃO APROVADO |
| Alterar conduta clínica | NÃO APROVADO | NÃO APROVADO |
| Alterar cadastro de paciente | NÃO APROVADO | NÃO APROVADO |
| Gerir usuários | PENDENTE | NÃO APROVADO |
| Alterar configurações do sistema | PENDENTE | NÃO APROVADO |
| Consultar auditoria | PENDENTE | PENDENTE |
| Exportar relatórios agregados | PENDENTE | PENDENTE |
| Exportar dados nominais | PENDENTE | NÃO APROVADO |
| Excluir registros | NÃO APROVADO | NÃO APROVADO |

---

## 5. Decisões pendentes remanescentes

As seguintes decisões permanecem pendentes após a Fase 2.4 e devem ser resolvidas antes da implementação dos recursos correspondentes:

| Ref. | Decisão pendente | Perfil afetado |
| --- | --- | --- |
| D5 | Exames clínicos individuais serão visíveis para Gestão Hospitalar? Se sim, apenas agregados ou por paciente? | Gestão Hospitalar |
| D6 | Perfis gerenciais terão acesso à trilha de auditoria? Com qual recorte temporal, funcional e de dados? | Ambos |
| D7 | Gestão Hospitalar poderá visualizar lista de usuários e perfis sem administrá-los? | Gestão Hospitalar |
| D8 | Gestão Hospitalar poderá alterar configurações operacionais não clínicas (ex.: parâmetros de setor)? | Gestão Hospitalar |
| D9a | Exportação de relatórios agregados será aprovada? Para quais formatos e com quais controles? | Ambos |
| D9b | Exportação nominal permanece proibida para Leitura/Gestor de forma definitiva? | Leitura/Gestor |

---

## 6. Responsabilidades e próxima etapa

### 6.1 Responsável pela aprovação

A aprovação registrada neste documento é de responsabilidade do responsável institucional do projeto GSI ONE — Hospital de Canindé.

### 6.2 Próxima etapa habilitada

Com a aprovação formal desta fase, fica habilitada a Fase 2.4 de especificação técnica, que deverá:

- propor as permissões gerenciais específicas a serem criadas;
- definir o vínculo perfil → permissão para cada capacidade aprovada;
- identificar o impacto esperado em RLS, policies, views e testes;
- definir views agregadas e anonimizadas necessárias;
- propor a migration futura e o rollback correspondente;
- definir os critérios para criação de usuários fictícios de teste;
- definir a ordem de implementação e os pontos de parada;
- identificar riscos técnicos residuais.

### 6.3 Proibições que permanecem em vigor até decisão contrária

- Não alterar RLS.
- Não alterar policies.
- Não alterar grants.
- Não criar usuários.
- Não executar migrations.
- Não executar comandos Supabase.
- Não aplicar stash.
- Não executar git add, commit ou push sem autorização expressa.

---

## 7. Riscos remanescentes

| Risco | Impacto | Mitigação aprovada |
| --- | --- | --- |
| Ampliação gradual e não controlada de permissões gerenciais | Exposição não intencional de dados sensíveis | Toda ampliação exige decisão expressa registrada em documento de fase |
| Reutilização inadequada de permissões clínicas existentes | Acesso clínico irrestrito por permissão de nome genérico | Criação de permissões gerenciais específicas com escopo definido |
| Dados nominais expostos por padrão em painéis | Violação de sigilo e LGPD | Permissão nominal exige justificativa e aprovação específica |
| Exportação nominal sem controle | Vazamento de dados sensíveis | Exportação nominal NÃO APROVADA para Leitura/Gestor; PENDENTE para Gestão Hospitalar |
| Confusão entre leitura gerencial e acesso a prontuário | Erosão dos controles clínicos | Proibição explícita de `consulta.visualizar` para ambos os perfis |

---

## 8. Histórico da fase

| Etapa | Data | Resultado |
| --- | --- | --- |
| Fase 2.3 — Matriz preliminar elaborada | 2026-07-27 | Documento institucional publicado e aprovado |
| Fase 2.4 — Aprovação definitiva registrada | 2026-07-28 | Este documento |
| Fase 2.4 — Especificação técnica | 2026-07-28 | Ver `GSI_ONE_FASE_2_4_ESPECIFICACAO_TECNICA_PERMISSOES_GERENCIAIS.md` |

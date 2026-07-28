# GSI ONE - Fase 2.3: Matriz de Perfis Gerenciais

**Fase:** 2.3 - Definição institucional dos perfis gerenciais  
**Data:** 2026-07-27  
**Repositório:** avanca-hospital-caninde-db  
**Projeto remoto:** gsi-one-homologacao  
**Padrão aplicado:** GHAES - Global Health AI Engineering Standard  
**Status:** Documento institucional de decisão - sem migration, sem alteração de banco e sem criação de usuários

---

## 1. Contexto da decisão

A Fase 2.3 consolida a definição institucional preliminar para dois perfis oficiais ainda sem permissões operacionais atribuídas:

- **Gestão Hospitalar**
- **Leitura/Gestor**

O objetivo desta etapa é separar a discussão institucional de governança da implementação técnica. Este documento não cria permissões, não vincula permissões a perfis, não altera RLS, não altera policies, não altera grants, não cria usuários e não executa comandos Supabase.

Estado confirmado para a decisão:

| Item | Estado |
| --- | --- |
| Ambiente | computador de casa |
| Branch | `main` limpa e sincronizada com `origin/main` |
| Commit base | `0e5d041 wip: consolidate phase 2.2 remote validation` |
| Projeto remoto | `gsi-one-homologacao` validado |
| Migrations locais/remotas | 32 locais e 32 remotas |
| RLS | todas as tabelas `public` com RLS |
| Usuários | nenhum usuário em `auth.users` |
| Dados clínicos | nenhum dado clínico |
| Stashes antigos | não aplicar |

---

## 2. Diferença entre Gestão Hospitalar e Leitura/Gestor

**Gestão Hospitalar** é um perfil gerencial-operacional. Deve apoiar a direção, coordenação e acompanhamento do funcionamento hospitalar, com foco em indicadores, produção, tempos assistenciais, ocupação, fluxos, relatórios e acompanhamento de setores.

**Leitura/Gestor** é um perfil estritamente consultivo. Deve permitir leitura de indicadores, relatórios e painéis, preferencialmente agregados e anonimizados, sem qualquer capacidade de alterar dados, executar ações clínicas, configurar o sistema ou gerir usuários.

Diferença central:

| Critério | Gestão Hospitalar | Leitura/Gestor |
| --- | --- | --- |
| Finalidade | Gestão operacional do hospital | Consulta gerencial somente leitura |
| Tipo de acesso | Gerencial, com eventual necessidade operacional nominal justificada | Somente leitura, preferencialmente agregada |
| Escrita em dados | Não aprovada para prontuário, prescrição, conduta clínica ou exclusão física | Não aprovada para qualquer `INSERT`, `UPDATE` ou `DELETE` |
| Dados nominais | Apenas quando necessário para gestão operacional e devidamente justificado | Apenas quando expressamente aprovado |

---

## 3. Princípio do menor privilégio

Os dois perfis devem seguir o princípio do menor privilégio:

- conceder somente permissões necessárias ao objetivo institucional aprovado;
- preferir painéis, views, RPCs ou relatórios com escopo limitado;
- evitar permissões clínicas amplas como solução para necessidades gerenciais;
- separar acesso agregado de acesso nominal;
- exigir decisão institucional expressa antes de ampliar leitura de dados sensíveis individuais;
- registrar toda ampliação de escopo com justificativa, impacto, risco e critério de auditoria.

---

## 4. Proibição de acesso clínico irrestrito

Nenhum dos dois perfis deve receber acesso clínico irrestrito.

Não devem ser atribuídas automaticamente as permissões:

- `paciente.visualizar`
- `atendimento.visualizar`
- `consulta.visualizar`

Essas permissões clínicas somente poderão ser vinculadas a Gestão Hospitalar ou Leitura/Gestor após decisão institucional expressa, com justificativa formal, análise de risco, impacto em RLS, impacto assistencial e regra de auditoria.

Também não estão aprovadas para esses perfis:

- edição de prontuário;
- prescrição;
- solicitação ou liberação clínica de exames;
- alteração de conduta clínica;
- evolução clínica;
- classificação de risco;
- alteração de dados assistenciais individuais;
- exclusão física de registros.

---

## 5. Escopo recomendado para Gestão Hospitalar

Escopo recomendado:

- visão gerencial do hospital;
- indicadores operacionais;
- produção por setor, equipe, período e fluxo;
- tempos assistenciais;
- ocupação;
- acompanhamento de fluxos;
- relatórios operacionais e gerenciais;
- acompanhamento de setores;
- monitoramento de gargalos;
- acompanhamento de filas e status operacionais;
- análise de desempenho institucional.

Restrições recomendadas:

- sem edição de prontuário;
- sem prescrição;
- sem alteração de conduta clínica;
- sem exclusão física;
- sem acesso irrestrito a dados sensíveis individuais;
- acesso nominal somente quando necessário para gestão operacional e devidamente justificado;
- acesso a dados clínicos detalhados somente mediante decisão institucional específica.

---

## 6. Escopo recomendado para Leitura/Gestor

Escopo recomendado:

- consulta de indicadores;
- consulta de relatórios;
- consulta de painéis;
- leitura de dados agregados;
- leitura de dados anonimizados ou pseudonimizados quando possível;
- acompanhamento institucional sem intervenção operacional direta.

Restrições recomendadas:

- sem `INSERT`;
- sem `UPDATE`;
- sem `DELETE`;
- sem ações clínicas;
- sem alteração de cadastro;
- sem gestão de usuários;
- sem configuração do sistema;
- sem exclusão;
- sem acesso nominal por padrão;
- acesso nominal somente quando expressamente aprovado.

---

## 7. Permissões existentes que podem ser utilizadas

As permissões existentes devem ser usadas somente se o nome, a finalidade e o impacto forem compatíveis com o escopo gerencial aprovado.

Permissões potencialmente reutilizáveis, condicionadas à validação institucional e técnica:

| Permissão existente | Uso potencial | Estado preliminar |
| --- | --- | --- |
| `relatorio.visualizar` | Consulta de relatórios institucionais | PENDENTE DE DECISÃO |
| `indicador.visualizar` | Consulta de indicadores e painéis | PENDENTE DE DECISÃO |
| `auditoria.visualizar` | Consulta controlada de trilhas de auditoria | PENDENTE DE DECISÃO |
| `setor.visualizar` | Acompanhamento de setores | PENDENTE DE DECISÃO |
| `usuario.visualizar` | Consulta administrativa limitada de usuários/perfis | PENDENTE DE DECISÃO |

Observação: a existência de uma permissão não autoriza sua vinculação automática aos perfis. Toda atribuição deve ser aprovada em etapa técnica posterior.

---

## 8. Permissões novas que eventualmente precisariam ser criadas

Caso as permissões existentes sejam clínicas demais, amplas demais ou semanticamente inadequadas, recomenda-se criar permissões específicas para escopo gerencial.

Permissões candidatas:

| Permissão candidata | Finalidade | Estado preliminar |
| --- | --- | --- |
| `gestao.indicadores.visualizar` | Visualizar indicadores operacionais e institucionais | PENDENTE DE DECISÃO |
| `gestao.relatorios.visualizar` | Visualizar relatórios gerenciais | PENDENTE DE DECISÃO |
| `gestao.ocupacao.visualizar` | Visualizar ocupação hospitalar agregada | PENDENTE DE DECISÃO |
| `gestao.fluxos.visualizar` | Visualizar fluxos, filas e tempos assistenciais agregados | PENDENTE DE DECISÃO |
| `gestao.setores.visualizar` | Visualizar acompanhamento gerencial por setor | PENDENTE DE DECISÃO |
| `gestao.dados_nominais.visualizar` | Visualizar dados nominais apenas quando houver justificativa aprovada | PENDENTE DE DECISÃO |
| `gestao.exportar` | Exportar relatórios autorizados | PENDENTE DE DECISÃO |

Nenhuma dessas permissões é criada por este documento.

---

## 9. Tabelas e áreas que cada perfil poderá visualizar

Visualização preliminar recomendada:

| Área/tabela | Gestão Hospitalar | Leitura/Gestor | Observação |
| --- | --- | --- | --- |
| Indicadores operacionais | APROVADO | APROVADO | Preferir dados agregados |
| Relatórios gerenciais | APROVADO | APROVADO | Conforme escopo institucional |
| Ocupação hospitalar agregada | APROVADO | APROVADO | Sem detalhe clínico individual por padrão |
| Produção por setor | APROVADO | APROVADO | Preferir agregação por período/setor |
| Tempos assistenciais agregados | APROVADO | APROVADO | Sem exposição nominal por padrão |
| Fluxos e filas operacionais | APROVADO | APROVADO | Gestão Hospitalar pode demandar visão operacional mais detalhada |
| Setores | APROVADO | APROVADO | Somente leitura para ambos nesta fase |
| Auditoria | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO | Pode exigir recorte por perfil e finalidade |
| Usuários/perfis | PENDENTE DE DECISÃO | NÃO APROVADO | Leitura/Gestor não deve gerir usuários |
| Pacientes nominais | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO | Não atribuir `paciente.visualizar` automaticamente |
| Atendimentos nominais | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO | Não atribuir `atendimento.visualizar` automaticamente |
| Consultas clínicas | NÃO APROVADO | NÃO APROVADO | Não atribuir `consulta.visualizar` automaticamente |
| Prescrições | NÃO APROVADO | NÃO APROVADO | Sem ação ou leitura irrestrita |
| Exames clínicos individuais | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO | Preferir indicadores agregados |

---

## 10. Tabelas e áreas que cada perfil não poderá alterar

Alteração preliminarmente não aprovada:

| Área/tabela | Gestão Hospitalar | Leitura/Gestor |
| --- | --- | --- |
| `pacientes` | NÃO APROVADO | NÃO APROVADO |
| `atendimentos` | NÃO APROVADO | NÃO APROVADO |
| `consultas` | NÃO APROVADO | NÃO APROVADO |
| prescrições | NÃO APROVADO | NÃO APROVADO |
| exames | NÃO APROVADO | NÃO APROVADO |
| triagem/classificação de risco | NÃO APROVADO | NÃO APROVADO |
| evolução clínica | NÃO APROVADO | NÃO APROVADO |
| conduta clínica | NÃO APROVADO | NÃO APROVADO |
| transferências clínicas | NÃO APROVADO | NÃO APROVADO |
| cadastros operacionais sensíveis | PENDENTE DE DECISÃO | NÃO APROVADO |
| usuários, perfis e permissões | PENDENTE DE DECISÃO | NÃO APROVADO |
| configurações do sistema | PENDENTE DE DECISÃO | NÃO APROVADO |
| exclusão física de qualquer registro | NÃO APROVADO | NÃO APROVADO |

---

## 11. Regras para dados sensíveis

Regras recomendadas:

- dados sensíveis individuais não devem ser expostos por padrão;
- dados clínicos devem ser agregados, anonimizados ou pseudonimizados sempre que possível;
- acesso nominal deve ter finalidade explícita, escopo definido e justificativa registrada;
- CPF, telefone, endereço, queixa principal, evolução, prescrição e demais dados clínicos ou identificáveis não devem aparecer em relatórios gerenciais gerais sem necessidade aprovada;
- qualquer ampliação de acesso nominal deve considerar LGPD, sigilo assistencial, auditoria e rastreabilidade;
- relatórios exportáveis devem evitar dados sensíveis sempre que a finalidade puder ser atendida por indicadores agregados.

---

## 12. Regras para relatórios e indicadores

Relatórios e indicadores devem seguir estas regras:

- usar dados agregados por padrão;
- separar indicadores operacionais de dados clínicos individuais;
- permitir filtros por período, setor, fluxo e status quando aprovados;
- evitar identificação nominal em painéis estratégicos;
- exigir aprovação específica para relatórios nominais;
- preservar rastreabilidade da origem dos dados;
- não permitir que painéis gerenciais se tornem atalho para prontuário irrestrito.

---

## 13. Regras para auditoria

Regras recomendadas:

- toda leitura de dados sensíveis por perfis gerenciais deve ser auditável;
- exportações devem registrar usuário, data/hora, finalidade, filtros e escopo exportado;
- acesso nominal excepcional deve ser rastreável;
- consultas a trilhas de auditoria devem ter escopo institucional definido;
- Leitura/Gestor não deve resolver, apagar, mascarar ou alterar eventos de auditoria;
- Gestão Hospitalar não deve remover ou editar eventos de auditoria.

---

## 14. Regras para exportação

Exportação não deve ser liberada automaticamente.

Regras recomendadas:

- exportação agregada pode ser aprovada para relatórios institucionais;
- exportação nominal deve permanecer pendente até decisão expressa;
- exportações devem respeitar finalidade, período, filtros e perfil;
- exportações devem gerar registro auditável;
- exportação de dados sensíveis deve exigir justificativa e aprovação institucional;
- Leitura/Gestor não deve exportar dados nominais sem autorização explícita.

---

## 15. Regras para exclusão

Exclusão física não está aprovada para nenhum dos dois perfis.

Regras recomendadas:

- nenhum dos perfis deve executar `DELETE`;
- nenhum dos perfis deve apagar registros clínicos, administrativos, operacionais ou de auditoria;
- eventuais correções devem seguir fluxo próprio, auditável e com perfil autorizado;
- exclusões lógicas, cancelamentos ou inativações, se existirem, exigem decisão institucional e técnica separada;
- logs de auditoria não devem ser excluídos por perfis gerenciais.

---

## 16. Matriz preliminar perfil x capacidade

Legenda:

- **APROVADO:** capacidade recomendada para aprovação institucional nesta fase documental.
- **NÃO APROVADO:** capacidade incompatível com o escopo preliminar do perfil.
- **PENDENTE DE DECISÃO:** capacidade exige decisão institucional expressa antes de implementação.

| Capacidade | Gestão Hospitalar | Leitura/Gestor |
| --- | --- | --- |
| Visualizar indicadores operacionais agregados | APROVADO | APROVADO |
| Visualizar relatórios gerenciais agregados | APROVADO | APROVADO |
| Visualizar produção por setor/período | APROVADO | APROVADO |
| Visualizar tempos assistenciais agregados | APROVADO | APROVADO |
| Visualizar ocupação agregada | APROVADO | APROVADO |
| Visualizar fluxos e filas operacionais | APROVADO | APROVADO |
| Visualizar acompanhamento de setores | APROVADO | APROVADO |
| Visualizar dados nominais de pacientes | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO |
| Receber `paciente.visualizar` | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO |
| Receber `atendimento.visualizar` | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO |
| Receber `consulta.visualizar` | NÃO APROVADO | NÃO APROVADO |
| Visualizar prescrições individuais | NÃO APROVADO | NÃO APROVADO |
| Visualizar exames clínicos individuais | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO |
| Inserir registros clínicos | NÃO APROVADO | NÃO APROVADO |
| Atualizar prontuário | NÃO APROVADO | NÃO APROVADO |
| Prescrever | NÃO APROVADO | NÃO APROVADO |
| Alterar conduta clínica | NÃO APROVADO | NÃO APROVADO |
| Alterar cadastro de paciente | NÃO APROVADO | NÃO APROVADO |
| Gerir usuários | PENDENTE DE DECISÃO | NÃO APROVADO |
| Alterar configurações do sistema | PENDENTE DE DECISÃO | NÃO APROVADO |
| Consultar auditoria | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO |
| Exportar relatórios agregados | PENDENTE DE DECISÃO | PENDENTE DE DECISÃO |
| Exportar dados nominais | PENDENTE DE DECISÃO | NÃO APROVADO |
| Excluir registros | NÃO APROVADO | NÃO APROVADO |

---

## 17. Riscos

Riscos identificados:

- conceder permissões clínicas amplas para resolver demandas gerenciais;
- expor dados sensíveis individuais em painéis administrativos;
- permitir acesso nominal sem justificativa institucional;
- transformar Leitura/Gestor em perfil administrativo por acúmulo de permissões;
- permitir exportações nominais sem auditoria suficiente;
- misturar indicadores agregados com navegação para prontuário individual;
- criar permissões novas sem correspondência clara no frontend, RLS e testes;
- implementar acesso gerencial antes da aprovação formal da matriz.

---

## 18. Decisões pendentes

Decisões que ainda precisam de aprovação:

| Ref. | Decisão pendente |
| --- | --- |
| D1 | Gestão Hospitalar poderá visualizar dados nominais de pacientes? Em quais situações? |
| D2 | Leitura/Gestor poderá visualizar dados nominais? Se sim, quais relatórios e mediante qual aprovação? |
| D3 | Algum dos dois perfis receberá `paciente.visualizar`? |
| D4 | Algum dos dois perfis receberá `atendimento.visualizar`? |
| D5 | Exames clínicos individuais poderão aparecer para gestão ou apenas indicadores agregados? |
| D6 | Auditoria será visível a perfis gerenciais? Com qual recorte? |
| D7 | Gestão Hospitalar poderá visualizar usuários/perfis sem administrá-los? |
| D8 | Gestão Hospitalar poderá alterar configurações operacionais não clínicas? |
| D9 | Exportação será permitida? Apenas agregada ou também nominal? |
| D10 | Quais permissões novas devem ser criadas para evitar reutilização inadequada de permissões clínicas? |

---

## 19. Critérios de aprovação

Para avançar à etapa técnica, a instituição deve aprovar:

- matriz final perfil x capacidade;
- lista objetiva de permissões existentes a reutilizar;
- lista objetiva de permissões novas a criar, se necessário;
- regra de acesso nominal;
- regra de exportação;
- regra de auditoria para leitura sensível;
- proibição explícita de ações clínicas para ambos os perfis;
- proibição explícita de exclusão física;
- impactos esperados no frontend, RLS, policies e testes;
- responsável institucional pela aprovação.

---

## 20. Próxima etapa técnica

Após aprovação institucional expressa, a próxima etapa técnica poderá:

- propor migration específica para permissões novas, se aprovadas;
- propor vinculação de permissões existentes aos perfis, se aprovadas;
- revisar RLS/policies apenas se houver necessidade e aprovação explícita;
- criar testes de segurança para os dois perfis;
- validar que Gestão Hospitalar não executa ações clínicas;
- validar que Leitura/Gestor permanece estritamente somente leitura;
- validar que `paciente.visualizar`, `atendimento.visualizar` e `consulta.visualizar` não foram atribuídas sem decisão expressa;
- documentar impacto no frontend antes de liberar uso operacional.

Esta etapa técnica não deve ser iniciada sem aprovação formal da matriz e das decisões pendentes.

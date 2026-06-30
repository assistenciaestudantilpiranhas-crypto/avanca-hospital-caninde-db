# DB-DOCUMENTATION-STANDARD.md

## 1. Objetivo

Este documento estabelece o padrão local para documentação técnica, operacional, de banco de dados, segurança, RLS, auditoria, autenticação, usuários, permissões e integração do repositório de banco de dados do Avança Hospital Canindé.

Toda documentação deste repositório deve seguir o padrão oficial definido em `GHAES-0009-DOCUMENTATION-STANDARD.md`, preservando rastreabilidade, clareza institucional, segurança da informação e compatibilidade com a arquitetura GSI HealthTech, GSI ONE e Avança Hospital.

## 2. Escopo

Este padrão se aplica a documentos criados ou mantidos neste repositório relacionados a:

- estrutura de banco de dados;
- migrations;
- schemas;
- tabelas;
- views;
- functions;
- triggers;
- policies;
- Row Level Security;
- auditoria;
- autenticação;
- usuários;
- papéis;
- permissões;
- integrações;
- decisões técnicas de banco de dados.

Este documento não cria integração real, não altera regras de acesso e não modifica objetos de banco de dados.

## 3. Referência ao padrão GHAES-0009

O padrão documental oficial para este repositório é o `GHAES-0009-DOCUMENTATION-STANDARD.md`.

Esse padrão deve orientar a organização, identificação, linguagem, estrutura mínima, status documental e rastreabilidade dos documentos produzidos no contexto do repositório de banco de dados.

Quando houver conflito entre documentos locais e o padrão GHAES-0009, a divergência deve ser registrada como decisão pendente ou ponto de revisão, sem alteração automática de regras técnicas, clínicas, operacionais ou de segurança.

## 4. Aplicação no repositório de banco de dados

A documentação do repositório de banco de dados deve descrever o que existe, o que foi decidido e o que ainda depende de validação.

Documentos deste repositório devem:

- diferenciar estado atual, proposta e decisão aprovada;
- registrar impacto em segurança, auditoria e persistência assistencial;
- evitar linguagem ambígua sobre permissões e acesso a dados;
- indicar quando uma informação estiver a validar;
- preservar compatibilidade com migrations e estrutura existente;
- não substituir revisão técnica de SQL, RLS, autenticação ou integração.

## 5. Famílias documentais usadas no projeto

As famílias documentais usadas no projeto são:

- `DB`: documentação de banco de dados, migrations, schemas, tabelas, policies, functions, triggers, auditoria e persistência.
- `SEC`: documentação de segurança, RLS, autenticação, usuários, papéis, permissões, auditoria e controles de acesso.
- `API`: documentação de contratos, integrações planejadas, endpoints, eventos, payloads e comunicação entre sistemas, quando aplicável.
- `GSI-ONE`: referência externa à plataforma digital de saúde GSI ONE, sem redefinir arquitetura ou regras do repositório de banco.
- `AVH`: referência institucional ao programa Avança Hospital, sem criar regra clínica, operacional ou assistencial por documentação de banco.

## 6. Estrutura mínima obrigatória dos documentos

Todo documento técnico deste repositório deve conter, quando aplicável:

- título;
- código ou identificador documental;
- família documental;
- status documental;
- objetivo;
- escopo;
- contexto;
- descrição técnica;
- impacto em banco de dados;
- impacto em RLS, segurança ou auditoria;
- impacto em autenticação, usuários ou permissões;
- impacto em integração;
- riscos;
- pendências;
- histórico de revisão ou referência de origem.

Quando algum item não se aplicar, o documento deve registrar `Não aplicável` ou `A validar`, conforme o caso.

## 7. Status documentais oficiais

Os status documentais oficiais são:

- `Draft`: documento em elaboração inicial, ainda sem revisão completa.
- `Em revisão`: documento submetido a revisão técnica, institucional ou de segurança.
- `Aprovado`: documento validado para orientar decisões ou execução.
- `Em uso`: documento aprovado e adotado como referência operacional ou técnica vigente.
- `Substituído`: documento preservado por histórico, mas superado por versão ou referência posterior.
- `Arquivado`: documento mantido apenas para registro, sem uso ativo como referência vigente.

## 8. Regras de linguagem

A linguagem dos documentos deve ser técnica, institucional, objetiva e rastreável.

Os documentos devem:

- usar termos consistentes com GHAES, GSI ONE e Avança Hospital;
- evitar promessas de implementação não aprovada;
- separar fato técnico, proposta e decisão;
- evitar marcas, metadados ou assinaturas de autoria automatizada;
- não inventar normas externas;
- não criar regra clínica, assistencial, operacional ou regulatória sem aprovação explícita;
- usar `A validar` quando uma informação depender de confirmação.

## 9. Regras para documentação de migrations

A documentação de migrations deve registrar:

- nome da migration;
- objetivo da migration;
- objetos afetados;
- tipo de alteração;
- impacto em dados existentes;
- impacto em compatibilidade com a aplicação;
- impacto em auditoria;
- riscos de reversão;
- validação esperada.

A documentação não deve orientar edição retroativa de migrations antigas sem autorização explícita. Preferencialmente, mudanças futuras devem ser registradas por nova migration, quando aprovadas.

## 10. Regras para documentação de RLS, permissões e auditoria

A documentação de RLS, permissões e auditoria deve indicar:

- tabelas ou objetos protegidos;
- finalidade da regra documentada;
- papéis envolvidos;
- escopo de leitura, escrita, atualização ou exclusão;
- relação com auditoria;
- riscos de exposição de dados;
- premissas a validar.

Nenhum documento deve sugerir enfraquecimento de RLS, acesso amplo ou contorno de auditoria como solução padrão.

## 11. Regras para documentação de autenticação e usuários

A documentação de autenticação e usuários deve registrar:

- contexto do mecanismo descrito;
- tipo de usuário ou papel envolvido;
- vínculo com permissões;
- dependências de Supabase Auth ou estrutura equivalente, quando aplicável;
- riscos de acesso indevido;
- pontos pendentes de validação.

Documentos não devem criar usuários reais, credenciais, permissões efetivas ou dados sensíveis.

## 12. Regras para documentação de integrações

A documentação de integrações deve diferenciar:

- integração planejada;
- integração em análise;
- integração aprovada;
- integração implementada;
- integração descontinuada.

Quando houver API, evento, sincronização ou troca de dados, o documento deve registrar objetivo, origem, destino, dados envolvidos, responsabilidades, riscos, segurança, auditoria e pendências.

Este documento não cria integração real nem autoriza implementação automática.

## 13. Regras para decisões técnicas

Decisões técnicas devem ser documentadas com:

- contexto;
- problema;
- alternativas consideradas;
- decisão;
- justificativa;
- impacto em banco de dados;
- impacto em segurança e auditoria;
- impacto em integração;
- riscos;
- pendências;
- status documental.

Decisões que afetem migrations, RLS, autenticação, usuários, permissões, dados assistenciais ou auditoria exigem validação explícita antes de implementação.

## 14. Próximas ações

As próximas ações recomendadas são:

- mapear documentos existentes por família documental;
- classificar documentos pelo status oficial;
- identificar documentos que precisam ser alinhados ao GHAES-0009;
- registrar pendências com `A validar` quando não houver decisão aprovada;
- manter este padrão como referência local para nova documentação do repositório de banco de dados.

# GSI ONE / Avanca Hospital Caninde DB

Repositorio da camada de banco de dados e persistencia do ecossistema GSI ONE / Avanca Hospital Caninde.

Este projeto descreve e versiona a base PostgreSQL/Supabase usada para sustentar autenticacao, perfis e permissoes, Row Level Security, auditoria, registros de pacientes, atendimentos e persistencia do fluxo assistencial.

## Papel no ecossistema

- GSI HealthTech: ecossistema institucional.
- GSI ONE: plataforma digital de saude.
- Avanca Hospital: programa de implantacao e caso de uso hospitalar.
- Este repositorio: camada de banco, seguranca, persistencia e rastreabilidade.

## Escopo do repositorio

O repositorio pode conter:

- migrations versionadas do Supabase;
- estruturas de schema PostgreSQL;
- politicas de Row Level Security;
- grants e regras de acesso;
- funcoes, triggers e views de apoio;
- estruturas relacionadas a autenticacao;
- perfis, permissoes e regras de leitura por modulo;
- audit logs e mecanismos de rastreabilidade;
- persistencia de pacientes, atendimentos, prescricoes, exames, farmacia, transferencias, indicadores e fluxo assistencial.

## Padroes obrigatorios

Este repositorio segue GHAES - Global Health AI Engineering Standard.

Documentos de referencia local:

- `GHAES-SESSION.md`
- `AGENTS.md`
- `CODEX.md`
- `DATABASE-STANDARD.md`
- `DOCUMENTO_MESTRE_FLUXO_ASSISTENCIAL.md`

Antes de qualquer alteracao sensivel, especialmente em migrations, RLS, autenticacao, permissoes, auditoria, dados de pacientes ou fluxo assistencial, leia os padroes aplicaveis e documente impacto, riscos e validacao.

## Regras de seguranca

- Nao editar migrations antigas sem autorizacao explicita.
- Nao enfraquecer RLS.
- Nao remover auditabilidade.
- Nao expor dados sensiveis de pacientes.
- Nao criar dados reais ou dados falsos com aparencia de producao.
- Nao alterar persistencia do fluxo assistencial sem aprovacao explicita.
- Nao fazer commit ou push sem autorizacao explicita.

## Validacao esperada

Conforme o tipo de alteracao, validar:

- sintaxe das migrations SQL;
- impacto em tabelas, views, funcoes e triggers;
- impacto em grants e politicas RLS;
- preservacao de auditoria;
- compatibilidade com autenticacao e perfis/permissoes;
- impacto no fluxo assistencial;
- testes automatizados aplicaveis.

## Observacao sobre o historico do projeto

O ecossistema pode conter artefatos herdados de fases anteriores de prototipo visual. Neste repositorio, entretanto, a documentacao atual deve tratar o projeto como camada de banco e persistencia baseada em PostgreSQL/Supabase, com migrations versionadas, seguranca, auditoria e rastreabilidade assistencial.

# GSI ONE — Plano Técnico de Evolução Modular

**Versão:** 1.0  
**Data de consolidação:** 2026-07-25  
**Repositório:** avanca-hospital-caninde-db  
**Último commit referência:** f2d8cd3 security: add granular phase B1 read permissions  
**Status:** Documento vivo — revisado a cada fase concluída

---

## 1. Objetivo Institucional

O GSI ONE é o sistema de gestão assistencial e operacional do Hospital Municipal de Canindé.

O sistema tem como objetivo:

- organizar o fluxo assistencial desde o acolhimento até o desfecho do atendimento;
- registrar atendimentos, triagens, consultas, exames, prescrições, observações e transferências;
- gerar informações para faturamento SUS (BPA e AIH);
- produzir indicadores assistenciais e relatórios gerenciais;
- suportar a gestão pública com rastreabilidade, auditoria e transparência;
- operar com segurança e proteção de dados de saúde, em conformidade com a LGPD e as normas do SUS.

O plano registrado neste documento consolida as decisões técnicas e institucionais aprovadas para a evolução do sistema de forma modular, segura e rastreável.

---

## 2. Estado Atual do Sistema

O repositório já possui:

- banco PostgreSQL gerenciado via Supabase;
- estrutura de migrations com rollbacks correspondentes;
- Row Level Security (RLS) ativo e auditado;
- perfis de usuário e sistema de permissões granulares;
- testes autenticados de segurança e acesso;
- fluxo assistencial mapeado e documentado;
- inventário SIGTAP com tabela local (`sigtap_procedimentos`);
- documentação técnica e institucional;
- frontend estático em HTML, CSS e JavaScript puro;
- dados fictícios em `localStorage` para demonstração.

Nenhuma alteração funcional foi realizada nesta etapa. Este documento consolida orientações para a evolução futura.

---

## 3. Diretrizes Aprovadas

As seguintes decisões foram formalmente aprovadas pelo desenvolvedor responsável:

### 3.1 Faturamento SUS

- Criar módulo próprio de faturamento SUS.
- O módulo cobrirá produção ambulatorial (BPA) e internação (AIH).
- A integração com SIGTAP será progressiva.

### 3.2 Repositório e Controle de Versão

Manter no GitHub toda a definição reproduzível do banco:

- migrations;
- rollbacks;
- functions e triggers;
- policies e grants;
- seeds fictícios;
- testes;
- documentação técnica.

Nunca colocar no GitHub:

- dados reais de pacientes;
- prontuários;
- CPF ou CNS reais;
- senhas ou secrets;
- service role key;
- arquivos `.env` com valores reais;
- dumps de produção.

### 3.3 Usuários de Teste

- Criar usuários fictícios para os ambientes de desenvolvimento e homologação.
- Usuários fictícios não devem ter acesso à produção.
- Credenciais fictícias nunca são iguais às de produção.

### 3.4 Modularização

- Modularizar o sistema progressivamente, sem reescrever tudo de uma vez.
- Migrar o `script.js` por módulos, preservando o que já funciona.
- Cada módulo deve ser autossuficiente: HTML, CSS e JS próprios.

### 3.5 Navegação e Interface

- Não usar pop-ups do navegador (`alert`, `confirm`, `prompt`) em fluxos assistenciais.
- Abrir módulos e formulários em páginas ou rotas próprias, preferencialmente na mesma aba.
- Modais internos são permitidos apenas para:
  - confirmação de ação;
  - alerta curto;
  - escolha rápida;
  - ação de formulário simples.

### 3.6 Numeração Institucional

Aprovada a seguinte convenção de numeração:

**Paciente:**
```
AAAA-NNNNNN
```
Exemplo: `2026-000001`

**Atendimento:**
```
AAAA-AT-NNNNNN
```
Exemplo: `2026-AT-000001`

Regras do número de paciente:

- usa o ano do primeiro cadastro;
- é permanente — não muda em retornos futuros;
- é independente do UUID técnico interno.

Regras do número de atendimento:

- possui sequência anual própria;
- reinicia em 1º de janeiro de cada ano;
- nunca é reutilizado, mesmo após cancelamento.

Regras técnicas de geração:

- geração ocorre no banco de dados;
- usa data do servidor (não do cliente);
- é automática via função ou trigger;
- impede edição manual após geração;
- garante unicidade com constraint;
- suporta concorrência com sequence ou SERIAL controlado;
- mantém registro de auditoria da geração.

---

## 4. Arquitetura-Alvo

O sistema evoluirá de um frontend monolítico com `localStorage` para uma arquitetura modular com backend Supabase.

```
Frontend (módulos independentes)
        |
        v
Supabase (PostgREST + Auth + Storage)
        |
        v
PostgreSQL (RLS + migrations + functions + triggers)
```

### 4.1 Princípios da Arquitetura

- Cada módulo clínico é independente e pode ser desenvolvido, testado e implantado separadamente.
- O banco é a única fonte de verdade.
- O `localStorage` será mantido apenas durante a fase de prototipação e removido gradualmente conforme os módulos migram para Supabase.
- Toda operação de escrita passa por funções com validação, auditoria e RLS.
- Toda operação de leitura clínica exige autenticação e permissão explícita.

---

## 5. Organização Recomendada do Repositório

```
src/
  auth/              -- autenticação e controle de sessão
  recepcao/          -- acolhimento, cadastro, chamada
  pacientes/         -- cadastro, histórico, numeração
  atendimentos/      -- abertura, registro, encerramento
  triagem/           -- classificação de risco (Manchester)
  consulta/          -- consulta médica, prescrição
  enfermagem/        -- evolução de enfermagem, sinais vitais
  exames/            -- solicitação, resultado, laudo
  farmacia/          -- dispensação, controle de estoque
  observacao/        -- clínica, pediátrica, obstétrica
  estabilizacao/     -- sala vermelha, sala de estabilização
  transferencias/    -- regulação, transferência segura
  faturamento/       -- BPA, AIH, APAC, produção SUS
  indicadores/       -- painel de qualidade assistencial
  administracao/     -- configurações, usuários, auditoria

supabase/
  migrations/        -- arquivos numerados de migração
  rollback/          -- rollback correspondente a cada migration
  seed/              -- dados fictícios para dev e homologação
  functions/         -- funções SQL reutilizáveis

tests/
  unit/              -- funções e validações isoladas
  integration/       -- fluxos completos com banco real
  security/          -- testes RLS, autenticação, permissões
  e2e/               -- simulação de fluxo assistencial ponta a ponta

docs/                -- documentação técnica e institucional
scripts/             -- scripts utilitários de desenvolvimento
public/              -- assets estáticos (logo, favicon, CSS global)
```

Esta estrutura é uma recomendação. A criação das pastas ocorrerá apenas quando um módulo for efetivamente iniciado.

---

## 6. Separação entre Ambientes

| Critério               | Desenvolvimento local    | Homologação               | Produção                  |
|------------------------|--------------------------|---------------------------|---------------------------|
| Banco                  | Supabase projeto local   | Supabase projeto staging  | Supabase projeto produção |
| Dados                  | Fictícios (seed)         | Fictícios (seed)          | Reais                     |
| Usuários               | Fictícios                | Fictícios                 | Reais                     |
| `.env`                 | `.env.local` (ignorado)  | variáveis de CI/CD        | variáveis de CI/CD        |
| Acesso externo         | Não                      | Restrito à equipe         | Restrito ao hospital      |
| Commits diretos        | Permitido                | Não — apenas via PR       | Não — apenas via PR       |
| RLS                    | Ativo                    | Ativo                     | Ativo                     |

---

## 7. Política de GitHub e Proteção de Dados

### O que entra no repositório

- Todo código-fonte;
- Todas as migrations e rollbacks;
- Todos os seeds com dados fictícios;
- Todos os testes;
- Toda a documentação técnica;
- Configurações de ambiente sem valores sensíveis (`.env.example`).

### O que nunca entra no repositório

- Qualquer arquivo `.env` com valores reais;
- Qualquer dump de banco de produção;
- CPF, CNS, nome real, data de nascimento real de paciente;
- Prontuário real ou laudo real;
- Chave de service role do Supabase;
- Senha de qualquer usuário real;
- Token de autenticação real;
- Qualquer dado coberto pela LGPD.

### Proteção ativa

- `.gitignore` deve bloquear `.env`, `*.dump`, `*.sql.gz`, `secrets/`;
- Revisão obrigatória antes de qualquer commit com dados;
- Nenhuma chave sensível em variável hardcoded;
- Branch `main` protegida — sem push direto sem revisão.

---

## 8. Estratégia de Usuários Fictícios

Para desenvolvimento e homologação, serão criados usuários fictícios representando perfis operacionais do hospital:

| Perfil                | Exemplo de e-mail fictício          |
|-----------------------|-------------------------------------|
| Médico plantonista    | medico.plantonista@gsi.test         |
| Enfermeiro triagem    | enfermeiro.triagem@gsi.test         |
| Técnico enfermagem    | tecnico.enf@gsi.test                |
| Recepcionista         | recepcao@gsi.test                   |
| Farmacêutico          | farmacia@gsi.test                   |
| Gestor hospitalar     | gestor@gsi.test                     |
| Auditor               | auditoria@gsi.test                  |
| Administrador sistema | admin@gsi.test                      |

Regras:

- domínio `@gsi.test` nunca existirá em produção;
- credenciais fictícias nunca são iguais às de produção;
- seeds de usuários fictícios ficam em `supabase/seed/`;
- remoção de seeds fictícios antes de qualquer carga em produção.

---

## 9. Estratégia de Modularização do Frontend

### Princípio

O `script.js` atual é um monolito funcional. A migração será progressiva: um módulo de cada vez, sem quebrar o que já funciona.

### Abordagem por módulo

Para cada módulo migrado:

1. Criar pasta própria em `src/<modulo>/`;
2. Extrair o HTML do módulo para um arquivo de template ou componente;
3. Extrair a lógica específica do módulo para JS próprio;
4. Conectar ao Supabase via client configurado centralmente;
5. Remover o trecho correspondente do `script.js` monolítico;
6. Testar o módulo isolado e integrado;
7. Fazer commit atômico com descrição clara.

### Ordem sugerida de migração

1. Módulo de autenticação (`auth/`);
2. Módulo de pacientes (`pacientes/`);
3. Módulo de atendimentos (`atendimentos/`);
4. Módulo de triagem (`triagem/`);
5. Módulo de consulta (`consulta/`);
6. Demais módulos clínicos;
7. Módulo de faturamento (`faturamento/`) — módulo novo, não migrado;
8. Módulo de indicadores (`indicadores/`);
9. Módulo de administração (`administracao/`).

---

## 10. Estratégia de Substituição do localStorage por Supabase

### Situação atual

O frontend usa `localStorage` via `GsiApi` para simular persistência. Isso é adequado para demonstrações, mas não para operação real.

### Estratégia de substituição

A substituição ocorre por módulo, na mesma ordem da modularização:

1. Criar a camada de serviço do módulo (ex: `pacientes/pacientesService.js`);
2. Substituir chamadas `GsiApi.*` por chamadas ao Supabase client;
3. Garantir autenticação e RLS ativo nas chamadas;
4. Remover dependência de `localStorage` do módulo migrado;
5. Manter `localStorage` apenas nos módulos ainda não migrados.

O `GsiApi` será removido por completo apenas quando todos os módulos estiverem migrados.

---

## 11. Regra Oficial de Navegação

### Regra aprovada

| Tipo de conteúdo                      | Onde abrir              |
|---------------------------------------|-------------------------|
| Módulo principal                      | Página ou rota própria  |
| Formulário de cadastro ou edição      | Página ou rota própria  |
| Detalhe de atendimento ou paciente    | Página ou rota própria  |
| Fluxo assistencial (triagem, consulta)| Página ou rota própria  |
| Confirmação de ação                   | Modal interno           |
| Alerta curto                          | Modal interno           |
| Escolha rápida                        | Modal interno           |
| Formulário simples de ação rápida     | Modal interno           |

### Proibições

- `window.alert()` — proibido em qualquer fluxo assistencial;
- `window.confirm()` — proibido em qualquer fluxo assistencial;
- `window.prompt()` — proibido em qualquer contexto;
- Pop-up de nova janela (`window.open`) — proibido por padrão;
- Redirecionamento para nova aba sem consentimento do usuário — proibido.

---

## 12. Módulo de Faturamento SUS

### Escopo inicial aprovado

O módulo de faturamento SUS cobrirá:

- registro de procedimentos realizados por atendimento;
- vinculação ao catálogo SIGTAP local;
- geração de boletim de produção ambulatorial (BPA);
- preparação para geração de AIH (internação);
- controle de competência mensal;
- auditoria de lançamentos.

### Localização no repositório

```
src/faturamento/
supabase/migrations/  -- tabelas e funções do módulo
docs/FATURAMENTO_SUS.md
```

### Premissas

- O módulo de faturamento nunca deve ser o único registro assistencial;
- O prontuário é a fonte primária; o faturamento é derivado;
- Toda vinculação de procedimento deve ter profissional responsável identificado;
- Correções de faturamento devem gerar rastro de auditoria.

---

## 13. Integração SIGTAP

### Situação atual

A tabela `sigtap_procedimentos` já existe no banco com estrutura e índices definidos.

### Estratégia de integração

- Manter catálogo local no banco — não depender de API externa em tempo real;
- Importar tabela SIGTAP da competência vigente via script controlado;
- Permitir atualização manual por competência, com registro de data e responsável;
- Expor catálogo via view ou função para o frontend;
- Nunca editar manualmente os dados SIGTAP importados — apenas reimportar.

### Fonte oficial

Tabela SIGTAP disponível em: [datasus.saude.gov.br/sigtap](http://datasus.saude.gov.br/sigtap)

---

## 14. Numeração Institucional de Pacientes

### Formato

```
AAAA-NNNNNN
```

Exemplo: `2026-000001`

### Especificação técnica

- `AAAA` = ano do primeiro cadastro do paciente no sistema;
- `NNNNNN` = sequência numérica de 6 dígitos com zero à esquerda;
- A sequência é anual — reinicia em 1º de janeiro de cada ano;
- O número é gerado automaticamente pelo banco no momento do cadastro;
- O número é imutável após geração;
- O número não é o UUID técnico — coexistem;
- Retornos futuros do mesmo paciente não geram novo número;
- O número serve como identificador institucional visível.

### Implementação no banco

```sql
-- Sequence anual controlada por função:
-- gsi_gerar_numero_paciente(p_ano INTEGER) RETURNS TEXT
-- Gera: AAAA-NNNNNN
-- Chamada por trigger BEFORE INSERT na tabela de pacientes
```

A implementação concreta será criada na Fase 4, com migration própria.

---

## 15. Numeração Institucional de Atendimentos

### Formato

```
AAAA-AT-NNNNNN
```

Exemplo: `2026-AT-000001`

### Especificação técnica

- `AAAA` = ano de abertura do atendimento;
- `AT` = código fixo de tipo (atendimento geral);
- `NNNNNN` = sequência anual própria de atendimentos;
- A sequência reinicia em 1º de janeiro de cada ano;
- O número é gerado automaticamente pelo banco;
- O número é imutável após geração;
- Atendimentos cancelados não liberam o número para reutilização;
- Cada tipo de atendimento pode ter código próprio no futuro (ex: `AT`, `OB`, `PD`).

### Implementação no banco

```sql
-- gsi_gerar_numero_atendimento(p_ano INTEGER, p_tipo TEXT DEFAULT 'AT') RETURNS TEXT
-- Gera: AAAA-TIPO-NNNNNN
-- Chamada por trigger BEFORE INSERT na tabela de atendimentos
```

A implementação concreta será criada na Fase 4, com migration própria.

---

## 16. Regras Técnicas de Sequenciamento

### Princípios obrigatórios

| Princípio         | Descrição                                                          |
|-------------------|--------------------------------------------------------------------|
| Geração no banco  | Funções SQL — nunca no frontend ou na aplicação                    |
| Data do servidor  | `CURRENT_DATE` ou `NOW()` — nunca data enviada pelo cliente        |
| Automática        | Trigger `BEFORE INSERT` — nunca chamada manual obrigatória         |
| Imutabilidade     | Coluna gerada como `GENERATED ALWAYS` ou com constraint de update  |
| Unicidade         | Constraint `UNIQUE` ou `PRIMARY KEY` na coluna de número           |
| Concorrência      | Sequence PostgreSQL ou `SELECT ... FOR UPDATE` controlado          |
| Auditoria         | Registro em tabela de log com timestamp, usuário e operação        |

### Estrutura de controle de sequence

```sql
CREATE TABLE gsi_sequences (
  seq_name   TEXT PRIMARY KEY,     -- ex: 'paciente_2026'
  seq_ano    INTEGER NOT NULL,
  seq_tipo   TEXT NOT NULL,        -- ex: 'paciente', 'atendimento'
  seq_atual  INTEGER DEFAULT 0,
  seq_digitos INTEGER DEFAULT 6,
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
```

A implementação concreta ocorrerá na Fase 4.

---

## 17. Plano Faseado

### Fase 1 — Organização do Repositório e Proteção de Segredos

**Objetivo:** garantir que o repositório está seguro antes de qualquer evolução.

Entregas:
- revisar e atualizar `.gitignore`;
- confirmar que nenhum secret está versionado;
- criar `.env.example` documentado;
- revisar arquivos existentes em busca de dados sensíveis;
- documentar política de branches.

Critério de aprovação: `git log` e `git status` limpos, sem secrets expostos.

---

### Fase 2 — Ambiente de Homologação e Usuários Fictícios

**Objetivo:** criar ambiente seguro para desenvolvimento e testes.

Entregas:
- criar projeto Supabase de staging (manual — fora do repositório);
- criar seed de usuários fictícios em `supabase/seed/`;
- documentar perfis e credenciais de teste;
- validar RLS no ambiente de staging.

Critério de aprovação: todos os perfis testados com acesso correto e restrito.

---

### Fase 3 — Arquitetura de Rotas e Páginas Próprias

**Objetivo:** estabelecer o padrão de navegação sem pop-ups.

Entregas:
- criar router simples baseado em hash ou path;
- definir padrão de componente de página;
- criar página-exemplo de um módulo (ex: pacientes);
- documentar a regra de navegação aprovada.

Critério de aprovação: módulo-exemplo funciona sem `alert/confirm/prompt`.

---

### Fase 4 — Numeração Institucional de Pacientes e Atendimentos

**Objetivo:** implementar sequenciamento institucional no banco.

Entregas:
- migration: tabela `gsi_sequences`;
- migration: função `gsi_gerar_numero_paciente`;
- migration: função `gsi_gerar_numero_atendimento`;
- migration: triggers nas tabelas de pacientes e atendimentos;
- rollback correspondente;
- testes de concorrência e unicidade;
- documentação da especificação técnica.

Critério de aprovação: testes passam com 100% de unicidade sob concorrência simulada.

---

### Fase 5 — Módulo Inicial de Faturamento

**Objetivo:** criar estrutura de banco e frontend do módulo de faturamento.

Entregas:
- migration: tabela de produção por atendimento;
- migration: tabela de competência;
- migration: RLS do módulo de faturamento;
- frontend: tela de registro de procedimentos por atendimento;
- frontend: painel de produção mensal.

Critério de aprovação: profissional autenticado consegue registrar e visualizar produção.

---

### Fase 6 — Importação SIGTAP e Catálogo Local

**Objetivo:** carregar e manter catálogo SIGTAP atualizado.

Entregas:
- script de importação da tabela SIGTAP vigente;
- função de busca no catálogo para o frontend;
- documentação de processo de atualização por competência;
- tela de consulta ao catálogo.

Critério de aprovação: busca por código ou descrição retorna resultado correto.

---

### Fase 7 — Migração Progressiva dos Módulos do script.js

**Objetivo:** substituir o monolito por módulos independentes.

Entregas (por módulo migrado):
- pasta própria em `src/<modulo>/`;
- JS e HTML extraídos;
- `localStorage` removido do módulo;
- integração com Supabase validada;
- testes do módulo.

Critério de aprovação por módulo: funciona igual ao original, sem `localStorage`.

---

### Fase 8 — Integração Completa com Supabase

**Objetivo:** remover dependência de `localStorage` por completo.

Entregas:
- `GsiApi` desativado;
- todos os módulos integrados ao Supabase;
- dados de demonstração migrados para seed;
- testes de integração completos.

Critério de aprovação: sistema funciona sem `localStorage` em nenhum módulo.

---

### Fase 9 — Relatórios e Exportações BPA/AIH

**Objetivo:** gerar arquivos de produção para o SUS.

Entregas:
- geração de arquivo BPA (boletim de produção ambulatorial);
- validação de campos obrigatórios DATASUS;
- preparação de estrutura AIH;
- exportação em formato compatível com SISREG/DATASUS.

Critério de aprovação: arquivo gerado validado no SISREG ou validador DATASUS.

---

## 18. Riscos

| Risco                                          | Probabilidade | Impacto   | Mitigação                                              |
|------------------------------------------------|---------------|-----------|--------------------------------------------------------|
| Dados reais acidentalmente versionados         | Médio         | Crítico   | `.gitignore` revisado + revisão antes de cada commit   |
| Quebra de funcionalidade na migração modular   | Alto          | Alto      | Migração por módulo com testes antes de remover antigo |
| Incompatibilidade de numeração legada          | Baixo         | Médio     | Numeração nova aplicada apenas a registros futuros     |
| RLS bloqueando acesso legítimo                 | Médio         | Alto      | Testes de acesso por perfil antes de cada migration    |
| Importação SIGTAP com versão desatualizada     | Médio         | Médio     | Controle de competência registrado em tabela própria   |
| Concorrência na geração de numeração           | Baixo         | Alto      | Sequence PostgreSQL com controle transacional          |
| Perda de rastreabilidade em refatoração        | Médio         | Alto      | Commits atômicos por módulo com mensagem clara         |

---

## 19. Dependências

| Dependência                          | Tipo        | Responsável          |
|--------------------------------------|-------------|----------------------|
| Projeto Supabase de staging criado   | Infra       | Desenvolvedor        |
| Acesso ao DATASUS para SIGTAP        | Externo     | Desenvolvedor        |
| Aprovação de cada fase antes de iniciar a próxima | Processo | Desenvolvedor |
| Revisão de segurança antes de produção | Processo | Desenvolvedor        |
| Definição de perfis reais de usuário | Institucional | Gestão hospitalar  |

---

## 20. Critérios de Aprovação por Fase

Cada fase só pode ser iniciada após aprovação explícita do desenvolvedor.

Cada fase só é considerada concluída quando:

- testes passam;
- RLS validado;
- sem dados sensíveis no repositório;
- sem quebra de funcionalidade anterior;
- documento de fase atualizado;
- commit registrado com mensagem clara;
- desenvolvedor confirma aprovação.

---

## 21. Itens Fora do Escopo Imediato

Os itens abaixo foram identificados mas não fazem parte das fases aprovadas:

- autenticação real (login, MFA, recuperação de senha) — fase futura;
- integração com sistemas externos (regulação estadual, RNDS, CNES) — fase futura;
- aplicativo móvel ou PWA — fase futura;
- notificações em tempo real — fase futura;
- backup automatizado — infra Supabase, fora do escopo do repositório;
- contratação de infraestrutura de produção — decisão institucional;
- treinamento de usuários — responsabilidade da gestão;
- homologação junto ao DATASUS — fase posterior à geração dos arquivos;
- APAC e procedimentos de alta complexidade — escopo ainda não mapeado.

---

## Controle de Versão deste Documento

| Versão | Data       | Autor             | Alteração                          |
|--------|------------|-------------------|------------------------------------|
| 1.0    | 2026-07-25 | Erick Gomes       | Criação inicial — consolidação das decisões aprovadas |

---

*Este documento é parte do repositório GSI ONE e segue o padrão GHAES — Global Health AI Engineering Standard.*  
*Referência: https://github.com/erickgomesal/ghaes*

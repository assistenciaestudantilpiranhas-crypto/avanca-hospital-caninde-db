# SIGTAP — Inventário da Fonte Oficial
**Gerado em:** 2026-07-23  
**Responsável técnico:** GSI ONE / GHAES  
**Status:** Documento técnico — sem alteração de código, banco ou migration

---

## 1. Fonte Oficial Consultada

| Item | Valor |
|------|-------|
| Portal | http://sigtap.datasus.gov.br |
| Área de download | http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp |
| Fonte dos arquivos (FTP) | `ftp://ftp2.datasus.gov.br/pub/sistemas/tup/downloads/` |
| Orgão responsável | CGSI / DRAC / Secretaria de Atenção à Saúde / Ministério da Saúde |

> **Nota:** O portal SIGTAP exibiu "serviço de downloads indisponível" na interface web no momento da consulta (2026-07-23). O download foi realizado com sucesso diretamente via protocolo FTP, que permanece ativo e é a fonte canônica oficial do DATASUS.

---

## 2. Competência Baixada

| Item | Valor |
|------|-------|
| Competência | **07/2026** (julho de 2026) |
| Arquivo ZIP | `TabelaUnificada_202607_v2607101010.zip` |
| URL FTP | `ftp://ftp2.datasus.gov.br/pub/sistemas/tup/downloads/TabelaUnificada_202607_v2607101010.zip` |
| Tamanho do ZIP | 2.144.592 bytes (~2,0 MB) |
| Data de publicação | 10/07/2026 (timestamp do servidor FTP: `Jul 10 10:10`) |
| Versão interna | `1.1` (arquivo `versao`) |
| Pasta extraída | `C:\Users\Micro\Documents\Codex\_sigtap_download\TabelaUnificada_202607\` |

---

## 3. Relação de Arquivos do Pacote

Todos os arquivos usam **largura fixa** (posições definidas em `*_layout.txt`), sem delimitador. Encoding: **ISO-8859-1 / Windows-1252** (arquivos com acentuação). Sem cabeçalho nas linhas de dados.

### 3.1 Arquivos de controle e documentação

| Arquivo | Tamanho | Finalidade |
|---------|---------|------------|
| `config.inf` | 13 bytes | Versão de configuração do pacote (`Version=1.0.0`) |
| `versao` | 3 bytes | Versão do layout dos arquivos (`1.1`) |
| `layout.txt` | 7.171 bytes | Descrição de todas as tabelas: colunas, posições de início/fim e tipos |
| `LEIA_ME.TXT` | 14.396 bytes | Histórico de alterações desde 2008; log de portarias e alterações por competência |
| `DATASUS - Tabela de Procedimentos - Lay-out.xls` | 60.928 bytes | Layout em formato Excel (duplica o `layout.txt`) |

### 3.2 Tabelas principais (prefixo `tb_`)

| Arquivo | Registros aprox. | Finalidade |
|---------|-----------------|------------|
| `tb_procedimento.txt` | **4.996** | Tabela-mestra de procedimentos: código, nome, complexidade, sexo, limites de idade, valores SH/SA/SP, financiamento, rubrica, competência |
| `tb_cid.txt` | **14.242** | Classificação Internacional de Doenças (CID-10): código, nome, agravo, sexo, estádio |
| `tb_ocupacao.txt` | **2.719** | Ocupações CBO (Classificação Brasileira de Ocupações) |
| `tb_sia_sih.txt` | **8.383** | Tabela de procedimentos do SIA/SIH (versão anterior SIASUS/SIHSUS): código, nome, tipo (A=ambulatorial, H=hospitalar) |
| `tb_grupo.txt` | **9** | Grupos de procedimentos (1 a 9) |
| `tb_sub_grupo.txt` | **69** | Subgrupos dentro de cada grupo |
| `tb_forma_organizacao.txt` | **417** | Formas de organização por grupo/subgrupo |
| `tb_financiamento.txt` | **7** | Tipos de financiamento (PAB, FAEC, MAC, etc.) |
| `tb_rubrica.txt` | ~50 | Rubricas de pagamento |
| `tb_modalidade.txt` | **4** | Modalidades: Ambulatorial, Hospitalar, Hospital Dia, Urgência/Emergência |
| `tb_registro.txt` | **10** | Instrumentos de registro: BPA Consolidado, BPA Individualizado, AIH Principal, AIH Especial, etc. |
| `tb_servico.txt` | ~80 | Serviços especializados |
| `tb_servico_classificacao.txt` | ~420 | Classificações dentro de cada serviço |
| `tb_habilitacao.txt` | ~370 | Habilitações necessárias para execução de procedimentos |
| `tb_grupo_habilitacao.txt` | ~60 | Grupos de habilitação |
| `tb_detalhe.txt` | ~50 | Detalhes adicionais de procedimentos |
| `tb_regra_condicionada.txt` | ~65 | Regras condicionadas (restrições de cobrança) |
| `tb_rede_atencao.txt` | ~10 | Redes de atenção (RAPS, Oncologia, etc.) |
| `tb_componente_rede.txt` | ~40 | Componentes de cada rede de atenção |
| `tb_tuss.txt` | ~5.900 | Tabela TUSS (Terminologia Unificada da Saúde Suplementar) para mapeamento |
| `tb_renases.txt` | ~300 | Relação Nacional de Serviços de Saúde (RENASES) |
| `tb_descricao.txt` | **4.996** | Descrição textual longa de cada procedimento (campo DS_PROCEDIMENTO, até 4.000 chars) |
| `tb_descricao_detalhe.txt` | ~200 | Descrição textual dos detalhes |
| `tb_tipo_leito.txt` | ~15 | Tipos de leito hospitalar |

### 3.3 Tabelas de relacionamento (prefixo `rl_`)

| Arquivo | Registros aprox. | Finalidade |
|---------|-----------------|------------|
| `rl_procedimento_cid.txt` | **81.867** | Procedimento × CID10 permitido; indica se CID é principal |
| `rl_procedimento_registro.txt` | **7.617** | Procedimento × Instrumento de registro (BPA/AIH) |
| `rl_procedimento_modalidade.txt` | **8.014** | Procedimento × Modalidade (ambulatorial/hospitalar) |
| `rl_procedimento_habilitacao.txt` | **11.045** | Procedimento × Habilitação exigida |
| `rl_procedimento_ocupacao.txt` | **195.113** | Procedimento × CBO permitido (maior arquivo do pacote) |
| `rl_procedimento_servico.txt` | **4.116** | Procedimento × Serviço/Classificação exigido |
| `rl_procedimento_compativel.txt` | **12.226** | Compatibilidade entre procedimentos (cobrança simultânea) |
| `rl_excecao_compatibilidade.txt` | ~5 | Exceções às regras de compatibilidade |
| `rl_procedimento_incremento.txt` | **2.510** | Acréscimos percentuais SH/SA/SP por habilitação |
| `rl_procedimento_leito.txt` | ~950 | Procedimento × Tipo de leito |
| `rl_procedimento_detalhe.txt` | ~1.200 | Procedimento × Detalhe |
| `rl_procedimento_sia_sih.txt` | **5.381** | De/para: procedimento SIGTAP → código SIA/SIH anterior |
| `rl_procedimento_origem.txt` | ~5 | Procedimento origem (histórico de substituição) |
| `rl_procedimento_regra_cond.txt` | ~400 | Procedimento × Regra condicionada |
| `rl_procedimento_comp_rede.txt` | ~200 | Procedimento × Componente de rede de atenção |
| `rl_procedimento_renases.txt` | ~600 | Procedimento × RENASES |
| `rl_procedimento_tuss.txt` | **0** | Mapeamento TUSS (arquivo presente, sem registros nesta competência) |

---

## 4. Estrutura dos Arquivos

### Formato geral
- **Largura fixa** em todas as tabelas (sem delimitador de campo)
- Posições absolutas definidas em cada `*_layout.txt`
- Sem linha de cabeçalho nos dados
- Encoding: **ISO-8859-1 / Windows-1252** (arquivos com acentuação em português)
- Arquivos ASCII puro (sem acentos): `rl_procedimento_sia_sih.txt`, `rl_procedimento_tuss.txt`
- Todos os arquivos terminam com `DT_COMPETENCIA` (6 chars, formato `AAAAMM`, ex: `202607`)

### Estrutura do `tb_procedimento.txt` (tabela central)

```
Coluna               Tamanho  Posição  Tipo
CO_PROCEDIMENTO         10    01-10    VARCHAR2  — código único do procedimento
NO_PROCEDIMENTO        250    11-260   VARCHAR2  — nome
TP_COMPLEXIDADE          1   261-261   VARCHAR2  — 1=Atenção Básica, 2=Média, 3=Alta
TP_SEXO                  1   262-262   VARCHAR2  — M, F, I=indiferente
QT_MAXIMA_EXECUCAO       4   263-266   NUMBER    — quantidade máxima por registro
QT_DIAS_PERMANENCIA      4   267-270   NUMBER    — dias de permanência (AIH)
QT_PONTOS                4   271-274   NUMBER    — pontos (APAC)
VL_IDADE_MINIMA          4   275-278   NUMBER    — em meses
VL_IDADE_MAXIMA          4   279-282   NUMBER    — em meses
VL_SH                   12   283-294   NUMBER    — valor Serviços Hospitalares (×100)
VL_SA                   12   295-306   NUMBER    — valor Serviços Ambulatoriais (×100)
VL_SP                   12   307-318   NUMBER    — valor Serviços Profissionais (×100)
CO_FINANCIAMENTO         2   319-320   VARCHAR2  — FK → tb_financiamento
CO_RUBRICA               6   321-326   VARCHAR2  — FK → tb_rubrica
QT_TEMPO_PERMANENCIA     4   327-330   NUMBER
DT_COMPETENCIA           6   331-336   CHAR      — competência de vigência
```

### Estrutura do `tb_registro.txt` — Instrumentos de registro

```
Código  Descrição
01      BPA (Consolidado)
02      BPA (Individualizado)
03      AIH (Proc. Principal)
04      AIH (Proc. Especial)
05      APAC (Procedimento)
...
```

### Estrutura do `tb_modalidade.txt`

```
01  Ambulatorial
02  Hospitalar
03  Hospital Dia
04  (a validar)
```

### Estrutura do `rl_procedimento_cid.txt`

```
CO_PROCEDIMENTO (10) + CO_CID (4) + ST_PRINCIPAL (1: S/N) + DT_COMPETENCIA (6)
```

---

## 5. Campos Essenciais para o GSI ONE

### Para BPA (Boletim de Produção Ambulatorial)

| Origem SIGTAP | Uso no GSI ONE |
|---------------|----------------|
| `tb_procedimento.CO_PROCEDIMENTO` | Código do procedimento registrado |
| `tb_procedimento.NO_PROCEDIMENTO` | Nome para exibição/seleção |
| `tb_procedimento.TP_COMPLEXIDADE` | Validação do nível do estabelecimento |
| `tb_procedimento.TP_SEXO` | Validação por sexo do paciente |
| `tb_procedimento.VL_IDADE_MINIMA/MAXIMA` | Validação por faixa etária |
| `tb_procedimento.CO_FINANCIAMENTO` | Fonte de financiamento (PAB, MAC, etc.) |
| `rl_procedimento_registro` (CO_REGISTRO=01 ou 02) | Filtra procedimentos válidos para BPA |
| `rl_procedimento_cid` | CIDs válidos por procedimento |
| `rl_procedimento_ocupacao` | CBOs que podem registrar o procedimento |
| `tb_grupo/sub_grupo/forma_organizacao` | Hierarquia de classificação |

### Para AIH (Autorização de Internação Hospitalar)

| Origem SIGTAP | Uso no GSI ONE |
|---------------|----------------|
| `tb_procedimento.CO_PROCEDIMENTO` | Procedimento principal ou especial |
| `tb_procedimento.QT_DIAS_PERMANENCIA` | Permanência mínima/máxima |
| `tb_procedimento.VL_SH / VL_SP` | Valores hospitalares e profissionais |
| `rl_procedimento_registro` (CO_REGISTRO=03 ou 04) | Filtra procedimentos válidos para AIH |
| `rl_procedimento_cid` | CIDs diagnósticos permitidos |
| `rl_procedimento_habilitacao` | Habilitação necessária no CNES |
| `rl_procedimento_leito` | Tipo de leito exigido |
| `rl_procedimento_compativel` | Procedimentos especiais compatíveis com o principal |
| `rl_procedimento_sia_sih` | Mapeamento para código legado SIH |

---

## 6. Proposta Preliminar de Tabelas PostgreSQL

> **Atenção:** Esta proposta é apenas esquemática. Não deve ser implementada sem validação técnica com o assessor de produção do SUS e confirmação das regras operacionais de BPA e AIH.

```sql
-- Tabela central de procedimentos
CREATE TABLE sigtap_procedimento (
    co_procedimento     CHAR(10)        PRIMARY KEY,
    no_procedimento     VARCHAR(250)    NOT NULL,
    tp_complexidade     CHAR(1),
    tp_sexo             CHAR(1),
    qt_maxima_execucao  INTEGER,
    qt_dias_permanencia INTEGER,
    vl_idade_minima     INTEGER,        -- em meses
    vl_idade_maxima     INTEGER,        -- em meses
    vl_sh               NUMERIC(12,2),
    vl_sa               NUMERIC(12,2),
    vl_sp               NUMERIC(12,2),
    co_financiamento    CHAR(2),
    co_rubrica          CHAR(6),
    dt_competencia      CHAR(6)         NOT NULL,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);

-- Instrumentos de registro
CREATE TABLE sigtap_registro (
    co_registro         CHAR(2)         PRIMARY KEY,
    no_registro         VARCHAR(50),
    dt_competencia      CHAR(6)
);

-- Relacionamento procedimento × instrumento (BPA/AIH)
CREATE TABLE sigtap_rl_procedimento_registro (
    co_procedimento     CHAR(10)        REFERENCES sigtap_procedimento,
    co_registro         CHAR(2)         REFERENCES sigtap_registro,
    dt_competencia      CHAR(6),
    PRIMARY KEY (co_procedimento, co_registro, dt_competencia)
);

-- CID-10
CREATE TABLE sigtap_cid (
    co_cid              CHAR(4)         PRIMARY KEY,
    no_cid              VARCHAR(100),
    tp_sexo             CHAR(1),
    dt_competencia      CHAR(6)
);

-- Procedimento × CID
CREATE TABLE sigtap_rl_procedimento_cid (
    co_procedimento     CHAR(10),
    co_cid              CHAR(4),
    st_principal        CHAR(1),
    dt_competencia      CHAR(6),
    PRIMARY KEY (co_procedimento, co_cid, dt_competencia)
);

-- Ocupações CBO
CREATE TABLE sigtap_ocupacao (
    co_ocupacao         CHAR(6)         PRIMARY KEY,
    no_ocupacao         VARCHAR(150)
);

-- Grupos / subgrupos / formas de organização
CREATE TABLE sigtap_grupo (
    co_grupo            CHAR(2)         PRIMARY KEY,
    no_grupo            VARCHAR(100),
    dt_competencia      CHAR(6)
);

-- Financiamento
CREATE TABLE sigtap_financiamento (
    co_financiamento    CHAR(2)         PRIMARY KEY,
    no_financiamento    VARCHAR(100),
    dt_competencia      CHAR(6)
);

-- Modalidade (ambulatorial/hospitalar)
CREATE TABLE sigtap_modalidade (
    co_modalidade       CHAR(2)         PRIMARY KEY,
    no_modalidade       VARCHAR(100),
    dt_competencia      CHAR(6)
);

-- Controle de competências importadas (para histórico)
CREATE TABLE sigtap_competencia_importada (
    dt_competencia      CHAR(6)         PRIMARY KEY,
    nome_arquivo        VARCHAR(100),
    importado_em        TIMESTAMPTZ     DEFAULT NOW(),
    importado_por       UUID            REFERENCES auth.users(id)
);
```

---

## 7. Preservação de Histórico por Competência

O SIGTAP publica uma competência por mês. Valores, procedimentos e regras **mudam mensalmente**. O campo `DT_COMPETENCIA` presente em todos os arquivos é o vínculo temporal.

**Implicações para o GSI ONE:**

- Cada produção (BPA/AIH) deve ser vinculada à competência vigente no momento do atendimento.
- Procedimentos excluídos em competências futuras devem ser mantidos no banco para garantir auditabilidade de registros históricos.
- Valores (`VL_SH`, `VL_SP`, `VL_SA`) mudam entre competências; o valor a faturar deve ser o da competência de produção, não da competência atual.
- **Recomendação:** usar particionamento por `dt_competencia` ou manter uma tabela de histórico separada por competência, com a mais recente marcada como vigente.

---

## 8. Diferenças entre Catálogo Nacional e Catálogo Local do Hospital

O SIGTAP é o **catálogo nacional**. O hospital de Canindé opera com um subconjunto desse catálogo, determinado por:

- **Cadastro CNES:** apenas procedimentos compatíveis com os serviços, habilitações e leitos declarados no CNES do hospital são elegíveis para faturamento.
- **Perfil de complexidade:** hospital de baixa complexidade não pode faturar procedimentos de alta complexidade.
- **Habilitações ativas:** `rl_procedimento_habilitacao` define habilitações exigidas; o hospital só pode cobrar o que tiver habilitado.
- **Modalidade:** o hospital opera em modalidade hospitalar (AIH) e possivelmente ambulatorial (BPA) — procedimentos exclusivos de outros tipos devem ser filtrados.

**O GSI ONE precisará, futuramente, de um módulo de "catálogo local"** que filtre o SIGTAP nacional pelo perfil do estabelecimento (CNES + habilitações + complexidade).

---

## 9. Riscos de Importação

| Risco | Descrição |
|-------|-----------|
| Encoding | Arquivos em ISO-8859-1; importar como UTF-8 corromperia acentos. Usar `ENCODING 'LATIN1'` no PostgreSQL ou converter antes. |
| Largura fixa | Nenhum delimitador; parsear por posição absoluta conforme `layout.txt`. Erro de posição gera dados silenciosamente errados. |
| Valores monetários | `VL_SH`, `VL_SA`, `VL_SP` em formato numérico sem vírgula (centavos?). A validar se está em centavos ou reais com casas decimais. |
| Idades em meses | `VL_IDADE_MINIMA/MAXIMA` em meses (ex: 0000 = recém-nascido, 9999 = sem limite). |
| Arquivo `tb_descricao.txt` | 17 MB com descrições longas (até 4.000 chars). Importar separado para não bloquear queries na tabela principal. |
| `rl_procedimento_ocupacao.txt` | 195.113 registros. Maior arquivo de relacionamento; criar índice antes de usar em validação. |
| Competência futura | A competência 07/2026 foi publicada em 10/07; pode haver retificação. Monitorar FTP mensalmente. |
| Arquivo `rl_procedimento_tuss.txt` | Vazio nesta competência (0 bytes de dados). Não confundir com ausência permanente. |

---

## 10. Informações a Validar com o Assessor de Produção

- [ ] Confirmar se os valores `VL_SH / VL_SA / VL_SP` estão em centavos ou reais.
- [ ] Confirmar quais `CO_REGISTRO` (instrumentos) o hospital utiliza efetivamente (BPA-C, BPA-I, AIH principal).
- [ ] Confirmar o CNES do Hospital de Canindé e suas habilitações cadastradas para filtrar o catálogo local.
- [ ] Confirmar se o hospital usa APAC (CO_REGISTRO=05) — não incluído no escopo inicial.
- [ ] Verificar se há necessidade de importar `tb_tuss.txt` (mapeamento com planos de saúde).
- [ ] Confirmar política de retenção histórica: quantas competências anteriores devem ser mantidas no banco.
- [ ] Verificar se o hospital usa `rl_procedimento_incremento` (acréscimos por habilitação) no faturamento.
- [ ] Confirmar se o campo `TP_COMPLEXIDADE` do procedimento deve ser validado contra o nível do hospital no CNES.

---

## 11. Recomendação para Próxima Etapa

1. **Criar migration de staging SIGTAP** (schema separado `sigtap` ou prefixo `sigtap_`) com as tabelas propostas — somente após validação com assessor de produção.
2. **Desenvolver script de importação** em Python ou pgcopy que:
   - Leia cada arquivo com encoding ISO-8859-1
   - Parse por posição fixa conforme `layout.txt`
   - Registre a competência importada em `sigtap_competencia_importada`
3. **Definir catálogo local**: criar view ou tabela derivada que filtre os procedimentos válidos para o hospital de Canindé com base em CNES, habilitações e complexidade.
4. **Automatizar atualização mensal**: monitorar o FTP do DATASUS e importar nova competência ao redor do dia 5 de cada mês.
5. **Não importar no Supabase até que** a estrutura de tabelas, RLS e políticas de acesso estejam definidas e aprovadas.

---

## 12. Confirmação de Integridade

| Verificação | Resultado |
|-------------|-----------|
| Arquivo ZIP baixado | `TabelaUnificada_202607_v2607101010.zip` — 2.144.592 bytes |
| Extração bem-sucedida | Sim — 79 arquivos extraídos |
| Fonte usada | FTP oficial DATASUS |
| Fonte iClinic usada | Não |
| PDFs usados como base | Não |
| Código alterado | Nenhum |
| Migration criada | Nenhuma |
| Banco alterado | Nenhum |
| RLS/grants/policies | Sem alteração |
| `git add` executado | Não |
| Commit realizado | Não |
| Push realizado | Não |

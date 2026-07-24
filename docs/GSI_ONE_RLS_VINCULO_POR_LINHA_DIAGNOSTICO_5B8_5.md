# GSI ONE — RLS: Diagnóstico do Vínculo de Acesso por Linha / Paciente / Atendimento

**Documento:** GSI_ONE_RLS_VINCULO_POR_LINHA_DIAGNOSTICO_5B8_5  
**Etapa:** 5B.8.5  
**Status:** Diagnóstico concluído — nenhuma alteração de banco, código ou migration realizada  
**Elaborado em:** 2026-07-24  
**Referências:** SEGURANCA_SUPABASE_INVENTARIO_5B8.md · GSI_ONE_TESTES_RLS_GRANTS_6B8.md · migrations 01–28

---

## 1. Estado atual

### 1.1 Resumo executivo

A camada de RLS do GSI ONE está **estruturalmente presente e correta quanto à existência de policies**, mas possui uma **lacuna crítica de granularidade**: o predicado principal de leitura em praticamente todas as tabelas é `is_linked_user()`, que responde **apenas à questão "este usuário tem perfil ativo?"**, sem qualquer referência à linha que está sendo lida, ao paciente envolvido, ao atendimento em curso, ao setor ou à responsabilidade assistencial do solicitante.

Isso significa que, na situação atual, qualquer usuário autenticado com pelo menos um perfil ativo pode ler **todos os registros clínicos de todos os pacientes**, independentemente de ter qualquer relação com aquele atendimento.

O achado foi confirmado pelos testes automatizados da etapa 6B.8 e está documentado naquele relatório como ponto crítico para esta etapa (5B.8.5).

### 1.2 Definição das funções auxiliares de segurança

Todas as funções abaixo são `SECURITY DEFINER`, `STABLE`, com `search_path = public`, definidas na migration `20260623100012_rls_policies.sql` e com EXECUTE restrito a `authenticated` conforme `20260623100016_hardening_funcoes.sql`.

---

#### `current_user_id() → uuid`

```sql
select auth.uid();
```

Retorna o UUID do usuário autenticado. `NULL` se anônimo. Não é chamada por nenhuma policy atual (as policies usam `auth.uid()` diretamente). Sem GRANT a `authenticated` por postura conservadora — exposição via RPC evitada intencionalmente.

---

#### `is_linked_user() → boolean`

```sql
select exists (
  select 1
  from usuarios u
  join usuario_perfil up on up.usuario_id = u.id
  where u.id = auth.uid()
    and u.ativo = true
);
```

**O predicado central do problema diagnosticado.** Retorna `TRUE` se e somente se:
- o usuário possui registro em `public.usuarios` com `ativo = true`; E
- possui ao menos um vínculo em `usuario_perfil`.

Não recebe parâmetro algum. Não consulta qual é a linha sendo acessada. Não verifica setor, unidade, atendimento, paciente, equipe ou responsabilidade. Usado como cláusula `USING` em 27 das 88 policies inventariadas.

---

#### `has_perfil(perfil_codigo text) → boolean`

```sql
select exists (
  select 1
  from usuario_perfil up
  join perfis_acesso pa on pa.id = up.perfil_id
  join usuarios u on u.id = up.usuario_id
  where up.usuario_id = auth.uid()
    and u.ativo = true
    and pa.nome = perfil_codigo
);
```

Verifica se o usuário possui o perfil pelo nome exato em `perfis_acesso.nome`. Também não recebe contexto de linha. Usado nas policies de UPDATE/ALL que restringem escrita por tipo de perfil.

---

#### `has_permission(permission_codigo text) → boolean`

```sql
select exists (
  select 1
  from usuario_perfil up
  join perfil_permissao pp on pp.perfil_id = up.perfil_id
  join permissoes p on p.id = pp.permissao_id
  join usuarios u on u.id = up.usuario_id
  where up.usuario_id = auth.uid()
    and u.ativo = true
    and p.chave = permission_codigo
);
```

Verifica se o usuário possui determinada chave de permissão via qualquer perfil vinculado. Também não recebe contexto de linha. Mais granular que `has_perfil`, mas ainda sem vínculo por linha.

---

#### `is_admin() → boolean`

```sql
select public.has_perfil('Administração');
```

Atalho para `has_perfil('Administração')`. Sem contexto de linha.

---

#### `is_auditoria() → boolean`

```sql
select public.has_perfil('Auditoria');
```

Atalho para `has_perfil('Auditoria')`. Sem contexto de linha.

---

### 1.3 Campo `setor` em `usuario_perfil`

A tabela `usuario_perfil` possui o campo `setor text` (migration `20260623100004_acesso.sql`). Esse campo **existe mas não é usado por nenhuma função ou policy** no momento. Ele representa a intenção arquitetural de vincular o usuário a um setor, mas permanece sem implementação funcional.

---

## 2. Evidências

| Fonte | Achado |
|---|---|
| `20260623100012_rls_policies.sql` | 27 policies `FOR SELECT` com `USING (is_linked_user())` em 20 tabelas diferentes |
| `20260623100004_acesso.sql` | `usuario_perfil.setor` existe mas não é referenciado em nenhuma função ou policy |
| `20260623100006_atendimentos.sql` | `atendimentos.profissional_responsavel_id` existe como FK para `usuarios`, mas não é usado em nenhuma policy de SELECT |
| `GSI_ONE_TESTES_RLS_GRANTS_6B8.md` | "Achado crítico: `is_linked_user()` não recebe parâmetros de linha…" |
| `SEGURANCA_SUPABASE_INVENTARIO_5B8.md` | "Ausência de vínculo granular por atendimento, setor, equipe, plantão ou responsabilidade assistencial" |

---

## 3. Tabela de policies que usam `is_linked_user()` — exposição por tabela

| Tabela | Nome da policy | Comando | USING | WITH CHECK | Tipo de dado exposto | Risco potencial |
|---|---|---|---|---|---|---|
| `dom_status_atendimento` | `dom_status_atendimento_select_linked` | SELECT | `is_linked_user()` | — | Domínio público interno | Baixo — dado não sensível |
| `dom_desfechos` | `dom_desfechos_select_linked` | SELECT | `is_linked_user()` | — | Domínio público interno | Baixo |
| `dom_classificacao_risco` | `dom_classificacao_risco_select_linked` | SELECT | `is_linked_user()` | — | Domínio público interno | Baixo |
| `dom_tipos_observacao` | `dom_tipos_observacao_select_linked` | SELECT | `is_linked_user()` | — | Domínio público interno | Baixo |
| `dom_status_transferencia` | `dom_status_transferencia_select_linked` | SELECT | `is_linked_user()` | — | Domínio público interno | Baixo |
| `dom_status_prescricao` | `dom_status_prescricao_select_linked` | SELECT | `is_linked_user()` | — | Domínio público interno | Baixo |
| `dom_status_exame` | `dom_status_exame_select_linked` | SELECT | `is_linked_user()` | — | Domínio público interno | Baixo |
| `perfis_acesso` | `perfis_acesso_select_linked` | SELECT | `is_linked_user()` | — | Nomes de perfis | Baixo |
| `permissoes` | `permissoes_select_linked` | SELECT | `is_linked_user()` | — | Chaves de permissões | Baixo |
| `perfil_permissao` | `perfil_permissao_select_linked` | SELECT | `is_linked_user()` | — | Mapa perfil × permissão | Baixo |
| `pacientes` | `pacientes_select_linked` | SELECT | `is_linked_user()` | — | **Nome, CPF, CNS, data nasc., telefone, município** | **Crítico** — dados identificáveis de todos os pacientes |
| `paciente_alergias` | `paciente_alergias_select_linked` | SELECT | `is_linked_user()` | — | **Alergias, gravidade** | **Crítico** |
| `paciente_comorbidades` | `paciente_comorbidades_select_linked` | SELECT | `is_linked_user()` | — | **Comorbidades clínicas** | **Crítico** |
| `paciente_medicamentos_continuos` | `paciente_medicamentos_continuos_select_linked` | SELECT | `is_linked_user()` | — | **Medicamentos em uso contínuo** | **Crítico** |
| `paciente_alertas_clinicos` | `paciente_alertas_clinicos_select_linked` | SELECT | `is_linked_user()` | — | **Alertas clínicos** | **Crítico** |
| `atendimentos` | `atendimentos_select_linked` | SELECT | `is_linked_user()` | — | **Todos os atendimentos ativos e históricos, queixa, status, etapa, setor, profissional** | **Crítico** |
| `chamadas` | `chamadas_select_linked` | SELECT | `is_linked_user()` | — | Histórico de chamadas por atendimento | Médio |
| `triagens` | `triagens_select_linked` | SELECT | `is_linked_user()` | — | **Dados de triagem, sinais vitais, classificação de risco** | **Crítico** |
| `consultas` | `consultas_select_linked` | SELECT | `is_linked_user()` | — | **Dados de consulta médica, conduta, CID** | **Crítico** |
| `evolucoes_enfermagem` | `evolucoes_enfermagem_select_linked` | SELECT | `is_linked_user()` | — | **Evoluções de enfermagem** | **Crítico** |
| `observacoes` | `observacoes_select_linked` | SELECT | `is_linked_user()` | — | **Dados de observação clínica, pediátrica, obstétrica** | **Crítico** |
| `reavaliacoes_observacao` | `reavaliacoes_observacao_select_linked` | SELECT | `is_linked_user()` | — | **Reavaliações clínicas** | **Crítico** |
| `estabilizacoes` | `estabilizacoes_select_linked` | SELECT | `is_linked_user()` | — | **Dados de sala de estabilização** | **Crítico** |
| `checklist_estabilizacao_itens` | `checklist_estabilizacao_itens_select_linked` | SELECT | `is_linked_user()` | — | Checklist de estabilização | Médio |
| `exames` | `exames_select_linked` | SELECT | `is_linked_user()` | — | **Exames solicitados e resultados** | **Crítico** |
| `prescricoes` | `prescricoes_select_linked` | SELECT | `is_linked_user()` | — | **Prescrições médicas** | **Crítico** |
| `prescricao_itens` | `prescricao_itens_select_linked` | SELECT | `is_linked_user()` | — | **Itens prescritos, doses, via** | **Crítico** |
| `transferencias` | `transferencias_select_linked` | SELECT | `is_linked_user()` | — | **Dados de transferência regulada** | **Crítico** |
| `checklist_transferencia_itens` | `checklist_transferencia_itens_select_linked` | SELECT | `is_linked_user()` | — | Checklist de transferência | Médio |
| `estoque_itens` | `estoque_itens_select_linked` | SELECT | `is_linked_user()` | — | Itens de estoque | Baixo |
| `estoque_movimentacoes` | `estoque_movimentacoes_select_linked` | SELECT | `is_linked_user()` | — | Movimentações de estoque | Baixo |
| `audit_log` | `audit_log_insert_linked` | INSERT | — | `is_linked_user()` | Gravação de auditoria | Baixo (INSERT controlado, SELECT restrito) |

> **Nota sobre `audit_log`:** a policy de INSERT com `is_linked_user()` foi explicitamente listada na migration como temporária, a ser removida quando o trigger automático for a única via de escrita. A policy de SELECT é restrita a admin/auditoria.

---

## 4. Mapeamento de relacionamentos existentes

```
auth.users (Supabase Auth)
    │
    └──▷ public.usuarios (id = auth.uid(), ativo boolean)
              │
              └──▷ usuario_perfil (usuario_id, perfil_id, setor [não usado])
                        │
                        └──▷ perfis_acesso (nome: Recepção, Técnico em Enfermagem, Médico, ...)
                                  │
                                  └──▷ perfil_permissao → permissoes (chave: paciente.criar, ...)

public.pacientes
    │
    └──▷ atendimentos (paciente_id, profissional_responsavel_id → usuarios, setor_atual)
              │
              ├──▷ triagens (atendimento_id, criado_por → usuarios)
              ├──▷ consultas (atendimento_id, criado_por → usuarios)
              ├──▷ evolucoes_enfermagem (atendimento_id, criado_por → usuarios)
              ├──▷ observacoes (atendimento_id, criado_por → usuarios)
              ├──▷ estabilizacoes (atendimento_id, criado_por → usuarios)
              ├──▷ exames (atendimento_id, criado_por → usuarios)
              ├──▷ prescricoes (atendimento_id, criado_por → usuarios)
              └──▷ transferencias (atendimento_id, criado_por → usuarios)
```

### 4.1 Vínculos existentes que NÃO são usados nas policies de SELECT

| Campo | Tabela | Descrição | Usado em policy? |
|---|---|---|---|
| `profissional_responsavel_id` | `atendimentos` | Profissional responsável pelo atendimento | **Não** |
| `created_by` | Todas as tabelas clínicas | UUID do usuário que criou o registro | **Não** |
| `setor_atual` | `atendimentos` | Setor onde o atendimento está em curso | **Não** |
| `setor` | `usuario_perfil` | Setor vinculado ao perfil do usuário | **Não** |

### 4.2 Vínculos ausentes (não existem como campos)

- Equipe assistencial (equipe multiprofissional por atendimento)
- Plantão ou escala de trabalho
- Unidade (para cenário futuro multi-CNES)
- Participação em procedimento (executor de exame, dispensador de farmácia)

---

## 5. Cenários de exposição

### Cenário 1 — Recepcionista acessa dados de consultas médicas

Um usuário com perfil `Recepção` pode, via SELECT direto à API PostgREST, ler:
- todas as consultas de todos os pacientes (`consultas_select_linked`);
- todas as prescrições (`prescricoes_select_linked`);
- todos os resultados de exames (`exames_select_linked`).

A policy não impede isso porque `is_linked_user()` é `TRUE` para qualquer usuário com perfil ativo, independentemente do perfil específico.

### Cenário 2 — Técnico de enfermagem de turno lê atendimentos de outro turno ou setor

O campo `setor_atual` em `atendimentos` existe, assim como `setor` em `usuario_perfil`, mas nenhum dos dois é verificado nas policies de SELECT. Um técnico do setor pediátrico pode ler atendimentos do setor obstétrico sem restrição.

### Cenário 3 — Usuário de farmácia acessa dados clínicos completos

Perfil `Farmácia` tem acesso de leitura a triagens, consultas, evoluções, observações e estabilizações, todos protegidos apenas por `is_linked_user()`. A farmácia precisa ver prescrições, mas não necessariamente toda a evolução clínica do paciente.

### Cenário 4 — Profissional de diagnóstico/exames lê dados obstétricos

Perfil `Diagnóstico/Exames` acessa observações obstétricas pela mesma policy ampla. Não há restrição por tipo de observação nem por atendimento ao qual o profissional está vinculado.

### Cenário 5 — Usuário recém-cadastrado sem atendimentos reais

Um usuário com perfil ativo que nunca atendeu nenhum paciente tem acesso de leitura ao histórico completo de todos os atendimentos, pacientes e registros clínicos desde o início do sistema.

---

## 6. Classificação das tabelas por grupo de acesso

### Grupo A — Catálogos públicos internos

**Risco:** Baixo — dados não sensíveis, necessários para funcionamento do sistema.  
**Policy atual:** `is_linked_user()` é adequada.  
**Ação recomendada:** Manter como está.

| Tabela |
|---|
| `dom_status_atendimento` |
| `dom_desfechos` |
| `dom_classificacao_risco` |
| `dom_tipos_observacao` |
| `dom_status_transferencia` |
| `dom_status_prescricao` |
| `dom_status_exame` |
| `perfis_acesso` |
| `permissoes` |
| `perfil_permissao` |
| `configuracoes_sistema` |

---

### Grupo B — Dados administrativos

**Risco:** Médio — dados de usuários e perfis têm senso de privacidade; não são clínicos.  
**Policy atual:** Adequada para a maioria (usuário vê o próprio; admin/auditoria veem todos).  
**Ação recomendada:** Revisar se `perfis_acesso`/`permissoes` precisam ser visíveis a todos os perfis ou apenas quando necessário para funcionamento do frontend.

| Tabela |
|---|
| `usuarios` |
| `usuario_perfil` |
| `perfis_acesso` |
| `permissoes` |
| `perfil_permissao` |

---

### Grupo C — Dados assistenciais gerais

**Risco:** Médio a Alto — `pacientes` e `atendimentos` contêm dados identificáveis.  
**Policy atual:** `is_linked_user()` para SELECT — ampla demais.  
**Ação recomendada:** Restringir SELECT por setor (atendimentos) e por necessidade operacional (pacientes).

| Tabela |
|---|
| `pacientes` |
| `atendimentos` |
| `chamadas` |

---

### Grupo D — Dados clínicos sensíveis

**Risco:** Crítico — dados de saúde protegidos por LGPD.  
**Policy atual:** `is_linked_user()` para SELECT — estruturalmente inadequada.  
**Ação recomendada:** Restringir por atendimento vinculado ao usuário (criação, responsabilidade, setor ou equipe).

| Tabela |
|---|
| `triagens` |
| `consultas` |
| `evolucoes_enfermagem` |
| `observacoes` |
| `reavaliacoes_observacao` |
| `estabilizacoes` |
| `checklist_estabilizacao_itens` |
| `exames` |
| `prescricoes` |
| `prescricao_itens` |
| `transferencias` |
| `checklist_transferencia_itens` |
| `paciente_alergias` |
| `paciente_comorbidades` |
| `paciente_medicamentos_continuos` |
| `paciente_alertas_clinicos` |

---

### Grupo E — Auditoria

**Risco:** Alto — contém histórico completo de operações, incluindo dados antes/depois.  
**Policy atual:** SELECT restrito a admin/auditoria — adequada e correta.  
**Ação recomendada:** Manter; avaliar minimização do payload JSON no futuro.

| Tabela |
|---|
| `audit_log` |

---

### Grupo F — Estoque e farmácia

**Risco:** Baixo a Médio — dados operacionais, não identificam pacientes diretamente.  
**Policy atual:** `is_linked_user()` para SELECT — razoável, mas pode ser refinada.  
**Ação recomendada:** Baixa prioridade de refinamento; manter e reavaliar em fase futura.

| Tabela |
|---|
| `estoque_itens` |
| `estoque_movimentacoes` |

---

## 7. Alternativas de arquitetura

### Alternativa 1 — Acesso por perfil e setor/unidade

**Descrição:** A policy de SELECT passa a verificar `has_perfil()` e, opcionalmente, o campo `setor` de `usuario_perfil` comparado com `setor_atual` do atendimento.

**Exemplo conceitual:**
```sql
-- pacientes: visível a perfis assistenciais
USING (
  has_perfil('Recepção') OR has_perfil('Técnico em Enfermagem') OR has_perfil('Médico') OR ...
)

-- atendimentos: restrito ao setor do usuário
USING (
  setor_atual = (
    SELECT up.setor FROM usuario_perfil up WHERE up.usuario_id = auth.uid() LIMIT 1
  ) OR is_admin() OR is_auditoria()
)
```

**Avaliação:**

| Critério | Resultado |
|---|---|
| Segurança | Melhor que o atual, mas ainda baseada em setor estático — não rastreia participação real |
| Complexidade | Baixa — usa campos já existentes |
| Impacto no frontend | Baixo — frontend atual já filtra por setor via `sectorSelect` |
| Impacto nas migrations | Média — novas policies, sem novas tabelas se `setor` já estiver preenchido |
| Impacto no fluxo atual | Baixo |
| Novas tabelas necessárias | Não |
| Risco de quebra | Médio — usuários sem `setor` preenchido perdem acesso |
| Aderência ao hospital de baixa complexidade | Alta — setor é conceito já presente na operação |

**Limitação:** Um profissional que atende em múltiplos setores precisa de múltiplos registros em `usuario_perfil`, ou o campo `setor` precisa ser null (leitura ampla). Além disso, o setor é informação estática — não reflete quem está de plantão agora.

---

### Alternativa 2 — Acesso por atendimento atribuído ao profissional ou equipe

**Descrição:** A policy de SELECT em tabelas clínicas (Grupo D) verifica se o usuário está vinculado ao atendimento da linha em questão, seja como `profissional_responsavel_id`, `created_by`, ou membro de uma equipe.

**Exemplo conceitual:**
```sql
-- triagens: visível ao criador, ao responsável pelo atendimento, admin e auditoria
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM atendimentos a
    WHERE a.id = triagens.atendimento_id
      AND (a.profissional_responsavel_id = auth.uid() OR a.created_by = auth.uid())
  )
  OR is_admin() OR is_auditoria()
)
```

**Avaliação:**

| Critério | Resultado |
|---|---|
| Segurança | Alta — vínculo real por registro ou atendimento |
| Complexidade | Alta — cada policy precisa de subquery correlacionada |
| Impacto no frontend | Alto — usuários sem vínculo explícito não veem dados de outros (pode quebrar visão gerencial) |
| Impacto nas migrations | Alto — todas as policies de SELECT do Grupo D precisam ser reescritas |
| Impacto no fluxo atual | Alto — `profissional_responsavel_id` precisaria ser preenchido consistentemente |
| Novas tabelas necessárias | Possivelmente — uma tabela `equipe_atendimento` para múltiplos participantes |
| Risco de quebra | Alto — profissionais que precisam ver atendimentos de colegas (enfermeiro do turno cobrindo) perderiam acesso |
| Aderência ao hospital de baixa complexidade | Baixa — em unidade pequena, toda a equipe precisa ver todo o fluxo ativo |

**Limitação:** Modelo muito restritivo para uma UPA/pronto-socorro de baixa complexidade onde a equipe é pequena e compartilha visão operacional do fluxo ativo.

---

### Alternativa 3 — Acesso operacional por etapa do fluxo assistencial

**Descrição:** Cada policy de SELECT verifica se o usuário tem permissão para a etapa que originou aquele registro. Exemplo: triagens são visíveis a quem tem `triagem.classificar`; consultas são visíveis a quem tem `consulta.iniciar` ou `consulta.registrar_conduta`.

**Exemplo conceitual:**
```sql
-- triagens: visível a quem pode triagem ou é admin/auditoria
USING (
  has_permission('triagem.classificar')
  OR is_admin() OR is_auditoria()
)

-- consultas: visível a médicos (consulta) e enfermagem (acompanhamento)
USING (
  has_permission('consulta.iniciar')
  OR has_permission('consulta.registrar_conduta')
  OR has_permission('triagem.classificar')
  OR is_admin() OR is_auditoria()
)
```

**Avaliação:**

| Critério | Resultado |
|---|---|
| Segurança | Melhorada — cada tabela restrita aos perfis que atuam nela |
| Complexidade | Média — usa `has_permission()` já existente, sem subqueries |
| Impacto no frontend | Baixo a médio — frontend já verifica permissões antes de renderizar módulos |
| Impacto nas migrations | Médio — uma nova migration com DROP+CREATE de ~20 policies |
| Impacto no fluxo atual | Baixo — sem mudança em dados, apenas no predicado das policies |
| Novas tabelas necessárias | Não |
| Risco de quebra | Baixo a médio — requer mapeamento cuidadoso de quais permissões dão acesso a quais tabelas |
| Aderência ao hospital de baixa complexidade | Alta — alinha o acesso a dados à função operacional do profissional |

**Limitação:** Não resolve o problema por linha — um médico ainda lê todas as consultas, não apenas as que realizou. Melhora a separação entre perfis sem granularidade de linha.

---

### Alternativa 4 — Modelo híbrido (recomendado)

**Descrição:** Combina quatro camadas de controle:

1. **Unidade/setor** — `usuario_perfil.setor` filtra tabelas operacionais (atendimentos, chamadas);
2. **Perfil/permissão** — `has_permission()` diferencia acesso às tabelas clínicas por etapa do fluxo;
3. **Participação no atendimento** — `created_by = auth.uid()` ou `profissional_responsavel_id = auth.uid()` como condição suplementar (OR, não AND — preserva visibilidade da equipe);
4. **Finalidade operacional** — atendimentos com status ativo têm visibilidade mais ampla; atendimentos encerrados são restritos a admin, auditoria e quem criou.

**Exemplo conceitual de acesso a atendimentos:**
```sql
USING (
  -- perfis que precisam ver o fluxo ativo completo
  (
    has_perfil('Recepção')
    OR has_perfil('Técnico em Enfermagem')
    OR has_perfil('Médico')
    OR has_perfil('Regulação de Transferência')
    OR has_perfil('Farmácia')
    OR has_perfil('Diagnóstico/Exames')
  )
  AND (
    -- setor do usuário bate com o setor atual, OU atendimento foi criado por este usuário
    setor_atual = (SELECT up.setor FROM usuario_perfil up WHERE up.usuario_id = auth.uid() LIMIT 1)
    OR created_by = auth.uid()
    OR profissional_responsavel_id = auth.uid()
    -- ou o atendimento está ativo e o perfil tem acesso operacional amplo
    OR (status_id IN (SELECT id FROM dom_status_atendimento WHERE codigo NOT IN ('encerrado','alta','obito')))
  )
  OR is_admin()
  OR is_auditoria()
)
```

**Exemplo conceitual de acesso a dados clínicos sensíveis (consultas, triagens, etc.):**
```sql
USING (
  has_permission('<permissao_da_etapa>')
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM atendimentos a
      WHERE a.id = <tabela>.atendimento_id
        AND (
          a.setor_atual = (SELECT up.setor FROM usuario_perfil up WHERE up.usuario_id = auth.uid() LIMIT 1)
          OR a.profissional_responsavel_id = auth.uid()
          OR a.created_by = auth.uid()
        )
    )
  )
  OR is_admin()
  OR is_auditoria()
)
```

**Avaliação:**

| Critério | Resultado |
|---|---|
| Segurança | Alta — combina perfil, setor e participação |
| Complexidade | Alta — múltiplas condições por policy; subqueries correlacionadas |
| Impacto no frontend | Médio — frontend atual filtra por setor; o backend passaria a aplicar a mesma lógica |
| Impacto nas migrations | Alto — todas as policies de SELECT do Grupo C e D precisam ser reescritas; `usuario_perfil.setor` precisa ser preenchido consistentemente |
| Impacto no fluxo atual | Médio — `setor_atual` em atendimentos e `setor` em `usuario_perfil` precisam estar populados |
| Novas tabelas necessárias | Opcional — `equipe_atendimento` para participação multiprofissional; `usuario_unidade` para multi-CNES futuro |
| Risco de quebra | Médio — usuários sem `setor` configurado em `usuario_perfil` precisam de fallback |
| Aderência ao hospital de baixa complexidade | Alta — combina simplicidade operacional com controle adequado |

---

## 8. Modelo recomendado

**Recomendação:** Alternativa 4 — Modelo híbrido, implementado em fases.

**Justificativa:**

1. **Alternativa 1** melhora, mas continua sem granularidade real de linha — setor estático não é suficiente para LGPD.
2. **Alternativa 2** é a mais segura, mas excessivamente restritiva para o contexto operacional de um hospital de baixa complexidade onde a equipe é pequena e multifuncional.
3. **Alternativa 3** melhora a separação por perfil sem resolver a granularidade de linha — passo intermediário válido.
4. **Alternativa 4** equilibra segurança, operacionalidade e aderência ao contexto institucional. Pode ser implementada progressivamente sem quebrar o fluxo existente.

**Pré-condições antes de qualquer implementação:**

- [ ] Confirmar que `usuario_perfil.setor` pode ser utilizado como campo operacional real;
- [ ] Confirmar que `atendimentos.setor_atual` é preenchido e atualizado consistentemente ao longo do fluxo;
- [ ] Confirmar se haverá necessidade de atendimentos visíveis a profissionais de múltiplos setores (ex.: médico que atende em urgência e observação);
- [ ] Confirmar com a equipe técnica o impacto no frontend antes da primeira migration de RLS refinada;
- [ ] Confirmar se `profissional_responsavel_id` em atendimentos é sempre preenchido, ou apenas eventual.

---

## 9. Plano faseado de implementação

> **Atenção:** Nenhuma das fases abaixo deve ser iniciada sem aprovação explícita. Este documento é de diagnóstico e planejamento.

### Fase 1 — Refinamento por permissão (baixo risco)

**Objetivo:** Substituir `is_linked_user()` por `has_permission('<etapa>')` nas policies de SELECT do Grupo D, sem subqueries.  
**Impacto:** Melhora a separação entre perfis; recepcionista deixa de ler consultas médicas.  
**Risco:** Baixo — usa infraestrutura já existente.  
**Prerequisito:** Mapeamento de qual permissão dá acesso a qual tabela clínica.  
**Estimativa:** 1 migration com DROP+CREATE de ~20 policies de SELECT.

### Fase 2 — Preenchimento de `setor` em `usuario_perfil`

**Objetivo:** Garantir que todos os usuários ativos tenham `setor` preenchido em `usuario_perfil`.  
**Impacto:** Prepara o ambiente para as policies de setor na Fase 3.  
**Risco:** Baixo — alteração de dados, não de estrutura.  
**Prerequisito:** Decisão institucional sobre setores válidos (a validar).

### Fase 3 — Acesso a atendimentos por setor

**Objetivo:** Adicionar condição de setor nas policies de SELECT de `atendimentos` e tabelas do Grupo C.  
**Impacto:** Profissional do setor pediátrico não lê atendimentos do setor obstétrico.  
**Risco:** Médio — usuários sem setor ou com setor incorreto perdem acesso.  
**Prerequisito:** Fase 2 concluída; validação com o frontend.

### Fase 4 — Vínculo por participação em atendimentos do Grupo D

**Objetivo:** Adicionar subquery de participação (`created_by`, `profissional_responsavel_id`) nas policies de SELECT das tabelas clínicas.  
**Impacto:** Tabelas clínicas ficam restritas a quem participou do atendimento (ou admin/auditoria).  
**Risco:** Alto — requer `profissional_responsavel_id` populado e `setor_atual` consistente.  
**Prerequisito:** Fases 1, 2 e 3 concluídas; validação end-to-end com usuários autenticados.

### Fase 5 (opcional/futura) — Tabela `equipe_atendimento`

**Objetivo:** Criar tabela de participação multiprofissional para registrar todos os profissionais que atuaram em um atendimento.  
**Impacto:** Resolve o caso de cobertura de plantão e substituição de profissional.  
**Risco:** Alto — nova tabela, novas policies, impacto no fluxo assistencial.  
**Prerequisito:** Todas as fases anteriores; validação institucional.

---

## 10. Matriz preliminar de testes para a futura correção

Para cada fase de refinamento, os seguintes cenários de teste devem ser cobertos. Esta matriz deve ser refinada quando a arquitetura for aprovada.

### Tabelas clínicas (Grupo D) — cenários de acesso por perfil

| Perfil | `triagens` | `consultas` | `evolucoes_enfermagem` | `prescricoes` | `exames` | `observacoes` | `transferencias` |
|---|---|---|---|---|---|---|---|
| Recepcionista | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Sem acesso |
| Técnico em Enfermagem | Leitura (seu setor) | Leitura (seu setor) | Leitura + escrita | Leitura | Leitura | Leitura + escrita | Leitura |
| Enfermeiro (futuro) | Leitura + escrita | Leitura | Leitura + escrita | Leitura | Leitura | Leitura + escrita | Leitura |
| Médico | Leitura | Leitura + escrita | Leitura | Leitura + escrita | Leitura + escrita | Leitura + escrita | Escrita (solicitar) |
| Farmácia | Sem acesso | Sem acesso | Sem acesso | Leitura + dispensar | Sem acesso | Sem acesso | Sem acesso |
| Diagnóstico/Exames | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Leitura + liberação | Sem acesso | Sem acesso |
| Regulação de Transferência | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Leitura + escrita |
| Administração | Tudo | Tudo | Tudo | Tudo | Tudo | Tudo | Tudo |
| Auditoria | Somente leitura | Somente leitura | Somente leitura | Somente leitura | Somente leitura | Somente leitura | Somente leitura |

### Cenários de borda obrigatórios

| Cenário | Resultado esperado |
|---|---|
| Usuário sem perfil (`usuario_perfil` vazia) | Nenhuma leitura em nenhuma tabela do Grupo C ou D |
| Usuário inativo (`usuarios.ativo = false`) | Nenhuma leitura; is_linked_user() retorna FALSE |
| Usuário autenticado sem registro em `usuarios` | Nenhuma leitura; is_linked_user() retorna FALSE |
| Acesso anônimo | REVOKE ALL já aplicado; nenhum acesso possível |
| Recepcionista tentando SELECT em `consultas` | Bloqueado (após Fase 1) |
| Farmacêutico tentando SELECT em `triagens` | Bloqueado (após Fase 1) |
| Técnico de outro setor tentando SELECT em `atendimentos` de setor diferente | Bloqueado (após Fase 3) |
| Médico lendo consulta de colega do mesmo setor | Permitido (acesso por setor, não por criador) |
| Médico lendo consulta de paciente de setor diferente (sem ser responsável) | Bloqueado (após Fase 4) |
| Admin acessando qualquer tabela | Sempre permitido |
| Auditoria fazendo UPDATE em qualquer tabela clínica | Bloqueado — apenas SELECT e audit_log |
| Auditoria fazendo SELECT em `audit_log` | Permitido |

---

## 11. Pontos que dependem de decisão institucional

Os itens abaixo **não podem ser decididos tecnicamente sem alinhamento com a direção hospitalar, coordenação de enfermagem e gestão de TI**:

- [ ] **Setores válidos da unidade:** qual é a lista oficial de setores (UPA, pronto-socorro, observação, pediátrico, obstétrico, farmácia, regulação, recepção, administração)?
- [ ] **Visibilidade entre setores:** um médico da observação pode ver triagens da urgência? Um técnico de enfermagem cobrindo dois setores deve ver ambos ou apenas um?
- [ ] **Cobertura de plantão:** quando um profissional substitui outro, quem deve ter acesso ao atendimento em andamento?
- [ ] **Gestão hospitalar e leitura ampla:** perfis como `Gestão Hospitalar` e `Leitura/Gestor` (existentes em `perfis_acesso`, sem policies próprias) devem ter leitura de dados assistenciais agregados ou individualizados?
- [ ] **Auditoria e granularidade:** a Auditoria deve ver todos os registros (comportamento atual para `audit_log`) ou apenas registros de períodos/competências específicas?
- [ ] **Profissional responsável:** `atendimentos.profissional_responsavel_id` deve ser obrigatoriamente preenchido em todos os atendimentos, ou permanece opcional?
- [ ] **LGPD e necessidade operacional:** a unidade tem orientação jurídica sobre o nível mínimo de separação de acesso a dados de saúde por perfil profissional?
- [ ] **Prioridade de implementação:** iniciar pelo refinamento por perfil/permissão (menor risco, impacto imediato na separação de papéis) ou aguardar desenho completo do modelo híbrido?

---

## 12. Riscos identificados

| Risco | Probabilidade | Impacto | Observação |
|---|---|---|---|
| Quebra de fluxo no frontend ao restringir SELECT | Alta | Alto | Frontend atual assume que qualquer usuário logado vê todos os dados — scripts como `loadPacientesReais`, `loadAtendimentosReais` podem retornar 0 linhas após o refinamento |
| `usuario_perfil.setor` vazio na maioria dos usuários | Alta | Alto | Se nenhum usuário tiver `setor` preenchido, a Fase 3 bloqueia o acesso de todos |
| `profissional_responsavel_id` nulo em atendimentos reais | Alta | Alto | Sem esse campo populado, a Alternativa 4 exclui atendimentos do campo de visão |
| Novos perfis sem mapeamento de permissões | Média | Médio | `Gestão Hospitalar` e `Leitura/Gestor` existem sem policies — usuários com esses perfis ficam com acesso imprevisível |
| Regressão em testes automatizados da suíte 6B.8 | Média | Médio | Os testes atuais verificam existência e nome de policies — novas policies devem ser adicionadas aos asserts |
| Impacto no PostgREST ao adicionar subqueries correlacionadas | Média | Médio | Subqueries em USING podem aumentar latência em tabelas com muitas linhas — medir antes de aplicar em produção |

---

*Documento de diagnóstico — 2026-07-24. Nenhuma migration, tabela, policy, function ou grant foi criado ou alterado. Aprovação explícita necessária antes de qualquer implementação.*

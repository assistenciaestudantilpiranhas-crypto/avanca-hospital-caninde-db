# GSI ONE — RLS Fase A: Plano Técnico de Restrição de Leitura

**Documento:** GSI_ONE_RLS_FASE_A_PLANO_TECNICO_5B8_5B  
**Etapa:** 5B.8.5B  
**Status:** Plano técnico — nenhuma migration criada; nenhum banco alterado  
**Elaborado em:** 2026-07-24  
**Pré-requisitos lidos:** GSI_ONE_RLS_VINCULO_POR_LINHA_DIAGNOSTICO_5B8_5.md · GSI_ONE_MATRIZ_LEITURA_PERFIL_MODULO_5B8_5A.md  

---

## 1. Objetivo e escopo

### 1.1 Objetivo

Produzir o plano técnico exato para a primeira migration de segurança de RLS do GSI ONE, denominada **Fase A**, que bloqueia acessos de leitura evidentemente indevidos com o menor risco possível.

A Fase A **não** implementa restrição por setor, por atendimento, por profissional ou por equipe. Essas restrições são escopo das Fases C e D.

### 1.2 Perfis tratados nesta fase

| Perfil | Problema atual | Ação proposta |
|---|---|---|
| `Recepção` | Lê triagens, consultas, evoluções, prescrições, exames, observações via `is_linked_user()` | Remover acesso clínico detalhado; manter apenas cadastro e fila |
| `Farmácia` | Lê triagens, consultas, evoluções, observações, transferências via `is_linked_user()` | Restringir a prescrições, itens de prescrição e estoque |
| `Gestão Hospitalar` | Herda leitura ampla de todo o banco sem policy própria | Bloquear acesso a dados clínicos nominais; documentar lacuna de tabelas de indicadores |
| `Leitura/Gestor` | Idêntico ao Gestão Hospitalar | Idêntico ao Gestão Hospitalar |

### 1.3 Perfis NÃO alterados nesta fase

Os perfis abaixo **mantêm o acesso atual** durante a Fase A:

- Técnico em Enfermagem
- Enfermeiro
- Médico
- Regulação de Transferência
- Administração
- Auditoria

> **Justificativa:** Esses perfis têm acesso clínico justificado pelo fluxo assistencial. A restrição por setor e atendimento que se aplica a eles é escopo das Fases C e D, que dependem de decisões institucionais sobre setores ainda pendentes.

### 1.4 Fora do escopo desta fase

- Restrição por setor (`usuario_perfil.setor` × `atendimentos.setor_atual`)
- Restrição por atendimento vinculado (`profissional_responsavel_id`, `created_by`)
- Criação de tabelas de indicadores ou views de dados agregados
- Restrição de Administração a dados clínicos
- Auditoria de leitura (triggers de SELECT)
- Criação de novas permissões de leitura no banco

---

## 2. Inventário nominal de policies SELECT afetadas

### Nomenclatura vigente e expressão USING atual

As 18 tabelas-alvo possuem policies de SELECT com `USING (public.is_linked_user())`, definidas pela migration `20260623100012_rls_policies.sql`. A tabela abaixo consolida o inventário completo.

| Tabela | Policy SELECT atual | USING atual | Perfis alcançados | Risco |
|---|---|---|---|---|
| `pacientes` | `pacientes_select_linked` | `is_linked_user()` | Todos os perfis vinculados | Alto — dados identificáveis |
| `atendimentos` | `atendimentos_select_linked` | `is_linked_user()` | Todos os perfis vinculados | Alto — fluxo e status |
| `chamadas` | `chamadas_select_linked` | `is_linked_user()` | Todos os perfis vinculados | Médio |
| `triagens` | `triagens_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — dados clínicos |
| `consultas` | `consultas_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — ato médico |
| `evolucoes_enfermagem` | `evolucoes_enfermagem_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — dados clínicos |
| `observacoes` | `observacoes_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — dados clínicos |
| `reavaliacoes_observacao` | `reavaliacoes_observacao_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — dados clínicos |
| `estabilizacoes` | `estabilizacoes_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — dados de urgência |
| `checklist_estabilizacao_itens` | `checklist_estabilizacao_itens_select_linked` | `is_linked_user()` | Todos os perfis vinculados | Médio |
| `prescricoes` | `prescricoes_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — prescrição médica |
| `prescricao_itens` | `prescricao_itens_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — itens de medicação |
| `exames` | `exames_select_linked` | `is_linked_user()` | Todos os perfis vinculados | **Crítico** — resultado clínico |
| `transferencias` | `transferencias_select_linked` | `is_linked_user()` | Todos os perfis vinculados | Alto — dados clínicos e regulatórios |
| `checklist_transferencia_itens` | `checklist_transferencia_itens_select_linked` | `is_linked_user()` | Todos os perfis vinculados | Médio |
| `audit_log` | `audit_log_select_admin_auditoria` | `is_admin() OR is_auditoria()` | Apenas Admin e Auditoria | **Correto** — não alterar |
| `estoque_itens` | `estoque_itens_select_linked` | `is_linked_user()` | Todos os perfis vinculados | Baixo |
| `estoque_movimentacoes` | `estoque_movimentacoes_select_linked` | `is_linked_user()` | Todos os perfis vinculados | Baixo |

> **`audit_log`:** policy atual está correta e não será alterada na Fase A.

---

## 3. Abordagem técnica da Fase A

### 3.1 Estratégia escolhida: substituição por lista positiva de perfis e permissões

A Fase A adota **lista positiva** (allowlist): em vez de `is_linked_user()` (qualquer vinculado), as novas policies de SELECT declaram explicitamente **quais perfis e permissões** têm acesso a cada tabela.

**Por que não criar novas permissões de leitura?**

Criar permissões de leitura novas (ex.: `triagem.visualizar`, `consulta.visualizar`) seria mais granular, mas exigiria:
1. inserção de novas chaves em `permissoes`;
2. vinculação de cada chave a cada perfil em `perfil_permissao`;
3. atualização dos testes de fixtures e de inventário.

Essa abordagem aumenta a superfície de mudança e o risco de regressão. Para a Fase A, a estratégia mais segura e rastreável é usar `has_perfil()` e `has_permission()` **com as permissões já existentes**, complementadas por `is_admin()` e `is_auditoria()`.

### 3.2 Template de política para a Fase A

```sql
-- Padrão de nomenclatura: <tabela>_select_<finalidade>
-- Finalidades: clinico | operacional | dispensacao | auditoria

drop policy if exists <tabela>_select_linked on <tabela>;

create policy <tabela>_select_<finalidade> on <tabela>
  for select
  to authenticated
  using (
    <expressão de perfis e permissões permitidos>
    or public.is_admin()
    or public.is_auditoria()
  );
```

> **Regra de nomenclatura:** `_select_linked` é o nome herdado da migration original. As novas policies usam sufixo descritivo da finalidade: `_select_clinico`, `_select_operacional`, `_select_dispensacao`. Policies antigas com `_select_linked` devem ser removidas (DROP) antes da criação das novas.

### 3.3 Separação de acesso administrativo, clínico e de auditoria

| Acesso | Quem | Mecanismo proposto |
|---|---|---|
| Administrativo | Administração | `is_admin()` — curto-circuito existente; sempre presente nas novas policies |
| Clínico | Médico, Técnico em Enfermagem, Enfermeiro | `has_perfil()` ou `has_permission()` da etapa clínica correspondente |
| Auditoria | Auditoria | `is_auditoria()` — sempre presente nas novas policies de dados clínicos |
| Dispensação | Farmácia | `has_permission('prescricao.dispensar')` apenas nas tabelas de prescrição e estoque |
| Operacional restrito | Recepção | Apenas `pacientes` e `atendimentos` com condições específicas |
| Bloqueado | Gestão Hospitalar, Leitura/Gestor | Nenhuma condição que cubra esses perfis nas tabelas clínicas |

---

## 4. Proposta por tabela

Para cada tabela, a proposta inclui: DROP da policy antiga, nome da nova policy, expressão USING, perfis alcançados, efeito no frontend e teste necessário.

---

### 4.1 `pacientes`

**Policy atual:** `pacientes_select_linked` — `is_linked_user()`  
**Problema:** Farmácia, Gestão Hospitalar e Leitura/Gestor não precisam de dados nominais de todos os pacientes.  
**Decisão da Fase A:** Manter acesso amplo para perfis assistenciais; bloquear Gestão Hospitalar e Leitura/Gestor.

**Proposta:**
```sql
drop policy if exists pacientes_select_linked on pacientes;

create policy pacientes_select_operacional on pacientes
  for select to authenticated
  using (
    public.has_permission('paciente.criar')          -- Recepção (cadastro)
    or public.has_permission('triagem.classificar')  -- Técnico em Enfermagem, Enfermeiro
    or public.has_permission('consulta.iniciar')     -- Médico
    or public.has_permission('prescricao.dispensar') -- Farmácia (identificação mínima)
    or public.has_permission('transferencia.solicitar') -- Médico (transferência)
    or public.has_permission('transferencia.aprovar_vaga') -- Regulação
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Recepção, Técnico em Enfermagem, Enfermeiro, Médico, Farmácia, Regulação, Administração, Auditoria  
**Perfis bloqueados:** Gestão Hospitalar, Leitura/Gestor, usuário sem perfil, usuário inativo  
**Efeito no frontend:** Telas de pacientes, triagem, consulta, farmácia e transferências continuam funcionando. Gestão Hospitalar perde acesso nominal a pacientes.  
**Teste:** SELECT em `pacientes` com usuário Gestão Hospitalar deve retornar 0 linhas.

---

### 4.2 `atendimentos`

**Policy atual:** `atendimentos_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Manter acesso para todos os perfis assistenciais; bloquear Gestão Hospitalar e Leitura/Gestor.

**Proposta:**
```sql
drop policy if exists atendimentos_select_linked on atendimentos;

create policy atendimentos_select_operacional on atendimentos
  for select to authenticated
  using (
    public.has_permission('atendimento.abrir')
    or public.has_permission('triagem.classificar')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('prescricao.dispensar')
    or public.has_permission('transferencia.solicitar')
    or public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_saida')
    or public.has_permission('exame.visualizar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Recepção, Técnico em Enfermagem, Enfermeiro, Médico, Farmácia (via `prescricao.dispensar`), Regulação, Diagnóstico/Exames, Administração, Auditoria  
**Perfis bloqueados:** Gestão Hospitalar, Leitura/Gestor  
**Efeito no frontend:** Módulo Atendimentos (central operacional do fluxo) continua funcional para todos os perfis assistenciais.  
**Teste:** SELECT em `atendimentos` com Gestão Hospitalar deve retornar 0 linhas.

---

### 4.3 `chamadas`

**Policy atual:** `chamadas_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Manter acesso para perfis que operam chamadas; bloquear demais.

**Proposta:**
```sql
drop policy if exists chamadas_select_linked on chamadas;

create policy chamadas_select_operacional on chamadas
  for select to authenticated
  using (
    public.has_permission('atendimento.abrir')
    or public.has_permission('triagem.classificar')
    or public.has_permission('consulta.iniciar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis bloqueados:** Farmácia, Regulação, Gestão Hospitalar, Leitura/Gestor  
**Efeito no frontend:** Painel de chamada continua funcional para Recepção, Técnico em Enfermagem, Enfermeiro e Médico.

---

### 4.4 `triagens`

**Policy atual:** `triagens_select_linked` — `is_linked_user()`  
**Problema:** Recepção e Farmácia não devem ler dados de triagem.  
**Decisão da Fase A:** Restringir a perfis clínicos que atuam na triagem ou usam seus dados.

**Proposta:**
```sql
drop policy if exists triagens_select_linked on triagens;

create policy triagens_select_clinico on triagens
  for select to authenticated
  using (
    public.has_permission('triagem.classificar')        -- Técnico em Enfermagem, Enfermeiro
    or public.has_permission('consulta.iniciar')        -- Médico (precisa da triagem para consultar)
    or public.has_permission('consulta.registrar_conduta')
    or public.has_permission('observacao.reavaliar')    -- Técnico em Enfermagem, Enfermeiro, Médico
    or public.has_permission('transferencia.confirmar_saida') -- Enfermeiro (referência clínica)
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Técnico em Enfermagem, Enfermeiro, Médico, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Farmácia, Regulação, Gestão Hospitalar, Leitura/Gestor  
**Efeito no frontend:** Rota `triagem` só é acessível para Técnico em Enfermagem e Enfermeiro (já controlado por `routePermissions`). O banco passa a reforçar o mesmo controle.  
**Teste:** SELECT em `triagens` com Recepção deve retornar 0 linhas. SELECT com Farmácia deve retornar 0 linhas.

> **Atenção:** A Regulação atualmente não tem acesso à rota de triagem no frontend mas tem acesso via API. Bloqueá-la no banco é correto e não quebra nenhuma funcionalidade do frontend.

---

### 4.5 `consultas`

**Policy atual:** `consultas_select_linked` — `is_linked_user()`  
**Problema:** Recepção, Farmácia, Regulação não devem ler consultas médicas.  
**Decisão da Fase A:** Restringir a Médico, Técnico em Enfermagem, Enfermeiro, Auditoria e Admin.

**Proposta:**
```sql
drop policy if exists consultas_select_linked on consultas;

create policy consultas_select_clinico on consultas
  for select to authenticated
  using (
    public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.has_permission('triagem.classificar')    -- Técnico em Enfermagem, Enfermeiro (continuidade do cuidado)
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Médico, Técnico em Enfermagem, Enfermeiro, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Farmácia, Regulação, Gestão Hospitalar, Leitura/Gestor  
**Efeito no frontend:** Rota `consulta` já bloqueada para Recepção e Farmácia no frontend. O banco passa a reforçar o mesmo bloqueio.  
**Teste:** SELECT em `consultas` com Recepção, Farmácia e Regulação deve retornar 0 linhas.

> **Nota sobre Regulação:** A Regulação pode precisar visualizar um resumo clínico (diagnóstico, CID) para documentar a transferência. Se confirmado, a Fase A pode incluir condição `has_permission('transferencia.solicitar')` para Regulação. Isso é uma decisão de produto que deve ser resolvida antes da migration. Por padrão, a proposta acima bloqueia a Regulação.

---

### 4.6 `evolucoes_enfermagem`

**Policy atual:** `evolucoes_enfermagem_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Restringir a perfis de enfermagem e médicos.

**Proposta:**
```sql
drop policy if exists evolucoes_enfermagem_select_linked on evolucoes_enfermagem;

create policy evolucoes_enfermagem_select_clinico on evolucoes_enfermagem
  for select to authenticated
  using (
    public.has_permission('enfermagem.evolucao.registrar')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Técnico em Enfermagem, Enfermeiro, Médico, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Farmácia, Regulação, Gestão Hospitalar, Leitura/Gestor

---

### 4.7 `observacoes`

**Policy atual:** `observacoes_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Restringir a perfis clínicos que atuam em observação.

**Proposta:**
```sql
drop policy if exists observacoes_select_linked on observacoes;

create policy observacoes_select_clinico on observacoes
  for select to authenticated
  using (
    public.has_permission('observacao.reavaliar')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.has_permission('transferencia.confirmar_saida')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Técnico em Enfermagem, Enfermeiro, Médico, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Farmácia, Regulação, Gestão Hospitalar, Leitura/Gestor

---

### 4.8 `reavaliacoes_observacao`

**Policy atual:** `reavaliacoes_observacao_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Idêntico a `observacoes`.

**Proposta:**
```sql
drop policy if exists reavaliacoes_observacao_select_linked on reavaliacoes_observacao;

create policy reavaliacoes_observacao_select_clinico on reavaliacoes_observacao
  for select to authenticated
  using (
    public.has_permission('observacao.reavaliar')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.is_admin()
    or public.is_auditoria()
  );
```

---

### 4.9 `estabilizacoes`

**Policy atual:** `estabilizacoes_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Restringir a perfis que atuam na sala de estabilização.

**Proposta:**
```sql
drop policy if exists estabilizacoes_select_linked on estabilizacoes;

create policy estabilizacoes_select_clinico on estabilizacoes
  for select to authenticated
  using (
    public.has_permission('estabilizacao.checklist_item')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Técnico em Enfermagem, Enfermeiro, Médico, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Farmácia, Regulação, Gestão Hospitalar, Leitura/Gestor

---

### 4.10 `checklist_estabilizacao_itens`

**Policy atual:** `checklist_estabilizacao_itens_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Restringir a perfis que executam o checklist.

**Proposta:**
```sql
drop policy if exists checklist_estabilizacao_itens_select_linked on checklist_estabilizacao_itens;

create policy checklist_estabilizacao_itens_select_clinico on checklist_estabilizacao_itens
  for select to authenticated
  using (
    public.has_permission('estabilizacao.checklist_item')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('consulta.registrar_conduta')
    or public.is_admin()
    or public.is_auditoria()
  );
```

---

### 4.11 `prescricoes`

**Policy atual:** `prescricoes_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Manter acesso para Médico, Farmácia (dispensação), Técnico em Enfermagem, Enfermeiro. Bloquear Recepção, Regulação, Gestão Hospitalar.

**Proposta:**
```sql
drop policy if exists prescricoes_select_linked on prescricoes;

create policy prescricoes_select_dispensacao on prescricoes
  for select to authenticated
  using (
    public.has_permission('prescricao.criar')      -- Médico
    or public.has_permission('prescricao.dispensar') -- Farmácia
    or public.has_permission('enfermagem.evolucao.registrar') -- Técnico em Enfermagem, Enfermeiro (administração)
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Médico, Farmácia, Técnico em Enfermagem, Enfermeiro, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Regulação, Gestão Hospitalar, Leitura/Gestor  
**Efeito no frontend:** Farmácia continua vendo prescrições. Recepção perde acesso à lista de prescrições (rota já bloqueada no frontend).

---

### 4.12 `prescricao_itens`

**Policy atual:** `prescricao_itens_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Idêntico a `prescricoes`.

**Proposta:**
```sql
drop policy if exists prescricao_itens_select_linked on prescricao_itens;

create policy prescricao_itens_select_dispensacao on prescricao_itens
  for select to authenticated
  using (
    public.has_permission('prescricao.criar')
    or public.has_permission('prescricao.dispensar')
    or public.has_permission('enfermagem.evolucao.registrar')
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

---

### 4.13 `exames`

**Policy atual:** `exames_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Manter acesso para perfis clínicos e de diagnóstico. Bloquear Recepção, Farmácia, Regulação, Gestão.

**Proposta:**
```sql
drop policy if exists exames_select_linked on exames;

create policy exames_select_clinico on exames
  for select to authenticated
  using (
    public.has_permission('exame.solicitar')
    or public.has_permission('exame.visualizar')
    or public.has_permission('exame.liberar_resultado')
    or public.has_permission('exame.marcar_critico')
    or public.has_permission('consulta.iniciar')
    or public.has_permission('observacao.reavaliar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Médico, Técnico em RX, Diagnóstico/Exames, Técnico em Enfermagem (via `observacao.reavaliar`), Enfermeiro, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Farmácia, Regulação (sem permissão de exame), Gestão Hospitalar, Leitura/Gestor

---

### 4.14 `transferencias`

**Policy atual:** `transferencias_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Manter acesso para Médico, Regulação, Enfermeiro. Bloquear Recepção, Farmácia, Gestão.

**Proposta:**
```sql
drop policy if exists transferencias_select_linked on transferencias;

create policy transferencias_select_operacional on transferencias
  for select to authenticated
  using (
    public.has_permission('transferencia.solicitar')
    or public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_saida')
    or public.has_permission('transferencia.confirmar_checklist')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Médico, Regulação de Transferência, Enfermeiro, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Técnico em Enfermagem (sem permissão de transferência explícita), Farmácia, Gestão Hospitalar, Leitura/Gestor

> **Atenção:** Técnico em Enfermagem não possui permissão de transferência no seed atual. Se o fluxo exigir que o Técnico veja transferências (ex.: para contexto na observação), a permissão `transferencia.visualizar` precisaria ser criada ou a condição ajustada. Isso é uma decisão de produto pendente.

---

### 4.15 `checklist_transferencia_itens`

**Policy atual:** `checklist_transferencia_itens_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Idêntico a `transferencias`.

**Proposta:**
```sql
drop policy if exists checklist_transferencia_itens_select_linked on checklist_transferencia_itens;

create policy checklist_transferencia_itens_select_operacional on checklist_transferencia_itens
  for select to authenticated
  using (
    public.has_permission('transferencia.aprovar_vaga')
    or public.has_permission('transferencia.confirmar_saida')
    or public.has_permission('transferencia.confirmar_checklist')
    or public.is_admin()
    or public.is_auditoria()
  );
```

---

### 4.16 `audit_log`

**Policy atual:** `audit_log_select_admin_auditoria` — `is_admin() OR is_auditoria()`  
**Decisão da Fase A:** **Não alterar.** Policy já está correta.

---

### 4.17 `estoque_itens`

**Policy atual:** `estoque_itens_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Restringir a Farmácia e Administração. Outros perfis não precisam ver estoque.

**Proposta:**
```sql
drop policy if exists estoque_itens_select_linked on estoque_itens;

create policy estoque_itens_select_farmacia on estoque_itens
  for select to authenticated
  using (
    public.has_permission('estoque.movimentar')
    or public.has_permission('prescricao.dispensar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

**Perfis alcançados:** Farmácia, Administração, Auditoria  
**Perfis bloqueados:** Recepção, Técnico em Enfermagem, Enfermeiro, Médico, Regulação, Gestão Hospitalar, Leitura/Gestor

> **Nota:** Médico e Enfermeiro não precisam ver o estoque diretamente — eles prescrevem e a Farmácia verifica a disponibilidade.

---

### 4.18 `estoque_movimentacoes`

**Policy atual:** `estoque_movimentacoes_select_linked` — `is_linked_user()`  
**Decisão da Fase A:** Idêntico a `estoque_itens`.

**Proposta:**
```sql
drop policy if exists estoque_movimentacoes_select_linked on estoque_movimentacoes;

create policy estoque_movimentacoes_select_farmacia on estoque_movimentacoes
  for select to authenticated
  using (
    public.has_permission('estoque.movimentar')
    or public.is_admin()
    or public.is_auditoria()
  );
```

---

## 5. Proposta por perfil

### 5.1 Recepção — acesso mínimo na Fase A

| Tabela | Acesso após Fase A | Base |
|---|---|---|
| `pacientes` | Sim — `has_permission('paciente.criar')` | Cadastro e localização |
| `atendimentos` | Sim — `has_permission('atendimento.abrir')` | Fila de atendimento |
| `chamadas` | Sim — `has_permission('atendimento.abrir')` | Painel de chamada |
| `triagens` | **Bloqueado** | Sem permissão de triagem |
| `consultas` | **Bloqueado** | Sem permissão clínica |
| `evolucoes_enfermagem` | **Bloqueado** | Sem permissão clínica |
| `observacoes` | **Bloqueado** | Sem permissão clínica |
| `reavaliacoes_observacao` | **Bloqueado** | Sem permissão clínica |
| `estabilizacoes` | **Bloqueado** | Sem permissão clínica |
| `checklist_estabilizacao_itens` | **Bloqueado** | Sem permissão clínica |
| `prescricoes` | **Bloqueado** | Sem permissão clínica |
| `prescricao_itens` | **Bloqueado** | Sem permissão clínica |
| `exames` | **Bloqueado** | Sem permissão clínica |
| `transferencias` | **Bloqueado** | Sem permissão de regulação |
| `checklist_transferencia_itens` | **Bloqueado** | Sem permissão de regulação |
| `estoque_itens` | **Bloqueado** | Sem permissão de farmácia |
| `estoque_movimentacoes` | **Bloqueado** | Sem permissão de farmácia |

### 5.2 Farmácia — acesso mínimo na Fase A

| Tabela | Acesso após Fase A | Base |
|---|---|---|
| `pacientes` | Sim — `has_permission('prescricao.dispensar')` | Identificação do destinatário |
| `atendimentos` | Sim — `has_permission('prescricao.dispensar')` | Vínculo da prescrição |
| `chamadas` | **Bloqueado** | Sem necessidade operacional |
| `triagens` | **Bloqueado** | Sem permissão clínica |
| `consultas` | **Bloqueado** | Sem permissão clínica |
| `evolucoes_enfermagem` | **Bloqueado** | Sem permissão clínica |
| `observacoes` | **Bloqueado** | Sem permissão clínica |
| `reavaliacoes_observacao` | **Bloqueado** | Sem permissão clínica |
| `estabilizacoes` | **Bloqueado** | Sem permissão clínica |
| `checklist_estabilizacao_itens` | **Bloqueado** | Sem permissão clínica |
| `prescricoes` | Sim — `has_permission('prescricao.dispensar')` | Dispensação |
| `prescricao_itens` | Sim — `has_permission('prescricao.dispensar')` | Dispensação granular |
| `exames` | **Bloqueado** | Sem permissão de diagnóstico |
| `transferencias` | **Bloqueado** | Sem permissão de regulação |
| `checklist_transferencia_itens` | **Bloqueado** | Sem permissão de regulação |
| `estoque_itens` | Sim — `has_permission('estoque.movimentar')` | Gestão de estoque |
| `estoque_movimentacoes` | Sim — `has_permission('estoque.movimentar')` | Movimentação de estoque |

### 5.3 Gestão Hospitalar e Leitura/Gestor — lacuna documentada

**Situação atual:** Esses perfis existem em `perfis_acesso` mas:
- Não possuem nenhuma permissão em `perfil_permissao`.
- Não estão listados em `routePermissions` no frontend.
- Herdam `is_linked_user() = TRUE` por terem registro em `usuario_perfil`.
- Com as novas policies propostas (baseadas em `has_permission()`), esses perfis perderão automaticamente o acesso a todas as tabelas clínicas e operacionais, pois nenhuma das condições será atendida.

**Tabelas que ainda serão acessíveis após a Fase A (por `is_admin()` ou `is_auditoria()` — não se aplica — ou por policies não alteradas):**
- `perfis_acesso`, `permissoes`, `perfil_permissao` (policy `_select_linked` não alterada nesta fase)
- Tabelas `dom_*` (policies `dom_*_select_linked` não alteradas nesta fase)

**Tabelas clínicas — acesso após Fase A:** Bloqueado (sem permissão correspondente).

**Lacuna documentada:** Não existem tabelas de indicadores ou views de dados agregados no banco atual. Enquanto essas não forem criadas com policies próprias, `Gestão Hospitalar` e `Leitura/Gestor` não terão acesso útil ao sistema. Isso é uma **pendência de produto** a ser tratada em fase separada.

---

## 6. Avaliação das opções para expressar as policies

| Opção | Avaliação |
|---|---|
| Substituir `is_linked_user()` por `has_permission()` | **Escolhida** — usa infraestrutura existente; não cria novos objetos |
| Combinar `has_permission()` com `has_perfil()` | Aceita quando necessário (ex.: `estabilizacoes` inclui Médico por perfil, não por permissão específica de leitura) |
| Criar novas permissões de leitura (`triagem.visualizar`, etc.) | **Adiado** — aumenta superfície de mudança; reservado para Fase B |
| Reutilizar permissões existentes de escrita como proxy de leitura | **Aceito com ressalva** — permissão de escrita implica acesso de leitura ao contexto necessário; documentar explicitamente |
| Adiar parte da restrição por falta de permissão adequada | Aceitável para Técnico em Enfermagem em transferências (sem permissão explícita de transferência); documentado como pendência |

---

## 7. Permissões utilizadas nas novas policies

Todas as permissões abaixo **já existem** no banco (seed em `20260623100004_acesso.sql`). Nenhuma permissão nova precisa ser criada na Fase A.

| Permissão (chave) | Usada em | Perfis que a possuem |
|---|---|---|
| `paciente.criar` | `pacientes`, `atendimentos` SELECT | Recepção, Administração |
| `atendimento.abrir` | `atendimentos`, `chamadas` SELECT | Recepção, Administração |
| `triagem.classificar` | `triagens`, `consultas`, `pacientes` SELECT | Técnico em Enfermagem, Enfermeiro |
| `consulta.iniciar` | `consultas`, `triagens`, `exames`, `observacoes` SELECT | Médico |
| `consulta.registrar_conduta` | `consultas`, `observacoes`, `estabilizacoes` SELECT | Médico |
| `enfermagem.evolucao.registrar` | `evolucoes_enfermagem`, `prescricoes` SELECT | Técnico em Enfermagem, Enfermeiro |
| `observacao.reavaliar` | `observacoes`, `reavaliacoes_observacao`, `triagens`, `exames` SELECT | Técnico em Enfermagem, Enfermeiro, Médico |
| `estabilizacao.checklist_item` | `estabilizacoes`, `checklist_estabilizacao_itens` SELECT | Técnico em Enfermagem, Enfermeiro |
| `exame.solicitar` | `exames` SELECT | Médico |
| `exame.visualizar` | `exames` SELECT | Técnico em RX, Diagnóstico/Exames, Auditoria |
| `exame.liberar_resultado` | `exames` SELECT | Técnico em RX, Diagnóstico/Exames |
| `exame.marcar_critico` | `exames` SELECT | Técnico em RX, Diagnóstico/Exames |
| `prescricao.criar` | `prescricoes`, `prescricao_itens` SELECT | Médico |
| `prescricao.dispensar` | `prescricoes`, `prescricao_itens`, `pacientes`, `atendimentos` SELECT | Farmácia |
| `estoque.movimentar` | `estoque_itens`, `estoque_movimentacoes` SELECT | Farmácia |
| `transferencia.solicitar` | `transferencias`, `atendimentos` SELECT | Médico |
| `transferencia.aprovar_vaga` | `transferencias`, `checklist_transferencia_itens` SELECT | Regulação de Transferência |
| `transferencia.confirmar_saida` | `transferencias`, `checklist_transferencia_itens`, `observacoes` SELECT | Enfermeiro |
| `transferencia.confirmar_checklist` | `checklist_transferencia_itens` SELECT | Enfermeiro |

---

## 8. Impacto no frontend

### 8.1 Telas que continuam funcionando sem alteração

| Tela / Rota | Perfil | Por quê não quebra |
|---|---|---|
| Pacientes | Recepção, Técnico em Enfermagem, Enfermeiro, Médico | Mantêm acesso via permissão correspondente |
| Atendimentos | Recepção, Técnico em Enfermagem, Enfermeiro, Médico, Regulação | Mantêm acesso via permissão de abertura/triagem/consulta |
| Painel de Chamada | Recepção, Técnico em Enfermagem, Médico | Mantêm acesso via `atendimento.abrir` |
| Triagem / Risco | Técnico em Enfermagem, Enfermeiro | Mantêm acesso via `triagem.classificar` |
| Consulta | Médico | Mantém acesso via `consulta.iniciar` |
| Enfermagem | Técnico em Enfermagem, Enfermeiro | Mantêm acesso via `enfermagem.evolucao.registrar` |
| Observação (todas) | Técnico em Enfermagem, Enfermeiro, Médico | Mantêm acesso via `observacao.reavaliar` |
| Estabilização | Técnico em Enfermagem, Enfermeiro, Médico | Mantêm acesso via `estabilizacao.checklist_item` / `consulta.iniciar` |
| Exames | Médico, Técnico em RX | Mantêm acesso via `exame.solicitar` / `exame.visualizar` |
| Farmácia | Farmácia | Mantém acesso a prescrições e estoque via `prescricao.dispensar` / `estoque.movimentar` |
| Transferências | Médico, Regulação, Enfermeiro | Mantêm acesso via permissões de transferência |
| Auditoria | Auditoria, Administração | Sem alteração — `audit_log` não muda |
| Configurações | Administração | Sem alteração |

### 8.2 Comportamentos que mudarão no frontend

| Comportamento atual | Comportamento esperado após Fase A | Risco |
|---|---|---|
| Farmácia vê listagem de atendimentos e pode navegar para detalhes clínicos via API | Farmácia só vê atendimentos para identificar paciente de prescrição; bloco clínico retorna vazio | Baixo — Farmácia não usa essas telas |
| Recepção consegue acessar dados de triagem via API direta | API retorna 0 linhas para Recepção em `triagens` | Baixo — Recepção não tem rota de triagem |
| Gestão Hospitalar vê todos os dados via `is_linked_user()` | Gestão Hospitalar perde acesso a dados clínicos; indicadores continuam indisponíveis até criar views próprias | **Médio** — usuários com esse perfil perderão acesso funcional ao sistema |
| `loadAtendimentosReais` carrega todos os atendimentos para qualquer perfil | Continua funcionando para perfis assistenciais; retorna vazio para Gestão Hospitalar e Leitura/Gestor | Médio — se algum perfil inesperado não tiver permissão correspondente |

### 8.3 Funções do frontend que podem ser afetadas

Funções em `script.js` que fazem SELECT em tabelas clínicas sem filtro por perfil:

- `loadPacientesReais` — retornará menos linhas se o usuário não tiver permissão correspondente
- `loadAtendimentosReais` — idem
- Funções que carregam triagens, consultas, observações na mesma chamada para múltiplos perfis — podem retornar arrays vazios para perfis bloqueados

**Ação necessária antes da migration:** Verificar se alguma tela usa dados clínicos de outra tabela como dependência (ex.: tela de Farmácia que carrega triagem do paciente como contexto visual). Se existir, esse dado deve ser removido da tela ou a policy deve incluir a permissão correspondente.

---

## 9. Dependências antes da migration

| Dependência | Status | Ação necessária |
|---|---|---|
| Permissões de leitura novas | Não necessárias na Fase A | Nenhuma |
| `usuario_perfil.setor` preenchido | Não necessário na Fase A | Nenhuma |
| `atendimentos.profissional_responsavel_id` preenchido | Não necessário na Fase A | Nenhuma |
| Tabelas de indicadores para Gestão Hospitalar | Não existem | Documentar como lacuna; criar em fase separada |
| Verificação do frontend sobre acesso a dados clínicos pela Farmácia | Pendente | Revisar tela de Farmácia: ela exibe algum dado clínico além de prescrições e estoque? |
| Decisão sobre acesso da Regulação a `consultas` (resumo clínico) | Pendente | Se necessário, incluir `transferencia.solicitar` na policy de `consultas` |
| Decisão sobre acesso do Técnico em Enfermagem a `transferencias` | Pendente | Sem permissão de transferência hoje; se necessário, criar permissão `transferencia.visualizar` |
| Suíte de testes `tests/security/policies.test.js` | Deve ser atualizada | Os testes verificam nomes de policies e uso de `is_linked_user()` — as novas policies mudam ambos |
| Confirmação de que `Técnico em RX` possui `exame.visualizar` | Verificar | Seed em `20260623100004` vincula `exame.visualizar` a `Diagnóstico/Exames`; verificar se `Técnico em RX` é alias ou perfil separado |

---

## 10. Matriz de testes autenticados para a futura migration

### 10.1 Estrutura dos testes

Cada teste deve ser executado com usuário fictício autenticado localmente via API REST do Supabase local, confirmando:

- `SELECT` retorna linhas esperadas (≥1) quando permitido
- `SELECT` retorna array vazio `[]` quando bloqueado
- Nenhuma linha clínica vaza para perfis bloqueados

### 10.2 Matriz completa

| Tabela | Recepção | Farmácia | Gestão/Leitura | Técnico Enf. | Enfermeiro | Médico | Regulação | Admin | Auditoria | Sem Perfil | Inativo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `pacientes` | ✅ LR | ✅ LR | ❌ | ✅ LO | ✅ LO | ✅ LO | ✅ LR | ✅ LX | ✅ LX | ❌ | ❌ |
| `atendimentos` | ✅ LO | ✅ LR | ❌ | ✅ LO | ✅ LO | ✅ LO | ✅ LO | ✅ LX | ✅ LX | ❌ | ❌ |
| `chamadas` | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `triagens` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `consultas` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌* | ✅ | ✅ | ❌ | ❌ |
| `evolucoes_enfermagem` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `observacoes` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `reavaliacoes_observacao` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `estabilizacoes` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `checklist_estabilizacao_itens` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `prescricoes` | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `prescricao_itens` | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `exames` | ❌ | ❌ | ❌ | ✅** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `transferencias` | ❌ | ❌ | ❌ | ❌*** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `checklist_transferencia_itens` | ❌ | ❌ | ❌ | ❌*** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `audit_log` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `estoque_itens` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `estoque_movimentacoes` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |

**Legenda:** ✅ = leitura permitida · ❌ = bloqueado · * = pendente de decisão de produto · ** = via `observacao.reavaliar` · *** = pendente de decisão de produto

### 10.3 Testes de vazamento de dados clínicos

Para cada perfil bloqueado em tabelas críticas, o teste deve:
1. Autenticar com usuário do perfil correspondente
2. Fazer GET via API REST (`/rest/v1/<tabela>?select=*`)
3. Confirmar que o corpo da resposta é `[]` (array vazio)
4. Confirmar que o código HTTP é `200` (não `403`) — o PostgREST retorna 200 com array vazio quando RLS bloqueia; um 403 indica problema de GRANT, não de RLS

### 10.4 Casos especiais a verificar

| Caso | Verificação |
|---|---|
| Farmácia faz SELECT em `pacientes` | Deve retornar linhas (identificação do destinatário) |
| Farmácia faz SELECT em `triagens` | Deve retornar `[]` |
| Farmácia faz SELECT em `consultas` | Deve retornar `[]` |
| Recepção faz SELECT em `triagens` | Deve retornar `[]` |
| Recepção faz SELECT em `atendimentos` | Deve retornar linhas (fila de atendimento) |
| Gestão Hospitalar faz SELECT em qualquer tabela clínica | Deve retornar `[]` em todas |
| Gestão Hospitalar faz SELECT em `dom_status_atendimento` | Deve retornar linhas (catálogo — policy não alterada na Fase A) |
| Médico faz SELECT em `triagens` | Deve retornar linhas |
| Médico faz SELECT em `estoque_itens` | Deve retornar `[]` |
| Auditoria faz SELECT em `consultas` | Deve retornar linhas |
| Auditoria faz SELECT em `audit_log` | Deve retornar linhas |
| Usuário sem perfil faz SELECT em qualquer tabela | Deve retornar `[]` em todas |
| Usuário inativo faz SELECT em qualquer tabela | Deve retornar `[]` em todas |

---

## 11. Plano de rollback

### 11.1 Estratégia

A migration da Fase A pode ser revertida em até 5 minutos com um script de rollback que:

1. Remove as novas policies (`DROP POLICY IF EXISTS`)
2. Recria as policies originais (`is_linked_user()`) com os nomes originais

### 11.2 Script de rollback (a criar antes da migration)

```sql
-- ROLLBACK Fase A: restaurar policies is_linked_user() originais
-- Executar APENAS se a migration de Fase A precisar ser revertida.

-- Tabelas clínicas
drop policy if exists triagens_select_clinico on triagens;
create policy triagens_select_linked on triagens
  for select to authenticated using (public.is_linked_user());

drop policy if exists consultas_select_clinico on consultas;
create policy consultas_select_linked on consultas
  for select to authenticated using (public.is_linked_user());

-- [repetir para cada tabela alterada pela migration de Fase A]
-- [script completo deve ser criado e validado antes da migration ser aprovada]
```

> **Regra:** O script de rollback completo deve ser criado, revisado e aprovado **antes** de a migration ser aplicada em qualquer ambiente compartilhado.

### 11.3 Critérios para acionar o rollback

- Qualquer tela assistencial retornando 0 linhas para um perfil que deveria ter acesso
- Qualquer módulo de farmácia sem acesso a prescrições ou estoque
- Qualquer módulo de regulação sem acesso a transferências
- Erro 403 em chamadas legítimas de API (indica possível problema de GRANT além de RLS)
- Relatório de usuário confirmando perda de funcionalidade operacional

### 11.4 Como validar regressão após rollback

1. Executar `npm run security:reset-and-test` no ambiente local
2. Verificar se os 88 inventários de policies retornam à contagem esperada
3. Verificar se `is_linked_user()` é novamente o predicado em ≥10 policies de SELECT
4. Fazer login com usuário de Farmácia e confirmar acesso a triagens (comportamento pré-Fase A)

---

## 12. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Frontend da Farmácia usa dados de triagem ou consulta como contexto visual | Média | Alto | Revisar tela de Farmácia em `script.js` antes de criar a migration |
| Gestão Hospitalar perde acesso funcional sem alternativa | Alta | Médio | Documentar como comportamento esperado; criar views de indicadores em fase separada |
| Técnico em Enfermagem perde acesso a transferências | Alta | Médio | Confirmar se o fluxo exige esse acesso antes da migration |
| Regulação perde acesso ao resumo clínico necessário para regulação | Média | Alto | Confirmar com equipe assistencial e adicionar condição à policy de `consultas` se necessário |
| Testes automatizados quebram por mudança de nomes de policies | Alta | Baixo | Atualizar `tests/security/policies.test.js` junto com a migration |
| Perfil `Técnico em RX` não possui `exame.visualizar` | Baixa | Alto | Verificar seed antes da migration |
| Supabase local sem dados de teste para os perfis novos | Média | Médio | Criar fixtures de usuários fictícios para todos os perfis afetados antes dos testes |

---

## 13. Critérios de aprovação para criar a migration

A migration da Fase A **só pode ser criada** quando todos os itens abaixo forem confirmados:

### Técnicos (obrigatórios)

- [ ] Revisão de `script.js` confirmando que a tela de Farmácia não usa dados de triagens ou consultas
- [ ] Confirmação de que `Técnico em RX` possui `exame.visualizar` no seed atual
- [ ] Script de rollback completo criado e revisado
- [ ] Atualização planejada de `tests/security/policies.test.js` para refletir os novos nomes de policies
- [ ] Fixtures de usuários fictícios para Farmácia, Recepção, Gestão Hospitalar e Leitura/Gestor criados em `tests/fixtures/security-users.js`

### Decisões de produto (obrigatórias)

- [ ] Confirmação de que a Regulação de Transferência pode ou não ler `consultas`
- [ ] Confirmação de que o Técnico em Enfermagem precisa ou não acessar `transferencias` no sistema
- [ ] Confirmação de que Gestão Hospitalar e Leitura/Gestor podem perder acesso funcional temporariamente (até views de indicadores serem criadas)

### Institucionais (obrigatórias para produção)

- [ ] Aprovação explícita por responsável técnico do projeto
- [ ] Confirmação de que não há usuários reais com perfil `Gestão Hospitalar` ou `Leitura/Gestor` ativos que serão afetados imediatamente

---

## 14. Itens explicitamente fora do escopo desta fase

Os itens abaixo foram avaliados e **deliberadamente excluídos** da Fase A:

| Item | Motivo da exclusão | Fase prevista |
|---|---|---|
| Restrição por `setor_atual` | Depende de lista oficial de setores; `usuario_perfil.setor` provavelmente vazio | Fase C |
| Restrição por `profissional_responsavel_id` | Campo pode estar nulo em atendimentos reais | Fase D |
| Restrição de Médico por atendimento | Exige subqueries; alto risco de quebra de fluxo | Fase D |
| Criação de tabelas/views de indicadores | Escopo de produto separado | Produto — fase a definir |
| Auditoria de leitura (trigger de SELECT) | Alta complexidade e impacto de performance | Fase E |
| Novas permissões de leitura (`triagem.visualizar`, etc.) | Aumenta superfície de mudança sem benefício imediato na Fase A | Fase B |
| Alteração de policies `FOR ALL` de escrita | Escopo separado; policies de escrita já são adequadas | Revisão futura |
| Restrição de Administração a dados clínicos | Acesso técnico de suporte necessário; rastreamento por audit_log é a mitigação | Fase E |
| Restrição de Auditoria a dados nominais justificados | Requer processo institucional de solicitação | Fase E |
| Policies de `paciente_alergias`, `paciente_comorbidades`, `paciente_medicamentos_continuos`, `paciente_alertas_clinicos` | Fora das 18 tabelas-alvo desta etapa; avaliar na Fase B | Fase B |
| Alteração das policies `dom_*_select_linked` | Catálogos públicos internos; risco de quebra sem benefício | Manter |

---

*Documento de planejamento técnico — 2026-07-24. Nenhuma migration, tabela, policy, function ou grant foi criado ou alterado. A migration só pode ser iniciada após confirmação dos critérios da seção 13.*

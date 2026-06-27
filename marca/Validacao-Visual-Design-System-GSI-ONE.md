# Validação Visual e Técnica — Design System GSI ONE

Documento de checkpoint, anterior a qualquer aplicação de tokens em código. Registra o estado atual do trabalho de marca e identidade, classifica os tokens por risco e define a primeira etapa segura de adoção. Nenhuma alteração de código foi feita a partir deste documento.

---

## 1. Resumo da situação atual

| Item | Status |
|---|---|
| Brandbook Institucional da GSI HealthTech | Criado — `marca/Brandbook-Institucional-GSI-HealthTech.md` |
| Manual de Identidade Visual da GSI ONE | Criado — `marca/Manual-Identidade-Visual-GSI-ONE.md` |
| Arquivo de tokens `gsi-design-system.css` | Criado — `marca/gsi-design-system.css`, isolado, não importado por nenhum arquivo do sistema |
| Tokens de risco (`--gsi-risco-*`) | Realinhados aos valores reais já validados em `style.css` (vermelho, laranja, amarelo, verde, azul) |
| Tokens complementares (status, claros/escuros, escalas de azul/cinza, sombras, raios, overlays, tv-mode, print) | Adicionados, com origem documentada (valor real vs. calculado) |
| Aplicação no sistema | **Nenhum token foi aplicado em `style.css`, `index.html` ou `script.js`.** O design system permanece um documento de referência. |

---

## 2. Classificação dos tokens

### 2.1 Tokens validados (valor idêntico ao já existente em `style.css`)

- `--gsi-risco-vermelho`, `--gsi-risco-laranja`, `--gsi-risco-amarelo`, `--gsi-risco-verde`, `--gsi-risco-azul`.
- `--gsi-risco-vermelho-claro/escuro`, `--gsi-risco-amarelo-claro`, `--gsi-risco-verde-claro/escuro`.
- `--gsi-status-sucesso-fundo/texto`, `--gsi-status-alerta-fundo/texto`, `--gsi-status-perigo-fundo/texto/borda`, `--gsi-status-info-fundo/texto`.
- `--gsi-azul-950/900/800/700/100`, `--gsi-cinza-950/700/100/50`.
- `--gsi-sombra-suave`, `--gsi-sombra-elevada`, `--gsi-sombra-padrao`, `--gsi-sombra-sucesso`.
- `--gsi-raio-pequeno`, `--gsi-raio-medio`, `--gsi-raio-grande`, `--gsi-raio-pill`, `--gsi-raio-circular`, `--gsi-raio-borda`.
- `--gsi-overlay-branco-08/12/16/22`.
- `--gsi-tv-fundo`, `--gsi-print-*` (todos).
- `--gsi-branco`.

### 2.2 Tokens calculados, pendentes de validação visual

- `--gsi-status-sucesso-borda`, `--gsi-status-alerta-borda`, `--gsi-status-info-borda`.
- `--gsi-risco-laranja-claro/escuro`, `--gsi-risco-amarelo-escuro`, `--gsi-risco-azul-claro/escuro`.
- `--gsi-azul-50`.
- `--gsi-cinza-900/800/600`.
- `--gsi-azul-profundo`, `--gsi-azul-petroleo`, `--gsi-teal`, `--gsi-turquesa-claro`, `--gsi-cinza-gelo`, `--gsi-cinza-medio`, `--gsi-cinza-texto`, `--gsi-azul-cinza-escuro` (paleta de marca — leitura visual da logo, sem confirmação do arquivo vetorial).

### 2.3 Tokens de baixo risco para futura adoção

Raios (`--gsi-raio-*`), sombras (`--gsi-sombra-*`), overlays (`--gsi-overlay-branco-*`) e tokens já validados de risco/status — todos reaproveitam exatamente valores já em produção, apenas formalizando nome/variável.

### 2.4 Tokens de médio risco

Escalas de azul e cinza (granularidade diferente da escala atual do sistema), bordas calculadas de status, variações claras/escuras calculadas de laranja/amarelo/azul, e o uso duplo de `--gsi-risco-verde` como cor de risco e cor de sucesso de UI.

### 2.5 Tokens de alto risco

`--gsi-tv-fundo` (tela pública/institucional, painel de chamada) e `--gsi-print-*` (bloco `@media print`, isolado com `!important`) — qualquer tokenização aqui exige teste dedicado antes de qualquer mudança real.

---

## 3. Decisão sobre verde clínico vs. verde de sucesso

**Situação encontrada:** `--green-600` (`#169653`) em `style.css` é usado simultaneamente como (a) cor de classificação de risco "pouco urgente" (`.tag.green`, `.risk-card.green`) e (b) cor de sucesso/ação positiva em UI (botão circular, switch ligado, barra de destaque do hero executivo).

**Recomendação:** separar semanticamente os dois usos.

- `--gsi-risco-verde` deve permanecer **exclusivo para classificação de risco clínico** — nunca reutilizado em botões, switches ou indicadores de UI que não representem risco assistencial.
- `--gsi-status-sucesso-*` deve ser o token oficial para **ações administrativas concluídas com sucesso** (confirmação de salvamento, switch ativado, botão de ação positiva).
- Como ambos compartilham hoje o mesmo valor HEX (`#169653` / `#0F7441` / `#E6F6EE`), a separação é **apenas semântica nesta etapa** — não exige mudança visual imediata, apenas a convenção de qual variável usar em cada contexto no momento da tokenização real.
- Isso evita que uma futura alteração de tom do verde de risco (por exigência clínica/assistencial) afete acidentalmente botões e switches administrativos, e vice-versa.

---

## 4. Matriz de adoção segura

| Grupo de tokens | Risco de aplicação | Impacto visual esperado | Onde poderia ser aplicado no futuro | Recomendação |
|---|---|---|---|---|
| Raios (`--gsi-raio-*`) | Baixo | Nenhum (valores idênticos aos atuais) | Cards, botões, inputs, modais | **Liberar** |
| Sombras (`--gsi-sombra-*`) | Baixo | Nenhum (valores idênticos aos atuais) | Cards, modais, botões elevados | **Liberar** |
| Overlays brancos (`--gsi-overlay-branco-*`) | Baixo | Nenhum (valores idênticos aos atuais) | Sidebar, menus escuros, modais sobre fundo azul | **Liberar** |
| Tokens de risco já validados (`--gsi-risco-*`) | Baixo (valor) / Médio (escopo de uso) | Nenhum se aplicado só onde já são usados hoje | `.tag`, `.risk-card` | **Validar antes** — confirmar que a tokenização não introduz o token em novos contextos não clínicos |
| Status administrativo (`--gsi-status-*`) | Médio | Pode introduzir um novo padrão visual de badges/alerts ainda não presente no sistema (ex.: `.status.info` não existe hoje) | Mensagens de confirmação, alertas de formulário, badges administrativos novos | **Validar antes** — revisar visualmente os 3 tons de borda calculados |
| Variações claras/escuras calculadas (laranja, amarelo escuro, azul claro/escuro) | Médio | Tons nunca usados antes no sistema — podem não combinar com a paleta existente | Backgrounds de alerta, hover states, novos badges | **Validar antes** |
| Escala de azuis (`--gsi-azul-*`) | Médio | Reorganização de uma escala já densa (6 tons reais + 1 novo) | Substituição de `--blue-*` por `--gsi-azul-*` em `style.css` | **Validar antes** — comparar lado a lado antes de qualquer substituição |
| Escala de cinzas (`--gsi-cinza-*`) | Médio | 3 tons novos não testados (900/800/600), podem ficar muito próximos dos tons vizinhos | Substituição de `--gray-*` por `--gsi-cinza-*` | **Validar antes** |
| Verde de risco vs. verde de sucesso (uso duplo) | Médio | Nenhum visual imediato, mas risco de acoplamento futuro entre semânticas distintas | Botões, switches, `.tag.green` | **Validar antes** — definir a separação semântica (seção 3) antes de tokenizar |
| `--gsi-tv-fundo` (painel de chamada/tv-mode) | Alto | Tela pública, visível a pacientes na sala de espera — qualquer erro é visível institucionalmente | `.tv-mode`, `.tv-panel` | **Bloquear temporariamente** |
| `--gsi-print-*` (impressão) | Alto | Bloco isolado com `!important`; erro pode quebrar relatórios oficiais impressos | `@media print` | **Bloquear temporariamente** |
| Paleta de marca (`--gsi-azul-profundo`, `--gsi-teal` etc.) | Alto (para uso em telas clínicas) / Baixo (para uso institucional puro) | Cores ainda não confirmadas pelo arquivo vetorial da logo | Login, cabeçalho/rodapé institucional, materiais de marca | **Validar antes** — apenas para contextos institucionais, nunca assistenciais |

---

## 5. Primeira etapa de aplicação recomendada

A primeira aplicação real de tokens — quando autorizada — deve ser pequena, reversível e fora do fluxo assistencial. Candidatos recomendados, em ordem de segurança:

1. **Tela de login** (se existir como tela isolada) — superfície de menor criticidade clínica, ideal para validar a paleta institucional (`--gsi-azul-profundo`, `--gsi-teal`) e a tipografia institucional (Sora/Manrope) sem afetar nenhum fluxo de atendimento.
2. **Cabeçalho institucional (topbar/sidebar — apenas elementos de marca, não os itens de navegação clínica)** — aplicar o logotipo/símbolo da GSI ONE e, opcionalmente, o gradiente de marca (`--gsi-gradiente-marca`) em elementos puramente decorativos (ex.: `.brand-mark`).
3. **Rodapé institucional** (se existir, ou a criar como elemento novo e isolado) — nome GSI HealthTech / GSI ONE, sem impacto em nenhuma lógica.
4. **Elementos de marca isolados** — favicon, metatags, splash/loading screen — sem qualquer relação com cores de risco, status ou dados clínicos.

**Critério comum a todos:** nenhum desses pontos deve tocar em `.tag`, `.risk-card`, `.status`, tabelas de pacientes/atendimentos, painel de chamada ou impressão.

---

## 6. Itens bloqueados temporariamente

Os itens abaixo **não devem ser tokenizados nem alterados** até decisão e validação específicas, mesmo após a aprovação da primeira etapa segura (seção 5):

- `@media print` (relatórios oficiais impressos).
- `.tv-mode` / `.tv-panel` (painel de chamada exibido ao público).
- Cores de classificação de risco já validadas clinicamente (`.tag.*`, `.risk-card.*`, `--red`, `--orange`, `--risk-yellow`, `--green-600`, `--risk-blue`).
- Status administrativos (`.status.warn/.good/.danger`) sem validação visual prévia dos novos tons de borda calculados.
- Substituição completa das escalas `--blue-*` e `--gray-*` por `--gsi-azul-*`/`--gsi-cinza-*` sem comparação visual lado a lado.

---

## 7. Checklist antes de qualquer aplicação no código

- [ ] Confirmar HEX finais da paleta de marca a partir do arquivo vetorial original da logo (AI/SVG/EPS).
- [ ] Validar visualmente, lado a lado com o sistema atual, todos os tokens marcados "calculado — a validar" (seção 2.2).
- [ ] Decidir formalmente a separação semântica entre `--gsi-risco-verde` e `--gsi-status-sucesso-*` (seção 3) e documentar a decisão.
- [ ] Definir com a equipe técnica/assistencial se a escala `--gsi-azul-*`/`--gsi-cinza-*` substituirá `--blue-*`/`--gray-*` ou se ambas coexistirão.
- [ ] Escolher e aprovar formalmente a primeira superfície de aplicação (seção 5), confirmando que não há ponto de contato com fluxo assistencial.
- [ ] Garantir que nenhuma alteração toque `@media print` ou `.tv-mode` nesta primeira rodada.
- [ ] Testar a mudança aprovada em ambiente isolado (cópia local) antes de editar `style.css` diretamente.
- [ ] Verificar responsividade e contraste (texto sobre fundo) após qualquer aplicação, mesmo pontual.
- [ ] Obter autorização explícita do responsável pelo projeto antes de editar `style.css`, `index.html` ou `script.js`.
- [ ] Registrar, neste mesmo arquivo ou em um novo registro de mudança, qual token foi efetivamente aplicado, onde, e por quem aprovado.

---

*Documento de checkpoint — GSI ONE / GSI HealthTech. Nenhuma alteração foi feita em `style.css`, `index.html`, `script.js` ou `gsi-design-system.css` a partir deste documento.*

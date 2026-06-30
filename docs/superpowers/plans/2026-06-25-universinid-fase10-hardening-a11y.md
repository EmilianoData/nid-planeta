---
date: 2026-06-25
revisado: 2026-06-26 (pós-verificação adversarial w0f3avelz + decisão de escopo do dono)
spec: docs/superpowers/specs/2026-06-25-universinid-fase10-hardening-a11y.md
status: implementado
gate: "GO 2026-06-26 (red-team 6 dimensões wf_e655d168-406: 0 bloqueantes; 5 atenções corrigidas no gate) + aprovado pelo dono"
implementado: "2026-06-26 — commit 20ad2f1 (código+testes); gate técnico verde; gate VISUAL pendente no preview"
tipo: web (UniversiNID — Next 15 / React 19 / Tailwind 3.4)
---

# Plano: FASE-10 — Hardening de a11y (touch-targets ≥44px + focus-visible)

## Contexto técnico

Stack: Next 15 App Router, React 19, Tailwind 3.4, primitivos hand-roll (cva) em
`src/components/universinid/ui/`, CSS escopado em `src/app/universinid/universinid.css`.
**Zero dep nova, zero CSP, zero schema.** Tokens (incl. foco) vivem em **`:root`**
(`universinid.css:12`): `--navy:#213D75`, `--focus-ring:2px solid #213D75` + `--focus-offset:2px`
(css:20). **`:root` (não `.uni-shell`) é decisivo** — ver Insight de portaling abaixo.

**Padrão de teste (obrigatório — zero dep nova):** render-tests usam `renderToStaticMarkup`
(`react-dom/server`) sob vitest `environment:'node'` — o padrão já vivo em
`src/components/universinid/RenderBlocks.test.tsx` (vitest.config.ts:8). **NÃO usar
`@testing-library/react`/`jsdom`** (não estão no `package.json`; instalar quebraria "zero dep nova").
Assertir presença/ausência de classe no HTML retornado satisfaz a mesma checagem de className.

> **Achado da leitura linha-a-linha (2026-06-25) que enxuga o escopo:** o **foco visível já está
> implementado** em toda a casca (todas as classes `.uni-*` interativas já têm
> `:focus-visible{outline:var(--focus-ring)}` — css:41/51/63/144/191/237) e nos primitivos
> (`focus-visible:ring-2 ring-[var(--navy)]`). Portanto a FASE-10 é **só o touch-target 44px**; foco
> é apenas **auditoria de consistência** (decisão: manter os dois padrões existentes — `ring` nos
> primitivos, `outline` nas `.uni-*` —, ambos visíveis e marinho; **não unificar**, para não arriscar
> regressão).

> **⚠️ Insight de portaling (verificação adversarial, alta gravidade):** `DialogContent` usa
> `RadixDialog.Portal` (`ui/dialog.tsx:35`) → o conteúdo (e os `Button` dentro dele) é renderizado
> em `document.body`, **fora de `.uni-shell`**. Logo o token `--touch-min` **DEVE ir em `:root`**
> (onde os demais tokens já estão); se fosse para `.uni-shell`, `var(--touch-min)` resolveria vazio
> dentro dos modais do admin e o `min-h` **sumiria silenciosamente** — e o render-test (markup)
> passaria mesmo assim (vê a string da classe, não o layout). Falso-verde evitado.

## Decisão de escopo (dono, 2026-06-26) — "Cobertura WCAG completa + varredura final"

A verificação revelou **mais superfícies <44px do que a spec enumerou**. Decisão do dono: **cobrir
todos os alvos <44px conhecidos** (não só os 4 enumerados) **+ rodar uma varredura final** no gate
para caçar qualquer alvo ainda não mapeado. Isto **supera a enumeração literal da spec** de forma
rastreável (a intenção da spec é 44px universal; `.uni-btn`/`.uni-nav`/`DialogClose` são toques do
aluno/usuário). A reconciliação do `IN:` da spec é tarefa 3.3.

## Estado real verificado (medidas ≈ por padding+fonte; medição exata = gate visual)

| Superfície | Arquivo:linha | Altura atual ≈ | Foco | Ação FASE-10 |
|---|---|---|---|---|
| `Button` (cva `size: md`) | `ui/button.tsx:28` (`py-[9px]`) | ≈33px | ✅ ring-navy | **+ `min-h` 44px (só no `md`)** |
| `Button` (`size: sm`) | `ui/button.tsx:29` (`py-[6px]`) | ≈27px | ✅ | **NÃO tocar — exceção consciente (ver R1)** |
| `Input` | `ui/input.tsx:6` (`py-[10px]`) | ≈40px | ✅ | **+ `min-h` 44px** |
| `Select` | `ui/select.tsx:6` (`py-[10px]`) | ≈40px | ✅ | **+ `min-h` 44px** |
| `Textarea` | `ui/textarea.tsx:7` (`min-h-[80px]`) | ≥80px | ✅ | **JÁ ≥44 — sem ação** |
| `DialogClose` (botão ×) | `ui/dialog.tsx:61` (`h-7 w-7`) | **28×28px** | ✅ ring-navy | **+ 44×44 (primitivo `ui/*` = escopo da spec)** |
| `.uni-back` | `universinid.css:235` (sem altura) | **≈16px** | ✅ outline | **+ `min-height` 44px + área de toque** (pior gap) |
| `.uni-k` | `universinid.css:37` (`padding:8px 12px`) | ≈32px | ✅ outline | **+ `min-height` 44px** |
| `.uni-cmd-item` | `universinid.css:188` (`padding:12px 18px`) | ≈40px | ✅ outline | **+ `min-height` 44px** (explícito) |
| `.uni-btn` (aluno: "Marcar concluída") | `universinid.css:142` (`padding:9px 16px`) | **≈37px** | ✅ outline | **+ `min-height` 44px** (toque do aluno) |
| `.uni-nav` (item da sidebar) | `universinid.css:59` (`padding:9px 10px`) | **≈37px** | ✅ outline | **+ `min-height` 44px** |
| `.uni-acct-item` (menu da conta) | `universinid.css:312` (`padding:9px 10px`, flex) | **≈37px** | ✅ outline | **+ `min-height` 44px** *(verificação)* |
| `.uni-pick` (item de lista/picker) | `universinid.css:290` (`padding:8px 10px`, block) | **≈33px** | ✅ outline | **+ `min-height` 44px + centrar** *(verificação)* |
| `.uni-tab` (aba) | `universinid.css:279` (`padding:8px 18px`, inline-block) | **≈33px** | ✅ outline | **+ área de toque 44px (ver R6)** *(verificação)* |

**Já conformes (referência, NÃO tocar):**
- `.uni-av` (menu da conta) — **`width:44px; height:44px` (css:46)** já é 44×44; o 34px é só o `> span`
  (disco visual interno, css:48). *(Corrige erro factual do plano anterior.)*
- `.uni-stat` (tile clicável) — `padding:14px 16px` + `.n` 1.5rem ≈63px (css:86).
- `.uni-embed-form input/button` (min-height:44px, css:137/139); `.uni-quiz-opt` (min-height:44px, css:260).

## Fases e tarefas

### Fase 1 — Token + primitivos `ui/*`

**Tarefa 1.1 — Adicionar o token `--touch-min` em `:root`**
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css`, **no bloco `:root` (linhas 12–25), ao lado de `--focus-ring` (linha 20)**, adicionar `--touch-min:44px;` com comentário (WCAG 2.5.5 Target Size). **Em `:root`, não em `.uni-shell`** — para os diálogos portalizados (ver Insight de portaling).
- Evidência: `git diff` mostra só a linha do token, dentro do bloco `:root`; `npm run build` verde.
- Depende de: nenhuma.

**Tarefa 1.2 — `min-h` 44px no Button, SÓ na variante `md`**
- Agente: `nid-frontend-engineer`
- O que faz: em `ui/button.tsx`, adicionar `min-h-[var(--touch-min)]` **à string da variante `md` (linha 28)** — **NÃO ao array base** (linhas 7–11), para `sm` **não** herdar o piso. Mantém padding/fonte atuais.
- Evidência: render-test `renderToStaticMarkup(<Button/>)` (env node — ver Padrão de teste) assertando que (a) o HTML do `Button` default (=md) **contém** `min-h-[var(--touch-min)]` e (b) `Button size="sm"` **NÃO** contém; `npm run test` PASS; `tsc` 0.
- Depende de: 1.1.

**Tarefa 1.3 — `min-h` 44px em Input e Select** *(Textarea já ≥44 — pular)*
- Agente: `nid-frontend-engineer`
- O que faz: adicionar `min-h-[var(--touch-min)]` ao `inputBase` (`ui/input.tsx:4`) e ao `selectBase` (`ui/select.tsx:4`). **Não** tocar `textarea.tsx` (já `min-h-[80px]`).
- Evidência: render-test `renderToStaticMarkup(<Input/>)` e `<Select/>` (env node) assertando que o HTML **contém** `min-h-[var(--touch-min)]`; `test` PASS; `tsc` 0.
- Depende de: 1.1.

**Tarefa 1.4 — `DialogClose` (botão ×) 28×28 → 44×44** *(NOVO — achado da verificação)*
- Agente: `nid-frontend-engineer`
- O que faz: em `ui/dialog.tsx:61`, trocar `h-7 w-7` por `min-h-[var(--touch-min)] min-w-[var(--touch-min)]` (mantém `flex items-center justify-center`, que já centra o `×`). Funciona porque o token está em `:root` e o portal herda de `:root`. **Clearance do título (gate D4):** a 44px o Close (`absolute right-4 top-4`) cresce ~16px p/ esquerda/baixo e pode invadir o `DialogTitle` (hoje `pr-8`, dialog.tsx:79) → **aumentar o `pr` do título (`pr-8` → `pr-12`/`pr-16`)** até a área 44×44 NÃO sobrepor o texto; medir no gate.
- Evidência: `git diff` mostra só a troca de classe em `ui/dialog.tsx:61`; `tsc` 0 + `build` verde. **Sem render-test SSR** aqui — `DialogClose` vive sob `RadixDialog.Portal` (createPortal), que `renderToStaticMarkup` não renderiza de forma confiável em env node; a prova de tamanho é o **gate visual medindo 44×44 DENTRO de um diálogo aberto do admin** (Tarefa 3.2), que também confirma o token resolvido no portal.
- Depende de: 1.1.

### Fase 2 — Classes interativas `.uni-*` da casca

> **Serialização (gate D2):** as 8 tarefas abaixo editam o MESMO arquivo `universinid.css` → executar **serialmente** (um agente, uma edição por vez; **sem fan-out paralelo na mesma folha**) para evitar conflito/sobre-escrita silenciosa. Os primitivos `ui/*` (1.2/1.3/1.4) são arquivos distintos e podem paralelizar entre si.

**Tarefa 2.1 — `.uni-back` (pior gap, ≈16px → 44px)**
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css:235`, adicionar **só** `min-height:var(--touch-min);` (já tem `inline-flex` + `align-items:center` → o link cresce apenas no eixo **vertical**, texto centrado; ícone + "Voltar" já dão largura ≥44px). **SEM** `margin-left`/padding horizontal negativos (gate D4: evita deslocar o link dentro da `.uni-lesson-bar`). Foco já existe (css:237).
- Evidência: visual no preview (≥44px no DevTools); `git diff` só nessa regra; **0 deslocamento** (crescimento vertical-only).
- Depende de: 1.1.

**Tarefa 2.2 — `.uni-k` (≈32px → 44px)**
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css:37`, adicionar `min-height:var(--touch-min);` (mantém `padding` e o `align-items:center`).
- Evidência: visual no preview (≥44px); `git diff` só nessa regra.
- Depende de: 1.1.

**Tarefa 2.3 — `.uni-cmd-item` (≈40px → 44px, explícito)**
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css:188`, adicionar `min-height:var(--touch-min);` (mantém `padding:12px 18px`; o foco usa `outline-offset:-2px` inset, css:191 — preservar).
- Evidência: visual no preview (≥44px na linha da paleta ⌘K).
- Depende de: 1.1.

**Tarefa 2.4 — `.uni-btn` (aluno "Marcar concluída", ≈37px → 44px)** *(NOVO — escopo do dono)*
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css:142`, adicionar `min-height:var(--touch-min);`. `.uni-btn` é `<button>` nativo (sem flex); se o texto descentralizar verticalmente no preview, parear com `display:inline-flex; align-items:center; justify-content:center;` (ver R3).
- Evidência: visual no preview na página da lição (≥44px, texto centrado); `git diff` só nas regras `.uni-btn*`.
- Depende de: 1.1.

**Tarefa 2.5 — `.uni-nav` (item da sidebar, ≈37px → 44px)** *(NOVO — escopo do dono)*
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css:59`, adicionar `min-height:var(--touch-min);` (já tem `display:flex` + `align-items:center`; preserva `.on` e `:hover`).
- Evidência: visual no preview na sidebar (cada item ≥44px); **0 regressão** no espaçamento/`gap` da lista.
- Depende de: 1.1.

**Tarefa 2.6 — `.uni-acct-item` (menu da conta, ≈37px → 44px)** *(NOVO — surgiu na verificação; entra pela decisão "completa")*
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css:312`, adicionar `min-height:var(--touch-min);` (já é `display:flex` + `align-items:center` — caso trivial, igual ao `.uni-nav`; preserva `:hover` e o foco inset css:316).
- Evidência: visual no preview no menu da conta (cada item ≥44px); `git diff` só nessa regra.
- Depende de: 1.1.

**Tarefa 2.7 — `.uni-pick` (item de lista/picker, ≈33px → 44px)** *(NOVO — verificação)*
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css:290`, adicionar `min-height:var(--touch-min);`. `.uni-pick` é `display:block; text-align:left` — para centrar verticalmente, parear com `display:flex; align-items:center;` (mantendo `width:100%`/`text-align:left` via `justify-content:flex-start`). Preserva `.on`/`.muted`/`:hover`.
- Evidência: visual no preview (≥44px, texto centrado e alinhado à esquerda); **0 regressão** na lista.
- Depende de: 1.1.

**Tarefa 2.8 — `.uni-tab` (aba, ≈33px → 44px)** *(NOVO — verificação; método FIXADO no gate)*
- Agente: `nid-frontend-engineer`
- O que faz: em `universinid.css:279`, trocar `display:inline-block` por `display:inline-flex; align-items:center;` + adicionar `min-height:var(--touch-min);`. **Método único (resolvido no gate 2026-06-26): altura cheia 44px** — como TODAS as abas crescem juntas, a linha continua alinhada. **NÃO usar pseudo-elemento** (evitaria mexer no visual, mas captura clique de abas vizinhas). **Preservar** `border-bottom`/`margin-bottom:-1.5px` (css:278-282) — o indicador `.on` casa com a base de `.uni-tabs` relativo ao próprio bottom da aba, então segue alinhado.
- Evidência: visual no preview — cada aba ≥44px; **indicador `.on` alinhado à linha-base de `.uni-tabs`** (gate D4); `git diff` só nas regras `.uni-tab*`.
- Depende de: 1.1.

> `.uni-av`, `.uni-stat`, `Textarea`: **nenhuma ação** (já ≥44px) — confirmar no gate visual, sem editar.

### Fase 3 — Verificação e registro

**Tarefa 3.1 — Varredura final de cobertura** *(NOVO — "varredura final" do dono)*
- Agente: `nid-accessibility-engineer`
- O que faz: varrer `universinid.css` + `src/components/universinid/ui/*.tsx` **+ `src/components/universinid/**/*.tsx`**
  (componentes de feature — ContentTree, Topbar, AccountMenu, QuizBlock, EmbedBlock…) atrás de qualquer
  superfície interativa (`button`, `a[href]`, `input`, `select`, `[role=button]`, `.uni-*` clicável,
  `:hover`/`:focus-visible`) com altura/área provável **<44px** **ainda não coberta** pelas Fases 1–2 —
  **incluindo `<button>` cru / `h-6`/`h-7`/`h-8` / `role="button"` ad-hoc que NÃO passem pelos primitivos
  `Button`/`.uni-*`** (gate D1: alvo que escaparia da herança). Produzir lista
  `arquivo:linha → medida estimada → veredicto (gap / já conforme / não-interativo)`,
  **com veredicto para todo arquivo de `ui/*`** (ex.: `ui/Icon.tsx` = SVG decorativo `aria-hidden` →
  não-interativo, fora de escopo — sem deixar arquivo sem veredicto).
- **Já conhecidos e já tasked** (descontar do veredicto, não são "novos"): `.uni-tab`/`.uni-pick`/`.uni-acct-item`
  (Tarefas 2.6–2.8) — a tabela acima **não é exaustiva**; a varredura existe para o residual.
- Evidência: lista anexada ao registro (3.3). **Se achar gap NOVO** (fora de 2.1–2.8), NÃO incluir silenciosamente — registrar e levar ao dono (pode virar 2.9+ ou follow-up; **fora da estimativa fixa da Fase 2**).
- Depende de: **2.1–2.8 (rodar APÓS a Fase 2** — assim "o residual" é literal, sem falso-gap do estado pré-edição; gate D2).

**Tarefa 3.2 — Gate de saída (técnico + visual)**
- Agente: `nid-accessibility-engineer` (conduz) + `nid-code-reviewer` (diff/escopo)
- **Pré-requisito de ambiente (gate D2/D3 — garantir ANTES de medir):** dev local não renderiza a casca autenticada (Neon frio). Fixar o caminho de prova: **preview Vercel da branch** destravado via MCP `get_access_to_vercel_url` (seta cookie `_vercel_jwt`; gotcha FASE-09) + **login admin de seed** + roteiro de **qual diálogo do admin abrir** para medir o `DialogClose`. (Neon tem só a branch `production` → preview lê/ESCREVE o banco real; cf. memória.)
- Evidência:
  - **Técnico:** `npm run test` (verde, render-tests novos) · `npx tsc --noEmit` (0) · `npm run build` (sucesso).
  - **Assert objetivo de CSS (gate D3 — honra o D6 da spec, zero dep):** teste node lendo `universinid.css` que assere que CADA seletor do escopo (`.uni-back`/`.uni-k`/`.uni-cmd-item`/`.uni-btn`/`.uni-nav`/`.uni-acct-item`/`.uni-pick`/`.uni-tab`) contém `min-height:var(--touch-min)` — fecha o falso-verde de "classe ausente" sem depender só do olho.
  - **Isolamento:** `git diff src/app/globals.css` → **vazio**; `git diff src/middleware.ts` → **vazio**; `git diff prisma/schema.prisma` → **vazio**.
  - **Visual (com artefato):** cada alvo do escopo ≥44×44px (DevTools), **com screenshot nomeado por superfície** anexado ao registro 3.3; **incluindo o `DialogClose` medido DENTRO de um diálogo aberto do admin** (prova o token no portal) **e que a área 44×44 do × NÃO sobrepõe o `DialogTitle`** (gate D4); o tab bar com **indicador `.on` alinhado**; `Tab` mostra o anel marinho em todos (incl. login e DialogClose); **0 regressão** em sidebar (`.uni-nav`/`.uni-acct-item` — **viewport curto: o scroll absorve sem cortar itens**, R7), linha de stats, ContentTree do admin (`sm` compactos), login (`.uni-login` sem anel vazado) e viewport estreito (≤820px).
- Depende de: 1.1–2.8, 3.1.

**Tarefa 3.3 — Registrar execução**
- Agente: `nid-frontend-engineer`
- O que faz: atualizar este plano (`status:` + bloco de execução: commits, evidências, desvios, lista da varredura 3.1) e reescrever `especificacoes/2-fila/FASE-10-hardening-a11y/SPEC.md` no **TEMPLATE A** (ritual de conclusão). **A spec aprovada (`docs/.../specs/...`) JÁ foi reconciliada no gate (2026-06-26)** — IN expandido + decisão do dono registrada ANTES de implementar (gate D6), então aqui é só registro de execução.
- Evidência: `git add` de caminhos explícitos; commit `docs(universinid): registro de execucao FASE-10`.
- Depende de: 3.2.

## Estimativa
| Fase | Tarefas | Estimativa |
|------|---------|------------|
| 1 | 1.1–1.4 | ~0,5 dia |
| 2 | 2.1–2.8 | ~0,5–1 dia (8 superfícies; `.uni-tab`/`.uni-pick` exigem centrar) |
| 3 | 3.1–3.3 | ~0,5–1 dia (varredura + gate visual no preview) |

## Riscos técnicos
- **R1 — `min-h` 44px regrediria o Button `sm`** (ContentTree do admin: 6–7 botões `sm`/linha; +~63% de altura): **MITIGADO POR DESIGN** — `min-h` só na variante `md`; `sm` segue compacto como **exceção consciente WCAG 2.5.8** (alvos inline em UI densa de admin/mouse, não chão de fábrica). O teste 1.2 trava isso (assert que `sm` NÃO tem o piso). Confirmar densidade do ContentTree no gate.
- **R2 — token em `.uni-shell` quebraria diálogos portalizados** (alta): **MITIGADO** — token em `:root` (1.1); gate mede o `DialogClose` DENTRO de um diálogo aberto (3.2), não só no markup.
- **R3 — `min-height` em elemento sem flex descentraliza texto** (`.uni-btn`, `.uni-back`): mitigação — pareie `min-height` com `align-items:center` (classes que já são flex) ou adicione `inline-flex` centrado (`.uni-btn`, tarefa 2.4); verificação visual obrigatória.
- **R4 — anel de foco vaza para `.uni-login`**: BAIXO — `.uni-login` tem `:focus-visible` próprios (css:164/167) e não usa os primitivos `ui/*`; ainda assim o gate cobre o login.
- **R5 — falso-verde** (markup ≠ layout): mitigação — render-tests (`renderToStaticMarkup`, env node) só conferem **presença das classes/min-h** na string HTML, não medem pixels; o tamanho real é verificação visual no preview, declarada como tal (R2 reforça: medir o portal).
- **R6 — `.uni-tab` a 44px altera a altura do tab bar** (abas ficam mais altas): **MITIGADO** — método FIXADO (Tarefa 2.8): altura cheia 44px + `inline-flex` (todas as abas crescem juntas → linha alinhada); **preservar** `margin-bottom:-1.5px`/`border-bottom` para o indicador `.on` casar com a base de `.uni-tabs`. Gate mede o alinhamento do indicador. (Pseudo-elemento descartado — capturaria clique de abas vizinhas.)
- **R7 — alongamento vertical acumulado** (sidebar com ~todos `.uni-nav`/`.uni-acct-item` ≥44px; linha de stats) — herda o R1 da spec: mitigação — `.uni-side` é `overflow-y:auto`; gate mede a lista de nav em **viewport curto** para confirmar que o scroll absorve sem cortar itens.

## Decisões já resolvidas (eram "em aberto" no plano anterior)
- ✅ **`.uni-av`:** já é 44×44 (css:46) — **conforme, sem ação** (corrige erro factual anterior).
- ✅ **`.uni-nav`:** **incluído** (tarefa 2.5) por decisão do dono.
- ✅ **`.uni-btn`:** **incluído** (tarefa 2.4) por decisão do dono.
- ✅ **`DialogClose`:** **incluído** (tarefa 1.4) — é primitivo `ui/*`, escopo da própria spec.
- ✅ **Button `sm`:** **mantido compacto** (exceção WCAG 2.5.8 documentada); `min-h` só no `md`.

## Gate obrigatório
Submetido ao `/nid:gate` (red-team) antes de qualquer implementação. Foco do gate: cobertura
(varredura 3.1), não-regressão em layouts densos (ContentTree `sm`)/sidebar/login, e a medição do
`DialogClose` no portal (prova anti-falso-verde do token em `:root`).

## Execução (2026-06-26) — `status: implementado`

**Commit do código+testes:** `20ad2f1` (10 arquivos). **Docs:** commit seguinte (registro + reconciliação da spec).

**Gate técnico VERDE:** `npm run test` **223/223** (inclui render-tests dos primitivos + assert-CSS de 11 seletores; `password.test.ts` deu timeout de bcrypt **só sob carga paralela** — passa isolado em 1,1s) · `npx tsc --noEmit` **0** · `npm run build` **OK** (todas as rotas `/universinid` compilam). **Isolamento íntegro:** `git diff` **VAZIO** em `globals.css`, `middleware.ts` (CSP) e `schema.prisma`.

**Implementado (Fases 1–2 + extras da varredura):**
- **F1 primitivos:** token `--touch-min:44px` em `:root`; `Button` `md` (sm intocado = exceção 2.5.8); `Input`/`Select`; `DialogClose` 44×44 + `DialogTitle` `pr-8`→`pr-16`.
- **F2 (8 classes):** `.uni-back`/`.uni-k`/`.uni-cmd-item`/`.uni-btn`/`.uni-nav`/`.uni-acct-item` (+`min-height`); `.uni-pick`/`.uni-tab` (flex+center+`min-height`; indicador da aba preservado).
- **F3.1 varredura → 4 alvos extra; decisão do dono "cobertura total" (2026-06-26):** implementados também `.uni-cont .go` (CTA do hero), `.uni-wm` (logo), `.uni-login input`, e os **4 botões ad-hoc do `QuizBlock`** (editor admin). `EmbedBlock` já conforme (`.uni-embed-form button`); `ui/Icon.tsx` não-interativo.
- **Testes novos:** `ui/{button,input,select}.test.tsx` + `app/universinid/touch-target.test.ts`.

**⏳ PENDENTE — gate VISUAL (checkpoint do dono no preview):** dev local não renderiza a casca autenticada (Neon frio) → medir no preview Vercel (via `get_access_to_vercel_url`). Conferir: cada alvo ≥44×44 no DevTools (incl. `DialogClose` no diálogo aberto e o tab bar); `Tab` mostra anel marinho em tudo (incl. login); **0 regressão** em sidebar/stats/ContentTree (`sm` compacto)/login/≤820px; clearance do `DialogClose` vs título (`pr-16` ok?); `.uni-tab` indicador alinhado; `.uni-login input` com box-model correto (≥44).

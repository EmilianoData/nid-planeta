---
date: 2026-06-25
revisado: 2026-06-26 (IN reconciliado no /nid:gate — escopo expandido do dono; ver IN)
status: aprovada
tipo: web (UniversiNID — Next 15 / React 19 / Tailwind 3.4)
autor: henrique.emiliano
fase: FASE-10
origem: docs/superpowers/specs/2026-06-25-universinid-roadmap-frontend-research.md (Onda 1, item #1 + veredicto "hardening primeiro")
pre_spec: especificacoes/2-fila/FASE-10-hardening-a11y/SPEC.md
mockup_validado: http://localhost:4310 (Antes/Depois + leitor de tamanho, aprovado pelo dono em 2026-06-25)
---

# Spec: FASE-10 — Hardening de a11y (touch-targets ≥44px + focus-visible)

## Contexto

O UniversiNID está sendo elevado a "plataforma de treinamento avançada" por ondas de features
não-invasivas (roadmap de 2026-06-25). **Toda** feature dessas ondas cria UI nova (sino de notificação,
ícone de bookmark, cards de catálogo, controles de revisão). Hoje os primitivos hand-roll
(`src/components/universinid/ui/`) e as classes interativas `.uni-*` **não garantem** alvo de toque mínimo
nem foco de teclado visível consistente — dívida de a11y registrada desde a Fase de Design. Se o padrão
não for fixado **antes** das ondas, cada feature replica botões fora do padrão e o retrabalho se multiplica
por ~10 telas. Daí o veredicto **hardening-first, cirúrgico**.

## Objetivo

Garantir que **todo elemento interativo do UniversiNID tenha alvo de toque ≥44×44px e foco de teclado
visível e consistente**, virando o default herdado por toda UI futura — sem regressão e sem tocar áreas
protegidas.

## Escopo

### IN — o que faremos
- [ ] Token novo `--touch-min: 44px` em `src/app/universinid/universinid.css`.
- [ ] Primitivos `src/components/universinid/ui/`: `button`, `input`, `select`, `textarea` + botões-ícone →
  área clicável `min-height`/`min-width` ≥ `--touch-min` + `:focus-visible` usando `--focus-ring`.
- [ ] Classes interativas `.uni-*` em `universinid.css`: `.uni-cmd-item`, `.uni-stat` (tile clicável),
  `.uni-back`, `.uni-k` → mesmo tratamento (44px + `:focus-visible`).
- [ ] **Escopo expandido (decisão do dono 2026-06-26, registrada no `/nid:gate`):** a leitura linha-a-linha do
  código revelou mais superfícies interativas <44px do que as 4 acima. Por decisão do dono ("cobertura WCAG
  completa + varredura final"), entram TAMBÉM no escopo: `DialogClose` (primitivo `ui/dialog.tsx`), `.uni-btn`,
  `.uni-nav`, `.uni-acct-item`, `.uni-pick`, `.uni-tab` → mesmo tratamento (44px). **Já conformes (sem ação):**
  `.uni-av` (44×44), `.uni-stat` (≈63px), `textarea` (≥80px). **Exceção consciente:** `Button` variante `sm`
  fica compacto (WCAG 2.5.8 — alvos inline em UI densa de admin/mouse), `min-h` só no `md`. Detalhe em
  `docs/superpowers/plans/2026-06-25-universinid-fase10-hardening-a11y.md` §Decisão de escopo.
- [ ] Foco escopado para **não vazar** para o login (`.uni-login`, sem ancestral `.uni-shell`).

### OUT — o que NÃO faremos (anti scope-creep)
- Auditoria de contraste (texto/ícone AA) — **pass próprio** futuro; a Fase de Design já calibrou AA
  (navy 10.56:1, green-text 6.28, muted 4.80, red 5.76).
- Links de conteúdo dentro do `RenderBlocks` (conteúdo autorado).
- Endurecimento da CSP base (frente paralela, independente da UI).
- Qualquer toque em `globals.css`, rotas-raiz (`/`, `/sistema-solar`), `schema.prisma` ou CSP (`middleware.ts`).

## Decisões (fechadas no /nid:specify — 2026-06-25)
- **D1 — Alvo:** **44×44px** (WCAG 2.5.5). Alinha com o padrão chão-de-fábrica/tablet do apontdelp.
- **D2 — Foco:** reusar o token **`--focus-ring` (`2px solid #213D75`)** via `:focus-visible`, com
  `outline-offset`; **escopado** para não atingir `.uni-login`.
- **D3 — Escopo:** primitivos `ui/*` **+** classes `.uni-*` principais (`.uni-cmd-item`, `.uni-stat`,
  `.uni-back`, `.uni-k`). Não inclui links de conteúdo.
- **D4 — Mecanismo:** **valor centralizado** (`--touch-min`) aplicado **explicitamente** em cada
  primitivo/classe — **sem seletor global** que possa inflar elementos não-interativos (ethos "explícito
  > esperto"). (Abordagem A do design; abordagem B "regra global" descartada.)
- **D5 — Contraste:** **fora** desta fase.
- **D6 — Prova:** verificação **visual no preview** (medir alvos no DevTools + navegação por teclado para
  ver o foco) — o jsdom não calcula layout, então não há teste unitário de tamanho; o que é automatizável é
  a presença de `min-size`/classes no CSS do build.

## Critérios de sucesso
- Todos os alvos do escopo IN com **≥44×44px**, medido no preview (mockup aprovado já demonstra a régua e o
  leitor de tamanho — http://localhost:4310, 2026-06-25).
- `:focus-visible` **visível e consistente** em todos os interativos, **incluindo o login**, sem vazar para
  `.uni-login`.
- **0 regressão visual**: sidebar, linha de stats, login, e viewport estreito intactos.
- Gate técnico verde: `npm run test` + `npx tsc --noEmit` + `npm run build`.

## Stack proposta
UniversiNID web (Next 15 App Router, React 19, Tailwind 3.4, primitivos hand-roll sobre Radix). CSS só em
`universinid.css` (regra #7). **Zero dependência nova, zero mudança de CSP, zero mudança de schema.**

## Stakeholders
- Sponsor / dono do quadro: Henrique Emiliano
- Usuário final: aluno do UniversiNID (tablet e desktop)
- Responsável NID: Henrique Emiliano

## Riscos identificados
- **R1 — 44px estica layouts densos** (sidebar, linha de stats) → mitigação: verificação visual por
  superfície + viewport estreito no gate.
- **R2 — `:focus-visible` vaza para o login** (`.uni-login` não tem ancestral `.uni-shell`) → mitigação:
  escopar o seletor; cobrir o login no smoke (`scripts/smoke-universinid.mjs` já tem o cenário de login).
- **R3 — "cirúrgico" vira refactor amplo dos primitivos** → mitigação: limitar a edição a `min-size` +
  ring; não reestruturar componentes (valor centralizado + aplicação explícita).
- **R4 — falso-verde no gate** (jsdom não mede 44px) → mitigação: a prova de tamanho é manual/visual no
  preview, declarada como tal; testes automatizados cobrem só presença de classes/min-size.

## Próximo passo
`/nid:plan` — plano técnico com tarefas (TDD onde aplicável), **lendo os primitivos `ui/*` linha a linha**
para os steps de código real, e o gate de saída. Depois `/nid:gate` (pode ser leve — hardening mecânico) →
reescrever `especificacoes/2-fila/FASE-10-hardening-a11y/SPEC.md` no TEMPLATE A.

---
date: 2026-06-18
spec: docs/superpowers/specs/2026-06-18-universinid-design-system.md
status: implementado
gate_aprovado_em: 2026-06-18 (GO após 2 rodadas de red-team; aprovação humana do dono do quadro)
implementado_em: 2026-06-23 (Fases 1–6; gate de saída adversarial GO 5/5 lentes; build+tsc+test 186/186; next start CSP OK; aguardando aprovação visual do dono)
decisao_ia: RESOLVIDA — catálogo completo na Sidebar; home foca a Trilha do módulo atual
tipo: web
fase_quadro: FASE-DESIGN (antes da FASE-09)
revisao: 3 (pós 2º red-team — gate de cor vira DENYLIST; IA da home explicitada)
---

# Plano: UniversiNID — Design System + UI Overhaul

> Spec: [2026-06-18-universinid-design-system.md](../specs/2026-06-18-universinid-design-system.md). Mockup-alvo: `.superpowers/brainstorm/1597-1781811789/content/home-combinado.html`.
> **Rev. 2:** incorpora o red-team `wf_5afdf48d-d4a` (3 lentes): primitivos `ui/`, CommandPalette, grep de cor abrangente, reuso do `d.trilha` existente, verde-texto AA, semântica da trilha, avatar 44px, estados de borda, foco.
> **Rev. 3:** fecha o 2º red-team `wf_433807ef-e00`: gate de cor vira **DENYLIST** (qualquer hex fora da paleta — pega a família roxa/lilás/âmbar pervasiva, incl. `#1d1840`/`#5e5b7a`/`#b3720f`); home deixa de ser "puramente visual" (a trilha substitui a vitrine → mudança de IA, catálogo na sidebar, a confirmar com o dono); `outline:none` do CommandPalette explícito. **Gate obrigatório** antes de implementar.

## Contexto técnico

Mudança **visual** (não toca dados/lógica/CSP/landing/kiosk) **+ uma mudança de IA na home**: a Trilha do módulo atual substitui a vitrine de cards que hoje lista a árvore inteira — o **catálogo completo migra para a Sidebar** (que já o lista). É a única mudança de comportamento; **a confirmar com o dono** (alternativa de baixo risco: manter a vitrine completa abaixo da trilha). Identidade: **marinho Mooring `#213D75`** + **Barlow** + **neutros** + **Delp Red `#CC0F10`** (CTA) + **verde** (sucesso); aposenta roxo `#3C3489`/`#534AB7`/âmbar.

**Arquivos-âncora (verificados contra o código real):**
- CSS: `src/app/universinid/universinid.css` (única folha; rule 7).
- Casca: `(app)/layout.tsx`, `components/universinid/{Topbar,Sidebar,ShellChrome,CommandPalette}.tsx`.
- **Primitivos:** `components/universinid/ui/{button,input,select,textarea,dialog}.tsx` (roxos hardcoded — base de admin+quiz).
- Home: `(app)/page.tsx` (hoje **ignora** `d.trilha`) ← `getDashboardData` ← `buildDashboard` (`dashboard.ts` **já produz `trilha`**; `dashboard.test.ts:93-118` ancora).
- Lição: `(app)/licao/[slug]/page.tsx`, `RenderBlocks.tsx`, `QuizClient.tsx` (roxos inline), `admin/QuizBlock.tsx`.
- Login: `(app)/(auth)/login/{page,LoginForm}.tsx` *(âncora corrigida)*.
- Admin: `(app)/admin/AdminUsers.tsx`, `admin/{ContentTree,AdminTabs,LessonEditor}.tsx`, `admin/quizzes/QuizResults.tsx`.

**Regras inegociáveis:** CSS só em `universinid.css`; **cores SEMPRE via `var(--token)`/classe `.uni-*` — proibido valor cromático arbitrário inline (`text-[#hex]`/`bg-[#hex]`)**; Tailwind inline só para layout/espaçamento · **NUNCA** `globals.css`/rotas-raiz/landing/kiosk · não alterar `User`/`LessonProgress`/slug/schemas · render por whitelist (sem `dangerouslySetInnerHTML`) · **sem dep/CDN nova** (ícones SVG inline; CSP `connect-src 'self'`) · **WCAG 2.2 AA** · pt-BR · `git add` explícito.

**Gate de cor — DENYLIST, não allowlist (regra primária do fechamento 6.3):** falha = **qualquer cor hex fora da paleta APROVADA** presente em `.tsx/.ts/.css` de `src/app/universinid` + `src/components/universinid` (excl. landing). Paleta aprovada (única permitida): marinho `#213D75`/`#2A4C8C`/`#EAEEF6` · neutros `#F4F2EE`/`#FFFFFF`/`#E7E2DA`/`#1E1E22`/`#6E6A66`/`#F7F5F1` · Delp Red `#CC0F10` · verde `#0B861D`/`#0A701A` · foco. Cor **só via `var(--token)`/`.uni-*`** — nenhum `[#hex]` arbitrário. Família roxa/lilás/âmbar a eliminar (exemplos **não-exaustivos**, NÃO usar como lista fechada): `#3C3489 #534AB7 #5b51a8 #2a2550 #1d1840 #5e5b7a #5e5b80 #e2e0f0 #7a6ff0 #6a3fb0 #cdbffb #6b6890 #4a4770 #f0eeff #f3f2fb #e7e5f4 #d9d6ee #ececf6 #faf9ff #f5f4ff #dd8f1a #8a5a00 #b3720f #ffd9a0` · `rgba(20,15,46) rgba(60,52,137) rgba(29,24,64)` · `--p/--pm/--pl/--org`.

**Decisão de IA (home) — RESOLVIDA (dono confirmou 2026-06-18):** o catálogo completo **permanece na Sidebar** (já lista toda a árvore) + uma entrada "Trilhas"; a **home foca no módulo atual** (trilha). Nada é escondido. (Alternativa "vitrine abaixo da trilha" foi descartada.)

**Verificação:** é visual → evidência = **preview/screenshot + axe-core + 180 testes verdes**; só o estado "atual" da trilha é lógica (TDD).

---

## Fases e tarefas

### Fase 1 — Fundação (tokens + ícones + casca + primitivos) — bloqueia tudo

**Tarefa 1.1 — Tokens + foco + verde-texto em `universinid.css`**
- Agente: `nid-frontend-engineer` (revisão `nid-accessibility-engineer`)
- O que faz: marinho + neutros + escala (§4.1). **`--green-text:#0A701A`** (texto verde AA ≈5.1:1; `--green:#0B861D` fica só p/ ícone/fill — 3:1). **Tokens de foco:** `--focus-ring:2px solid #213D75; --focus-offset:2px`. `.uni-stat.acc` → `--navy`. Aposenta roxo/âmbar.
- Evidência: `build` ok; **contrastes documentados** (navy/branco 10.6:1, verde-texto/`--bg`, muted/`--bg` 4.8:1, Delp Red/branco 5.76:1) — todos ≥AA; grep zero `--p/--pm/--pl/--org` no css.
- Depende de: nenhuma

**Tarefa 1.2 — Ícones SVG inline (`Icon.tsx`)**
- Agente: `nid-frontend-engineer`
- O que faz: `components/universinid/ui/Icon.tsx` com ~20–30 ícones de linha **extraídos do tabler.io (MIT) e embedados como paths JSX**. **NUNCA** importar `@tabler/icons-react` nem CDN.
- Evidência: `Icon` renderiza (nome inválido degrada); **grep zero `@tabler`/`cdn.jsdelivr`** em `.tsx/.ts`; `build` ok (bundle sem tabler).
- Depende de: nenhuma

**Tarefa 1.3 — Casca: Topbar + Sidebar + CommandPalette**
- Agente: `nid-frontend-engineer` (revisão `nid-accessibility-engineer`)
- O que faz: re-skin marinho+ícones na `Topbar` (**`.uni-av` 44×44** — círculo visual 34 via padding/flex), `Sidebar` (nav, item ativo tint + **`aria-current='page'`**, mantém `aria-label` do anel), e **`CommandPalette`** (overlay/hover/shadow inline roxos → neutros+marinho via tokens; **remove o `outline:none` inline do input** e aplica `:focus-visible` com `--focus-ring`).
- Evidência: preview (topbar, sidebar, **⌘K aberto**); avatar ≥44px no DevTools; foco/contraste AA; grep do CommandPalette sem roxo.
- Depende de: 1.1, 1.2

**Tarefa 1.4 — Primitivos `ui/` (base de admin + quiz)**
- Agente: `nid-frontend-engineer`
- O que faz: migra `ui/{button,input,select,textarea,dialog}.tsx` para os tokens — **primary=Delp Red**, secondary=outline-navy, ghost=tint marinho, **ring/foco=marinho** (`--focus-ring`), hover=tint marinho, bordas/sombras neutras. Remove todo roxo hardcoded (`#3C3489`/`#534AB7`/`#f0eeff`/`#ececf6`).
- Evidência: preview de um form + um dialog; `build`; grep zero roxo nos 5 arquivos.
- Depende de: 1.1. **Bloqueia 3.2, 3.3, 5.x** (consomem os primitivos).

### Fase 2 — Home com Trilha

**Tarefa 2.1 — Reusar `d.trilha` existente + estado "atual" (TDD)**
- Agente: `nid-backend-engineer`
- O que faz: **NÃO reescreve `buildDashboard`.** `dashboard.ts` já produz `trilha {moduloTitulo, licoes[].status}` (testado em `dashboard.test.ts:93-118`). Verifica se atende; se faltar o estado **"atual"** (1ª não-concluída, distinto de `IN_PROGRESS`), adiciona uma função pura derivando do `status` existente — **com TDD** e **mapeando conscientemente o impacto nos 2 testes existentes** (atualizar se estender o tipo).
- Evidência: testes de `dashboard` verdes (ou atualizados deliberadamente); teste do "atual" (1ª não-concluída; módulo 100% → sem atual; sem progresso → 1ª é atual).
- Depende de: nenhuma (paraleliza com Fase 1)

**Tarefa 2.2 — Home: hero editorial + stats + Trilha (a11y) + estados**
- Agente: `nid-frontend-engineer` (revisão `nid-accessibility-engineer`)
- O que faz: `(app)/page.tsx` consome `d.trilha` (hoje ignorado). Hero editorial + faixa de stats + **componente `Trilha`/`LessonNode`** (conector, anel SVG, 3 estados) substituindo o grid; **catálogo completo permanece na Sidebar** (decisão de IA). **A11y:** `<ol>/<li>`, **`aria-current='step'`** no nó atual, **texto/aria de estado por nó** ("Concluída/Em curso/Próxima" — não só cor/ícone), ícone `aria-hidden`. **+ empty-state** (módulo concluído / trilha vazia) **+ `loading.tsx`** (skeleton) da home. **Remove TODO roxo da home, incl. o inline `style={{color:'#3C3489'}}` do badge "EM CURSO".**
- Evidência: preview com dados reais; **axe-core sem violação serious/critical**; leitor de tela anuncia o estado; testes de `dashboard` seguem verdes; `build`.
- Depende de: 1.1, 1.2, 2.1

### Fase 3 — Lição + Quiz

**Tarefa 3.1 — Página de lição (leitura) — sem regressão do iframe legado**
- Agente: `nid-frontend-engineer`
- O que faz: refina `.uni-content` + barra (`licao/[slug]/page.tsx`). **Classes próprias para os chips da barra (`.uni-lesson-bar .chip`/`.met`)** — hoje herdam de `.uni-ls` por coincidência de cascata. **NÃO alterar `height/overflow` de `.uni-lesson`/`.uni-content`** (contêm o iframe legado). Não toca `RenderBlocks`.
- Evidência: preview de lição **LIMPA** (texto+imagem+embed) **e LEGADA** (iframe rola interno, topbar/sidebar fixas, sem scroll duplo); `build`.
- Depende de: 1.1, 1.2

**Tarefa 3.2 — `QuizClient` re-skin (a11y)**
- Agente: `nid-frontend-engineer` (revisão `nid-accessibility-engineer`)
- O que faz: tokens no quiz do aluno (opção selecionada marinho, **acerto/Aprovado com `--green-text` sobre wrapper branco** — não sobre `--bg`), CTA Delp Red. Remove roxos inline (`#5b51a8`/`#2a2550`/`#3C3489`/`#cfc8ea`). **A11y:** `aria-describedby` ligando questão→feedback; **opções com `min-height:44px`**. **Lógica/contrato intactos**.
- Evidência: **os testes da rota/quiz/RenderBlocks seguem verdes**; preview; axe; leitor anuncia feedback por questão; alvos ≥44px.
- Depende de: 1.1, 1.2, 1.4

**Tarefa 3.3 — `QuizBlock` (autoria) re-skin**
- Agente: `nid-frontend-engineer`
- O que faz: tokens no formulário de autoria.
- Evidência: preview no editor com lição **LIMPA**; round-trip intacto; `build`.
- Depende de: 1.1, 1.2, 1.4

### Fase 4 — Login

**Tarefa 4.1 — Login re-skin + foco**
- Agente: `nid-frontend-engineer` (revisão `nid-accessibility-engineer`)
- O que faz: em `(app)/(auth)/login/{page,LoginForm}.tsx` — gradiente roxo→marinho; **remove `outline:none` e adiciona `:focus-visible{ outline: var(--focus-ring) }`** (SC 2.4.11). Mantém responsivo.
- Evidência: preview desktop + viewport estreito; **foco visível** em todos os campos; contraste AA; `build`.
- Depende de: 1.1, 1.2

### Fase 5 — Admin + estados de borda

**Tarefa 5.1 — Usuários + chrome admin** · **5.2 — Conteúdo (ContentTree+dialogs)** · **5.3 — Quizzes + Editor chrome**
- Agente: `nid-frontend-engineer`
- O que faz: re-skin de `AdminUsers`/`AdminTabs`/tabela, `ContentTree`+diálogos, `QuizResults` + chrome do `LessonEditor` — **consumindo os primitivos já migrados (1.4)**. Não toca o BlockNote interno.
- Evidência: preview de cada tela; `build`.
- Depende de: 1.1, 1.2, **1.4**

**Tarefa 5.4 — Estados de borda escopados (`not-found`/`error`)**
- Agente: `nid-frontend-engineer`
- O que faz: cria `(app)/not-found.tsx` e `(app)/error.tsx` **escopados ao segmento universinid** (herdam a casca + `universinid.css`, **NÃO** o `globals.css`/404 global). O `notFound()` da lição passa a cair no visual novo.
- Evidência: preview do 404/erro no visual UniversiNID (não no 404 global); `git diff` confirma `globals.css` intacto.
- Depende de: 1.1, 1.2

### Fase 6 — Gate de saída

**Tarefa 6.1 — Auditoria a11y (axe-core)**
- Agente: `nid-accessibility-engineer`
- O que faz: **axe-core** nas rotas `/universinid`, `/universinid/licao/:slug`, `/universinid/(auth)/login`, `/universinid/admin` → **zero violação serious/critical**; pares de contraste documentados no PR (valores numéricos); `:focus-visible` presente em todos os controles; trilha com `aria-current`/estado textual.
- Evidência: relatório axe (violations vazio) + tabela de contraste.
- Depende de: Fases 1–5

**Tarefa 6.2 — Gate técnico + smoke visual**
- Agente: `nid-qa-engineer`
- O que faz: `build`+`tsc`+`test` (**verdes**) + smoke **contra `next start`** (gotcha do flight dev): login → home/trilha → **⌘K** → lição **LIMPA E LEGADA (iframe)** → quiz, **zero violação de CSP**. Screenshots das telas-chave.
- Evidência: outputs verdes + log smoke (zero CSP) + screenshots.
- Depende de: Fases 1–5

**Tarefa 6.3 — Code review final**
- Agente: `nid-code-reviewer`
- O que faz: **gate de cor por DENYLIST** (acima) — varre `.tsx/.ts/.css` (excl. landing) e **falha em QUALQUER hex fora da paleta aprovada**, não numa lista fixa; **proíbe `text-[#hex]`/`bg-[#hex]` arbitrário** (cor só via token/`.uni-*`); **zero `@tabler`/CDN**; `git diff` confirma `globals.css`/landing/kiosk/dados intactos; sem `dangerouslySetInnerHTML`/`any`; pt-BR.
- Evidência: relatório aprovado — lista de hex encontrados **vazia salvo os da paleta aprovada** (anexar a saída do grep).
- Depende de: 6.1, 6.2

---

## Estimativa (revisada)

| Fase | Tarefas | Estimativa |
|------|---------|------------|
| 1 — Fundação (tokens+ícones+casca+primitivos) | 4 | 1,75 dia |
| 2 — Home com Trilha (componente + a11y + estados) | 2 | 1,75 dia |
| 3 — Lição + Quiz | 3 | 1,25 dia |
| 4 — Login | 1 | 0,25 dia |
| 5 — Admin + estados de borda | 4 | 1,75 dia |
| 6 — Gate de saída | 3 | 1 dia |
| **Total** | **17** | **~8 dias** |

## Riscos técnicos

- **Cor órfã** → grep abrangente em `.tsx/.ts/.css` (alfabeto acima), zero-match como gate literal (6.3).
- **Superfícies esquecidas** → CommandPalette (1.3), primitivos `ui/` (1.4), 404/error (5.4), empty/skeleton (2.2) agora têm dono.
- **`d.trilha` já existe** → 2.1 reusa, não reinventa; impacto nos 2 testes mapeado.
- **Verde AA** → `--green-text:#0A701A` p/ texto; `#0B861D` só ícone/fill.
- **Iframe legado** → 3.1 não toca height/overflow; smoke cobre lição LEGADA (6.2).
- **Tailwind inline cromático** → proibido valor `[#hex]`; cor só via token (6.3).
- **Ícones** → SVG inline do tabler.io (MIT), sem dep/CDN; grep no gate.
- **Foco** → tokens `--focus-ring`; remove `outline:none` do login (4.1).
- **Gotchas herdados:** smoke contra `next start`; editor/telas com lição LIMPA; nunca 2 dev servers no mesmo `.next`.

## Gate obrigatório

**GO** após 2 rodadas de red-team + **aprovação humana concedida em 2026-06-18** → `/nid:implement` liberado. **Próximo passo: implementar a Fase 1** (tokens + ícones + casca + primitivos `ui/`) com checkpoint antes das fases seguintes. Ordem: Fase 1 antes de tudo; 1.4 antes de 3.2/3.3/5.x.

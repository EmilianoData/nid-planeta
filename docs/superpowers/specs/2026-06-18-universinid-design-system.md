# UniversiNID — Design System + UI Overhaul (Spec)

- **Data:** 2026-06-18
- **Projeto:** nid-planeta · branch `feature/nid-planeta`
- **Status:** ✅ **aprovada em 2026-06-18** (`aprovada`) — habilita `/nid:plan`.
- **Tipo:** web (design system + UI do UniversiNID) · **Fase de Design — a executar ANTES da FASE-09 (gamificação)**
- **Origem:** `/nid:specify` → `superpowers:brainstorming` com **companion visual** (mockups navegáveis em `.superpowers/brainstorm/1597-1781811789/content/`: `universinid-redesign.html`, `dashboard-directions.html`, `home-combinado.html`). 5 decisões visuais aprovadas pelo dono do quadro.
- **Continuação de:** FASE-08 (Quizzes) implementada; ver [feedback_aesthetic] (preferência refined-enterprise) — nota: a memória de estética era sobre a **landing/kiosk**, não o UniversiNID; aqui vale a norma institucional Delp.

> O UniversiNID foi construído **função-primeiro** (FASES 00→08): autenticação, autoria no-code,
> render, quizzes. O visual ficou mínimo (paleta roxa `#3C3489`, primitivos hand-roll, Tailwind
> inline) e **abaixo das expectativas**. Esta fase estabelece um **design system** e o aplica em
> todas as telas — para que a FASE-09 (gamificação) nasça no padrão, não exija outro redesign.

---

## 1. Contexto

Hoje o UniversiNID funciona, mas lê como "template competente": cor de marca **roxa `#3C3489`**
(fora da paleta institucional Delp), acento âmbar `#dd8f1a`, hierarquia/espaçamento/profundidade
incipientes, sem biblioteca de ícones (emoji/texto), componentes sem sistema. A tipografia **já é
Barlow** e o Delp Red `#cc0f10` **já aparece** como acento — então a base institucional está
parcialmente lá; o que falta é **identidade de cor conforme a norma + nível de acabamento (craft)**.

## 2. Objetivo

Estabelecer um **design system do UniversiNID** (tokens, escala tipográfica, ícones, componentes)
e **aplicá-lo em todas as telas**, elevando o produto de "template" para "produto Delp", dentro da
norma visual institucional — sem tocar dados, fluxo, landing/kiosk ou a CSP.

## 3. Decisões aprovadas (brainstorm visual 2026-06-18)

| # | Decisão | Valor |
|---|---|---|
| 1 | Direção de identidade | **Híbrido dentro da norma**: base institucional + 1 acento próprio escolhido na paleta Delp |
| 2 | Acento de marca | **Azul-marinho Mooring `#213D75`** (heróis, nav ativa, progresso, ícones, números) |
| 3 | CTAs / destaques | **Delp Red `#CC0F10`** (já é) · sucesso/conclusão **verde `#0B861D`** |
| 4 | Tipografia | **Barlow** (já é) — formaliza escala e pesos |
| 5 | Profundidade | **Design system aplicado** (tokens + componentes coesos), não só reskin |
| 6 | Linguagem de layout da home | **Sidebar + hero editorial + faixa de stats + Trilha/jornada** (combinação A+B+C; a trilha vira o esqueleto da FASE-09) |

**Aposenta:** roxo `#3C3489`/`#534AB7`/`#f0eeff` e âmbar `#dd8f1a` como cores de marca.

## 4. Design system (a definir em `universinid.css` + primitivos)

### 4.1 Tokens (`.uni-shell, .uni-login` `:root`)
- **Cor:** `--navy:#213D75` · `--navy-2:#2A4C8C` (gradiente do hero) · `--navy-l:#EAEEF6` (tint: nav ativa, ícone-tile, badges) · `--red:#CC0F10` (CTA) · `--green:#0B861D` (sucesso) · neutros `--bg:#F4F2EE` · `--card:#FFFFFF` · `--line:#E7E2DA` · `--ink:#1E1E22` · `--muted:#6E6A66` · `--soft:#F7F5F1`.
- **Tipografia (Barlow):** hero 1.7rem/800 · h1 1.5/800 · h2 1.3/700 · rótulo-de-seção .72/700 uppercase tracking .1em · corpo .95–1rem/400–500 · meta .72–.74. Pesos 400/500/700/800.
- **Espaço:** escala 4/8/12/16/24/32. **Raio:** 10 (controles) · 13–14 (cards) · 18–20 (hero). **Elevação:** sombras sutis navy-tinted — hover `0 8px 22px rgba(33,61,117,.10)`, hero `0 12px 34px rgba(33,61,117,.20)`.
- **Ícones:** conjunto curado de **SVGs de linha inline** (estilo Tabler, ~20–30 usados) — componente `Icon`/sprite, **sem dependência pesada** (CLAUDE.md: minimizar deps). NÃO usar CDN externo em produção (CSP `connect-src 'self'`).

### 4.2 Componentes (re-skin/criação em `src/components/universinid/ui/` + classes `.uni-*`)
Botões (primary=Delp Red, secondary=outline-navy, ghost), input/select/textarea, dialog, **card**, **stat-chip**, **hero editorial**, **trilha (lesson-node: estados concluído/atual/bloqueado + conector + anel de progresso)**, badge/chip, sidebar-nav-item, topbar, progress-bar, **empty-state**, **skeleton de carregamento**.

## 5. Aplicação por tela (escopo)

### IN — o que faremos
- [ ] **Tokens + reset** em `universinid.css` (aposenta roxo/âmbar; introduz marinho + neutros + escala).
- [ ] **Casca** (topbar + sidebar) re-skin marinho + ícones de linha.
- [ ] **Home/Dashboard** — nova linguagem: hero editorial + faixa de stats + **Trilha do módulo** (substitui o grid de cards atual). *(maior peça)*
- [ ] **Lição (`licao/[slug]`)** — leitura refinada (tipografia, breadcrumb, meta) + **`QuizClient` re-skinned** (opções marinho, correta verde, resultado).
- [ ] **`QuizBlock` (autoria)** — formulário no novo sistema.
- [ ] **Login** — trocar gradiente roxo→marinho; manter estrutura.
- [ ] **Admin** (Usuários, Conteúdo/ContentTree, Quizzes, Editor BlockNote) — tabelas, abas, dialogs, chrome no novo sistema.
- [ ] **Ícones** — set SVG inline curado, substituindo emoji/texto.

### OUT — o que NÃO faremos (motivo)
- Mudar **fluxo/UX/IA** além do visual e da home-trilha (*é overhaul visual, não de produto*).
- **Dark mode** (*app é light-only; YAGNI*).
- **Gamificação real** — medalhas/notícias são **FASE-09**; aqui só o **esqueleto visual** da trilha.
- **Landing 3D / kiosk `/`, `/sistema-solar`** e `globals.css` (*intocáveis — visual próprio aprovado*).
- Alterar **dados** (`User`/`LessonProgress`/slug, schemas) ou a **CSP**.

## 6. Critérios de sucesso
- Todas as telas do UniversiNID no novo design system; o dono **aprova visualmente** (sai do "simples demais").
- **Norma Delp atendida**: Barlow + paleta institucional (marinho ∈ paleta; Delp Red só em CTA/destaque; neutros de base).
- **Gate técnico verde**: `npm run build` + `npx tsc --noEmit` + `npm run test` (os 180 testes seguem passando — mudança é visual) + smoke sem violação de CSP.
- **Zero regressão**: landing/kiosk e `globals.css` intactos; render por whitelist mantido; **a11y WCAG AA** (contrastes do marinho/Delp Red verificados; foco visível; alvos ≥44px desejável).
- A **trilha** pronta para receber a FASE-09 (estados/nós já modelados).

## 7. Stack proposta
Tailwind 3.4 (utilitário inline, como já se faz no admin) + `universinid.css` escopado (tokens + classes `.uni-*`). Ícones SVG inline. Sem novas dependências pesadas. Render por Server/Client Components existentes.

## 8. Stakeholders
- **Sponsor / dono do quadro:** Henrique Emiliano. **Usuário final:** alunos (colaboradores Delp) + admin/instrutor. **Responsável NID:** Henrique Emiliano.

## 9. Riscos identificados
- **Escopo amplo (muitas telas)** → faseável no plano: (1) tokens+casca, (2) home/trilha, (3) lição+quiz, (4) admin. Cada fatia verificável em navegador.
- **Ícones inline** → curar um set mínimo; evitar dep/CDN (CSP). Mitigação: sprite SVG local.
- **Dados da trilha** (ordem/estado das lições do módulo) → já existem (`position` + `LessonProgress`); confirmar a query no plano (sem N+1, sem tocar contratos).
- **Regressão visual** em telas não-cobertas → checklist de telas + smoke + revisão.
- **Contraste WCAG** do marinho/Delp Red sobre os fundos → validar no `nid-accessibility-engineer`.

---

> **Próximo após aprovação:** `Status: aprovada` → `/nid:plan` (plano fatiado por tela com tokens primeiro) → `/nid:gate` → implementar. Mockups de referência em `.superpowers/brainstorm/1597-1781811789/content/`.

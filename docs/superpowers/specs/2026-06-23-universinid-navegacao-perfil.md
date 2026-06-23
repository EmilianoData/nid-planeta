---
date: 2026-06-23
status: aprovada
tipo: web
autor: henrique.emiliano
origem: review do dono pós Fase de Design (observações de navegação) → /nid:specify (brainstorm 2026-06-23)
decomposicao: Frente A de 2 (A = navegação + perfil [esta]; B = FASE-09 gamificação, pré-spec em especificacoes/2-fila/)
---

# Spec: UniversiNID — Navegação (menu da conta) + Página de Perfil

## Contexto

No review da Fase de Design (overhaul visual, já em preview), o dono observou que faltava
**navegação de "você/conta"**: não havia entrada visível para o **módulo admin** (hoje só via
⌘K ou digitando `/universinid/admin`), nem **página de perfil** do usuário, e o **avatar** da
topbar **desloga direto** ao clicar (sem menu). A casca atual é: **Sidebar à esquerda** =
catálogo (Curso→Módulo→Lição, navegável — `Sidebar.tsx`); **Topbar** = logo + busca ⌘K +
sequência + avatar (`Topbar.tsx`, avatar 44×44 que chama `signOut` no clique).

Decisão de IA do brainstorm (2026-06-23): **manter o catálogo à esquerda** e adicionar um
**menu da conta no canto superior direito** (no avatar), separando "conteúdo" (esquerda) de
"você/conta" (direita). Gamificação ("Minhas conquistas"), notícias e certificados são a
**Frente B (FASE-09)** — fora desta spec.

## Objetivo

Dar ao aluno/admin uma **navegação de conta clara**: um menu no avatar (Meu perfil · Admin
quando aplicável · Sair) e uma **página de perfil somente-leitura** com identidade + resumo de
progresso — sem tocar dados, fluxo de conteúdo, landing/kiosk ou CSP.

## Escopo

### IN — o que faremos
- [ ] **Menu da conta** (novo componente client `AccountMenu.tsx`, hand-rolled, **sem dep nova**):
  o avatar da topbar passa a **abrir um menu** (dropdown ancorado à direita) em vez de deslogar
  direto. Itens: **Meu perfil**, **Admin** (renderizado **só se `role === 'ADMIN'`**), **Sair**
  (o `signOut` atual migra para este item). A11y: botão com `aria-haspopup="menu"` +
  `aria-expanded`; container `role="menu"` com `role="menuitem"`; foca o 1º item ao abrir; **Esc**
  fecha e **devolve o foco ao avatar**; clique-fora fecha; `:focus-visible` com `--focus-ring`.
  Reaproveita os padrões já provados no `CommandPalette` (Esc + restauração de foco).
- [ ] **Página `/universinid/perfil`** (`(app)/perfil/page.tsx`, **Server Component** sob o layout
  logado que já faz o auth-gate): identidade **somente leitura** (iniciais no avatar, nome,
  e-mail, papel como badge) + **resumo de progresso** (% geral, lições X/Y, sequência/streak,
  módulos ativos) **reusando `getDashboardData()`** — **nenhuma query nova**. Link "Voltar ao
  início" (`.uni-back`).
- [ ] **CSS escopado** em `universinid.css`: classes `.uni-acct-*` (menu) e `.uni-profile*`
  (página), só com tokens da paleta marinho.
- [ ] **Avatar 44×44 preservado** (alvo de toque WCAG 2.5.8) — agora como gatilho do menu.

### OUT — o que NÃO faremos (motivo)
- **Edição de nome/senha** pelo usuário (*escrita em `User` é sensível; YAGNI nesta frente — perfil
  é só leitura por decisão do dono*).
- **Conquistas/medalhas, notícias, certificados** (*são a Frente B / FASE-09 — "spec separada,
  sempre"; o item "Minhas conquistas" entra no menu junto com a B, sem link morto agora*).
- **Mover o catálogo** para a direita ou criar 2º painel lateral (*decisão de IA: catálogo fica à
  esquerda + menu da conta à direita*).
- **Hambúrguer/menu mobile** e mudanças no **⌘K** (*fora do escopo; app é desktop-first*).
- **Tocar `globals.css`, landing (`/`), kiosk (`/sistema-solar`), CSP, `User`/`LessonProgress`/
  `slug`, schema** (*regras inegociáveis herdadas*).

## Critérios de sucesso
- Avatar abre o **menu da conta** (não desloga direto); **Sair** funciona como antes; **Admin**
  aparece **só** para `ADMIN` e some para `STUDENT`.
- `/universinid/perfil` renderiza identidade + resumo de progresso reusando os dados do dashboard,
  sem query nova; STUDENT e ADMIN acessam (rota sob o auth-gate do layout).
- **a11y WCAG AA**: menu navegável por teclado (abrir/Esc/foco), foco visível em todos os itens,
  contrastes na paleta marinho já validados; **axe-core sem violação serious/critical** nas
  rotas tocadas.
- **Zero regressão**: catálogo (Sidebar), ⌘K, lição (incl. iframe legado), quizzes e admin
  seguem funcionando; `globals.css`/landing/kiosk/CSP/`User`/`LessonProgress`/slug intactos.
- **Gate técnico verde**: `npm run build` + `npx tsc --noEmit` + `npm run test` (os ≥186 testes
  seguem passando — mudança é UI + 1 página de leitura) + smoke contra `next start`.

## Stack proposta
Tailwind 3.4 + `universinid.css` escopado (tokens `.uni-*`) + primitivos `ui/` existentes +
ícones SVG inline (`Icon.tsx` — `user`/`logout`/`settings`/`chevron-down` já disponíveis). Menu
**hand-rolled** (sem `@radix-ui/react-dropdown-menu` nem qualquer dep nova — CSP `connect-src
'self'`). Server Components para a leitura; client só no `AccountMenu`. Reuso de
`getDashboardData`/`getProgressMap` (`@/lib/universinid/actions`).

## Arquivos-âncora (verificados)
- `src/components/universinid/Topbar.tsx` (avatar → vira gatilho do menu).
- `src/app/universinid/ShellChrome.tsx` (passa `isAdmin`/estado; hospeda o `AccountMenu`).
- **Novo:** `src/components/universinid/AccountMenu.tsx` (client) e
  `src/app/universinid/(app)/perfil/page.tsx` (server).
- `src/lib/universinid/actions.ts` (`getDashboardData` retorna `DashboardData & { nome }`; reuso).
- `src/app/universinid/universinid.css` (classes novas `.uni-acct-*` / `.uni-profile*`).

## Stakeholders
- **Sponsor / dono do quadro:** Henrique Emiliano.
- **Usuário final:** alunos (colaboradores Delp) + admin/instrutor.
- **Responsável NID:** Henrique Emiliano.

## Riscos identificados
- **A11y do menu hand-rolled** (foco/Esc/clique-fora/teclado) → reusar os padrões do
  `CommandPalette` (focus-trap/Esc/restauração) + auditoria axe-core no gate.
- **Mudança de hábito do avatar** (era logout direto) → "Sair" fica como item claro do menu;
  rótulo/ícone explícitos.
- **Scope creep para FASE-09** (conquistas/medalhas) → explicitamente OUT; item "Conquistas"
  só com a Frente B.
- **Regressão na casca** (Topbar/ShellChrome são vivos) → só estilo/estrutura do avatar muda; a
  lógica de `signOut` é preservada (migra para o item "Sair"); cobertura por smoke.
- **Custo de query no `/perfil`** → reusa `getDashboardData` (já memoizado em `cache()` via
  `buscarLinhasProgresso`); sem N+1 nem query nova.

---

> **Próximo após aprovação:** `status: aprovada` → `/nid:plan` (plano técnico TDD onde aplicável,
> tarefas com evidência) → `/nid:gate` (GO) → `/nid:implement`. A Frente B (FASE-09) segue na
> fila com sua própria pré-spec.

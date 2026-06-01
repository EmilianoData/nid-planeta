# UniversiNID — Escopo Fase 2/3 + Visão "Plataforma de Treinamento" (Research / Scoping)

- **Data:** 2026-06-01
- **Projeto:** nid-planeta
- **Status:** Research consolidado — **insumo para brainstorm + `/nid:specify`** (NÃO é spec aprovada)
- **Origem:** workflow de verificação (4 verificadores paralelos + síntese) sobre a visão do usuário
- **Fonte da verdade da Fase 1:** `docs/superpowers/specs/2026-05-29-universinid-plataforma-fase1-design.md`

> Visão do usuário (verbatim): página de treinamento sem rolagem padrão; home tipo "site de
> treinamento" (treinamentos disponíveis + notícias de tech + medalhas); barra de módulos à
> esquerda; **criar módulos novos sem precisar codar**; níveis básico/médio/avançado; módulos
> por **tipo de IA**; "deixar robusto". Pergunta: faz parte de alguma fase ou precisa incrementar?
> Precisa baixar repositórios de referência?

---

## 1. Mapeamento item-a-item

| Item da visão | Classificação | Build status | Observação |
|---|---|---|---|
| Página principal do usuário | **Fase 1 — já existe** | exists | Dashboard `(app)/page.tsx`. É página de **progresso**, não "home portal". Enriquecer, não recriar. |
| Barra de navegação por módulos (esquerda) | **Fase 1 — já existe** | exists | `Sidebar.tsx` itera `CATALOGO` por módulo, com anéis de progresso. Atende. |
| Níveis básico/médio/avançado | **Misto** | exists (taxonomia) | `type Dificuldade` em `catalogo.ts`, já renderizado. **Criar/editar níveis sem codar NÃO existe.** |
| Conteúdo navegável com rolagem padrão | **Fase 2 — sem spec/código** | specced-not-built | Objetivo do "conteúdo nativo" (HTML→MDX). É o *proper fix* do scroll. |
| Home portal: catálogo/browse de treinamentos | **Misto** | specced-not-built | Dados existem (`CATALOGO`), mas vitrine/rota de browse dedicada não. Incremento de UI. |
| Medalhas por concluir treinamento | **Fase 3 — sem spec/código** | specced-not-built | Gamificação. A Fase 1 removeu o stat "Badges" do mockup de propósito. |
| Notícias de tech na home | **NET-NEW — sem fase** | not-specced | Modelo `NewsPost` + UI. Não está em nenhuma fase. |
| **Criar módulos/níveis/lições sem codar** | **NET-NEW — sem fase** | not-specced | **Conflito estratégico central** (§2). Hoje hardcoded; admin só gere usuários. |
| Taxonomia "por tipo de IA" | **NET-NEW — sem fase** | not-specced | Nova dimensão. Cai no mesmo net-new da autoria no-code. |

**Veredito:** a maior parte é **puxar para frente** Fase 2 (conteúdo rolável) e Fase 3 (medalhas), que existem como bullets mas **sem spec nem código**. Três itens **já existem** (dashboard, sidebar, taxonomia de níveis) e só pedem enriquecimento. Dois são **genuinamente NET-NEW**: notícias de tech e — crítico — **autoria no-code**.

---

## 2. Conflito estratégico central — autoria no-code × MDX-em-arquivos

"Criar módulos sem codar" exige conteúdo no **banco + UI de autoria**. A Fase 2 specada é o oposto: **MDX em arquivos versionados** (spec: "metadados vivem no catálogo em código, não no banco"; schema só tem `User + LessonProgress`). São arquiteturas opostas.

> **A Fase 2 NÃO pode ser construída como está especificada enquanto a arquitetura de autoria não for decidida.**

| Opção | Entrega | Trade-off |
|---|---|---|
| (a) CMS git-backed (Keystatic/TinaCMS) | UI de autoria mantendo arquivos versionados | Mantém espírito da spec; semi-no-code |
| (b) Conteúdo no banco + editor | No-code de verdade | Contraria a spec; novo schema + CRUD (esforço **XL**) |
| (c) **Híbrido (recomendado)** | `body` único + discriminador `contentType` (iframe/mdx/blocos) | Mantém iframe legado por slug na transição, entrega MDX e abre porta p/ editor de blocos sem nova migração |
| (d) **Payload CMS** (avaliar) | Admin CRUD no-code + editor + upload de mídia + RBAC prontos, Next+Postgres-native | Pode duplicar o NextAuth v5 existente; runtime/admin próprio |

### Modelo de dados proposto (migração de `catalogo.ts` → banco)
- `Module` (slug único, titulo, emoji, ordem, status draft/published) 1—N `Lesson`
- `Lesson` (slug único **semeado com os 39 slugs atuais**, moduleId, ordem, tempoMin, dificuldade, status, `contentType` discriminador, `screenId` anulável, `body` anulável) N—N `Category`
- `Category` (tipo de IA; slug, nome, ordem) — navegável/filtrável
- `Level` (opcional) — só vira tabela se admin precisar criar níveis novos; senão o enum basta
- `Badge` + `UserBadge` (Fase 3)
- `NewsPost` (feed de tech)

### ⚠️ Hazard crítico de migração (preservar progresso)
`LessonProgress.lessonSlug` é **String solta** (sem FK), unique `(userId, lessonSlug)`. O progresso é um **join-por-valor pelo slug**.
- **Semear `Lesson` com os 39 slugs atuais ANTES de qualquer FK** → progresso preservado com zero transformação.
- **NÃO** migrar progresso para um `lessonId` cuid (quebraria o contrato de slug estável).
- Hoje o slug é imutável (autorado por dev). **Com admins editando lições, um rename orfana todo o progresso em silêncio.** Mitigação obrigatória: **slug imutável após a 1ª publicação** OU rename atualiza `LessonProgress` na mesma transação.
- `screenId` anulável coexiste com `body` → migração lição-a-lição (iframe→MDX) sem perder progresso.

---

## 3. Bug de scroll na página de treinamento

**Causa-raiz (duas somadas, confirmadas no código):**
1. Conteúdo da lição está dentro de `<iframe>` (`/universinid.html?embed=1`); o scroll é **delegado ao documento interno** e o iframe colapsa para `min-height:70vh` sem altura travada. `(app)/licao/[slug]/page.tsx` + `.uni-frame` em `universinid.css:66`.
2. `globals.css:11` tem `body { overflow: hidden; overscroll-behavior: none }` **global** (feito para a cena 3D da landing) — trava a rolagem de toda a app, inclusive `/universinid`. (A casca `.uni-shell` NÃO trava — usa `min-height:100vh` sem `overflow:hidden`.)

| | Interim (Fase 1, agora) | Definitivo (Fase 2) |
|---|---|---|
| Estratégia | Só CSS/layout, mantém iframe | Remove o iframe; conteúdo MDX/React nativo |
| `globals.css` | Escopar `overflow:hidden` só à landing (classe `body.scene-lock`) **ou** toggle client no layout do universinid | Idem (consistência) |
| `.uni-frame` | `height: calc(100vh - 56px - 58px)` + `min-height` (evitar `height:auto`) | Eliminado |
| Flex | `min-height:0` em `.uni-body` / `.uni-lesson` | — |
| Resultado | Rolagem volta (trapped no iframe, funcional) | Rolagem padrão do documento; habilita dark mode/notas/quizzes |

> ⚠️ Coordenação: o fix interim toca `globals.css` (compartilhado com a landing, que tem trabalho em andamento). Preferir variante **escopada ao `/universinid`** (toggle de overflow no mount do layout logado) para não interferir na cena 3D / trabalho de landing em aberto.

---

## 4. Tooling / referências — precisa baixar repositórios? **NÃO**

- **Não clonar nada.** LMS pesado (Moodle/Open edX) = stack incompatível, net-negativo. Exemplos de CRUD também não: **`c:\dev\apontdelp` é a referência interna completa.**
- **Reutilizáveis do `apontdelp`** (caminhos confirmados):
  - `src/lib/api-utils.ts` — `withAuth(roles)`, `apiResponse/apiError/validationError`, `apiPaginatedResponse`
  - `src/lib/rbac.ts` — RBAC, `ROUTE_PERMISSIONS`, `hasPermission`
  - `src/middleware.ts` + `src/lib/auth.config.ts` — middleware NextAuth v5 por role
  - `src/lib/validators/common.ts` (+ pasta `validators/`) — Zod por entidade
  - CRUD admin de referência: `src/app/(dashboard)/configuracao/deduction-config.tsx` + `src/app/api/deductions/[id]/route.ts` (toggle/DELETE com `withAuth`)
  - `config-tabs.tsx` — admin por abas (Módulos/Lições/Níveis/Badges)
  - `src/components/ui/` — **shadcn/ui pronto para portar** (nid-planeta hoje não tem `components/ui`)
  - Stack comprovada: `@tanstack/react-query`, `zustand`, `sonner`, `next-themes` (dark mode), `@hello-pangea/dnd` (reordenar lições)
- **Único item externo real:** **1 dependência npm de editor** (stack tem **zero** rich-text/MDX). Candidatos: **BlockNote** (Notion-like, no-code real), **Tiptap** (mais controle), Lexical/Plate. **Decisão de spec.**
- **Avaliar Payload CMS** como candidato de arquitetura (não conclusão).
- **Skills:** `nid-*` + superpowers + frontend-design **bastam para construir** (mecânica), mas **não cobrem o domínio LMS/CMS nem a autoria no-code**. **`nid-universinid-author` está OBSOLETA** — atrelada ao pipeline estático legado (`docs/universinid → build_universinid.py → universinid.html`) que **nem existe neste repo**. Aposentar/reescrever via `/nid:skill-create`.

---

## 5. Próximo passo recomendado

O que falta **não é tooling — é uma decisão de arquitetura de conteúdo.** Antes de qualquer build:

1. **`superpowers:brainstorming`** sobre autoria: **editor-lib sobre Prisma/NextAuth atual** (híbrido `contentType`) **vs Payload CMS**; MDX-em-DB vs editor de blocos.
2. **`/nid:specify` de uma Fase 2 re-escopada**, com a decisão de autoria resolvida: schema novo + migração de `catalogo.ts`; contrato de slug estável (semear 39 slugs, slug imutável pós-publicação); remoção do iframe (proper fix do scroll) + escopo do `overflow:hidden`; home portal (browse + níveis + categorias por tipo de IA); notícias de tech.
3. **Spec separada de Fase 3** (gamificação: badges/medalhas/certificados).

**Independente disso:** aplicar já o **interim_fix de CSS do scroll** (§3) — destrava o usuário.

---
date: 2026-06-03
status: aprovada
aprovada_em: 2026-06-03
tipo: web
autor: Henrique Emiliano + Claude
---

# Spec: UniversiNID — Fase 2a (Autoria no-code de conteúdo)

- **Projeto:** nid-planeta · branch `feature/nid-planeta`
- **Continuação de:** Fase 1 (fechada) — `2026-05-29-universinid-plataforma-fase1-design.md`
- **Decisão de arquitetura (aprovada 2026-06-03):** `2026-06-02-universinid-fase2-arquitetura-decisao.md` + ADR-0001
- **Brainstorm + pesquisa de arquitetura:** JÁ FEITOS e aprovados (não reabertos nesta spec)

> Esta spec transcreve decisões **já fechadas** e aterra os detalhes da 2a. Os 4 pontos de produto
> e o veredito de arquitetura (híbrido BlockNote, não Payload) foram decididos no doc de 2026-06-02.

> **Refinado pós-grounding (2026-06-03)** — após ler os dois codebases (nid-planeta Fase 1 + molde do `apontdelp`),
> 4 ajustes de **encoding** (a hierarquia Course→Module→Lesson e o no-code seguem iguais; serão ratificados no `/nid:gate`):
> 1. **Blocos:** sem tabela `Block`. O documento BlockNote é persistido como **`Lesson.contentDraft Json?` + `Lesson.contentPublished Json?`** (BlockNote já é um doc; linha-por-bloco não traria query alguma e dissolve o risco #4 de N+1).
> 2. **Ordenação:** `position Int` (padrão do `apontdelp`: cliente envia a ordem, server faz bulk-update em `$transaction`) em vez da lib `fraci` — escala de admin não justifica a dependência.
> 3. **UI:** **não** portar shadcn 1:1 (apontdelp usa Tailwind 4; nid-planeta usa Tailwind 3.4) — **hand-roll** de ~5 primitivos sobre `universinid.css` + Radix unstyled (version-agnostic). BlockNote dona a superfície do editor.
> 4. **Scroll:** o fix **não** vem sozinho — `body{overflow:hidden}` (global, do kiosk) exige um container `overflow-y:auto` **escopado** em `universinid.css` (sem tocar `globals.css`). Vira tarefa explícita.
>
> Consequência: `isomorphic-dompurify` **adiado** (o render por whitelist emite elementos React, não HTML → sem `dangerouslySetInnerHTML`; defesa = allowlist de host em URLs de embed/imagem no write-time + CSP).

---

## Contexto

Hoje o conteúdo do UniversiNID vive num **único arquivo HTML estático** (`public/universinid.html`,
~6.451 linhas) embutido por **iframe** em cada lição. Consequências mensuráveis da dor atual:

- **Editar 1 lição = editar HTML à mão** num arquivo de 6.451 linhas + re-deploy. Não há autoria no-code.
- **39 lições presas em iframe** → bug de scroll, sem edição estruturada, sem busca no conteúdo.
- A Fase 1 entregou login + backend + **progresso keyed por `slug`** (39 chaves vivas em `LessonProgress`),
  mas o conteúdo continuou congelado em HTML.

A visão de produto evoluiu para **plataforma de treinamento** onde o ADMIN **autora sem codar**
(texto, imagem, vídeo embed; quiz depois). Isso exige conteúdo **no banco** + um **editor de blocos**.

## Objetivo

Permitir que o ADMIN crie e edite **Curso → Módulo → Lição** com conteúdo rico (texto, imagem, vídeo
embed) por um **editor no-code estilo Notion (BlockNote)** e publique **sem tocar em código** —
preservando **100% do progresso** dos 39 slugs atuais e eliminando o iframe (e seu bug de scroll)
de forma incremental.

## Escopo

### IN — o que faremos
- [ ] Schema Prisma **`Course → Module → Lesson`** no mesmo Neon (sem 2º banco); conteúdo em `Lesson.contentDraft/contentPublished Json` (sem tabela `Block`).
- [ ] Migração dos **39 slugs**: semear como `Lesson` **antes de qualquer FK** → cada lição vira **1 bloco "embed legado"** → decompor **lição-a-lição** em blocos ricos.
- [ ] Tabela **`LessonSlugAlias`** + `Lesson.slug` **imutável na UI** (blindagem do risco #1).
- [ ] **Admin CRUD** (só ADMIN): cursos/módulos/lições — criar, editar, excluir, **reordenar (`position Int` + `$transaction`)**, **DRAFT/PUBLISHED**.
- [ ] **Editor BlockNote**: blocos **texto, imagem (upload), vídeo (embed)**; doc BlockNote (JSON tipado) salvo **inteiro** por lição.
- [ ] **Render no servidor por whitelist** (`renderToReactElement`, estilo Tiptap Static Renderer) — **sem `dangerouslySetInnerHTML`**; bloco de tipo desconhecido **degrada (skip+log)**.
- [ ] **Upload de imagem → Vercel Blob** (server-upload ≤4,5MB; client-upload acima).
- [ ] **Vitrine + sidebar** com o nível **Course → Module → Lesson** (um nível a mais que hoje).
- [ ] **Remoção do iframe lição-a-lição** conforme decomposição → **scroll nativo**.
- [ ] **Defesa XSS write-time**: allowlist de host em URLs de embed + `http(s)`-only em `href`/`src` (Zod) + **CSP** (no middleware). `isomorphic-dompurify` adiado (render emite React, sem HTML cru).

### OUT — o que NÃO faremos (anti-scope-creep)
- **Payload CMS** — descartado por bloqueio de runtime + custo ≫ ganho (ver ADR-0001).
- **Quizzes** — Fase 2b (modelo deixa a porta aberta via bloco custom).
- **Badges / medalhas / certificados / notícias de tech** — Fase 3 (spec separada).
- **Entidade `Category` / filtro "tipo de IA"** — **subsumida pelo `Course`** (mesmo eixo de agrupamento). Tags ortogonais só no futuro, se houver filtro transversal real.
- **Autoria por instrutores não-admin** — futuro; modelar posse de forma **aditiva**, mas só ADMIN agora.
- **Version-history completa** — só `DRAFT/PUBLISHED` + coluna de snapshot publicado.
- **Upload de vídeo** — embed-only (YouTube/Vimeo/Stream).
- **Azure Blob** — só com mandato do TI (OIDC→Azure workload identity; nunca Managed Identity).
- **Rename de slug na UI** — imutável (escape hatch é `LessonSlugAlias`, não a UI).
- **Mexer no `globals.css`** para o scroll — o fix vem de graça ao remover o iframe.

## Critérios de sucesso
- **Autoria no-code:** ADMIN cria um curso novo (módulo + lição + 3 tipos de bloco: texto, imagem, vídeo), publica e vê no portal — **0 linhas de código/HTML editadas**. Antes: impossível sem editar HTML → Depois: 100% pela UI.
- **Progresso preservado:** os **39 slugs** continuam resolvendo `LessonProgress` após a migração → **0 progresso órfão** (verificável por seed + query).
- **Scroll:** toda lição **decomposta** (sem iframe) rola nativamente → **0 lição decomposta** com bug de scroll.
- **Segurança:** **0 `dangerouslySetInnerHTML`**; embed sanitizado no write-time; bloco desconhecido **degrada sem derrubar a página** (coberto por teste).
- **Qualidade:** `npm run build` passa; testes Vitest de CRUD + migração + render verdes (**TDD — teste falha primeiro**).

## Stack proposta
Híbrido sobre o stack da Fase 1 (ver ADR-0001 e reuso do `apontdelp`). **Já instalado:** Next 15.5.15, React 19, Prisma 7.8 + adapter-pg + Postgres/Neon, NextAuth v5, Zod 3, Zustand 5, Vitest 4, Tailwind **3.4**.
**A instalar:** `@blocknote/react` + `@blocknote/core` (editor, MPL-2.0, React 19 OK) · `prisma-json-types-generator` (tipar o Json do conteúdo) · `@vercel/blob` (upload de imagem) · `@tanstack/react-query` + `sonner` (admin interativo, padrão do apontdelp) · `@radix-ui/react-dialog` (+ `react-select` se preciso), `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react` (primitivos hand-roll).
**Descartados/adiados:** `fraci` (usar `position Int`), `isomorphic-dompurify` (adiado — render por whitelist React + allowlist de URL), shadcn 1:1 do apontdelp (Tailwind 4 ≠ 3.4).

## Modelo de dados (resumo — detalhar no `/nid:plan`)

| Entidade | Campos-chave | Notas |
|---|---|---|
| **Course** *(NOVO)* | `id`, `title`, `slug`, `position Int`, `status` DRAFT/PUBLISHED | Trilha que agrupa módulos. Reordenável por `position`. |
| **Module** | `id`, `courseId` (FK), `title`, `emoji`, `position Int`, `status` | Era raiz; agora filho de `Course`. |
| **Lesson** | `id`, `moduleId` (FK), `slug` **único+imutável**, `title`, `tempoMin`, `dificuldade` enum, `position Int`, `status`, **`contentDraft Json?`**, **`contentPublished Json?`** | `slug` = chave estável de progresso. O doc BlockNote vive nas 2 colunas Json (draft = admin edita; published = aluno lê). |
| **LessonSlugAlias** *(NOVO)* | `oldSlug` (PK), `lessonId` (FK) | Escape hatch p/ risco #1 — resolve slug antigo → lição. |
| **LessonProgress** | **INTACTO** — `@@unique([userId, lessonSlug])` | Join-por-valor pelo `lessonSlug`; `Course` não toca a chave. |

- **Sem tabela `Block`** — o documento BlockNote (array de blocos `text \| image \| embed \| legacy-embed`; `quiz` na 2b) é persistido **inteiro** em `Lesson.contentDraft/contentPublished`.
- **Ordenação:** `position Int` em **cada nível** (Course/Module/Lesson) → reorder = cliente envia a ordem, server faz bulk-update em `$transaction` (padrão do `apontdelp`). A ordem **dos blocos** é gerida pelo próprio editor dentro do JSON.
- **Dificuldade:** enum `Dificuldade { INICIANTE INTERMEDIARIO AVANCADO }` (label exibido mapeado na UI), **por lição** (como no catálogo atual).
- **Tipagem do JSON:** `prisma-json-types-generator` (suporta Prisma 7) — tipa `contentDraft/contentPublished` como o doc do BlockNote via anotação `///`.

## Editor + render (segurança)
- **BlockNote** entrega slash-menu/drag/toolbar/`uploadFile` (o coração do no-code). Conteúdo = **doc JSON único** (array de blocos) salvo em `Lesson.contentDraft`.
- **Render server por whitelist** — renderer próprio sobre o JSON do BlockNote mapeia cada tipo conhecido para **elementos React** (nunca `dangerouslySetInnerHTML`). Bloco/tipo desconhecido → **skip + log**, nunca derruba a página.
- **Defesa XSS:** como o render emite React (não HTML), `isomorphic-dompurify` é **adiado**. Defesa na 2a = **allowlist de host** em URLs de embed (YouTube/Vimeo/Stream) e `http(s)`-only em `href`/`src` validados no **write-time** (Zod) + **CSP** sem inline scripts. DOMPurify volta se/quando entrar bloco de HTML cru.
- **Quiz (2b)** = bloco custom (`createReactBlockSpec`) mapeado p/ **componente client** no read-time.

## Mídia
- **Imagem:** upload → **Vercel Blob** (server-upload ≤ **4,5MB**; acima usa **client-upload** com token estático read-write — OIDC não aceito nesse fluxo).
- **Vídeo:** **embed-only** (iframe YouTube/Vimeo/Stream) — nunca upload/hospedagem.

## Migração — incremental e reversível (ponto mais delicado)
1. **Semear os 39 slugs** (de `catalogo.ts`) como linhas `Lesson` **ANTES de qualquer FK** → progresso preservado, zero transformação.
2. Cada lição nasce com `contentPublished = contentDraft = [{ type: 'legacy-embed', props: { screenId } }]` (1-elemento, aponta pro `public/universinid.html` atual; preserva `slug` + `screenId`). Validar que o progresso resolve.
3. **Só então decompõe lição-a-lição** em blocos ricos pelo editor; ao remover o `legacy-embed` daquela lição, o render passa a ser nativo → **scroll nativo** (via container escopado, ver abaixo). Sem big-bang.

**Scroll (tarefa explícita, não "de graça"):** `body { overflow:hidden }` no `globals.css` existe para o kiosk 3D. Ao renderizar conteúdo inline, adicionar um container **`overflow-y:auto` escopado** ao shell do `/universinid` em `universinid.css` (NUNCA tocar `globals.css`). Verificação: decompor 1 lição longa e confirmar que o conteúdo rola dentro do shell com o chrome fixo.

**Agrupamento inicial (Course):** os **6 módulos atuais** (`m0 Fundamentos`, `m1 Básico`, `m2 Intermediário`, `m3 Avançado`, `m4 Playbooks`, `m5 Referência Rápida`) entram sob **1 curso guarda-chuva** — proposta de nome **"IA Agêntica no NID — nid-spec-kit"**. Nenhum módulo órfão. Cursos adicionais (trilhas por tema, ex. "IA Generativa") entram no futuro.

## Reuso do `apontdelp` (evidência, não premissa)
Molde de CRUD em `c:\dev\apontdelp\src\app\api\pcp\schedule\`: `route.ts` (list/create) · `[id]/route.ts` (edit/delete) · `reorder/route.ts` (**`position Int` + `$transaction`**, é exatamente o padrão a copiar) · `publish/route.ts` (status via `updateMany`). **`src/lib/api-utils.ts`** (`withAuth`, `apiResponse`, `apiError`, `parseBody`) e o **hook react-query co-locado** (`src/hooks/use-pcp-schedule.ts`, padrão `useQuery`/`useMutation` + `sonner`) são **portáveis quase 1:1**. **`src/components/ui/` (shadcn) NÃO é portável 1:1** — apontdelp está em Tailwind 4; nid-planeta em Tailwind 3.4 → **hand-roll** dos ~5 primitivos (dialog/sheet, input, textarea, select, button) sobre Radix unstyled + `cn` (criar `src/lib/utils.ts`).

## Faseamento
- **Fase 2a (ESTA spec):** schema + migração dos 39 slugs + admin CRUD + editor BlockNote (texto/imagem/embed) + render whitelist + vitrine/sidebar com Course→Module→Lesson + remoção do iframe lição-a-lição.
- **Fase 2b:** quizzes (bloco custom interativo).
- **Fase 3:** badges/medalhas/certificados/notícias de tech (spec separada).

## Pontos confirmados na aprovação (2026-06-03)
1. ✅ **Nome do curso guarda-chuva:** **"IA Agêntica no NID — nid-spec-kit"** (título editável depois; só o `slug` da lição é imutável).
2. ✅ **`Category` descartada:** `Course` é o **único** eixo de agrupamento na 2a. Tags ortogonais ficam para o futuro (só se houver filtro transversal real).
3. ✅ **Versionamento:** basta `DRAFT/PUBLISHED` + **1 coluna de snapshot** — sem version-history.

## Stakeholders
- **Sponsor / Usuário final / Responsável NID:** Henrique Emiliano (ADMIN único que autora hoje).
- Audiência: equipe NID/DELP (alunos, papel STUDENT).

## Riscos identificados

| # | Risco | Mitigação |
|---|---|---|
| 1 | **Slug orphaning** — rename orfana `LessonProgress` (39 chaves vivas) | `Lesson.slug` **imutável na UI** + tabela `LessonSlugAlias`. Rename nunca orfana em silêncio. |
| 2 | **XSS** via conteúdo autorado | Nunca `dangerouslySetInnerHTML`; render por whitelist; sanitizar embed/raw no write-time + CSP. |
| 3 | **Render de JSON não-confiável** | JSON estruturado + whitelist de tipos; desconhecido degrada (skip+log); tipar com generator. |
| 4 | **N+1 / payload pesado** na árvore Course→Module→Lesson | *Dissolvido* pela coluna Json (sem tabela Block). `include` aninhado com `orderBy: { position }`; **nunca** selecionar `contentDraft/contentPublished` (campos Json grandes) em listagens de árvore — só ao abrir a lição. |
| 5 | **Teto 4,5MB** Vercel Blob | Estratégia de token por caminho de upload definida **antes** de codar o `uploadFile`. |
| 6 | **Scope creep de versioning** | Resistir a version-history; `DRAFT/PUBLISHED` + snapshot bastam. |
| 7 | **Regressão na landing 3D** | Híbrido **não** mexe nas rotas-raiz (ao contrário do Payload). Isolar mudanças em `/universinid/**`. |

## Próximo passo
Após **aprovação oral** desta spec → atualizar `status: aprovada` → **`/nid:plan`** (plano técnico TDD).
ADR correspondente: **ADR-0001** (`docs/superpowers/adr/0001-universinid-editor-blocos-hibrido.md`).

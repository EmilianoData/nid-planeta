# UniversiNID Fase 2 — Decisão de Arquitetura + Design (aguardando aprovação)

- **Data:** 2026-06-02
- **Projeto:** nid-planeta · branch `feature/nid-planeta`
- **Status:** ✅ **APROVADO em 2026-06-03.** O usuário aprovou o híbrido BlockNote e respondeu os 3 pontos abertos (§5): (1) **Course = SIM** — hierarquia passa a `Course → Module → Lesson → Block` (cursos = trilhas que agrupam módulos); (2) storage = **Vercel Blob**; (3) scroll = **esperar o fix grátis na 2a** (não mexer no `globals.css` agora). Próximo: escrever a **spec da Fase 2a** (`/nid:specify` + ADR) → `superpowers:writing-plans`.
  - ⚠️ **Único desvio do design abaixo:** a §3 propunha `Module → Lesson → Block` (sem Course). Com Course aprovado, ler `Module` como filho de `Course`; ver ripples na §5.1.
- **Origem:** `superpowers:brainstorming` (4 perguntas respondidas) + workflow de pesquisa de arquitetura `wf_384f4752-5c3` (task `w063v4i0f`, 5 agentes, 329k tokens, fontes verificadas no npm registry).
- **Continuação de:** `2026-06-01-universinid-fase2-3-escopo-research.md` (scoping) e `2026-05-29-universinid-plataforma-fase1-design.md` (Fase 1, fechada).

> ⚠️ O output bruto do workflow foi salvo num arquivo TEMP (`...\Temp\...\w063v4i0f.output`) que pode ser limpo. Este doc consolida o que importa.

---

## 1. Decisões de produto (respondidas no brainstorm)

| # | Pergunta | Resposta do usuário | Consequência |
|---|---|---|---|
| 1 | Teto da autoria "sem codar" | **Autoria completa** (criar módulo→lição→conteúdo rico: texto, imagem, vídeo, quiz; publicar/reordenar) | Único cenário em que Payload vira candidato real; exige conteúdo no banco + editor |
| 2 | Imagens e vídeos | **Híbrido**: vídeo por **embed**, imagem por **upload** | Precisa storage de imagem (Vercel Blob); vídeo nunca hospedado |
| 3 | Quem autora | **Só você (ADMIN) por enquanto**, extensível p/ instrutores depois | 1 papel ADMIN agora; modelar posse de conteúdo aditiva; estados rascunho/publicado |
| 4 | Quizzes | **Texto/mídia primeiro**, quiz vem depois | Quiz sai do 1º entregável (vira Fase 2b); modelo deixa porta aberta |

---

## 2. Veredito de arquitetura → **HÍBRIDO** (não Payload)

**Decisão recomendada: editor de blocos BlockNote sobre o Prisma 7.8 + NextAuth v5 já existentes, com admin CRUD próprio reaproveitando padrões do `apontdelp`. NÃO embutir Payload CMS.**

Insight central: **o no-code vem do EDITOR, não do CMS.** O editor de blocos entrega o slash-menu/drag/upload Notion-like (o coração da autoria) e instala em ambos os caminhos; o Payload só somaria infra.

**Payload é VIÁVEL mas CONDICIONAL** — o medo de "dois logins" NÃO se confirma (no padrão *content-only* o NextAuth fica intocado, conteúdo lido via Local API que pula access control). Mas a conta não fecha sobre uma Fase 1 fechada:

| Custo do Payload | Detalhe (verificado) |
|---|---|
| 🔴 **Bloqueio de runtime real** | `@payloadcms/next@3.85.0` peer `next` = `>=15.2.9 <15.3.0 \|\| >=15.3.9 <15.4.0 \|\| >=15.4.11 <15.5.0 \|\| >=16.2.6 <17.0.0`. App está em **`next ^15.5.15` — zona morta** → `npm install` falha (ERESOLVE). Exigiria downgrade (15.4.x) ou upgrade major (16.2.6+). |
| 🟠 **2º ORM** | Payload usa Drizzle, nunca Prisma → 2º ORM + 2º pipeline de migrations. |
| 🟠 **Colisão `users`** | Auth-collection padrão do Payload mapeia p/ `public.users`, mesma do Prisma → exige banco/schema Neon separado (`schemaName` é **EXPERIMENTAL**). |
| 🟠 **Storage adapter obrigatório** | Filesystem da Vercel é efêmero → `@payloadcms/storage-vercel-blob` (ou S3/R2). |
| 🟠 **Refactor de TODAS as rotas-raiz** | `/`, `/sistema-solar`, `/universinid` movem p/ route group `(app)` → risco de regressão na **landing 3D em andamento**. |

Conclusão: condições satisfazíveis, mas muito risco de regressão em troca de **zero ganho de UX de autoria**. Viável, não escolhido.

---

## 3. Design da Fase 2a

### Editor + renderização (segurança)
- **BlockNote** `@blocknote/react@0.51.4` — peer `react ^18 || ^19` (**compatível com React 19 sem `--legacy-peer-deps`**), licença **MPL-2.0** (core livre; só pacotes `xl` de export/AI são GPL/comercial — não usamos). É o único dos 4 com UI Notion-like pronta (slash menu, drag, toolbar, `uploadFile`); Tiptap/Lexical são headless, Plate exige integração.
- Conteúdo salvo como **JSON por bloco** (BlockNote é construído sobre Tiptap/ProseMirror).
- **Render no servidor por whitelist renderer** (estilo Tiptap Static Renderer — `renderToReactElement`, **sem `dangerouslySetInnerHTML`**). Bloco de tipo desconhecido **degrada (skip + log), nunca derruba a página**.
- **Quiz futuro** (2b) = bloco custom via `createReactBlockSpec` → config como props no JSON → mapeado p/ **componente client nosso** no read-time (interativo não renderiza por HTML de servidor em nenhum editor).

### Modelo de dados (Prisma, mesmo Neon, **sem 2º banco**)
- `Module` → `Lesson` → `Block`. **(ATUALIZADO 2026-06-03: `Course` → `Module` → `Lesson` → `Block` — ver §5.1.)**
- **`Lesson.slug` único e IMUTÁVEL na UI** (sem campo de rename no form) **+ tabela `LessonSlugAlias`** (`oldSlug → lessonId`) como escape hatch → blinda o **risco #1**.
- `Block.content` = **Json tipado** via `prisma-json-types-generator` (suporta Prisma 7) — união discriminada `text | image | embed` (quiz depois).
- **Ordenação por fractional indexing** — lib `fraci` (suporte first-class a Prisma, MIT) → drag-reorder atualiza **1 linha**; tem proteção a colisão + max-length.
- `status DRAFT/PUBLISHED` + coluna de snapshot publicado (**sem** version-history completa — overkill p/ ferramenta interna; aluno lê publicado, admin edita draft).
- `Category` (**tipo de IA**, N–N) — navegável/filtrável na vitrine. (Atrelar a Module por padrão — "módulos por tipo de IA"; revisar no spec.)
- Dificuldade = **enum fixo** (Iniciante / Intermediário / Avançado).
- **`LessonProgress` fica INTACTO** — continua join-por-valor pelo `lessonSlug`.

### Mídia
- Imagem por **upload → Vercel Blob** (app já na Vercel; grátis no Hobby; `del()` grátis). **Teto de 4,5MB** no server-upload (`put()` server-side); acima disso **client-upload** (browser→Blob) que exige **token estático read-write** (OIDC NÃO aceito nesse fluxo).
- Vídeo **embed-only** (iframe YouTube/Vimeo/Stream), nunca upload.
- Azure Blob **só se o TI exigir** assets in-tenant → federação **OIDC→Azure workload identity** (GA), **nunca Managed Identity** (não funciona a partir da Vercel).

### Migração — incremental e reversível (ponto mais delicado)
1. Semear os **39 slugs** (de `catalogo.ts`) como linhas `Lesson` **ANTES de qualquer FK** → progresso preservado, zero transformação.
2. Cada lição entra primeiro como **1 bloco "embed legado"** apontando pro HTML atual (preserva `slug` + `screenId`). Validar que o progresso resolve.
3. **Só então decompõe lição-a-lição** em blocos ricos pelo editor; remove o iframe daquela lição → **scroll nativo** (fix definitivo do bug de scroll).
4. Nenhum big-bang; as 39 chaves de progresso ficam intactas em todo passo.

### Reuso do `apontdelp` (evidência, não premissa)
Molde de CRUD ~1:1 em `c:\dev\apontdelp\src\app\api\pcp\schedule\`: `route.ts` (list/create) + `[id]/route.ts` (edit/delete) + `reorder/route.ts` (drag, casa com `fraci`) + `publish/route.ts` (DRAFT→PUBLISHED) + hooks co-locados (`use-pcp-schedule.ts`). Também `src/lib/api-utils.ts` (`withAuth`, `apiPaginatedResponse`), `rbac.ts`, `validators/`, e `src/components/ui/` (shadcn/ui pronto p/ portar — nid-planeta não tem `components/ui`). Stack disponível p/ portar: react-query, zustand, sonner, next-themes, @hello-pangea/dnd.

### Faseamento
- **Fase 2a (este entregável):** schema + migração dos 39 slugs + admin CRUD (módulos/lições, reorder, draft/publish) + editor BlockNote (texto/imagem/embed) + render server whitelist + portal/browse (categorias por tipo de IA + níveis) + remoção do iframe lição-a-lição.
- **Fase 2b:** quizzes (bloco custom interativo).
- **Fase 3:** badges/medalhas, notícias de tech, certificados.

---

## 4. Riscos (do workflow — endereçar no spec/plano)
1. **Slug orphaning (#1, não rodapé):** `LessonProgress @@unique([userId, lessonSlug])` sobre 39 slugs vivos. `Lesson.slug` imutável na UI + `LessonSlugAlias`. Rename nunca pode orfanar progresso em silêncio.
2. **XSS via conteúdo autorado:** nunca `dangerouslySetInnerHTML` cru. Render via Static Renderer (elementos React). Bloco raw-HTML/embed → sanitizar no **write-time** (`isomorphic-dompurify`/`sanitize-html`; DOMPurify não roda em Server Component Node puro) + CSP bloqueando inline scripts.
3. **Render de JSON não-confiável:** JSON estruturado (não HTML cru) + whitelist de node types; desconhecido degrada (skip+log). Tipar com `prisma-json-types-generator`.
4. **N+1 na árvore Module→Lesson→Block:** único `include` aninhado com `orderBy: { fi }` por nível; nunca incluir o JSON grande do bloco em queries de listagem.
5. **Teto 4,5MB Vercel Blob:** planejar estratégia de token por caminho de upload antes de codar o `uploadFile`.
6. **Versioning scope creep:** resistir a tabela de version-history; DRAFT/PUBLISHED + snapshot bastam.
7. **Residual (não introduzido aqui):** Auth.js v5 ainda é beta (absorvido pelo Better Auth). O híbrido NÃO amplifica esse acoplamento; o Payload com login unificado adicionaria (`payload-authjs` nem documenta o provider Credentials).

---

## 5. Pontos abertos — RESPONDIDOS (2026-06-03)
1. **Camada "Course"?** → **SIM** (usuário sobrepôs a proposta de NÃO). Cursos = **trilhas** que agrupam vários módulos (ex.: trilha "IA Generativa" com N módulos). Hierarquia final: **`Course → Module → Lesson → Block`**. Ver §5.1 (ripples).
2. **Storage:** → **Vercel Blob** confirmado (migrar p/ Azure só com mandato do TI).
3. **Scroll:** → **esperar o fix grátis na 2a** (remoção do iframe). **Não** tocar no `globals.css` agora.

### 5.1 Ripples do `Course` (resolver na spec da 2a)
- **Migração dos 6 módulos atuais:** os 6 módulos de `catalogo.ts` precisam de um `Course` pai. Default proposto: criar curso(s) inicial(is) que envolvam os módulos existentes; **não** orfanar nenhum módulo (e portanto nenhum dos 39 slugs de progresso). Decidir na spec se é 1 curso "guarda-chuva" ou poucos cursos por tema.
- **`Category` (tipo de IA) sobe de nível?** A §3 colocava `Category` N–N no `Module`. Com `Course` como trilha, reavaliar: a categorização "tipo de IA" provavelmente faz mais sentido no `Course` (ou continua no `Module`). Decidir na spec — evitar duplicar a semântica de agrupamento entre `Course` e `Category`.
- **Navegação/vitrine + sidebar:** passam a ter um nível a mais (Course → Module → Lesson). A vitrine atual navega módulos; reespecificar para navegar cursos → drill-in.
- **`status DRAFT/PUBLISHED` + ordenação (`fraci`):** aplicar também ao `Course` (cursos rascunho/publicado e reordenáveis), espelhando `Module`.
- **`LessonProgress` continua INTACTO** (keyed por `lessonSlug`); o `Course` é puramente uma camada de agrupamento acima — não toca a chave de progresso.

---

## 6. Próximo passo (retomada)
1. Coletar as 3 respostas de §5 + aprovação do design.
2. Escrever a **spec da Fase 2a** em `docs/superpowers/specs/2026-MM-DD-universinid-fase2a-design.md` (a decisão de arquitetura é **ADR-worthy** neste projeto nid-spec-kit — considerar `/nid:specify` + ADR).
3. `superpowers:writing-plans` → plano de implementação (TDD).
4. Spec separada da Fase 3.

## 7. Fontes verificadas (workflow)
- Payload Next peer range: https://registry.npmjs.org/@payloadcms/next/latest
- BlockNote react peer/licença: https://registry.npmjs.org/@blocknote/react/latest
- Payload Local API (pula access control): https://payloadcms.com/docs/local-api/overview
- Payload Postgres/Drizzle + colisão de tabela: https://payloadcms.com/docs/database/postgres
- Payload custom auth strategies: https://payloadcms.com/docs/authentication/custom-strategies
- BlockNote server processing / custom blocks: https://www.blocknotejs.org/docs/features/server-processing
- Tiptap Static Renderer: https://tiptap.dev/docs/editor/api/utilities/static-renderer
- fraci (fractional indexing Prisma): https://github.com/SegaraRai/fraci
- prisma-json-types-generator: https://github.com/arthurfiorette/prisma-json-types-generator
- Vercel Blob preço/limites + client-upload: https://vercel.com/docs/vercel-blob/usage-and-pricing · https://vercel.com/docs/vercel-blob/client-upload
- Vercel OIDC → Azure: https://vercel.com/docs/oidc/azure
- payload-authjs (ponte Auth.js, gotcha Credentials): https://github.com/CrawlerCode/payload-authjs

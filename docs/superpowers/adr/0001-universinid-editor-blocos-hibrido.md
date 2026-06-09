# ADR-0001 — UniversiNID: editor de blocos híbrido (BlockNote), não Payload CMS

- **Status:** ✅ Aceito (2026-06-03)
- **Projeto:** nid-planeta · UniversiNID Fase 2
- **Contexto-fonte:** `docs/superpowers/specs/2026-06-02-universinid-fase2-arquitetura-decisao.md`
- **Spec que materializa:** `docs/superpowers/specs/2026-06-03-universinid-fase2a-design.md`
- **Decisores:** Henrique Emiliano (aprovação) + Claude (pesquisa)

## Contexto

A Fase 1 entregou o UniversiNID como **plataforma** (login NextAuth v5, backend Prisma 7.8 +
Postgres/Neon, progresso keyed por `slug`), mas o **conteúdo** continuou congelado num HTML
estático de ~6.451 linhas embutido por iframe. A Fase 2 exige **autoria no-code completa**
(texto, imagem, vídeo embed, quiz depois) feita pelo ADMIN, sem editar código.

A pergunta de arquitetura: **embutir um CMS (Payload) ou construir CRUD próprio + editor de blocos
sobre o stack atual?** Decisão tomada com base em pesquisa com fontes verificadas no npm registry
(workflow `wf_384f4752-5c3`, 5 agentes).

## Decisão

**Adotar o caminho HÍBRIDO:** editor de blocos **BlockNote** (`@blocknote/react@0.51.4`) sobre o
**Prisma 7.8 + NextAuth v5 já existentes**, com **admin CRUD próprio** reaproveitando padrões do app
irmão `apontdelp`. **NÃO** embutir Payload CMS.

> **Insight central:** o "sem codar" vem do **EDITOR**, não do CMS. O editor de blocos entrega o
> slash-menu/drag/upload estilo Notion (o coração da autoria) e roda igual sobre qualquer backend.
> O Payload só somaria infraestrutura, sem nenhum ganho de UX de autoria.

**Decisão de modelagem associada:** a hierarquia é **`Course → Module → Lesson → Block`**, onde
`Course` é a **trilha** navegável. **Não** existe entidade `Category` paralela na Fase 2a — "trilha"
e "tipo de IA" são o **mesmo eixo de agrupamento**; manter os dois seria semântica duplicada. Tags
genuinamente ortogonais só entram se/quando houver filtro transversal real cruzando trilhas.

## Alternativas consideradas

### A) Payload CMS (rejeitada — viável, mas custo ≫ ganho)
O medo de "dois logins" **não** se confirma (no padrão *content-only*, NextAuth fica intocado e o
conteúdo é lido via Local API que pula access control). Mas a conta não fecha sobre uma Fase 1 fechada:

| Custo verificado | Detalhe |
|---|---|
| 🔴 **Bloqueio de runtime real** | `@payloadcms/next@3.85.0` peer `next` = `>=15.2.9 <15.3.0 \|\| >=15.3.9 <15.4.0 \|\| >=15.4.11 <15.5.0 \|\| >=16.2.6 <17.0.0`. App está em **`next 15.5.15` — zona morta** → `npm install` falha (ERESOLVE). Exigiria downgrade (15.4.x) ou upgrade major (16.2.6+). |
| 🟠 **2º ORM** | Payload usa **Drizzle** → 2º ORM + 2º pipeline de migrations ao lado do Prisma. |
| 🟠 **Colisão `users`** | Auth-collection padrão mapeia p/ `public.users`, mesma do Prisma → exige schema/banco Neon separado (`schemaName` é EXPERIMENTAL). |
| 🟠 **Storage adapter obrigatório** | FS da Vercel é efêmero → `@payloadcms/storage-vercel-blob` ou S3/R2. |
| 🟠 **Refactor das rotas-raiz** | `/`, `/sistema-solar`, `/universinid` migrariam p/ route group `(app)` → risco de regressão na **landing 3D em andamento**. |

### B) Editor headless puro (Tiptap/Lexical/Plate) — descartada
São headless: exigiriam construir o slash-menu/drag/toolbar/upload do zero (semanas de UI). BlockNote
já entrega essa camada Notion-like pronta sobre Tiptap/ProseMirror.

### C) Híbrido BlockNote — **ESCOLHIDA**
`@blocknote/react@0.51.4`: peer `react ^18 || ^19` (**compatível com React 19 sem `--legacy-peer-deps`**),
licença **MPL-2.0** (core livre; só pacotes `xl` de export/AI são GPL/comercial — não usados). Único dos
candidatos com UI Notion-like pronta. Conteúdo salvo como **JSON por bloco**; render server por
**whitelist** (`renderToReactElement`), sem `dangerouslySetInnerHTML`.

## Consequências

**Positivas:**
- Zero downgrade/upgrade de Next; zero 2º ORM; zero refactor das rotas-raiz → **landing 3D protegida**.
- Reuso direto do molde CRUD do `apontdelp` (`api/pcp/schedule/`, `api-utils.ts`, `rbac.ts`, shadcn).
- `LessonProgress` e os 39 slugs ficam intactos; migração incremental e reversível.
- Única dependência externa nova de peso: o editor (BlockNote).

**Negativas / dívidas assumidas:**
- CRUD admin é **código nosso** (vs. gerado pelo Payload) — mais código para manter, mitigado pelo reuso 1:1 do apontdelp.
- Render seguro de JSON autorado exige disciplina (whitelist + sanitização write-time + CSP) — endereçado como risco #2 da spec.
- Auth.js v5 segue beta (absorvido pelo Better Auth); o híbrido **não amplifica** esse acoplamento (o Payload com login unificado adicionaria).

## Refinamentos de implementação (2026-06-03, pós-grounding nos codebases)
A decisão central (híbrido, não Payload) é inalterada. Após ler a Fase 1 e o molde do `apontdelp`, 4 ajustes de **encoding** (serão ratificados no `/nid:gate`):
1. **Sem tabela `Block`** — o doc BlockNote vive em `Lesson.contentDraft/contentPublished Json?` (BlockNote já é um documento; linha-por-bloco não traz query e dissolve o N+1).
2. **Ordenação por `position Int`** + bulk-update em `$transaction` (padrão do `apontdelp`), não a lib `fraci` — escala de admin não justifica a dependência.
3. **Sem portar shadcn 1:1** (apontdelp = Tailwind 4; nid-planeta = Tailwind 3.4) → hand-roll de ~5 primitivos sobre Radix unstyled + `cn`.
4. **`isomorphic-dompurify` adiado** — render por whitelist emite React (sem `dangerouslySetInnerHTML`); defesa = allowlist de host em URLs + CSP.

## Evidência (fontes verificadas)
- Payload Next peer range — https://registry.npmjs.org/@payloadcms/next/latest
- BlockNote react peer/licença — https://registry.npmjs.org/@blocknote/react/latest
- Payload Local API (pula access control) — https://payloadcms.com/docs/local-api/overview
- Payload Postgres/Drizzle + colisão de tabela — https://payloadcms.com/docs/database/postgres
- BlockNote server processing / custom blocks — https://www.blocknotejs.org/docs/features/server-processing
- Tiptap Static Renderer — https://tiptap.dev/docs/editor/api/utilities/static-renderer
- fraci (fractional indexing, Prisma) — https://github.com/SegaraRai/fraci
- prisma-json-types-generator — https://github.com/arthurfiorette/prisma-json-types-generator
- Vercel Blob preço/limites + client-upload — https://vercel.com/docs/vercel-blob/usage-and-pricing

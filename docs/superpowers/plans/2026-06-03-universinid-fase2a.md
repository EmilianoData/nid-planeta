---
date: 2026-06-03
spec: 2026-06-03-universinid-fase2a-design.md
adr: 0001-universinid-editor-blocos-hibrido.md
status: IMPLEMENTADO 100% — Fases 0-7 + 07.1 + riders A2/A3/A5/A6/A8 + C1 + extensoes E1/E2/E3 (2026-06-17); criterio #1 e upload (7.4) VALIDADOS EM PRODUCAO. Fase 2a ENCERRADA.
gate_aprovado_em: 2026-06-03
tipo: web
---

# UniversiNID Fase 2a — Implementation Plan

## ✅ EXECUÇÃO — status real (atualizado 2026-06-11)

**Fases 0–4 + rider A3: CONCLUÍDAS, commitadas e verificadas** em `feature/nid-planeta`
(`npm run build` ok · `npm run test` 80/80 · `tsc` 0 · smoke de navegador real). Commits:
- **Fases 0–3** (sessão anterior): deps, schema + migração dos 39 slugs, API/CRUD — até `7e25f3e`.
- **tailwind-merge ^2** `2bb2afa` · **4.1** QueryProvider `fb037d8` · **4.2** hook react-query `c65b5cc` · **4.3** primitivos UI `a8b5f7a` · **4.4** LessonEditor (BlockNote, `ssr:false`) + rota de autoria `827dc58` · **4.5** ContentTree + aba Conteúdo `8bbc414` (+ fix dialogs sob demanda `962df32`).
- **Rider A3** (DELETE 409 c/ progresso; helper `hasStudentProgress`) `ee607e3` — security review limpo.
- **Correções da verificação:** upload buffer do body + leniência 422 `379569d` · sanitiza imagem sem URL no load (RangeError BlockNote) `43a8065` · upload fail-fast + erro claro `96223c1`.

**Verificado no navegador (localhost):** login admin → árvore (curso + 6 módulos + 39 lições; CRUD/publicar/reordenar) → editor BlockNote (sem white-screen/MantineProvider; guard legacy) → **save round-trip de texto** (PATCH doc real 200 → persiste → reload mostra) → A3 delete (200 sem progresso).

**⚠️ Pendência NÃO-código — upload de imagem:** `put()` do Vercel Blob dá `ConnectTimeout` a partir do **localhost na rede corporativa DELP** (Node não usa o proxy do navegador). Código correto → **verificar em deploy de preview**. Peers `@mantine/core`+`@mantine/hooks` ^8 adicionados (a Fase 0 original esquecera).

**Fase 5: CONCLUÍDA (2026-06-11)** — SPEC executada em `especificacoes/` (FASE-05). Commits:
- **5.1** `RenderBlocks` (whitelist de leitura, rider A2 no read, teto de profundidade) `efc225a`.
- **5.2** lição lê do banco; iframe só p/ `legacy-embed`; admin pré-visualiza draft, aluno 404 `7ec7871`.
- **5.3** scroll escopado: `.uni-lesson` com altura `calc(100vh-56px)` + `.uni-content{overflow-y:auto}` `9c25799` — `git diff globals.css` vazio.
- **C1 (segurança, fora do plano original)** `/api/reseed` estava 100% público (middleware não cobre `/api/**`) → `withAuth(['ADMIN'])`, TDD 401/403/200 `8c5bfd9`.

**Verificação da Fase 5 (navegador real, dev + build de produção `next start`):** lição legada renderiza iframe e rola internamente (sem regressão); TrackOpen prova IN_PROGRESS (módulos ativos 1→2, streak 0→1) e Concluir reflete no dashboard (2/39→3/39) — chave = slug (risco #1 intacto); lição de teste autorada no editor (3 parágrafos + imagem + embed YouTube) publica e renderiza **nativa** (sem iframe); em **DRAFT**: admin vê preview, aluno (role STUDENT) recebe **404 sem vazamento** (verificado no build de produção — em dev o flight do devtools serializa a query, MAS é dev-only); slug inexistente 404; lição longa (25 §) rola DENTRO de `.uni-content` (scrollTop 0→3057, body parado, topbar fixa); landing `/` e `/sistema-solar` intactos.

**Observações p/ Fase 6:** (1) `markLessonProgress` (actions.ts:38) valida slug contra o **catálogo estático** → lições novas criadas no banco ainda não rastreiam progresso (console: "track open falhou… Lição inexistente") — resolver quando a sidebar/vitrine lerem do banco; (2) `.uni-side` não tem teto de altura (estica o shell além do viewport; pré-existente da Fase 1, não tocado pela 5.3); (3) rodar `next start` local exige `AUTH_TRUST_HOST=true` (`.env.production.local`, git-ignored — na Vercel é automático); (4) sobraram no banco a lição de teste `licao-de-teste-fase-5` (DRAFT) e o usuário `aluno.teste.fase5@delp.com.br` — úteis p/ smoke da Fase 6, remover no fechamento da 2a.

**Fase 6: CONCLUÍDA (2026-06-11)** — SPEC executada em `especificacoes/` (FASE-06), com as 3 extensões aprovadas pelo dono do quadro (fecham a dupla fonte de verdade por completo). Commits:
- **6.1** vitrine Course→Module→Lesson do banco (+ export `PublishedTree`/`PublishedCourse`) `2a5632f`.
- **6.2** sidebar 3 níveis do banco via props (layout→ShellChrome→Sidebar), `.uni-course` no CSS escopado, ⌘K intacto `a6c8673`.
- **6.3** `catalogo.test.ts` documenta condição de aposentadoria `8e1469a`.
- **E1** palette ⌘K lista lições do banco (por prop, atalho intacto) `ef9d8c2`.
- **E2 (TDD)** `buildDashboard(rows, now, modulos)` parametrizado pela árvore publicada — fixtures explícitas, denominador dinâmico, árvore vazia não quebra; `getDashboardData` converte enum→rótulo `d7b260b`.
- **E3 (TDD)** guarda de `markLessonProgress` validada no BANCO via `resolveLessonBySlug` (cobre alias/risco #1) — lições novas rastreiam progresso `750a31b`.

**Decisões do dono do quadro (§4-D da SPEC):** E1+E2+E3 aprovadas; Neon de prod = MESMO banco já semeado (A8 vira verificação); título do curso sempre visível na sidebar; vitrine SUBSTITUI a seção "Continuar na trilha".

**Verificação (navegador real, dev):** vitrine = 1 curso → 6 módulos → 40 lições publicadas; publicar lição nova → aparece na vitrine, sidebar E busca ⌘K sem rebuild; despublicar → some das três; DRAFT nunca listado (nem p/ admin); progresso por slug intacto (ícones/anéis/EM CURSO); stats dinâmicos (3/40→4/40 ao concluir lição nativa do banco, console limpo — fim do "track open falhou"); item ativo da sidebar destaca; legada abre iframe; `/` e `/sistema-solar` intactos.

**Rider A8 (cutover prod):** mesmo Neon ⇒ `db:push`/`db:seed` desnecessários. Contagens verificadas (2026-06-11, read-only): `courses=1, modules=6, lessons=41 (40 publicadas — 39 do seed + lição de teste; 1 draft), lesson_progress=8`. **Resta apenas (pós-deploy, dono do quadro): abrir `/universinid` em produção e confirmar vitrine/sidebar populadas.**

**Sobras de teste no banco (limpar na Fase 7):** lições `licao-de-teste-fase-5` (PUBLISHED) e `licao-vitrine-6-1` (DRAFT) + usuário `aluno.teste.fase5@delp.com.br`.

**Fase 7: CONCLUÍDA (2026-06-13)** — SPEC executada em `especificacoes/` (FASE-07), fechamento da Fase 2a. Commits:
- **7.1** CSP completa (B4) em `src/middleware.ts` `9af0136` — 4 diretivas, só no matcher `/universinid`, landing/kiosk fora. Evidências (a)–(e) no navegador, 0 violações. **Decisão do dono do quadro:** `style-src` ganhou `https://fonts.googleapis.com` (sem o host, a CSP bloqueava o Google Fonts e derrubava a Barlow no UniversiNID).
- **7.2** revisão final (a11y + perf) `22e9001` — revisão multi-dimensional (security+a11y+correctness) com verificação adversarial: 23 achados brutos → 14 confirmados (0 blocker/high). **A5 verificado: 16/16 handlers admin com `withAuth(['ADMIN'])` como 1ª ação + `/api/reseed`.** Corrigidos no escopo (WCAG A/AA + perf): contrastes (`.uni-badge.on`, CommandPalette), `aria-label` em inputs de dialog e botões de reordenar, focus-trap+restauração no CommandPalette, `aria-live` no "Salvando…", `getPublishedTree` em `cache()`.
- **7.3** smoke e2e da Fase 2a `c5ed0ee` — passos 9-14 (criar/autorar/publicar/ver-como-aluno-nativo/concluir/despublicar) + `exitCode`. **Rodado contra build de produção: 14/14 OK, 0 console/page errors, exit 0.**
- **7.5** este registro de fechamento.

**Achados da 7.2 fora do escopo CSP/A5 → follow-ups rastreados (chips), respeitam decisões do dono do quadro:** (1) JWT válido 8h pós-desativação (re-checar `isActive` no servidor); (2) endurecer CSP base (`object-src 'none'`/`base-uri 'self'`/`connect-src 'self'` — impacto zero, mas o dono do quadro decidira manter só o B4 → confirmar); (3) alvos de toque <44px (WCAG AA de 24px já atendido; 44px é padrão org, contexto desktop-admin).

**Descoberta importante (não é bug de código):** o editor BlockNote não monta para um doc que contenha um bloco `type:'embed'` (custom) no `initialContent` — o schema padrão do BlockNote não tem 'embed' (tem 'video'). Isso só ocorria numa lição-fixture (`licao-de-teste-fase-5`) onde um bloco 'embed' fora inserido via API (fora do editor); saneada. Lições normais montam (full-load e SPA). **Round-trip de vídeo/embed editor↔RenderBlocks** → **RESOLVIDO na FASE-07.1** (bloco custom `embed` no editor). Também: a SDD teve o `contentDraft` esvaziado durante o diagnóstico intensivo do editor e foi **restaurada** ao marcador legado `s0-1` (hipótese de "abrir editor apaga draft legado" testada e REFUTADA — abrir sem digitar não dispara autosave).

**Fase 7.1 (corretiva): CONCLUÍDA (2026-06-14)** — fecha o round-trip de vídeo do critério #1.
SPEC `especificacoes/2-fila/FASE-07.1-bloco-embed-no-editor/SPEC.md` (gate GO, red-team 6 dimensões + ajustes 1–4). Commits:
- **07.1.1** `normalizeEmbedUrl` (YouTube/Vimeo/Stream → embedável; casa allowlist + CSP `frame-src`, fecha a Decisão-em-aberto #1 da FASE-07) `19363d6`.
- **07.1.2** bloco custom `embed` via `createReactBlockSpec` (factory em 0.51.4) + schema embed-only (remove `video`/`audio`/`file`) `954f204`.
- **07.1.3** editor usa o schema + slash-menu "Vídeo (embed)" (`insertOrUpdateBlockForSlashMenu`, sem lixo "/video") + `keepEditableBlocks` (guard de load recursivo, não crasha em bloco fora do schema) `c9412e7`.
- **07.1.3b** `validateContentDoc` tolera embed incompleto (sem URL) — paridade com image, evita 422 no autosave entre inserir o bloco e colar a URL `a1405f6`.
- **07.1.4** smoke estendido (passo 10b insere embed; passo 12 afirma `.uni-embed iframe` normalizado) `5872501`.

**Evidência automatizada (toda verde):** `npx tsc --noEmit` 0; `npm run test` 120/120 (novos: `embed-url` 8, `keepEditableBlocks` 3, `lessons` PATCH-200-embed, `sanitize` embed-incompleto); `npm run build` ok. **Defesa em profundidade preservada:** normaliza no input → `validateContentDoc` no PATCH → `isAllowedEmbed` no `RenderBlocks`; 0 `dangerouslySetInnerHTML`.
**Smoke e2e (build de produção, `next start` :3100):** ✅ **14/14 OK · 0 console/page errors · exit 0** (2026-06-14) — passo 10 insere o embed via slash-menu e o autosave **200 contém a URL normalizada** (`watch?v=…` → `youtube.com/embed/…`); passo 12 confirma `.uni-embed iframe` normalizado renderizando p/ o aluno, **sem crash e sem violação de CSP**. (Contra `next dev` os passos pré-existentes 5/Cmd+K e 9/ContentTree falham — ambiente, não código novo.) **Decisões-em-aberto da SPEC (§8) seguem para o dono do quadro:** outros blocos sem render no `RenderBlocks` (codeBlock/quote/table/…), banner ao remover bloco antigo no load, e promoção da pasta `2-fila/FASE-07.1` → `1-fase-atual/`.

### Critérios de sucesso da Fase 2a (spec de design `2026-06-03-universinid-fase2a-design.md`)

| # | Critério | Status | Evidência |
|---|---|---|---|
| 1 | Autoria no-code: ADMIN cria curso+módulo+lição com os 3 tipos de bloco, publica, vê no portal — 0 código/HTML | ✅ **Fechado end-to-end em produção (2026-06-16)** | **Texto:** ✅ smoke 7.3. **Vídeo embed:** ✅ **FASE-07.1** (bloco custom `embed`; `embed-url`/`keepEditableBlocks`/`lessons`/`sanitize` + smoke e2e 14/14) + **validado em produção 2026-06-16**. **Imagem:** ✅ **upload validado em PRODUÇÃO 2026-06-16** (fecha a 7.4). Login OK após cadastrar `AUTH_SECRET`/`DATABASE_URL`/`BLOB_READ_WRITE_TOKEN` na Vercel (Prod+Preview). |
| 2 | Progresso preservado: 39 slugs resolvem `LessonProgress`, 0 órfão | ✅ | teste `seed-plan`/`catalogo` verde + smoke passo 4 (concluir legada) + passo 13 (progresso em lição nova); `lesson_progress` inalterado no A8 |
| 3 | Scroll: lição decomposta rola nativamente, 0 bug | ✅ | FASE-05 (5.3) + smoke passo 12 (`.uni-content`, sem `iframe.uni-frame`) |
| 4 | Segurança: 0 `dangerouslySetInnerHTML`; embed sanitizado write-time; bloco desconhecido degrada | ✅ | grep: única ocorrência é comentário JSDoc no RenderBlocks; testes `sanitize-content`/`RenderBlocks` verdes; revisão de segurança 7.2 sem blocker |
| 5 | Qualidade: `npm run build` passa; testes Vitest (CRUD+migração+render) verdes (TDD) | ✅ | gate de saída: `npm run test` 103/103, `tsc` 0, `npm run build` ok |

**Sobras de teste no banco (dono do quadro, requer acesso DB — DELETE responde 409 por A3 quando há progresso):** lições `licao-de-teste-fase-5` (saneada), `licao-vitrine-6-1` (DRAFT) e as `smoke-fase2a-<ts>` (DRAFT, despublicadas) + cursos/módulos de smoke (DRAFT) + usuário `aluno.teste.fase5@delp.com.br` (fixture do smoke — usado por `SMOKE_STUDENT_*` no `.env`, MANTER se o smoke for rodar de novo).

**▶ FASE 2A FECHADA 100% (2026-06-16):** (7.4) ✅ upload de imagem validado em **PRODUÇÃO** (`nid-planeta.vercel.app`) — junto com login e render de vídeo embed; só foi possível após cadastrar `AUTH_SECRET`/`DATABASE_URL`/`BLOB_READ_WRITE_TOKEN` na Vercel (Prod+Preview) e **rebuildar** (Promote não injeta env — ver [[reference-vercel-deploy]]). Resta só o **ritual de board do dono do quadro** (não-bloqueante): mover FASE-07 p/ `3-concluidas/` (FASE-07.1 já movida), atualizar `especificacoes/README.md` + `ARQUITETURA.md` §6/§7, e decidir a promoção da FASE-08 (pré-spec, requer `/nid:specify`).

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o ADMIN crie/edite `Course → Module → Lesson` com conteúdo rico (texto, imagem, vídeo embed) por um editor no-code (BlockNote) e publique sem codar — preservando os 39 slugs de progresso e eliminando o iframe (e o bug de scroll) lição-a-lição.

**Architecture:** Híbrido (ADR-0001) sobre o stack da Fase 1 (Prisma 7.8 + NextAuth v5 + Postgres/Neon). Conteúdo no banco; o doc BlockNote é persistido **inteiro** em `Lesson.contentDraft/contentPublished` (sem tabela Block). Admin CRUD via **API routes + react-query** (molde do `apontdelp`); leitura via **Server Components**. Render por **whitelist próprio** (elementos React, sem `dangerouslySetInnerHTML`). Ordenação por `position Int` + `$transaction`. Tudo isolado em `/universinid/**` (protege a landing 3D).

**Tech Stack:** Next 15.5.15 (App Router) · React 19 · Prisma 7.8 (adapter-pg, client em `src/generated/prisma`) · NextAuth v5 · `@blocknote/core|react|mantine` · `prisma-json-types-generator` · `@vercel/blob` · `@tanstack/react-query` · `sonner` · Radix (`@radix-ui/react-dialog`) + `clsx`/`tailwind-merge`/`cva`/`lucide-react` · Zod 3 · Vitest 4 · Tailwind 3.4.

> **Convenções confirmadas (grounding):** schema em `prisma/schema.prisma`; client importado de `@/generated/prisma`; singleton `@/lib/prisma`; `auth` de `@/lib/auth`. Sem `prisma migrate` — usa **`npm run db:push`** + **`npm run db:generate`** (`postinstall` roda `prisma generate`). Testes: **import explícito** `import { describe, it, expect, vi, beforeEach } from 'vitest'` (sem `globals`), env `node`, mock no padrão `vi.hoisted` + `vi.mock('@/lib/prisma'|'@/lib/auth')`. **NUNCA** tocar `src/app/globals.css` nem rotas-raiz.

---

## File Structure (decomposição)

**Criar:**
- `prisma/schema.prisma` (modificar) — `Course`, `Module`, `Lesson`, `LessonSlugAlias`, enums; gerador `prisma-json-types-generator`.
- `src/types/prisma-json.ts` — declaração global `PrismaJson.BlockDoc`.
- `src/lib/universinid/content-types.ts` — tipos do doc de blocos (`UniBlock`, `UniBlockDoc`) + type guards.
- `prisma/seed-content.ts` — migração dos 39 slugs (Course guarda-chuva + 6 módulos + 39 lições c/ `legacy-embed`).
- `src/lib/api-utils.ts` — port do `apontdelp` (`withAuth`, `apiResponse`, `apiError`, `parseBody`).
- `src/lib/utils.ts` — `cn()`.
- `src/lib/universinid/validators.ts` — schemas Zod (course/module/lesson/reorder/publish/upload).
- `src/lib/universinid/content-queries.ts` — leitura (árvore publicada, lição por slug+alias) p/ Server Components.
- `src/app/api/universinid/admin/courses/route.ts` · `[id]/route.ts` · `reorder/route.ts`
- `src/app/api/universinid/admin/modules/route.ts` · `[id]/route.ts` · `reorder/route.ts`
- `src/app/api/universinid/admin/lessons/route.ts` · `[id]/route.ts` · `reorder/route.ts` · `[id]/publish/route.ts`
- `src/app/api/universinid/admin/upload/route.ts` — Vercel Blob.
- `src/components/universinid/ui/` — primitivos hand-roll (`button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `dialog.tsx`).
- `src/components/universinid/QueryProvider.tsx` — react-query + `<Toaster/>`.
- `src/hooks/universinid/use-admin-content.ts` — hook react-query (CRUD + reorder + publish).
- `src/components/universinid/admin/` — `ContentTree.tsx`, `LessonEditor.tsx` (BlockNote), `*Dialog.tsx`.
- `src/components/universinid/RenderBlocks.tsx` — whitelist renderer (server).
- testes co-locados `*.test.ts(x)`.

**Modificar:**
- `src/app/universinid/(app)/layout.tsx` — embrulhar children com `QueryProvider`.
- `src/app/universinid/(app)/licao/[slug]/page.tsx` — ler `Lesson` por slug(+alias) e renderizar `RenderBlocks`; `legacy-embed` ainda monta o iframe.
- `src/app/universinid/(app)/page.tsx` — vitrine por Course→Module→Lesson (publicado).
- `src/app/universinid/(app)/admin/` — nova aba "Conteúdo".
- `src/app/universinid/universinid.css` — container de scroll escopado + estilos dos primitivos.
- `prisma/seed.ts` — chamar `seed-content` (idempotente) após o admin.

---

## Fases e tarefas

### Fase 0 — Dependências e scaffolding base

**Tarefa 0.1 — Instalar dependências**
- Agente: `nid-devops-engineer`
- Depende de: nenhuma
- Evidência: `npm install` sem `ERESOLVE`; `npm run build` ainda passa (baseline verde antes de mexer em código).

- [ ] **Step 1: Instalar libs de runtime**
```bash
npm install @blocknote/core@^0.51.4 @blocknote/react@^0.51.4 @blocknote/mantine@^0.51.4 @vercel/blob @tanstack/react-query@^5 sonner @radix-ui/react-dialog clsx tailwind-merge class-variance-authority lucide-react
```
- [ ] **Step 2: Instalar gerador** — ⚠️ **A7: como dependency normal, NÃO `-D`.** O `postinstall: prisma generate` (`package.json`) roda o bloco `generator json` em **todo** install, inclusive prod com `--omit=dev` → se for devDep, o `prisma generate` de prod quebra.
```bash
npm install prisma-json-types-generator
```
- [ ] **Step 3: Verificar baseline**
Run: `npm run build`
Expected: build conclui (9 páginas), 0 erro de tipo. Se `ERESOLVE`: parar e reportar (não usar `--legacy-peer-deps` sem investigar).
- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore(universinid): deps da Fase 2a (BlockNote, react-query, vercel blob, radix)"
```

**Tarefa 0.2 — `cn()` util**
- Agente: `nid-frontend-engineer`
- Depende de: 0.1
- Evidência: import `{ cn } from '@/lib/utils'` compila.

- [ ] **Step 1: Criar `src/lib/utils.ts`**
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```
- [ ] **Step 2:** Run `npx tsc --noEmit` → Expected: 0 erro novo.
- [ ] **Step 3: Commit** `git add src/lib/utils.ts && git commit -m "feat(universinid): util cn()"`

**Tarefa 0.3 — Vitest reconhece `.tsx` (senão testes de componente são SILENCIOSAMENTE pulados)**
- Agente: `nid-qa-engineer`
- Depende de: nenhuma
- Evidência: um teste `.tsx` dummy é coletado e roda (sem o fix, o glob `src/**/*.test.ts` NÃO casa `.tsx` → falso-verde no teste de XSS da 5.1).

> ⚠️ **B1 (gate):** o `include` do Vitest **substitui** os defaults. O atual `['src/**/*.test.ts']` deixa de fora **(a)** os `.tsx` (teste de XSS da 5.1) **e (b)** `prisma/**` — onde mora `prisma/seed-content.test.ts`, o teste que prova o Risco #1 ("39 slugs → Lesson, 0 órfão"). Sem os dois eixos, o teste mais crítico do plano é **silenciosamente pulado** (falso-verde no critério "progresso preservado").

- [ ] **Step 1: Editar** `vitest.config.ts` — cobrir `.tsx` **e** `prisma/`:
```ts
test: {
  environment: 'node',
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'prisma/**/*.test.ts'], // 3 eixos
},
```
- [ ] **Step 2: Provar que AMBOS os eixos coletam** — criar 2 smokes:
  - `src/lib/__tsx_smoke__.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
describe('tsx smoke', () => {
  it('renderiza JSX', () => { expect(renderToStaticMarkup(<p>oi</p>)).toContain('oi'); });
});
```
  - `prisma/__seed_smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('prisma dir smoke', () => { it('é coletado', () => { expect(1).toBe(1); }); });
```
Run: `npm run test`
Expected: **AMBOS coletados e PASS** (procurar os 2 nomes no output). Se "No test files found" p/ qualquer um → o glob não pegou aquele eixo; revisar Step 1. Se erro de transform JSX → adicionar `@vitejs/plugin-react` ao `plugins` (esbuild costuma bastar p/ `renderToStaticMarkup`; só adicionar se falhar).
- [ ] **Step 3:** Remover os 2 smokes (`git rm src/lib/__tsx_smoke__.test.tsx prisma/__seed_smoke__.test.ts`) e **commit** `chore(universinid): vitest coleta .test.tsx e prisma/**`.

---

### Fase 1 — Schema + tipagem do conteúdo

**Tarefa 1.1 — Tipos do documento de blocos**
- Agente: `nid-backend-engineer`
- Depende de: 0.1
- Evidência: teste de type guard verde.

- [ ] **Step 1: Escrever o teste falho** — `src/lib/universinid/content-types.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { isLegacyEmbed, legacyEmbedDoc, type UniBlockDoc } from './content-types';

describe('content-types', () => {
  it('legacyEmbedDoc cria doc de 1 bloco com o screenId', () => {
    const doc = legacyEmbedDoc('s0-1');
    expect(doc).toHaveLength(1);
    expect(doc[0]).toMatchObject({ type: 'legacy-embed', props: { screenId: 's0-1' } });
  });

  it('isLegacyEmbed detecta doc legado e rejeita doc decomposto', () => {
    expect(isLegacyEmbed(legacyEmbedDoc('s1-2'))).toBe(true);
    const decomposed: UniBlockDoc = [{ id: 'b1', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'oi', styles: {} }], children: [] }];
    expect(isLegacyEmbed(decomposed)).toBe(false);
  });
});
```
- [ ] **Step 2:** Run `npm run test -- content-types` → Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implementar** `src/lib/universinid/content-types.ts`
```ts
// Tipos do documento autorado. BlockNote produz um array de blocos;
// guardamos o array inteiro em Lesson.contentDraft/contentPublished.

export interface InlineText {
  type: 'text';
  text: string;
  styles: Record<string, unknown>;
}
export interface InlineLink {
  type: 'link';
  href: string;
  content: InlineText[];
}
export type InlineContent = InlineText | InlineLink;

export interface BaseBlock {
  id: string;
  props: Record<string, unknown>;
  content?: InlineContent[];
  children?: UniBlock[];
}

export interface LegacyEmbedBlock {
  type: 'legacy-embed';
  props: { screenId: string };
}
export interface ParagraphBlock extends BaseBlock { type: 'paragraph'; }
export interface HeadingBlock extends BaseBlock { type: 'heading'; props: { level: 1 | 2 | 3 } & Record<string, unknown>; }
export interface BulletListBlock extends BaseBlock { type: 'bulletListItem'; }
export interface NumberedListBlock extends BaseBlock { type: 'numberedListItem'; }
export interface ImageBlock { type: 'image'; id: string; props: { url: string; caption?: string; previewWidth?: number } & Record<string, unknown>; }
export interface EmbedBlock { type: 'embed'; id: string; props: { url: string; provider?: 'youtube' | 'vimeo' | 'stream' } & Record<string, unknown>; }

export type UniBlock =
  | LegacyEmbedBlock | ParagraphBlock | HeadingBlock
  | BulletListBlock | NumberedListBlock | ImageBlock | EmbedBlock
  | { type: string; id?: string; props?: Record<string, unknown>; content?: InlineContent[]; children?: UniBlock[] }; // desconhecido → degrada no render

export type UniBlockDoc = UniBlock[];

export function legacyEmbedDoc(screenId: string): UniBlockDoc {
  return [{ type: 'legacy-embed', props: { screenId } }];
}

export function isLegacyEmbed(doc: unknown): boolean {
  return Array.isArray(doc) && doc.length === 1 && (doc[0] as { type?: string })?.type === 'legacy-embed';
}
```
- [ ] **Step 4:** Run `npm run test -- content-types` → Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/universinid/content-types.* && git commit -m "feat(universinid): tipos do doc de blocos + legacy-embed"`

**Tarefa 1.2 — Declaração `PrismaJson.BlockDoc`**
- Agente: `nid-backend-engineer`
- Depende de: 1.1
- Evidência: arquivo presente; referenciado pelo gerador na 1.3.

- [ ] **Step 1: Criar** `src/types/prisma-json.ts`
```ts
import type { UniBlockDoc } from '@/lib/universinid/content-types';

declare global {
  namespace PrismaJson {
    type BlockDoc = UniBlockDoc;
  }
}
export {};
```
- [ ] **Step 2:** Confirmar que `tsconfig.json` inclui `src/**/*` (já inclui). Run `npx tsc --noEmit` → Expected: 0 erro.
- [ ] **Step 3: Commit** `git add src/types/prisma-json.ts && git commit -m "feat(universinid): tipo global PrismaJson.BlockDoc"`

**Tarefa 1.3 — Schema Prisma + gerador JSON**
- Agente: `nid-database-engineer`
- Depende de: 1.2
- Evidência: `npm run db:generate` ok; `npm run db:push` cria as tabelas no Neon; `LessonProgress` **inalterado** no diff do schema.

- [ ] **Step 1: Adicionar o gerador** em `prisma/schema.prisma` (após o `generator client`)
```prisma
generator json {
  provider = "prisma-json-types-generator"
}
```
- [ ] **Step 2: Adicionar enums + modelos** (NÃO alterar `User`/`LessonProgress`)
```prisma
enum ContentStatus {
  DRAFT
  PUBLISHED
}

enum Dificuldade {
  INICIANTE
  INTERMEDIARIO
  AVANCADO
}

model Course {
  id        String        @id @default(cuid())
  slug      String        @unique
  title     String
  subtitle  String?
  position  Int           @default(0)
  status    ContentStatus @default(DRAFT)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  modules   Module[]
  @@map("courses")
}

model Module {
  id        String        @id @default(cuid())
  courseId  String
  title     String
  emoji     String        @default("📘")
  position  Int           @default(0)
  status    ContentStatus @default(DRAFT)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  course    Course        @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons   Lesson[]
  @@index([courseId])
  @@map("modules")
}

model Lesson {
  id               String            @id @default(cuid())
  moduleId         String
  slug             String            @unique
  title            String
  tempoMin         Int               @default(5)
  dificuldade      Dificuldade       @default(INICIANTE)
  position         Int               @default(0)
  status           ContentStatus     @default(DRAFT)
  /// [BlockDoc]
  contentDraft     Json?
  /// [BlockDoc]
  contentPublished Json?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  module           Module            @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  aliases          LessonSlugAlias[]
  @@index([moduleId])
  @@map("lessons")
}

model LessonSlugAlias {
  oldSlug   String   @id
  lessonId  String
  createdAt DateTime @default(now())
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  @@index([lessonId])
  @@map("lesson_slug_aliases")
}
```
- [ ] **Step 3:** Run `npm run db:generate`
Expected: gera client em `src/generated/prisma`; `prisma.lesson` agora tipa `contentDraft: UniBlockDoc | null`. Se o gerador `json` falhar (incompat. Prisma 7): reportar e cair no fallback `Json` não-tipado (cast manual via `content-types`) — **não** bloquear a fase.
- [ ] **Step 4:** Run `npm run db:push`
Expected: cria `courses`, `modules`, `lessons`, `lesson_slug_aliases`; **0 alteração** em `users`/`lesson_progress`.
- [ ] **Step 5:** Run `npx tsc --noEmit` → Expected: 0 erro.
- [ ] **Step 6: Commit** `git add prisma/schema.prisma && git commit -m "feat(universinid): schema Course/Module/Lesson + JSON tipado (Fase 2a)"`

---

### Fase 2 — Migração dos 39 slugs (RISCO #1)

**Tarefa 2.1 — Seed de conteúdo (curso guarda-chuva + 6 módulos + 39 lições)**
- Agente: `nid-database-engineer` + `nid-tdd-coach`
- Depende de: 1.3
- Evidência: teste prova que **os 39 slugs viram `Lesson`** e que cada um nasce com `legacy-embed`.

> ⚠️ **B2 (gate):** a lógica pura (`buildSeedPlan`) NÃO pode importar `@/lib/prisma` (o singleton abre um `pg.Pool` no escopo de módulo — `src/lib/prisma.ts`). Por isso ela vive em `src/lib/universinid/seed-plan.ts` (puro, testável, **em `src/`** → também blinda o B1 p/ este teste), e o I/O (`runSeedContent`) fica em `prisma/seed-content.ts` importando a função pura + o prisma.

- [ ] **Step 1: Escrever o teste falho** — `src/lib/universinid/seed-plan.test.ts` (puro, sem prisma)
```ts
import { describe, it, expect } from 'vitest';
import { buildSeedPlan, DIFICULDADE_MAP } from './seed-plan';
import { todasLicoes, CATALOGO } from './catalogo';
import { isLegacyEmbed } from './content-types';

describe('seed-plan (migração 39 slugs)', () => {
  const plan = buildSeedPlan();

  it('1 curso guarda-chuva + 6 módulos + 39 lições', () => {
    expect(plan.course.slug).toBe('ia-agentica-no-nid');
    expect(plan.modules).toHaveLength(CATALOGO.length); // 6
    expect(plan.lessons).toHaveLength(todasLicoes().length); // 39
  });

  it('cobre exatamente os slugs do catálogo (0 órfão, 0 extra)', () => {
    const seeded = new Set(plan.lessons.map((l) => l.slug));
    const catalog = new Set(todasLicoes().map((l) => l.slug));
    expect(seeded).toEqual(catalog);
  });

  it('toda lição nasce com legacy-embed apontando pro screenId', () => {
    for (const l of plan.lessons) {
      expect(isLegacyEmbed(l.contentDraft)).toBe(true);
      expect(l.contentDraft[0]).toMatchObject({ type: 'legacy-embed', props: { screenId: l.screenId } });
      expect(l.contentPublished).toEqual(l.contentDraft);
    }
  });

  it('mapeia dificuldade do catálogo p/ enum', () => {
    expect(DIFICULDADE_MAP['Iniciante']).toBe('INICIANTE');
    expect(DIFICULDADE_MAP['Intermediário']).toBe('INTERMEDIARIO');
    expect(DIFICULDADE_MAP['Avançado']).toBe('AVANCADO');
  });
});
```
- [ ] **Step 2:** Run `npm run test -- seed-plan` → Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implementar a função PURA** `src/lib/universinid/seed-plan.ts` (zero import de prisma)
```ts
import { CATALOGO } from './catalogo';
import { legacyEmbedDoc, type UniBlockDoc } from './content-types';

export const COURSE_SLUG = 'ia-agentica-no-nid';

export const DIFICULDADE_MAP = {
  'Iniciante': 'INICIANTE',
  'Intermediário': 'INTERMEDIARIO',
  'Avançado': 'AVANCADO',
} as const;

export interface SeedLesson {
  slug: string; title: string; position: number; tempoMin: number;
  dificuldade: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
  moduleOrdem: number; screenId: string;
  contentDraft: UniBlockDoc; contentPublished: UniBlockDoc;
}
export interface SeedModule { ordem: number; title: string; emoji: string; position: number; }
export interface SeedPlan {
  course: { slug: string; title: string; subtitle: string };
  modules: SeedModule[];
  lessons: SeedLesson[];
}

export function buildSeedPlan(): SeedPlan {
  const modules: SeedModule[] = CATALOGO.map((m) => ({
    ordem: m.ordem, title: m.titulo, emoji: m.emoji, position: m.ordem,
  }));
  const lessons: SeedLesson[] = CATALOGO.flatMap((m) =>
    m.licoes.map((l) => {
      const doc = legacyEmbedDoc(l.screenId);
      return {
        slug: l.slug, title: l.titulo, position: l.ordem, tempoMin: l.tempoMin,
        dificuldade: DIFICULDADE_MAP[l.dificuldade], moduleOrdem: m.ordem,
        screenId: l.screenId, contentDraft: doc, contentPublished: doc,
      };
    }),
  );
  return {
    course: { slug: COURSE_SLUG, title: 'IA Agêntica no NID — nid-spec-kit', subtitle: 'Do brief ao código com o nid-spec-kit' },
    modules, lessons,
  };
}

```
(`buildSeedPlan` + interfaces ficam aqui — **sem** `runSeedContent`/`prisma`.)
- [ ] **Step 4:** Run `npm run test -- seed-plan` → Expected: PASS (4 testes), **sem** abrir conexão PG.
- [ ] **Step 5: Implementar o I/O** `prisma/seed-content.ts` (importa a função pura + o prisma) — idempotente, NÃO toca `lesson_progress`:
```ts
import { prisma } from '../src/lib/prisma';
import { buildSeedPlan } from '../src/lib/universinid/seed-plan';

export async function runSeedContent(): Promise<void> {
  const plan = buildSeedPlan();
  const course = await prisma.course.upsert({
    where: { slug: plan.course.slug },
    update: { title: plan.course.title, subtitle: plan.course.subtitle, status: 'PUBLISHED' },
    create: { slug: plan.course.slug, title: plan.course.title, subtitle: plan.course.subtitle, position: 0, status: 'PUBLISHED' },
  });

  const moduleIdByOrdem = new Map<number, string>();
  for (const m of plan.modules) {
    // Sem unique natural p/ módulo → procura por (courseId,title) e cria se ausente.
    const existing = await prisma.module.findFirst({ where: { courseId: course.id, title: m.title } });
    const row = existing
      ? await prisma.module.update({ where: { id: existing.id }, data: { emoji: m.emoji, position: m.position, status: 'PUBLISHED' } })
      : await prisma.module.create({ data: { courseId: course.id, title: m.title, emoji: m.emoji, position: m.position, status: 'PUBLISHED' } });
    moduleIdByOrdem.set(m.ordem, row.id);
  }

  for (const l of plan.lessons) {
    const moduleId = moduleIdByOrdem.get(l.moduleOrdem)!;
    await prisma.lesson.upsert({
      where: { slug: l.slug },
      // ⚠️ update NÃO sobrescreve content* (só metadados) → re-seed não apaga lição já decomposta. Conteúdo só no create.
      update: { moduleId, title: l.title, position: l.position, tempoMin: l.tempoMin, dificuldade: l.dificuldade },
      create: {
        moduleId, slug: l.slug, title: l.title, position: l.position, tempoMin: l.tempoMin,
        dificuldade: l.dificuldade, status: 'PUBLISHED',
        contentDraft: l.contentDraft, contentPublished: l.contentPublished,
      },
    });
  }
}
```
- [ ] **Step 6: Commit** `git add src/lib/universinid/seed-plan.* prisma/seed-content.ts && git commit -m "feat(universinid): seed de conteúdo (39 slugs → legacy-embed), lógica pura + I/O separados"`

**Tarefa 2.2 — Acoplar seed ao `db:seed` e rodar contra o Neon**
- Agente: `nid-database-engineer`
- Depende de: 2.1
- Evidência: após `npm run db:seed`, `SELECT count(*) FROM lessons` = 39 e cada slug do catálogo existe; `lesson_progress` intacto.

- [ ] **Step 1: Chamar `runSeedContent()` no fim de** `prisma/seed.ts` (após o upsert do admin)
```ts
import { runSeedContent } from './seed-content';
// ...ao final do main(), antes do disconnect:
await runSeedContent();
console.log('✓ conteúdo semeado (curso/módulos/39 lições)');
```
- [ ] **Step 2:** Run `npm run db:seed`
Expected: logs do admin + "conteúdo semeado". Sem erro.
- [ ] **Step 3: Verificação manual (evidência)** — rodar no Neon (psql/Studio):
```sql
SELECT count(*) FROM lessons;            -- espera 39
SELECT count(*) FROM modules;            -- espera 6
SELECT count(*) FROM lesson_progress;    -- inalterado vs antes
```
- [ ] **Step 4:** Re-rodar `npm run db:seed` (idempotência) → Expected: ainda 39 lições, sem duplicatas.
- [ ] **Step 5: Commit** `git add prisma/seed.ts && git commit -m "chore(universinid): db:seed roda o seed de conteúdo"`

**Tarefa 2.3 — Resolver lição por slug + alias (leitura)**
- Agente: `nid-backend-engineer`
- Depende de: 1.3
- Evidência: teste cobre slug direto e slug antigo via alias.

- [ ] **Step 1: Teste falho** — `src/lib/universinid/content-queries.test.ts`
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { lessonFindUnique, aliasFindUnique } = vi.hoisted(() => ({
  lessonFindUnique: vi.fn(), aliasFindUnique: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: {
  lesson: { findUnique: lessonFindUnique },
  lessonSlugAlias: { findUnique: aliasFindUnique },
} }));

import { resolveLessonBySlug } from './content-queries';

describe('resolveLessonBySlug', () => {
  beforeEach(() => { lessonFindUnique.mockReset(); aliasFindUnique.mockReset(); });

  it('retorna a lição quando o slug é direto', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'L1', slug: 'llm-o-que-e' });
    const res = await resolveLessonBySlug('llm-o-que-e');
    expect(res?.id).toBe('L1');
    expect(aliasFindUnique).not.toHaveBeenCalled();
  });

  it('cai no alias quando o slug não existe direto', async () => {
    lessonFindUnique.mockResolvedValueOnce(null);
    aliasFindUnique.mockResolvedValue({ oldSlug: 'antigo', lessonId: 'L9', lesson: { id: 'L9', slug: 'novo' } });
    const res = await resolveLessonBySlug('antigo');
    expect(res?.id).toBe('L9');
  });

  it('retorna null quando não há lição nem alias', async () => {
    lessonFindUnique.mockResolvedValue(null);
    aliasFindUnique.mockResolvedValue(null);
    expect(await resolveLessonBySlug('inexistente')).toBeNull();
  });
});
```
- [ ] **Step 2:** Run `npm run test -- content-queries` → Expected: FAIL.
- [ ] **Step 3: Implementar** `src/lib/universinid/content-queries.ts`
```ts
import { prisma } from '@/lib/prisma';

export async function resolveLessonBySlug(slug: string) {
  const direct = await prisma.lesson.findUnique({ where: { slug } });
  if (direct) return direct;
  const alias = await prisma.lessonSlugAlias.findUnique({ where: { oldSlug: slug }, include: { lesson: true } });
  return alias?.lesson ?? null;
}

// Árvore publicada p/ vitrine/sidebar — NUNCA seleciona o Json grande.
export async function getPublishedTree() {
  return prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { position: 'asc' },
    select: {
      id: true, slug: true, title: true, subtitle: true,
      modules: {
        where: { status: 'PUBLISHED' }, orderBy: { position: 'asc' },
        select: {
          id: true, title: true, emoji: true,
          lessons: {
            where: { status: 'PUBLISHED' }, orderBy: { position: 'asc' },
            select: { id: true, slug: true, title: true, tempoMin: true, dificuldade: true }, // sem content*
          },
        },
      },
    },
  });
}
```
- [ ] **Step 4:** Run `npm run test -- content-queries` → Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/universinid/content-queries.* && git commit -m "feat(universinid): resolver lição por slug+alias + árvore publicada"`

---

### Fase 3 — Infra de API + Admin CRUD

**Tarefa 3.1 — Port do `api-utils` (auth/validate/response)**
- Agente: `nid-backend-engineer`
- Depende de: 0.1
- Evidência: teste de `withAuth` cobre 401 (sem sessão), 403 (não-admin), ok (admin).

- [ ] **Step 1: Teste falho** — `src/lib/api-utils.test.ts`
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
import { withAuth, apiError, apiResponse } from './api-utils';

describe('withAuth', () => {
  beforeEach(() => authMock.mockReset());

  it('401 sem sessão', async () => {
    authMock.mockResolvedValue(null);
    const { error } = await withAuth(['ADMIN']);
    expect(error?.status).toBe(401);
  });
  it('403 quando role não permitido', async () => {
    authMock.mockResolvedValue({ user: { id: 'u', role: 'STUDENT' } });
    const { error } = await withAuth(['ADMIN']);
    expect(error?.status).toBe(403);
  });
  it('passa quando ADMIN', async () => {
    authMock.mockResolvedValue({ user: { id: 'u', role: 'ADMIN' } });
    const { error, session } = await withAuth(['ADMIN']);
    expect(error).toBeNull();
    expect(session?.user.role).toBe('ADMIN');
  });
});

describe('helpers', () => {
  it('apiResponse embrulha em {success,data}', async () => {
    const res = apiResponse({ a: 1 }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true, data: { a: 1 } });
  });
  it('apiError embrulha em {success:false,error}', async () => {
    const res = apiError('x', 404);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: 'x' });
  });
});
```
- [ ] **Step 2:** Run `npm run test -- api-utils` → Expected: FAIL.
- [ ] **Step 3: Implementar** `src/lib/api-utils.ts` (adaptado: roles STUDENT|ADMIN; sem MANAGER)
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

type Role = 'STUDENT' | 'ADMIN';

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
export function validationError(error: z.ZodError) {
  const msgs = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return apiError(msgs.join('; '), 422);
}
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | NextResponse> {
  try {
    return schema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) return validationError(err);
    return apiError('Corpo da requisição inválido', 400);
  }
}
export async function withAuth(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user) return { error: apiError('Não autenticado', 401), session: null };
  const role = (session.user as { role?: Role }).role;
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return { error: apiError('Sem permissão', 403), session: null };
  }
  return { error: null, session: session as { user: { id: string; role: Role } } };
}
```
- [ ] **Step 4:** Run `npm run test -- api-utils` → Expected: PASS (5).
- [ ] **Step 5: Commit** `git add src/lib/api-utils.* && git commit -m "feat(universinid): api-utils (withAuth ADMIN, apiResponse/Error, parseBody)"`

**Tarefa 3.2 — Validators Zod (course/module/lesson/reorder/publish/upload)**
- Agente: `nid-backend-engineer`
- Depende de: 0.1
- Evidência: `npx tsc --noEmit` ok; usados nas rotas seguintes.

- [ ] **Step 1: Criar** `src/lib/universinid/validators.ts`
```ts
import { z } from 'zod';

export const HTTP_URL = z.string().url().refine((u) => /^https?:\/\//.test(u), 'URL deve ser http(s)');

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug: minúsculas, números e hífen'),
  subtitle: z.string().optional(),
});
export const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
}); // sem slug → imutável na UI

export const createModuleSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().min(1).default('📘'),
});
export const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  emoji: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export const createLessonSchema = z.object({
  moduleId: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  tempoMin: z.number().int().min(1).default(5),
  dificuldade: z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']).default('INICIANTE'),
});
export const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  tempoMin: z.number().int().min(1).optional(),
  dificuldade: z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  contentDraft: z.array(z.unknown()).optional(), // ⚠️ B3: z.unknown() NÃO z.any() (regra no-explicit-any quebra o build); sanitizado por sanitizeContentDoc no handler
}); // sem slug → imutável (risco #1)

export const reorderSchema = z.object({
  parentId: z.string().min(1).optional(), // A4: courseId (p/ módulos) ou moduleId (p/ lições); ausente p/ cursos (raiz)
  items: z.array(z.object({ id: z.string().min(1), position: z.number().int().min(0) })).min(1),
});
// A4: nos reorders de Module/Lesson, o handler DEVE escopar pelo pai:
//   prisma.module.update({ where: { id: it.id, courseId: parsed.parentId }, ... }) — impede mover item de outro pai.

export const uploadQuerySchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\//, 'Apenas imagens'),
});
```
- [ ] **Step 2:** Run `npx tsc --noEmit` → Expected: 0 erro.
- [ ] **Step 3: Commit** `git add src/lib/universinid/validators.ts && git commit -m "feat(universinid): validators Zod do admin de conteúdo"`

**Tarefa 3.3 — Course CRUD (rota canônica, TDD completo)**
- Agente: `nid-backend-engineer`
- Depende de: 3.1, 3.2, 1.3
- Evidência: testes de GET/POST/PATCH/DELETE verdes (mock prisma+auth).

- [ ] **Step 1: Teste falho** — `src/app/api/universinid/admin/courses/courses.test.ts`
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, courseFindMany, courseCreate, courseAggregate } = vi.hoisted(() => ({
  authMock: vi.fn(), courseFindMany: vi.fn(), courseCreate: vi.fn(), courseAggregate: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  course: { findMany: courseFindMany, create: courseCreate, aggregate: courseAggregate },
} }));

import { GET, POST } from './route';
const ADMIN = { user: { id: 'a', role: 'ADMIN' } };

function req(body?: unknown) {
  return new NextRequest('http://t/api/universinid/admin/courses', {
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });
}

describe('courses route', () => {
  beforeEach(() => { authMock.mockReset(); authMock.mockResolvedValue(ADMIN); courseFindMany.mockReset(); courseCreate.mockReset(); courseAggregate.mockReset(); });

  it('GET 200 lista cursos ordenados', async () => {
    courseFindMany.mockResolvedValue([{ id: 'c1', position: 0 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
  });

  it('GET 401 sem sessão', async () => {
    authMock.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it('POST 403 p/ não-admin', async () => {
    authMock.mockResolvedValue({ user: { id: 's', role: 'STUDENT' } });
    expect((await POST(req({ title: 'X', slug: 'x' }))).status).toBe(403);
  });

  it('POST cria com position = max+1 e status DRAFT', async () => {
    courseAggregate.mockResolvedValue({ _max: { position: 4 } });
    courseCreate.mockResolvedValue({ id: 'c2', position: 5 });
    const res = await POST(req({ title: 'Novo', slug: 'novo' }));
    expect(res.status).toBe(201);
    expect(courseCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ position: 5, status: 'DRAFT' }) }));
  });

  it('POST 422 quando slug inválido', async () => {
    expect((await POST(req({ title: 'X', slug: 'Maiúsculo!' }))).status).toBe(422);
  });
});
```
- [ ] **Step 2:** Run `npm run test -- courses` → Expected: FAIL.
- [ ] **Step 3: Implementar** `src/app/api/universinid/admin/courses/route.ts`
```ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, parseBody } from '@/lib/api-utils';
import { createCourseSchema } from '@/lib/universinid/validators';

export async function GET() {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const courses = await prisma.course.findMany({
    orderBy: { position: 'asc' },
    include: { modules: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' }, select: { id: true, slug: true, title: true, status: true, position: true } } } } },
  });
  return apiResponse(courses);
}

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const parsed = await parseBody(request, createCourseSchema);
  if (parsed instanceof Response) return parsed;
  const max = await prisma.course.aggregate({ _max: { position: true } });
  const course = await prisma.course.create({
    data: { title: parsed.title, slug: parsed.slug, subtitle: parsed.subtitle ?? null, position: (max._max.position ?? -1) + 1, status: 'DRAFT' },
  });
  return apiResponse(course, 201);
}
```
- [ ] **Step 4:** Run `npm run test -- courses` → Expected: PASS (5).
- [ ] **Step 5: Implementar** `src/app/api/universinid/admin/courses/[id]/route.ts`
```ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError, parseBody } from '@/lib/api-utils';
import { updateCourseSchema } from '@/lib/universinid/validators';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await parseBody(request, updateCourseSchema);
  if (parsed instanceof Response) return parsed;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return apiError('Curso não encontrado', 404);
  const updated = await prisma.course.update({ where: { id }, data: parsed });
  return apiResponse(updated);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return apiError('Curso não encontrado', 404);
  await prisma.course.delete({ where: { id } }); // Cascade derruba módulos/lições
  return apiResponse({ deleted: true });
}
```
- [ ] **Step 6: Implementar reorder** `src/app/api/universinid/admin/courses/reorder/route.ts`
```ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, parseBody } from '@/lib/api-utils';
import { reorderSchema } from '@/lib/universinid/validators';

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const parsed = await parseBody(request, reorderSchema);
  if (parsed instanceof Response) return parsed;
  const updated = await prisma.$transaction(
    parsed.items.map((it) => prisma.course.update({ where: { id: it.id }, data: { position: it.position } })),
  );
  return apiResponse(updated);
}
```
- [ ] **Step 7:** Run `npm run test -- courses` (toda a pasta) → Expected: PASS.
- [ ] **Step 8: Commit** `git add src/app/api/universinid/admin/courses && git commit -m "feat(universinid): Course CRUD + reorder (API admin)"`

**Tarefa 3.4 — Module CRUD + reorder**
- Agente: `nid-backend-engineer`
- Depende de: 3.3
- Evidência: testes espelhando 3.3 (GET por `courseId`, POST/PATCH/DELETE/reorder) verdes.
- **Padrão idêntico ao 3.3**, trocando `course`→`module`, `createCourseSchema`→`createModuleSchema`, `updateCourseSchema`→`updateModuleSchema`. Diferenças explícitas:
  - `GET` recebe `?courseId=` e filtra: `where: { courseId }`, `orderBy: { position }`, `include: { lessons: { orderBy:{position}, select:{id,slug,title,status,position} } }`.
  - `POST`: `position = max(where courseId) + 1`.

- [ ] **Step 1:** Escrever `src/app/api/universinid/admin/modules/modules.test.ts` (espelhar courses.test.ts, com `?courseId=c1` no GET).
- [ ] **Step 2:** Run `npm run test -- modules` → FAIL.
- [ ] **Step 3:** Implementar `modules/route.ts`:
```ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError, parseBody } from '@/lib/api-utils';
import { createModuleSchema } from '@/lib/universinid/validators';

export async function GET(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!courseId) return apiError('courseId é obrigatório', 400);
  const modules = await prisma.module.findMany({
    where: { courseId }, orderBy: { position: 'asc' },
    include: { lessons: { orderBy: { position: 'asc' }, select: { id: true, slug: true, title: true, status: true, position: true } } },
  });
  return apiResponse(modules);
}

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const parsed = await parseBody(request, createModuleSchema);
  if (parsed instanceof Response) return parsed;
  const max = await prisma.module.aggregate({ where: { courseId: parsed.courseId }, _max: { position: true } });
  const mod = await prisma.module.create({ data: { courseId: parsed.courseId, title: parsed.title, emoji: parsed.emoji, position: (max._max.position ?? -1) + 1, status: 'DRAFT' } });
  return apiResponse(mod, 201);
}
```
- [ ] **Step 4:** Implementar `modules/[id]/route.ts` (igual ao courses `[id]`, com `updateModuleSchema` e `prisma.module`).
- [ ] **Step 5:** Implementar `modules/reorder/route.ts` (igual ao courses reorder, com `prisma.module`).
- [ ] **Step 6:** Run `npm run test -- modules` → PASS. **Commit** `feat(universinid): Module CRUD + reorder`.

**Tarefa 3.5 — Lesson CRUD + reorder + publish + save de conteúdo**
- Agente: `nid-backend-engineer` + `nid-security-engineer` (revisar sanitização de URL)
- Depende de: 3.3, 2.3
- Evidência: testes cobrem create (slug obrigatório), PATCH metadados, **PATCH contentDraft (save do editor)**, publish (copia draft→published, status PUBLISHED), e que **slug não pode ser alterado** (não há campo).

- [ ] **Step 1: Teste falho** — `src/app/api/universinid/admin/lessons/lessons.test.ts` (espelhar; + 2 casos):
```ts
// ...setup com lessonUpdate, lessonFindUnique, lessonCreate, lessonAggregate...
it('PATCH salva contentDraft (doc do editor)', async () => {
  lessonFindUnique.mockResolvedValue({ id: 'L1' });
  lessonUpdate.mockResolvedValue({ id: 'L1' });
  const res = await PATCH(reqJson({ contentDraft: [{ type: 'paragraph', id: 'b', props: {}, content: [], children: [] }] }), ctx('L1'));
  expect(res.status).toBe(200);
  expect(lessonUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ contentDraft: expect.any(Array) }) }));
});
it('publish copia contentDraft → contentPublished e seta PUBLISHED', async () => {
  lessonFindUnique.mockResolvedValue({ id: 'L1', contentDraft: [{ type: 'paragraph' }] });
  lessonUpdate.mockResolvedValue({ id: 'L1', status: 'PUBLISHED' });
  const res = await POST_PUBLISH(reqEmpty(), ctx('L1'));
  expect(lessonUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED', contentPublished: [{ type: 'paragraph' }] }) }));
});
```
- [ ] **Step 2:** Run `npm run test -- lessons` → FAIL.
- [ ] **Step 3:** Implementar `lessons/route.ts` (POST create: `position=max(where moduleId)+1`, `contentDraft=contentPublished=[]`), `lessons/[id]/route.ts` (PATCH: metadados **e/ou** `contentDraft`; DELETE), `lessons/reorder/route.ts`, e:
```ts
// src/app/api/universinid/admin/lessons/[id]/publish/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError } from '@/lib/api-utils';
type Ctx = { params: Promise<{ id: string }> };
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) return apiError('Lição não encontrada', 404);
  const updated = await prisma.lesson.update({ where: { id }, data: { status: 'PUBLISHED', contentPublished: lesson.contentDraft ?? [] } });
  return apiResponse(updated);
}
```
- [ ] **Step 4 (A1 — defesa XSS, código obrigatório):** criar `src/lib/universinid/sanitize-content.ts` + teste `sanitize-content.test.ts` (em `src/`, coletado):
```ts
// src/lib/universinid/sanitize-content.ts
const EMBED_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com'];
const VIDEODELIVERY = /\.videodelivery\.net$/; // Cloudflare Stream

export function isSafeHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  try { const u = new URL(raw); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}
export function isAllowedEmbed(raw: unknown): boolean {
  if (!isSafeHttpUrl(raw)) return false;
  try { const h = new URL(raw).hostname; return EMBED_HOSTS.includes(h) || VIDEODELIVERY.test(h); } catch { return false; }
}
export interface ContentCheck { ok: boolean; error?: string; }
export function validateContentDoc(doc: unknown): ContentCheck {
  if (!Array.isArray(doc)) return { ok: false, error: 'conteúdo deve ser um array de blocos' };
  for (const block of doc) {
    const b = block as { type?: string; props?: { url?: unknown } };
    if (b?.type === 'image' && !isSafeHttpUrl(b.props?.url)) return { ok: false, error: 'imagem: URL deve ser http(s)' };
    if (b?.type === 'embed' && !isAllowedEmbed(b.props?.url)) return { ok: false, error: 'embed: só YouTube/Vimeo/Stream' };
  }
  return { ok: true };
}
```
Teste (com payloads reais de ataque):
```ts
import { describe, it, expect } from 'vitest';
import { validateContentDoc, isAllowedEmbed } from './sanitize-content';
describe('validateContentDoc (XSS)', () => {
  it('rejeita image com javascript:', () => { expect(validateContentDoc([{ type: 'image', props: { url: 'javascript:alert(1)' } }]).ok).toBe(false); });
  it('rejeita image com data:', () => { expect(validateContentDoc([{ type: 'image', props: { url: 'data:text/html,<script>' } }]).ok).toBe(false); });
  it('rejeita embed de host fora da allowlist', () => { expect(validateContentDoc([{ type: 'embed', props: { url: 'https://evil.com/x' } }]).ok).toBe(false); });
  it('aceita embed YouTube e imagem https', () => {
    expect(validateContentDoc([{ type: 'embed', props: { url: 'https://youtube.com/embed/x' } }, { type: 'image', props: { url: 'https://blob.vercel.com/a.png' } }]).ok).toBe(true);
  });
});
```
- [ ] **Step 5: Wire no handler** — em `lessons/[id]` PATCH, se `parsed.contentDraft` presente: `const c = validateContentDoc(parsed.contentDraft); if (!c.ok) return apiError(c.error!, 422);` antes do `update`.
- [ ] **Step 6:** Run `npm run test -- lessons sanitize-content` → PASS. **Commit** `feat(universinid): Lesson CRUD + reorder + publish + save (sanitização XSS write-time)`.

**Tarefa 3.6 — Upload de imagem (Vercel Blob)**
- Agente: `nid-backend-engineer` + `nid-security-engineer`
- Depende de: 3.1
- Evidência: teste valida 403 não-admin, 400 não-imagem; manual: upload de PNG retorna URL pública.

- [ ] **Step 1: Teste falho** — `upload.test.ts` (mock `@vercel/blob` `put`): 403 p/ STUDENT; 400 quando contentType não-imagem; 200 retornando `{ url }`.
- [ ] **Step 2:** Implementar `src/app/api/universinid/admin/upload/route.ts`
```ts
import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { withAuth, apiResponse, apiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const filename = request.nextUrl.searchParams.get('filename');
  const contentType = request.headers.get('content-type') ?? '';
  if (!filename) return apiError('filename é obrigatório', 400);
  if (!contentType.startsWith('image/')) return apiError('Apenas imagens', 400);
  if (!request.body) return apiError('Corpo vazio', 400);
  // A6: teto server-upload da Vercel = 4,5MB. Rejeitar EXPLICITAMENTE (413), não deixar a plataforma dar erro opaco.
  const MAX = 4.5 * 1024 * 1024;
  const len = Number(request.headers.get('content-length') ?? '0');
  if (len > MAX) return apiError('Imagem acima de 4,5MB — use uma menor (client-upload virá depois)', 413);
  const blob = await put(`universinid/${Date.now()}-${filename}`, request.body, { access: 'public', contentType });
  return apiResponse({ url: blob.url });
}
```
- [ ] **Step 3 (runbook A6):** Provisionar o **Blob store** no projeto Vercel + `BLOB_READ_WRITE_TOKEN` (prod: injetado pela Vercel; dev: `vercel env pull .env.local`). Sem store/token o runtime falha **embora o teste (mock de `put`) passe** — por isso é runbook, não teste. Run `npm run test -- upload` → PASS.
- [ ] **Step 4: Commit** `feat(universinid): upload de imagem via Vercel Blob (admin, ≤4,5MB)`.

---

### Fase 4 — Editor BlockNote (cliente) + react-query

**Tarefa 4.1 — QueryProvider + Toaster**
- Agente: `nid-frontend-engineer`
- Depende de: 0.1
- Evidência: app monta sem erro de provider; `npm run build` ok.

- [ ] **Step 1: Criar** `src/components/universinid/QueryProvider.tsx`
```tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
```
- [ ] **Step 2: Embrulhar** em `src/app/universinid/(app)/layout.tsx` — envolver `<ShellChrome>...</ShellChrome>` com `<QueryProvider>`.
- [ ] **Step 3:** Run `npm run build` → Expected: ok. **Commit** `feat(universinid): react-query provider + sonner`.

**Tarefa 4.2 — Hook react-query do admin de conteúdo**
- Agente: `nid-frontend-engineer`
- Depende de: 3.3–3.5, 4.1
- Evidência: `npx tsc --noEmit` ok; usado pelos componentes admin.

- [ ] **Step 1: Criar** `src/hooks/universinid/use-admin-content.ts` espelhando `apontdelp/src/hooks/use-pcp-schedule.ts`: `apiFetch` helper (lê `{success,data}`/`{error}`), `useQuery(['uni-courses'])`, `useMutation` p/ create/update/delete/reorder/publish/saveContent por entidade, `onSuccess→toast.success+invalidate`, `onError→toast.error`. (Código completo no estilo do hook irmão; ~120 linhas.)
- [ ] **Step 2:** Run `npx tsc --noEmit` → ok. **Commit** `feat(universinid): hook react-query do admin de conteúdo`.

**Tarefa 4.3 — Primitivos de UI hand-roll**
- Agente: `nid-frontend-engineer` + `nid-accessibility-engineer`
- Depende de: 0.2
- Evidência: render visual ok; dialog acessível (foco preso, Esc fecha, `aria` correto — Radix garante).
- ⚠️ **Dep mismatch (achado da Fase 0):** `tailwind-merge` resolveu p/ **^3.6.0** (mira Tailwind 4), mas o projeto é **tailwindcss 3.4.14**. `cn()` (`src/lib/utils.ts`) usa `twMerge` → merge de classes pode errar em TW3. **Antes** de usar `cn` nos primitivos: `npm install tailwind-merge@^2` (versão p/ TW3) e revalidar build. (`lucide-react@^1.17.0` também resolveu alto — validar a API de ícones ao usar.)

- [ ] **Step 1: Criar** `src/components/universinid/ui/`:
  - `button.tsx` (cva: variantes default/ghost/danger; alvo ≥44px conforme a11y industrial), `input.tsx`, `textarea.tsx`, `select.tsx` (nativo estilizado), `dialog.tsx` (wrapper de `@radix-ui/react-dialog` com `cn`).
  - Estilos via classes Tailwind 3 + tokens do `universinid.css` (`var(--p)`, `var(--red)`...). Texto ≥18px, contraste ≥4.5:1.
- [ ] **Step 2:** Run `npm run build` → ok. **Commit** `feat(universinid): primitivos de UI (button/input/textarea/select/dialog) hand-roll`.

**Tarefa 4.4 — LessonEditor (BlockNote)**
- Agente: `nid-frontend-engineer`
- Depende de: 4.2, 4.3, 3.6
- Evidência: **manual** — abrir uma lição no admin, adicionar parágrafo + imagem (upload) + embed, salvar; recarregar mostra o conteúdo (contentDraft persistido).

> ⚠️ **GUARD CRÍTICO (falha silenciosa):** `legacy-embed` **não** é um bloco do schema do BlockNote. Passar um doc `[{type:'legacy-embed'}]` para `useCreateBlockNote({ initialContent })` faz o editor **lançar/descartar** (ele valida `initialContent` contra o schema). Como TODA lição nasce legacy-embed (2.1), abrir uma lição ainda-não-decomposta no editor — o mecanismo central da decomposição (5.2 step 3) — quebraria. Por isso: se `isLegacyEmbed(initial)` → abrir o editor **vazio** + banner "começar a autorar substitui o embed legado". O 1º save (doc real) sobrescreve o `contentDraft` legacy.

- [ ] **Step 1 (verificar antes de codar):** Confirmar na doc do BlockNote se `useCreateBlockNote` com tipo desconhecido em `initialContent` **lança** ou **filtra**. Em qualquer caso, aplicar o guard abaixo (não depender do comportamento).
- [ ] **Step 2: Criar** `src/components/universinid/admin/LessonEditor.tsx`
```tsx
'use client';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCallback, useRef } from 'react';
import type { PartialBlock } from '@blocknote/core';
import { isLegacyEmbed } from '@/lib/universinid/content-types';

async function uploadImage(file: File): Promise<string> {
  const res = await fetch(`/api/universinid/admin/upload?filename=${encodeURIComponent(file.name)}`, {
    method: 'POST', headers: { 'content-type': file.type }, body: file,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Falha no upload');
  return json.data.url as string;
}

export function LessonEditor({ initial, onSave }: { initial: unknown[] | undefined; onSave: (doc: unknown[]) => void }) {
  const legacy = isLegacyEmbed(initial);                       // ← guard: lição ainda-legada
  const editor = useCreateBlockNote({
    initialContent: !legacy && initial && initial.length ? (initial as PartialBlock[]) : undefined,
    uploadFile: uploadImage,
  });
  const t = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = useCallback(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => onSave(editor.document), 800); // debounce salva contentDraft
  }, [editor, onSave]);
  return (
    <div>
      {legacy && (
        <p role="status" className="uni-legacy-hint">
          Esta lição ainda usa o conteúdo legado (HTML embutido). Comece a autorar abaixo — ao salvar, o conteúdo nativo substitui o embed legado.
        </p>
      )}
      <BlockNoteView editor={editor} onChange={handleChange} />
    </div>
  );
}
```
- [ ] **Step 3 (B5 — SSR):** Confirmar se a cadeia de import do BlockNote toca `window`/`document` em escopo de módulo (App Router server-renderiza o 1º request mesmo em `'use client'`). **Por segurança, não importar `LessonEditor` direto** na página: carregar via `next/dynamic` com `ssr: false`:
```tsx
// src/app/universinid/(app)/admin/licao/[id]/page.tsx (client wrapper)
'use client';
import dynamic from 'next/dynamic';
const LessonEditor = dynamic(() => import('@/components/universinid/admin/LessonEditor').then(m => m.LessonEditor), {
  ssr: false, loading: () => <p>Carregando editor…</p>,
});
// ...usar <LessonEditor initial={...} onSave={saveContent} /> + botão Publicar (POST publish)
```
- [ ] **Step 4: Verificação manual** — `npm run dev`, logar como admin: **(z)** a página de edição **não** lança "window is not defined" no server log; **(a)** abrir lição **legada** → editor vazio + banner, sem erro de console; **(b)** adicionar os 3 tipos de bloco, salvar, recarregar → conteúdo persiste (`contentDraft` substituiu o legacy). **Commit** `feat(universinid): LessonEditor (BlockNote, dynamic ssr:false) + guard legacy + upload + save debounced`.

**Tarefa 4.5 — ContentTree (gestão da árvore)**
- Agente: `nid-frontend-engineer`
- Depende de: 4.2, 4.3
- Evidência: manual — criar curso/módulo/lição, reordenar (drag), publicar/despublicar; mudanças refletem após invalidate.

- [ ] **Step 1: Criar** `src/components/universinid/admin/ContentTree.tsx` — árvore Course→Module→Lesson com ações (criar via Dialog, editar metadados, excluir, drag-reorder via `@hello-pangea/dnd` **ou** botões ↑/↓ que chamam `reorder`). Aba "Conteúdo" em `src/app/universinid/(app)/admin/`. (DnD opcional: começar com ↑/↓ para reduzir risco; drag fica como melhoria.)
- [ ] **Step 2: Verificação manual** + **Commit** `feat(universinid): ContentTree (CRUD+reorder+publish na UI admin)`.

---

### Fase 5 — Render por whitelist + decomposição do iframe + scroll

**Tarefa 5.1 — Renderer por whitelist (server, sem dangerouslySetInnerHTML)**
- Agente: `nid-frontend-engineer` + `nid-security-engineer`
- Depende de: 1.1
- Evidência: testes provam render de paragraph/heading/list/image/embed e que **tipo desconhecido degrada (não lança)**.

- [ ] **Step 1: Teste falho** — `src/components/universinid/RenderBlocks.test.tsx`
```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RenderBlocks } from './RenderBlocks';

describe('RenderBlocks (whitelist)', () => {
  it('renderiza parágrafo como <p> com o texto', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'b', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'olá', styles: {} }], children: [] }]} />);
    expect(html).toContain('olá');
    expect(html).toContain('<p');
  });
  it('embed vira iframe com a URL', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'e', type: 'embed', props: { url: 'https://youtube.com/embed/x' } }]} />);
    expect(html).toContain('iframe');
    expect(html).toContain('youtube.com/embed/x');
  });
  it('bloco desconhecido degrada (não lança, não renderiza)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => renderToStaticMarkup(<RenderBlocks doc={[{ id: 'z', type: 'sorcery', props: {} } as never]} />)).not.toThrow();
    warn.mockRestore();
  });

  // A2 — defesa em profundidade: re-valida no READ (doc pode chegar sem passar pelo PATCH: seed, import futuro, escrita direta)
  it('NEUTRALIZA href javascript: (não emite o atributo perigoso)', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'p', type: 'paragraph', props: {}, content: [{ type: 'link', href: 'javascript:alert(1)', content: [{ type: 'text', text: 'x', styles: {} }] }], children: [] }]} />);
    expect(html).not.toContain('javascript:');
  });
  it('NÃO emite iframe p/ embed de host fora da allowlist', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'e', type: 'embed', props: { url: 'https://evil.com/x' } }]} />);
    expect(html).not.toContain('evil.com');
    expect(html).not.toContain('<iframe');
  });
});
```
- [ ] **Step 2:** Run `npm run test -- RenderBlocks` → FAIL.
- [ ] **Step 3: Implementar** `src/components/universinid/RenderBlocks.tsx` — mapeia cada `UniBlock` por `type`. **Defesa em profundidade (A2):** reusar `isSafeHttpUrl`/`isAllowedEmbed` de `sanitize-content.ts` **também no read** — `<a href>` só se `isSafeHttpUrl(href)` (senão `<span>` sem href); `<img src>` só se `isSafeHttpUrl(src)` (senão skip+warn); `embed`→`<iframe>` só se `isAllowedEmbed(url)` (senão skip+warn); `legacy-embed`→`null` (tratado na página, 5.2); `default`→`console.warn` + `null`. **Nunca** `dangerouslySetInnerHTML`.
- [ ] **Step 4:** Run `npm run test -- RenderBlocks` → PASS. **Commit** `feat(universinid): renderer de blocos por whitelist (seguro, degrada)`.

**Tarefa 5.2 — Página da lição: ler do banco + decompor iframe**
- Agente: `nid-frontend-engineer`
- Depende de: 5.1, 2.3
- Evidência: lição ainda-legada mostra o iframe (igual hoje); lição decomposta mostra conteúdo nativo; progresso (MarkComplete/TrackOpen) intacto.

- [ ] **Step 1: Modificar** `src/app/universinid/(app)/licao/[slug]/page.tsx`:
```tsx
// trecho central
const session = await auth();
const isAdmin = session?.user?.role === 'ADMIN';
const lesson = await resolveLessonBySlug(slug);
if (!lesson) notFound();
if (lesson.status !== 'PUBLISHED' && !isAdmin) notFound(); // ← não vazar rascunho por URL
const doc = ((isAdmin ? lesson.contentDraft : lesson.contentPublished) ?? []) as UniBlockDoc; // admin pré-visualiza draft
// ...barra com título + MarkComplete (slug = lesson.slug) + TrackOpen (inalterados)...
{isLegacyEmbed(doc) ? (
  <iframe className="uni-frame" src={`/universinid.html?embed=1#${(doc[0] as { props: { screenId: string } }).props.screenId}`} title={lesson.title} />
) : (
  <div className="uni-content"><RenderBlocks doc={doc} /></div>
)}
```
- [ ] **Step 2:** Garantir que `MarkComplete`/`TrackOpen` recebem `lesson.slug` (a chave de progresso permanece o slug). NÃO alterar `actions.markLessonProgress`.
- [ ] **Step 3: Verificação manual** — abrir uma lição (legada) → iframe igual; o progresso "concluir" continua funcionando. **Commit** `feat(universinid): lição lê do banco; iframe só p/ legacy-embed`.

**Tarefa 5.3 — Scroll escopado (RISCO/escopo: NÃO tocar globals.css)**
- Agente: `nid-frontend-engineer`
- Depende de: 5.2
- Evidência: decompor 1 lição longa → conteúdo rola **dentro** do shell; chrome/landing fixos; `globals.css` intocado (diff vazio).

- [ ] **Step 1: Adicionar** em `src/app/universinid/universinid.css` um container de scroll escopado:
```css
.uni-content {
  flex: 1;
  min-height: 0;            /* permite o filho rolar dentro do flex */
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px clamp(16px, 4vw, 48px);
}
```
- [ ] **Step 2:** Confirmar que o ancestral `.uni-lesson`/shell é `display:flex; flex-direction:column; height:100%` (ajustar **só** em `universinid.css` se necessário). **NÃO** editar `globals.css`.
- [ ] **Step 3: Verificação manual** — decompor (no editor) uma lição com muito conteúdo, publicar, abrir como aluno → rola dentro do shell. `git diff src/app/globals.css` → vazio.
- [ ] **Step 4: Commit** `fix(universinid): scroll escopado para conteúdo nativo (sem tocar globals.css)`.

---

### Fase 6 — Vitrine + sidebar com nível Course

**Tarefa 6.1 — Dashboard/vitrine por Course→Module→Lesson (publicado)**
- Agente: `nid-frontend-engineer`
- Depende de: 2.3 (`getPublishedTree`)
- Evidência: manual — vitrine lista o curso "IA Agêntica no NID" → 6 módulos → 39 lições; progresso por slug aparece igual.

- [ ] **Step 1: Modificar** `src/app/universinid/(app)/page.tsx` para ler `getPublishedTree()` em vez de `CATALOGO`, mantendo o cálculo de progresso por `slug` (via `getProgressMap`). Render: seção por Course, grupo por Module, cards de Lesson (tempo/dificuldade).
- [ ] **Step 2: Modificar** o `ShellChrome`/sidebar para navegar Course→Module→Lesson (hoje navega módulos). Manter ⌘K.
- [ ] **Step 3:** Atualizar `catalogo.test.ts` — o teste que valida `screenId` em `universinid.html` deve sobreviver enquanto houver lições legadas; quando todas decompostas, esse teste se aposenta. Por ora, mantê-lo (ainda há legacy-embed). **Commit** `feat(universinid): vitrine/sidebar lendo do banco (Course→Module→Lesson)`.

---

### Fase 7 — Revisão, segurança e fechamento

**Tarefa 7.1 — CSP (conjunto COMPLETO, no middleware)**
- Agente: `nid-security-engineer`
- Depende de: 5.1
- Evidência: CSP presente **só** em `/universinid/**`; **(a)** lição legada (iframe `/universinid.html`) renderiza; **(b)** embed de vídeo renderiza; **(c)** imagem do Blob + preview do editor renderizam; **(d)** a app **hidrata** (sem tela branca); **(e)** o editor Mantine fica estilizado.
- ⚠️ **B4 (gate):** especificar o conjunto inteiro — uma diretiva faltando derruba a app:
  - `frame-src 'self' https://*.youtube.com https://www.youtube.com https://player.vimeo.com https://*.videodelivery.net` — `'self'` é **obrigatório** p/ o iframe legado `/universinid.html` durante a migração (sem ele, todas as 39 lições ficam em branco no dia 1).
  - `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com` — Blob (upload) + `blob:`/`data:` (preview pré-upload do BlockNote).
  - `script-src 'self' 'unsafe-inline'` (ou nonce) — Next injeta scripts inline de bootstrap/hydration; `'self'` puro **quebra a hidratação da app toda**.
  - `style-src 'self' 'unsafe-inline'` — `@blocknote/mantine` injeta estilo inline (senão o editor renderiza sem estilo).
- [ ] **Step 1:** Adicionar a CSP **no `src/middleware.ts`** (já escopado a `/universinid/:path*` via matcher) setando o header `Content-Security-Policy` na `NextResponse` — **NÃO** em `next.config headers()` global (arriscaria o worker/blob da landing 3D). **Step 2:** Verificar no browser cada item (a)–(e) da evidência. **Commit** `feat(universinid): CSP completa para /universinid (middleware)`.

**Tarefa 7.2 — Revisão de código + a11y + build/test final**
- Agente: `nid-code-reviewer` + `nid-accessibility-engineer` + `nid-qa-engineer`
- Depende de: todas
- Evidência: `npm run build` ok; `npm run test` 100% verde; a11y AA nos formulários/editor; review sem issue >80% confiança.
- [ ] **Step 1:** `npm run test` (toda a suíte). **Step 2:** `npm run build`. **Step 3:** revisão a11y (alvos ≥44px, labels, foco, contraste). **Step 4:** code review. **Commit** de ajustes.

**Tarefa 7.3 — Smoke e2e (estender o smoke da Fase 1)**
- Agente: `nid-qa-engineer`
- Depende de: 7.2
- Evidência: `scripts/smoke-universinid.mjs` estendido: login admin → criar curso/módulo/lição → editar conteúdo → publicar → ver como aluno → progresso. 0 erro de console.
- [ ] **Step 1:** Estender o smoke. **Step 2:** Rodar. **Commit** `test(universinid): smoke e2e da Fase 2a`.

---

## Estimativa

| Fase | Tarefas | Estimativa |
|------|---------|------------|
| 0 — Deps/scaffolding | 2 | 0,5 dia |
| 1 — Schema + tipos | 3 | 1 dia |
| 2 — Migração 39 slugs | 3 | 1,5 dia |
| 3 — API + CRUD | 6 | 3 dias |
| 4 — Editor + react-query | 5 | 3 dias |
| 5 — Render + decomposição + scroll | 3 | 2 dias |
| 6 — Vitrine/sidebar | 1 | 1,5 dia |
| 7 — Revisão/segurança/smoke | 3 | 1,5 dia |
| **Total** | **26** | **~14 dias** |

## Riscos técnicos
1. **Slug orphaning (#1):** `Lesson.slug` sem campo de rename na UI + `LessonSlugAlias` + resolução por alias (2.3). Teste 2.1 prova cobertura dos 39 slugs.
2. **`prisma-json-types-generator` x Prisma 7:** se o gerador não casar com o client custom em `src/generated/prisma`, fallback `Json` não-tipado + cast via `content-types.ts` (1.3 Step 3). Não bloqueia.
3. **BlockNote x React 19/Next 15:** peer compatível (ADR); usar variante `@blocknote/mantine` (estilos isolados ao editor). Se conflitar com Tailwind, o editor fica em página própria.
4. **Teto 4,5MB Blob:** server-upload só ≤4,5MB; arquivos maiores ficam fora do 1º corte (client-upload é melhoria).
5. **Scroll:** fix escopado em `universinid.css`; **proibido** tocar `globals.css` (kiosk/landing).
6. **Regressão da landing 3D:** tudo isolado em `/universinid/**`; nenhuma rota-raiz alterada.

## Gate (/nid:gate) — resultado 2026-06-03
1ª passada (red-team `nid-red-team`): **NO-GO**, 4 bloqueantes + rider de segurança. **Todos remediados neste plano** (B1–B5 inline; A1/A2/A4/A6/A7 com código; A3/A5/A8 abaixo). Refinamentos pós-grounding (Block→Json, position, hand-roll UI, DOMPurify adiado) ratificados.

### Riders pós-gate (obrigatórios, ainda sem tarefa dedicada)
- **A3 — DELETE orfana `LessonProgress`:** `LessonProgress` é join-por-valor no `slug` (sem FK). `DELETE` de Course (cascade) ou Lesson deixa progresso órfão. **Decisão:** nas rotas `[id]` DELETE de Course/Module/Lesson, **bloquear** (409) se existir `LessonProgress` para algum slug descendente, com mensagem "há progresso de alunos — despublique em vez de excluir". (Alternativa aceita: permitir + logar. Decidir no início da Fase 3; default = bloquear.)
- **A5 — RBAC só no handler:** o `middleware.ts` matcher `/universinid/:path*` **NÃO** cobre `/api/universinid/**`. Logo `withAuth(['ADMIN'])` é a **única** guarda das rotas admin → **toda** rota (incl. as espelho 3.4/3.5/reorder/publish/upload) DEVE enumerar `withAuth(['ADMIN'])` explicitamente. Checagem no review (7.2): `grep` por handlers admin sem `withAuth`.
- **A8 — Runbook de cutover:** as Fases 5.2/6.1 trocam leitura de `CATALOGO` (estático) → banco. **Antes** do deploy de cutover em prod: rodar `npm run db:push` + `npm run db:seed` contra o Neon de **prod** (senão site vazio). `db:seed` (`tsx prisma/seed.ts`) ≠ `npm run seed` (`scripts/seed.mjs`, que é o seed de xlsx/landing) — não confundir.

### SITs / checagens obrigatórias (confirmar no início da implementação)
- [ ] B1: `vitest include` = `['src/**/*.test.ts','src/**/*.test.tsx','prisma/**/*.test.ts']` + smoke prova os 3 eixos.
- [ ] B2: `buildSeedPlan` em `src/lib/universinid/seed-plan.ts` (puro, sem prisma); I/O em `prisma/seed-content.ts`.
- [ ] B3: nenhum `z.any()` (usar `z.unknown()`); `next build` verde.
- [ ] B4: CSP completa no middleware (`frame-src 'self'`+vídeo; `img-src 'self' data: blob: blob-host`; `script-src` nonce/unsafe-inline; `style-src 'unsafe-inline'`).
- [ ] B5: `LessonEditor` via `next/dynamic({ssr:false})`; sem "window is not defined".
- [ ] A1/A2: `sanitize-content.ts` + teste XSS adversarial; `RenderBlocks` re-valida URL no read.
- [ ] A4: `reorder` escopa pelo `parentId`.
- [ ] A5: toda rota admin enumera `withAuth(['ADMIN'])`.
- [ ] A6: 413 p/ >4,5MB + Blob store/token provisionados.
- [ ] A7: `prisma-json-types-generator` em `dependencies`.
- [ ] A3: política de DELETE vs progresso decidida.
- [ ] A8: `db:push`+`db:seed` em prod antes do cutover.

## Self-review (writing-plans)
- **Cobertura da spec:** schema+migração (F1–F2), CRUD/publish (F3), editor/upload (F3.6/F4), render whitelist (F5.1), decomposição+scroll (F5.2–5.3), vitrine/sidebar (F6), segurança/CSP (F3.5/7.1), risco #1 (F2.1/2.3). ✔
- **Sem placeholders:** código real em cada passo de implementação; tarefas espelhadas (3.4/3.5) trazem schema+path+handler explícitos.
- **Consistência de tipos:** `UniBlockDoc`/`isLegacyEmbed`/`legacyEmbedDoc` (1.1) reusados em 2.1/5.1/5.2; `withAuth/apiResponse/parseBody` (3.1) em todas as rotas; `position` consistente em course/module/lesson.

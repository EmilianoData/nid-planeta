---
date: 2026-06-23
spec: docs/superpowers/specs/2026-06-23-universinid-fase09-medalhas.md
status: pendente-gate
tipo: web
fase_quadro: FASE-09 (MVP medalhas/conquistas) — Frente B
---

# FASE-09 MVP — Medalhas / Conquistas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans. Steps em checkbox (`- [ ]`).

**Goal:** Conceder medalhas de conclusão (1 por módulo + 1 pelo curso), persistidas com `awardedAt`, exibidas em `/universinid/conquistas` e contadas no dashboard — sem tocar `User`/`LessonProgress`/slug/CSP/landing/kiosk.

**Architecture:** Catálogo `Badge` (seed da árvore) + concessões `UserBadge` (`userId` **join-por-valor**, sem FK `User`). Função **pura** `badgesGanhos(alvos, completed)` decide elegibilidade; `grantBadges(userId)` upserta idempotente após `COMPLETED`; backfill retroativo. UI por Server Components.

**Tech Stack:** Prisma 7.8 + Neon (`db:push`, **não** migrate), client `@/generated/prisma`; Vitest (imports explícitos, `vi.mock('@/lib/prisma'|'@/lib/auth')`); Next 15 Server Components; `Icon.tsx`; CSS `.uni-medal*`.

## Global Constraints (verbatim da spec)
- `db:push` + `db:generate` (NUNCA `prisma migrate`). `UserBadge.userId` **join-por-valor** — proibida FK/relação para `User`.
- **NUNCA** alterar colunas de `User`/`LessonProgress`, `slug` de lição, CSP (`middleware.ts`), `globals.css`, landing (`/`), kiosk (`/sistema-solar`).
- Zod `z.unknown()` nas bordas; sem `dangerouslySetInnerHTML`; TDD (teste falha primeiro). CSS só em `universinid.css`; classe **`.uni-medal*`** (não reusar `.uni-badge`). Paleta marinho; sem dep/CDN nova; pt-BR; `git add` explícito.
- Latch de conclusão (`upsertLessonProgress`) intacto: `COMPLETED` nunca regride; falha de concessão **não** pode quebrar o registro de progresso.

## File Structure
- **Modify** `prisma/schema.prisma` — `enum BadgeEscopo` + `model Badge` + `model UserBadge`.
- **Create** `src/lib/universinid/badges.ts` — `badgeSlugModulo`/`badgeSlugCurso`, `badgesGanhos()` (pura), tipos.
- **Create** `src/lib/universinid/badges.test.ts` — TDD da função pura.
- **Modify** `src/lib/universinid/actions.ts` — `grantBadges(userId)`, `getConquistas()`, backfill; `getDashboardData` ganha `conquistas`.
- **Modify** `src/lib/universinid/actions.test.ts` (ou novo) — TDD de `grantBadges` (idempotência/retroatividade) com prisma mockado.
- **Modify** `prisma/seed.ts` — semear `Badge` da árvore (idempotente por `slug`).
- **Create** `src/app/universinid/(app)/conquistas/page.tsx` — página (Server Component).
- **Modify** `src/app/universinid/(app)/page.tsx` — 5º stat "Conquistas".
- **Modify** `src/app/universinid/universinid.css` — `.uni-medal*`.

---

## Fase 1 — Schema + seed do catálogo

### Tarefa 1.1 — Schema `Badge`/`UserBadge` + `db:push`
- **Agente:** `nid-database-engineer`
- **Depende de:** nenhuma.
- [ ] **Step 1 — Adicionar ao `prisma/schema.prisma`:**
```prisma
enum BadgeEscopo { MODULE COURSE }

model Badge {
  id        String      @id @default(cuid())
  slug      String      @unique
  nome      String
  descricao String?
  escopo    BadgeEscopo
  alvoId    String                          // module.id ou course.id (join-por-valor ao conteúdo)
  icone     String      @default("trophy")
  position  Int         @default(0)
  createdAt DateTime    @default(now())
  awards    UserBadge[]
  @@map("badges")
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String                          // JOIN-POR-VALOR — sem FK p/ User (model protegido)
  badgeId   String
  badge     Badge    @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  awardedAt DateTime @default(now())
  @@unique([userId, badgeId])
  @@map("user_badges")
}
```
- [ ] **Step 2 — Aplicar:** `npm run db:push` (Neon) e `npm run db:generate`.
- [ ] **Step 3 — Verificar:** `npx tsc --noEmit` (client tem `Badge`/`UserBadge`); `npm run build`. **Evidência:** `db:push` ok, client gerado, tabelas `badges`/`user_badges` no Neon; `LessonProgress`/`User` inalterados (`git diff prisma/schema.prisma` só adiciona).
- [ ] **Step 4 — Commit:** `git add prisma/schema.prisma && git commit -m "feat(universinid): FASE-09.1 — schema Badge/UserBadge (userId join-por-valor)"`

### Tarefa 1.2 — Helpers de slug + seed do catálogo
- **Agente:** `nid-backend-engineer`
- **Depende de:** 1.1.
- [ ] **Step 1 — `src/lib/universinid/badges.ts` (helpers, sem lógica de I/O):**
```ts
export type BadgeEscopo = 'MODULE' | 'COURSE';
export const badgeSlugModulo = (moduleId: string) => `mod-${moduleId}`;
export const badgeSlugCurso = (courseId: string) => `curso-${courseId}`;
```
- [ ] **Step 2 — Semear em `prisma/seed.ts`** (idempotente por `slug`; 1 Badge MODULE por módulo + 1 COURSE por curso, lidos da árvore já semeada). Para cada curso/módulo: `prisma.badge.upsert({ where: { slug }, create: {...}, update: { nome, position } })`. `nome` MODULE = `"Módulo: ${m.title}"`; COURSE = `"Trilha completa: ${c.title}"`.
- [ ] **Step 3 — Verificar:** `npm run db:seed` cria os badges; **2ª execução = mesma contagem** (idempotente). **Evidência:** contagem `badges` = nº módulos + nº cursos; re-seed não duplica.
- [ ] **Step 4 — Commit:** `git add src/lib/universinid/badges.ts prisma/seed.ts && git commit -m "feat(universinid): FASE-09.2 — seed do catalogo de medalhas (idempotente)"`

---

## Fase 2 — Elegibilidade (pura, TDD) + concessão

### Tarefa 2.1 — `badgesGanhos()` (função pura, TDD)
- **Agente:** `nid-backend-engineer` (coach `nid-tdd-coach`)
- **Produces:** `badgesGanhos(alvos: BadgeAlvo[], completed: Set<string>): string[]` (retorna slugs de badge ganhos).
- **Depende de:** 1.2.
- [ ] **Step 1 — Teste falhando** em `src/lib/universinid/badges.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { badgesGanhos, type BadgeAlvo } from './badges';

const alvos: BadgeAlvo[] = [
  { slug: 'mod-a', escopo: 'MODULE', licaoSlugs: ['l1', 'l2'] },
  { slug: 'mod-b', escopo: 'MODULE', licaoSlugs: ['l3'] },
  { slug: 'curso-x', escopo: 'COURSE', licaoSlugs: ['l1', 'l2', 'l3'] },
];

describe('badgesGanhos', () => {
  it('módulo com todas as lições concluídas é ganho', () => {
    expect(badgesGanhos(alvos, new Set(['l1', 'l2']))).toEqual(['mod-a']);
  });
  it('módulo parcial NÃO é ganho', () => {
    expect(badgesGanhos(alvos, new Set(['l1']))).toEqual([]);
  });
  it('curso só é ganho com TODAS as lições de todos os módulos', () => {
    expect(badgesGanhos(alvos, new Set(['l1', 'l2', 'l3']))).toEqual(['mod-a', 'mod-b', 'curso-x']);
  });
  it('alvo sem lições nunca é ganho (evita medalha vazia)', () => {
    expect(badgesGanhos([{ slug: 'mod-vazio', escopo: 'MODULE', licaoSlugs: [] }], new Set(['l1']))).toEqual([]);
  });
  it('conjunto vazio de progresso = nenhum ganho', () => {
    expect(badgesGanhos(alvos, new Set())).toEqual([]);
  });
});
```
- [ ] **Step 2 — Rodar e ver falhar:** `npx vitest run src/lib/universinid/badges.test.ts` → FAIL (`badgesGanhos is not a function`).
- [ ] **Step 3 — Implementar** em `badges.ts`:
```ts
export interface BadgeAlvo { slug: string; escopo: BadgeEscopo; licaoSlugs: string[] }

export function badgesGanhos(alvos: BadgeAlvo[], completed: Set<string>): string[] {
  return alvos
    .filter((a) => a.licaoSlugs.length > 0 && a.licaoSlugs.every((s) => completed.has(s)))
    .map((a) => a.slug);
}
```
- [ ] **Step 4 — Ver passar:** `npx vitest run src/lib/universinid/badges.test.ts` → PASS (5/5); suíte geral verde.
- [ ] **Step 5 — Commit:** `git add src/lib/universinid/badges.ts src/lib/universinid/badges.test.ts && git commit -m "feat(universinid): FASE-09.3 — badgesGanhos (funcao pura, TDD)"`

### Tarefa 2.2 — `grantBadges()` + hook na conclusão + backfill (TDD)
- **Agente:** `nid-backend-engineer` (revisão `nid-silent-failure-hunter`)
- **Consumes:** `badgesGanhos`, `badgeSlug*`, `getPublishedTree`, `prisma`, `buscarLinhasProgresso`.
- **Produces:** `grantBadges(userId)`, `getConquistas()`, `backfillBadges()`.
- **Depende de:** 2.1.
- [ ] **Step 1 — Teste falhando** (em `actions.test.ts` ou `badges-grant.test.ts`): com `vi.mock('@/lib/prisma')`, dado um usuário que concluiu todas as lições de `mod-a`, `grantBadges` chama `userBadge.upsert` (ou `createMany skipDuplicates`) para o `Badge` de `mod-a` **uma vez**; chamar 2× **não** cria 2 (idempotência via `@@unique`). Montar o `alvos` a partir de uma árvore mockada.
- [ ] **Step 2 — Ver falhar.**
- [ ] **Step 3 — Implementar `grantBadges(userId)`** em `actions.ts`: monta `alvos` da árvore publicada (módulo → `licaoSlugs` das lições publicadas; curso → união); `completed` = slugs com `status==='COMPLETED'`; `ganhos = badgesGanhos(alvos, completed)`; carrega `Badge` por `slug in ganhos`; **`createMany({ data: [...], skipDuplicates: true })`** de `UserBadge` (idempotente; `@@unique`). **Best-effort:** envolver em try/catch com log — falha NÃO propaga para o caller de progresso. Hookar após `upsertLessonProgress` em `markLessonProgress` e na rota de quiz (ponto onde `COMPLETED` é gravado). `backfillBadges()` = roda `grantBadges` para todos os `userId` distintos em `LessonProgress` (idempotente).
- [ ] **Step 4 — Ver passar** (idempotência provada); suíte verde; `tsc`.
- [ ] **Step 5 — Commit:** `git add src/lib/universinid/actions.ts src/lib/universinid/*test* && git commit -m "feat(universinid): FASE-09.4 — grantBadges idempotente + backfill (TDD)"`

---

## Fase 3 — UI (conquistas + dashboard)

### Tarefa 3.1 — `getConquistas()` + página `/conquistas`
- **Agente:** `nid-frontend-engineer`
- **Depende de:** 2.2.
- [ ] **Step 1 — `getConquistas()`** em `actions.ts`: retorna o **catálogo** (`Badge` ordenado por `position`/`escopo`) + um `Set` dos `badgeId` ganhos do usuário (com `awardedAt`). Sem query pesada.
- [ ] **Step 2 — `(app)/conquistas/page.tsx`** (Server Component): grid de medalhas; ganha = ícone marinho/verde + data; bloqueada = neutro + "Conclua o módulo X para desbloquear". `Icon name={badge.icone}`. Link "Voltar".
- [ ] **Step 3 — CSS `.uni-medal*`** em `universinid.css` (grid + estado ganho/bloqueado; tokens; **não** reusar `.uni-badge`).
- [ ] **Step 4 — Verificar:** preview `/conquistas`; grep de cor = só tokens; `build`. **Evidência:** página lista ganhas+bloqueadas; menu "Minhas conquistas" chega lá.
- [ ] **Step 5 — Commit:** `git add src/lib/universinid/actions.ts "src/app/universinid/(app)/conquistas/page.tsx" src/app/universinid/universinid.css && git commit -m "feat(universinid): FASE-09.5 — pagina /conquistas"`

### Tarefa 3.2 — 5º stat "Conquistas" no dashboard
- **Agente:** `nid-frontend-engineer`
- **Depende de:** 2.2.
- [ ] **Step 1 — `getDashboardData`** ganha `conquistas: number` (`prisma.userBadge.count({ where: { userId } })`).
- [ ] **Step 2 — `(app)/page.tsx`** adiciona um 5º `.uni-stat` "Conquistas" (link para `/conquistas`); ajustar o grid de stats (`.uni-stats` aceita 5).
- [ ] **Step 3 — Verificar:** preview da home (5 stats, contagem bate); testes de `dashboard` atualizados se o tipo mudou; `build`. **Evidência:** stat aparece e linka.
- [ ] **Step 4 — Commit:** `git add src/lib/universinid/actions.ts src/lib/universinid/dashboard.ts "src/app/universinid/(app)/page.tsx" src/app/universinid/universinid.css && git commit -m "feat(universinid): FASE-09.6 — 5o stat Conquistas"`

---

## Fase 4 — Gate de saída

### Tarefa 4.1 — Gate técnico + smoke + denylist + isolamento
- **Agente:** `nid-qa-engineer` + `nid-code-reviewer`
- **O que faz:** `db:push`/`db:generate` aplicados; `build`+`tsc`+`test` (TDD de `badgesGanhos`/`grantBadges` + suíte ≥186 verdes); **smoke `next start`**: concluir a última lição de um módulo → medalha concedida (1×, não duplica ao refazer) → aparece em `/conquistas` e no 5º stat; **0 violação de CSP**. **Denylist de cor** + `git diff` confirma `User`(colunas)/`LessonProgress`/slug/CSP/`globals.css`/landing/kiosk **intactos** e `UserBadge` **sem FK para `User`**. Sem `dangerouslySetInnerHTML`/`any`; pt-BR.
- **Evidência:** outputs verdes + log do smoke (concessão idempotente, 0 CSP) + grep de cor vazio + `git diff` do schema só-aditivo.
- **Depende de:** Fases 1–3.

---

## Estimativa
| Fase | Tarefas | Estimativa |
|------|---------|------------|
| 1 — Schema + seed | 2 | 0,75 dia |
| 2 — Elegibilidade + concessão (TDD) | 2 | 1 dia |
| 3 — UI (conquistas + stat) | 2 | 1 dia |
| 4 — Gate de saída | 1 | 0,25 dia |
| **Total** | **7** | **~3 dias** |

## Riscos técnicos
- **Concessão duplicada/race (R2)** → `@@unique([userId, badgeId])` + `createMany skipDuplicates`; teste de idempotência (2.2).
- **Medalha órfã por slug (R3)** → `alvos` montados da **árvore publicada**; lições por slug resolvidas no banco; teste com módulo de lições publicadas.
- **Tocar `User` (R5)** → **evitado**: `UserBadge.userId` join-por-valor; gate confere ausência de FK.
- **Retroatividade (R6)** → `backfillBadges()` idempotente (não migração); 2ª execução = mesmo estado.
- **Hot path de conclusão** → `grantBadges` best-effort (try/catch+log); falha não quebra `upsertLessonProgress` (latch intacto).
- **Regressão no dashboard (R8)** → 5º stat aditivo; `globals.css` intocado; testes de `dashboard` revisados.
- **`db:push` em prod** → aplicar no Neon de produção ANTES do deploy (aditivo; sem perda).

## Gate obrigatório
Submeter ao **`/nid:gate`** (red-team) antes de implementar — atacar R2/R3/R6 + hot path + isolamento de `User`. Sem **GO** (ou dispensa explícita do dono), nada de código.

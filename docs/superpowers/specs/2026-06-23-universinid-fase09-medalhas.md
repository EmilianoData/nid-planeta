---
date: 2026-06-23
status: aprovada
tipo: web
autor: henrique.emiliano
origem: pré-spec especificacoes/2-fila/FASE-09-gamificacao-e-noticias-fase-3/SPEC.md (D1–D9) + /nid:specify (brainstorm 2026-06-23)
frente: B (FASE-09) — MVP = só medalhas/conquistas; notícias e certificados ficam para frentes seguintes
---

# Spec: UniversiNID — FASE-09 MVP: Medalhas / Conquistas

## Contexto

A Fase de Design + Frente A (navegação) estão em produção. A Frente A criou a entrada
**"Minhas conquistas"** no menu da conta — **hoje sem destino**. A pré-spec da FASE-09
(`2-fila/FASE-09…`) lista gamificação como badges + certificados + notícias, com 14 perguntas
em aberto. O brainstorm (2026-06-23) **fatiou o MVP em só medalhas/conquistas** (notícias e
certificados = frentes futuras) e respondeu as decisões centrais. Hoje **não há nenhuma
mecânica de conquista**; o progresso existe (`LessonProgress`, 39 chaves vivas) e o streak já
é um stat (não é entregável desta fase — D9).

## Objetivo

Dar ao aluno **medalhas de conclusão** (uma por módulo + uma "grande" pelo curso), persistidas
com data, visíveis numa página **"Minhas conquistas"** e contabilizadas no dashboard — sem
tocar `User`/`LessonProgress`/slug/CSP/landing/kiosk.

## Decisões do brainstorm (2026-06-23)
- **MVP = só medalhas** (notícias/certificados depois).
- **P1 — nível:** medalha **por módulo** (concluir todas as lições publicadas do módulo) **+ 1 "grande" pelo curso** inteiro.
- **Persistência:** **persistidas** (com `awardedAt`) — habilita data e futura notificação.
- **P13 (User protegido):** resolvido por **join-por-valor** — `UserBadge.userId String` **sem FK/relação para `User`** (mesmo padrão de `QuizAttempt`/`LessonProgress`). **`User` não é editado** → sem aval especial nem ADR de exceção.
- **Dashboard:** **5º stat "Conquistas"** (adiciona à faixa; não reabre o design dos 4 atuais).
- **P2 tipos:** só **conclusão** (módulo/curso). Sem streak/quiz/primeira-lição no MVP.
- **P4 catálogo:** **seed** (`db:seed`) idempotente a partir da árvore publicada (1 Badge por módulo + 1 por curso). **Sem CRUD de badges no admin** no MVP.
- **P5 visual:** ícone **SVG inline** (`Icon.tsx`: `trophy`/`award`); ganha = marinho/verde, bloqueada = neutro. **Classe nova `.uni-medal*`** (NÃO reusar `.uni-badge`, que é a pílula de status).
- **P3 mecânica:** concessão **no momento da conclusão** (após `upsertLessonProgress` marcar `COMPLETED`) — upsert idempotente — **+ backfill retroativo** idempotente para quem já concluiu antes da fase.

## Escopo

### IN — o que faremos
- [ ] **Schema (`db:push`):** `model Badge` (catálogo) + `model UserBadge` (concessões) + `enum BadgeEscopo { MODULE COURSE }`. `UserBadge.userId` **join-por-valor** (sem FK `User`); FK só entre as **tabelas novas** (`UserBadge.badgeId → Badge`, `onDelete: Cascade`); `@@unique([userId, badgeId])` (concessão idempotente).
- [ ] **Seed de badges** (`prisma/seed.ts` ou passo dedicado, idempotente por `slug`): 1 Badge `escopo=MODULE` por módulo publicado + 1 Badge `escopo=COURSE` por curso. `alvoSlug` = slug do módulo/curso (join-por-valor ao conteúdo; sem FK).
- [ ] **Lógica pura (TDD):** `badgesGanhos(tree, progressMap)` → quais `alvoSlug` o usuário já cumpre (módulo = todas as lições publicadas COMPLETED; curso = todas as lições de todos os módulos COMPLETED). Resolve slugs pela árvore (R3).
- [ ] **Concessão (`grantBadges(userId)`):** após `COMPLETED` (em `markLessonProgress` e na rota de quiz, que já chamam `upsertLessonProgress`), calcula `badgesGanhos` e **upserta `UserBadge`** idempotente (`@@unique`). **Backfill** idempotente (server action/seed) para concluintes pré-fase.
- [ ] **Página `/universinid/conquistas`** (Server Component, sob o auth-gate): grid de medalhas **ganhas** (com data) + **bloqueadas** (com "como desbloquear"). É o destino do item **"Minhas conquistas"** (Frente A). CSS escopado `.uni-medal*`.
- [ ] **Dashboard:** 5º stat **"Conquistas"** (contagem de `UserBadge` do usuário) linkando para `/conquistas`. `getDashboardData` ganha o campo `conquistas: number` (sem query pesada — `count`).

### OUT — o que NÃO faremos (motivo)
- **Notícias de tech** e **certificados** (*frentes seguintes; "spec separada, sempre" — D2*).
- **CRUD de badges no admin** (*catálogo por seed no MVP; CRUD é creep*).
- **Pontos, ranking, leaderboard, níveis/XP** (*P14 — nenhuma fonte pede; anti-creep explícito*).
- **Medalhas de streak/quiz/primeira-lição** (*só conclusão no MVP; streak já é stat — D9*).
- **Notificação/toast "você ganhou!"** (*o dado (`awardedAt`) habilita, mas a UI de notificação fica para iteração futura*).
- **Tocar `User`(colunas)/`LessonProgress`/slug/CSP/`globals.css`/landing/kiosk** (*regras inegociáveis; `User` preservado via join-por-valor*).

## Critérios de sucesso
- Concluir todas as lições de um módulo concede a medalha do módulo (idempotente — refazer não duplica); concluir o curso concede a medalha "grande".
- `/universinid/conquistas` lista ganhas (com data) e bloqueadas; "Minhas conquistas" do menu chega lá; 5º stat "Conquistas" no dashboard bate com a contagem.
- **Retroatividade:** quem já concluiu módulos antes da fase recebe as medalhas no backfill (idempotente, sem duplicar).
- **Zero regressão:** `User`/`LessonProgress`/slug/CSP/landing/kiosk intactos; `markLessonProgress`/quiz preservam o contrato (latch COMPLETED nunca regride).
- **Gate técnico verde:** `db:push` aplicado no Neon + `db:generate`; `build`+`tsc`+`test` (testes da concessão e do `badgesGanhos` em TDD; suíte existente segue verde) + smoke `next start` (concluir módulo → medalha aparece, 0 violação de CSP).

## Stack proposta
Prisma 7.8 + Neon (`db:push`, **não** migrate) com client em `@/generated/prisma`; lógica pura testável (molde `estadoTrilha`/`buildDashboard`); concessão via server actions (`@/lib/universinid/actions`) reusando `upsertLessonProgress`; Server Components para leitura; `Icon.tsx` (SVG inline); CSS `.uni-medal*` escopado. Zod `z.unknown()` nas bordas; sem dep/CDN nova; sem `dangerouslySetInnerHTML`.

## Modelo de dados (esboço — confirmar no /nid:plan)
```prisma
enum BadgeEscopo { MODULE COURSE }

model Badge {
  id        String      @id @default(cuid())
  slug      String      @unique            // estável; ex.: "modulo-fundamentos", "curso-ia-agentica"
  nome      String
  descricao String?
  escopo    BadgeEscopo
  alvoSlug  String                          // slug do módulo/curso (join-por-valor ao conteúdo)
  icone     String      @default("trophy")  // nome do Icon
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
  @@unique([userId, badgeId])               // concessão idempotente
  @@map("user_badges")
}
```

## Stakeholders
- **Sponsor / dono do quadro:** Henrique Emiliano. **Usuário final:** alunos + admin. **Responsável NID:** Henrique Emiliano.

## Riscos identificados
- **R2 — concessão duplicada/race** → `@@unique([userId, badgeId])` + upsert idempotente; teste TDD adversarial.
- **R3 — medalha órfã por slug** (Risco #1 do projeto) → `badgesGanhos` resolve lições pela árvore publicada + `resolveLessonBySlug`/alias; teste com lição renomeada.
- **R5 — tocar `User`** → **evitado** por join-por-valor (precedente `QuizAttempt`); `User` não muda.
- **R6 — retroatividade** → backfill idempotente (não migração de schema); teste de 2ª execução = mesmo estado.
- **R8 — regressão no dashboard** → 5º stat é adição contida; home (4 stats + Trilha) não é reestruturada; `globals.css` intocado.
- **Hot path de conclusão** → `grantBadges` roda após `upsertLessonProgress`; não altera o latch COMPLETED; falha na concessão não pode quebrar o registro de progresso (concessão é best-effort/idempotente, com log) — endurecer no plano.
- **Colisão de CSS** → usar `.uni-medal*` (a classe `.uni-badge` já é a pílula de status).

---

> **Próximo após aprovação:** `status: aprovada` → `/nid:plan` → `/nid:gate` (R2/R3/R6 + hot path) → `/nid:implement`. Notícias e certificados seguem como frentes próprias.

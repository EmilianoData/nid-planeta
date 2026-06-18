---
date: 2026-06-18
spec: docs/superpowers/specs/2026-06-18-universinid-fase2b-quizzes.md
status: implementado
gate_aprovado_em: 2026-06-18 (GO após 4 rodadas de red-team; aprovação humana do dono do quadro)
implementado_em: 2026-06-18 (Fases 1-5 + endurecimento da auditoria; smoke ao vivo pendente — ver §Registro)
tipo: web
fase_quadro: FASE-08
revisao: 5 (pós 4º red-team — 422-vs-500 em extractQuizBlock, JSDoc do latch concorrente, ordem 1.3→3.1)
---

# Plano: UniversiNID Fase 2b — Quizzes (FASE-08)

> Spec aprovada: [2026-06-18-universinid-fase2b-quizzes.md](2026-06-18-universinid-fase2b-quizzes.md).
> **Gate obrigatório** (`/nid:gate`). Fundação de-riscada por `wf_f2178844-6c3`.
> **Rev. 2:** fechou 11 bloqueantes do 1º red-team (`wf_28c55c1b-c57`).
> **Rev. 3:** fecha os achados do 2º red-team (`wf_d158f605-809`): pattern Prisma do latch (`upsert.where` não aceita predicado), rate-limit via banco (in-memory é inoperante em serverless), validação no `publish/route.ts`, `select` sem `answers` na rota admin, contrato de `extractQuizBlock`, threading de `isAdmin`, schema Zod concreto no read.
> **Rev. 4:** fecha o 3º red-team (`wf_c81e9bf2-150`): `validateContentDoc` com `mode` opcional (não quebra os 8 testes/PATCH existentes); **reverte para o slug RECEBIDO** em `markLessonProgress`/`upsertLessonProgress` (preserva as 39 chaves vivas e o teste de alias — a regra de ouro #2); `$transaction` em `create`+progresso; nota do mock `updateMany`.
> **Rev. 5:** fecha o 4º red-team (`wf_4d9175cc-187`): `extractQuizBlock` lança `QuizDataError` → catch discrimina **422 vs 500**; JSDoc do latch documenta atomicidade em `$transaction` + backstop `update:{}` fora dela; ordem **1.3 antes de 3.1** (tipo `quiz` só após validação recursiva + gate no publish); evidência a11y verificável no gate (6.3). As 3 lentes confirmaram que o plano está **correto e completo** — os "NO-GO" residuais eram sobre o *código ainda não existir* (trabalho do `/nid:implement`, com os testes exigidos na evidência das tarefas), não sobre o plano.

## Contexto técnico

Stack: Next.js 15 (App Router) · React 19 · Prisma/Neon · **BlockNote v0.51.4** · Tailwind 3.4.
O quiz é **bloco custom BlockNote**; config nas props JSON; resultados em tabela nova `QuizAttempt`.

| # | Descoberta de-risk (evidência) | Decisão |
|---|---|---|
| A | `propSchema` só primitivos (`EmbedBlock.tsx:10-15`) | Questões em **`questoesJson: string`**; `notaCorte: number` (70). `render()` parse / `onSave` stringify via `editor.updateBlock`. |
| B | `RenderBlocks` é Server Component puro (`RenderBlocks.tsx:1-5`) | **Strip do gabarito no servidor, em `page.tsx`, ANTES** do `RenderBlocks`. |
| C | CSP já tem `unsafe-inline` + `connect-src 'self'` (`middleware.ts:22,26,34`) | **Zero ajuste de CSP.** |
| D | `markLessonProgress` é `'use server'`+`exigirSessao()` (`actions.ts:43-58`) | Extrair **`upsertLessonProgress()`** puro; action e rota o chamam com `userId` já validado. |

### Contratos fixados (vinculantes entre tarefas)

- **`Questao`:** `{ enunciado: string; alternativas: string[]; corretaIdx: number; explicacao?: string }`.
- **`questoesJson` pós-`stripQuizAnswers` (ao client):** `[{ enunciado, alternativas }]` — **sem** `corretaIdx`/`explicacao`.
- **Snapshot `QuizAttempt.answers` (só banco):** `{ notaCorte, itens:[{enunciado,alternativas,escolhidaIdx,corretaIdx,acertou}] }`. **Nunca** retornado a front-end (aluno **nem** admin).
- **Feedback ao aluno (resposta da rota):** `{ score, passed, itens:[{acertou, explicacao?}] }`.
- **`passed` é imutável:** calculado no momento da tentativa com a `notaCorte` de então; mudar `notaCorte` depois **não retroage**. O relatório admin lê a coluna `QuizAttempt.notaCorte` (não o `answers`).
- **`upsertLessonProgress` é latch:** nunca regride `COMPLETED`.

**Regras inegociáveis:** `z.unknown()` **na fronteira de API**; shape interno usa `z.object/z.array` concretos · `withAuth([...])` explícito · nunca `dangerouslySetInnerHTML` · **validação write-time E read-time** · CSS só em `universinid.css` · `db:push`+`db:generate` · TDD (teste falha primeiro; `vi.hoisted`+`vi.mock`) · `git add` explícito · strings pt-BR.

---

## Fases e tarefas

### Fase 1 — Fundação de dados

**Tarefa 1.1 — Model `QuizAttempt`**
- Agente: `nid-database-engineer`
- O que faz: adiciona `QuizAttempt` (join-por-valor `userId`/`lessonSlug` sem FK; `score Int`, `passed Boolean`, **`notaCorte Int`** (coluna não-sensível p/ o relatório admin sem tocar `answers`), `answers Json`, `createdAt`; `@@index([userId])`, `@@index([lessonSlug])`, `@@index([userId,lessonSlug])`, `@@index([lessonSlug,createdAt])`; **sem `@@unique`**; `@@map("quiz_attempts")`). `db:push`+`db:generate`. **Não toca `User`/`LessonProgress`.**
- Evidência: `git diff` só o model novo (zero diff em `User`/`LessonProgress`); `db:push` aplica; client regenerado; `tsc` = 0.
- Depende de: nenhuma

**Tarefa 1.2 — Tipos + `stripQuizAnswers` (TDD)**
- Agente: `nid-backend-engineer`
- O que faz: em `content-types.ts`: `QuizBlock` na união `UniBlock`; tipo `Questao`; `stripQuizAnswers(doc)` que para cada bloco `quiz` faz `JSON.parse(questoesJson)`, remove `corretaIdx`/`explicacao`, **re-serializa** ao contrato `[{enunciado,alternativas}]`; **recursivo em `children`**; **idempotente**; tolera JSON inválido (não lança — caminho de render) e **avisa com contexto** quando neutraliza.
- Evidência (teste **primeiro**): remove gabarito e preserva enunciado/alternativas; recursivo; idempotente; JSON inválido → bloco neutralizado sem lançar. Verde.
- Depende de: nenhuma

**Tarefa 1.3 — Validação write-time recursiva + gate no publish (TDD)**
- Agente: `nid-backend-engineer` (revisão `nid-security-engineer`)
- O que faz:
  1. **Refatora `validateContentDoc` para recursiva** (extrai `walkBlocks` que desce em `children`) — hoje só itera o nível raiz; sem isso um `quiz` aninhado escapa. Vale para todos os tipos. **Assinatura:** `validateContentDoc(doc: unknown, mode: 'autosave'|'publish' = 'autosave')` — `mode` **opcional, default `autosave`**, para que os chamadores existentes (PATCH `lessons/[id]/route.ts` e os 8 testes de `sanitize-content.test.ts`) **NÃO mudem** nem quebrem o build.
  2. Ramo `quiz`: `JSON.parse(questoesJson)` em try/catch + Zod concreto. **Rejeita doc com >1 bloco `quiz` (contagem global do doc, não por nível; mensagem pt-BR).**
  3. **Dois modos:** `autosave` tolera incompleto (`'[]'`, ou questão sem `corretaIdx` — estado legítimo de edição); **`publish` forte**: ≥1 questão, cada uma ≥2 alternativas, `corretaIdx` no range, `notaCorte` 1–100.
  4. **Liga o modo `publish`** em `src/app/api/universinid/admin/lessons/[id]/publish/route.ts` (que hoje copia `contentDraft→contentPublished` **sem validar**): `validateContentDoc(draft,'publish')` **antes** do update; **422** se reprovar.
- Evidência: testes — rejeita 2º quiz (inclusive aninhado); rejeita JSON inválido; tolera incompleto no autosave; **publish de quiz incompleto → 422** (suite `lessons`); valida quiz em `children`. Verde.
- Depende de: 1.2

### Fase 2 — Backend de submissão

**Tarefa 2.1 — `upsertLessonProgress` puro com LATCH atômico + refatorar `markLessonProgress` (TDD)**
- Agente: `nid-backend-engineer`
- O que faz: cria `src/lib/universinid/progress-utils.ts` com `upsertLessonProgress(userId, slug, status, pct, client = prisma)` — **sem** `'use server'`/`exigirSessao`. **Latch atômico (NÃO via `upsert.where` — o Prisma só aceita a chave única ali):** `client.lessonProgress.updateMany({ where:{ userId, lessonSlug: slug, status:{ not:'COMPLETED' } }, data:{ status, pct } })`; se `count===0`, garante existência sem regredir via `client.lessonProgress.upsert({ where:{ userId_lessonSlug }, create:{ ... }, update:{} })` (`update:{}` no-op preserva o COMPLETED). **Chaveia pelo slug RECEBIDO do chamador** (preserva o contrato vivo do `LessonProgress` — as 39 chaves usam o slug recebido; o teste de alias de `actions.test.ts` **continua válido**); **não re-resolve** o slug (o chamador já validou existência → sem dupla resolução). Aceita um **cliente Prisma opcional** (`client`) para rodar dentro de `$transaction`. JSDoc: *"userId e slug já validados pelo chamador (withAuth/exigirSessao) — não autentica nem re-resolve. Latch de dois passos: atômico dentro de `$transaction` (serial); fora dela, o `update:{}` no-op é o backstop que preserva COMPLETED sob corrida."*. Refatora `markLessonProgress` p/ chamá-la passando o **slug recebido** (comportamento inalterado; mantém `exigirSessao`+`revalidatePath`).
- Evidência: **passo obrigatório ANTES de refatorar** — adicionar `updateMany: vi.fn()` ao mock de `lessonProgress` em `actions.test.ts` e confirmar os testes existentes verdes (inclui o **teste de alias inalterado**: chave = slug recebido). Novos testes em `progress-utils.test.ts`: **COMPLETED não regride** com `IN_PROGRESS` posterior — caso **sequencial** e o caso `updateMany count=0` + `upsert` dispara `update:{}` no-op sobre COMPLETED preexistente (backstop fora de `$transaction`); cria quando ausente.
- Depende de: nenhuma. **Implementar ANTES de qualquer tarefa da Fase 4** (latch ativo antes de mexer no fluxo de conclusão).

**Tarefa 2.2 — Schema Zod da submissão**
- Agente: `nid-backend-engineer`
- O que faz: `submitQuizSchema` em `validators.ts`: `{ lessonSlug: z.string().min(1), respostas: z.array(z.number().int()) }`.
- Evidência: `tsc` = 0; usado pela rota.
- Depende de: nenhuma

**Tarefa 2.3 — `correctQuiz` puro (TDD)**
- Agente: `nid-backend-engineer`
- O que faz: `(respostas, questoes, notaCorte) → { score, passed, snapshot, feedback }`. `score` % ; `passed = score>=notaCorte`; `snapshot` completo (com `corretaIdx`); `feedback` **sem `corretaIdx` cru** (só `acertou`+`explicacao`).
- Evidência: testes — score correto; `passed` no **limite exato**; feedback não vaza gabarito; snapshot completo. Verde.
- Depende de: 1.2

**Tarefa 2.4 — Rota `POST /api/universinid/quiz/attempt` (TDD)**
- Agente: `nid-backend-engineer` (revisão `nid-security-engineer` + `nid-silent-failure-hunter`)
- **`extractQuizBlock(contentPublished): { questoes: Questao[]; notaCorte: number } | null`** (função própria server-side): localiza o único bloco `quiz`; **`null` se ausente** (rota → 404); **lança `QuizDataError` (subclasse de `Error`) se `JSON.parse(questoesJson)` falhar**. **Proibido `catch {}` silencioso** retornando `null`/`[]`.
- O que faz: bloco principal **em try/catch com discriminação de erro** — `catch (e) { if (e instanceof QuizDataError) return apiError('Conteúdo do quiz corrompido', 422); return apiError('Erro interno', 500); }` (elimina a ambiguidade 422 vs 500; **`lesson`/`contentPublished` nunca serializados em resposta de erro**). `withAuth(['STUDENT','ADMIN'])` → `parseBody(submitQuizSchema)` → **rate-limit (rider A9, via count no banco)** → `resolveLessonBySlug` (**lê `contentPublished` do banco; NUNCA aceita gabarito do body**) → exige `status==='PUBLISHED'` (senão 422) → `extractQuizBlock` (404/422) → `correctQuiz` → **dentro de `prisma.$transaction(async (tx) => { ... })`** (atomicidade: attempt e progresso não divergem): `await tx.quizAttempt.create` (snapshot + coluna `notaCorte`) e, **se `passed` E role `STUDENT`**, `await upsertLessonProgress(session.user.id, lessonSlug, 'COMPLETED', 100, tx)` (ADMIN grava attempt mas **não** marca progresso) → responde `{ id, score, passed, itens }` **sem gabarito/answers**.
- Evidência: `attempt.test.ts` (`vi.hoisted`+`vi.mock`): 401 · 403 · 422 (body inválido / DRAFT / `questoesJson` corrompido) · 404 (slug inexistente / lição sem quiz) · 429 (6ª em 60s) · 200 ok · **auto-complete só STUDENT+passed** · **`upsertLessonProgress` awaited — mock rejeitado ⇒ 500** · **erro inesperado do `create` ⇒ 500 genérico sem `contentPublished` no corpo** · **resposta sem `corretaIdx`/`answers`** · remover `questoesJson` do body **não altera** a correção. Verde.
- Depende de: 1.1, 2.1, 2.2, 2.3

> **Rider A9 (rate-limit anti-flood) — baseado no banco** (correto em serverless multi-instância): antes de gravar, `prisma.quizAttempt.count({ where:{ userId, lessonSlug, createdAt:{ gt: agora-60s } } })`; se `>=5` → **429**. **Não** usar contador in-memory (`Map`) — é zerado por cold start e não compartilha entre instâncias na Vercel, logo inoperante. Teste: 6ª submissão em 60s → 429.

### Fase 3 — Autoria (admin, editor BlockNote)

**Tarefa 3.1 — `QuizBlock.tsx` (bloco custom + formulário)** — protótipo de risco primeiro
- Agente: `nid-frontend-engineer`
- O que faz: `createReactBlockSpec` (**exporta factory `quizBlock`**, como `embedBlock`), `propSchema:{ notaCorte:{default:70}, questoesJson:{default:'[]'} }`, `content:'none'`. Formulário: add/remover questão, alternativas, marcar a correta (radio), explicação opcional, `notaCorte`; `onSave` → `editor.updateBlock(block,{type:'quiz',props:{notaCorte,questoesJson:JSON.stringify(questoes)}})`. Cuidado com foco/teclado dentro do bloco (cf. `stopPropagation` do `EmbedBlock`). Estilos `.uni-quiz-edit*`; **strings pt-BR**.
- Evidência: **protótipo de risco primeiro** — 3 questões × 4 alternativas, add/remover, round-trip stringify→prop→parse→`Questao[]` íntegro; teclado/foco sem atrito; `build` ok.
- Depende de: 1.2, **1.3** (o tipo `quiz` só é introduzido depois da validação recursiva + gate no publish existirem — senão um quiz inválido publica sem barreira)

**Tarefa 3.2 — Registrar `quiz` no editor + guards (anti-perda + unicidade)**
- Agente: `nid-frontend-engineer`
- O que faz: registra `quiz: quizBlock()` em `editor-schema.ts`; inclui `'quiz'` em `KNOWN_BLOCK_TYPES`/`keepEditableBlocks`. **Guard anti-perda (deploy parcial):** função **pura** `shouldBlockSave(originalTypes,newTypes):boolean` — autosave **não persiste** se `keepEditableBlocks` reduziu o array (evita apagar silenciosamente um `quiz` desconhecido pelo editor); avisa o admin. **Guard de unicidade (UX):** oculta/desabilita o item de slash-menu "inserir quiz" quando já há um `quiz` no doc (evita 2º quiz na origem e o loop de toast do 422).
- Evidência: round-trip — doc com `quiz` hidrata **sem crash** e sobrevive ao autosave; **teste unitário de `shouldBlockSave`** (reduziu ⇒ bloqueia); guard de unicidade (2º item indisponível com quiz presente); `build` ok.
- Depende de: 3.1

### Fase 4 — Render ao aluno + gating (ordem: 4.1 → 4.2 → 4.3 → 4.4; toda a Fase 4 depende de 2.1)

**Tarefa 4.1 — Strip do gabarito em `page.tsx` + threading de contexto (TDD)**
- Agente: `nid-frontend-engineer` (revisão `nid-security-engineer`)
- O que faz: em `licao/[slug]/page.tsx`, strip **uma vez, antes** do branch de papel: `const rawDoc=(isAdmin?lesson.contentDraft:lesson.contentPublished)??[]; const doc=stripQuizAnswers(rawDoc as UniBlockDoc);` (vale p/ admin e aluno). Passa contexto: `<RenderBlocks doc={doc} isAdmin={isAdmin} lessonSlug={params.slug} />` (assinatura na 4.3).
- Evidência: teste — doc ao `RenderBlocks` **não contém** `corretaIdx`/`explicacao` em **ambos** os ramos.
- Depende de: 1.2

**Tarefa 4.2 — `QuizClient.tsx` (TDD)**
- Agente: `nid-frontend-engineer` (revisão `nid-accessibility-engineer`)
- O que faz: `'use client'` (padrão `MarkComplete`); estado de respostas + `useTransition`; questões com `<label>`/radio; botão Enviar; `fetch('POST /api/universinid/quiz/attempt')`; resultado + erros + explicações; refazer (ilimitado); **`router.refresh()` ao receber `passed:true`** (dashboard/lição revalidam). **Prop `modoPreview?: boolean`** → Enviar desabilitado com aviso pt-BR ("Pré-visualização: envio desabilitado"). Estilos `.uni-quiz*`.
- Evidência: **TDD (teste primeiro)** — questões **sem** `corretaIdx`/`explicacao`; Enviar desabilitado enquanto `pending` e quando `modoPreview`; resultado após resposta; **strings pt-BR**; teste cobre `<label>`/`aria-label` por alternativa e foco visível. `build` ok; revisão do `nid-accessibility-engineer` registrada no PR (contraste ≥4,5:1; alvos ≥44px).
- Depende de: 2.4 (contrato da rota)

**Tarefa 4.3 — `case 'quiz'` no `RenderBlocks` + threading de `isAdmin` (TDD)** — defesa em profundidade read-time
- Agente: `nid-frontend-engineer`
- O que faz: **altera a assinatura** `RenderBlocks({ doc, isAdmin, lessonSlug })` e propaga `isAdmin`/`lessonSlug` pela recursão (`renderBlocks`→`renderLeaf`) até o `case 'quiz'`. O case: (a) `JSON.parse` em **try/catch**; (b) **re-valida shape read-time com schema concreto** `z.array(z.object({ enunciado:z.string(), alternativas:z.array(z.string()).min(2) }))` (`z.unknown()` é regra de *entrada de API*, não de shape interno); (c) **degrada para warn+null** com contexto `console.warn('RenderBlocks: quiz inválido ignorado',{lessonSlug,blockId})`; (d) renderiza `<QuizClient questoes notaCorte lessonSlug modoPreview={isAdmin} />`.
- Evidência: `RenderBlocks.test.tsx` — renderiza `QuizClient` sem gabarito; **`questoesJson` malformado degrada p/ null sem crash** (warn com `lessonSlug`); `modoPreview` chega ao `QuizClient` em ambos os ramos; tipo desconhecido degrada (retrocompat).
- Depende de: 4.1, 4.2

**Tarefa 4.4 — Ocultar `MarkComplete` em lição com quiz (TDD)**
- Agente: `nid-frontend-engineer`
- O que faz: detecta bloco `quiz` no **doc efetivamente exibido** (draft p/ admin, published p/ aluno); se houver, **não** renderiza o botão manual. Lições sem quiz seguem com o botão.
- Evidência: testes — lição com quiz não mostra `MarkComplete` (ramo aluno e admin/draft); sem quiz mostra; reprovar não conclui.
- Depende de: 4.1, 2.1

### Fase 5 — Admin: resultados por aluno

**Tarefa 5.1 — Query agregada por aluno (TDD)** — `select` explícito sem `answers`, por lessonId, bulk
- Agente: `nid-backend-engineer`
- O que faz: a leitura de `QuizAttempt` usa **`select` Prisma explícito** `{ id, userId, lessonSlug, score, passed, notaCorte, createdAt }` — **nunca seleciona `answers`**; a função retorna **tipo TS sem `answers`** (acesso vira erro de compilação). Filtra `role==='STUDENT'`. Resolve **todos** os `lessonSlug` distintos → `lessonId` canônico via **bulk query** (`lesson.findMany({where:{slug:{in}}})` + `lessonSlugAlias.findMany`, Map — **sem N+1**); agrupa **por `lessonId`** (consolida slug antigo+novo pós-rename); por grupo: `max(score)`, `aprovado=any(passed)`, `notaCorte` (coluna), `totalTentativas`. `userId` órfão → "aluno removido"; **`lessonSlug` órfão** (lição deletada) → grupo "lição removida" (não some silenciosamente). Resolve `userId→nome/email` por bulk `user.findMany`.
- Evidência: testes — melhor score; aprovado; **slug antigo+novo = 1 grupo**; **sem N+1**; **`select` não inclui `answers` (tipo de retorno sem o campo)**; admin excluído; `userId`/`lessonSlug` órfão rotulados. Verde.
- Depende de: 1.1

**Tarefa 5.2 — Rota GET admin + UI "por aluno"**
- Agente: `nid-backend-engineer` (rota) + `nid-frontend-engineer` (UI)
- O que faz: `GET /api/universinid/admin/quiz/results` com **`withAuth(['ADMIN'])`** explícito, servindo **exclusivamente** o resultado da função de 5.1 (**proibido `prisma.quizAttempt` cru na rota** — evita reintroduzir `answers`); UI em `/universinid/admin`: seleciona aluno → histórico (melhor score + aprovado/não + nota de corte). Hook `use-admin-content` pattern. Strings pt-BR.
- Evidência: teste da rota **401/403**; **resposta da rota não contém `answers`/`corretaIdx` em nenhum item**; `build` ok; render com mock; sem `any`.
- Depende de: 5.1

### Fase 6 — Gate de saída

**Tarefa 6.0 — Pré-requisito: lição-alvo publicada com quiz + Playwright**
- Agente: `nid-qa-engineer`
- O que faz: garante ≥1 **lição decomposta publicada com bloco quiz** (cria se faltar; depende da Fase 3); verifica Playwright (senão, instalação transiente — ver handoff).
- Evidência: lição publicada com quiz existe; Playwright operável.
- Depende de: Fases 3, 4

**Tarefa 6.1 — Auditoria de segurança e falhas silenciosas**
- Agente: `nid-security-engineer` + `nid-silent-failure-hunter`
- O que faz: gabarito ausente em **todos** os caminhos (RSC aluno **e** preview admin; resposta da rota de submissão; **resposta da rota admin de resultados**); `await` garantido; latch atômico; rate-limit por banco ativo; sem `catch {}` enganador; warns com contexto.
- Evidência: relatório sem stop-ship.
- Depende de: Fases 1–5

**Tarefa 6.2 — Gate técnico + smoke com CSP**
- Agente: `nid-qa-engineer`
- O que faz: `build` + `tsc` + `test` verdes; smoke: responde, submete, **passa → COMPLETED** (dashboard atualiza via `router.refresh`), reprova → não conclui, **fetch same-origin sob `connect-src 'self'` sem violação de CSP**.
- Evidência: outputs verdes + log do smoke (zero violação CSP).
- Depende de: 6.0, 6.1

**Tarefa 6.3 — Code review final**
- Agente: `nid-code-reviewer`
- Evidência: relatório aprovado (sem `any`, Zod, pt-BR, CSS escopado, defesa em profundidade, `git add` explícito); **confirma que a revisão a11y da 4.2 está registrada no PR** (contraste ≥4,5:1; alvos ≥44px).
- Depende de: 6.1, 6.2

---

## Estimativa (revisada)

| Fase | Tarefas | Estimativa |
|------|---------|------------|
| 1 — Fundação de dados | 3 | 0,75 dia |
| 2 — Backend submissão | 4 | 1,5 dia |
| 3 — Autoria editor (formulário complexo — maior risco) | 2 | 2 dias |
| 4 — Render aluno + gating | 4 | 1,5 dia |
| 5 — Admin resultados | 2 | 0,75 dia |
| 6 — Gate de saída (+ buffer) | 4 | 1 dia |
| **Total** | **19** | **~7,5 dias** |

> Maior risco remanescente: o formulário interativo do `QuizBlock` (3.1) — estado controlado dentro de `createReactBlockSpec`/ProseMirror, sem precedente além do `EmbedBlock` (1 campo). Daí o "protótipo de risco primeiro" e o buffer da Fase 6.

## Riscos técnicos (de-riscados + fechados em 2 rodadas de gate)

Props complexas → `questoesJson` (3.1) · gabarito no RSC → strip antes do branch (4.1) + read-time re-valida (4.3) + correção do banco (2.4) · `answers` na superfície admin → `select` sem `answers` + tipo TS (5.1/5.2) · latch COMPLETED → `updateMany` atômico (2.1) · parse silencioso → `extractQuizBlock` lança → 422 (2.4) · publish silencioso → `validateContentDoc('publish')` no `publish/route.ts` (1.3) · autosave apaga quiz → `shouldBlockSave` (3.2) · 1 quiz/lição → validação recursiva + guard de slash-menu (1.3/3.2) · promise solta → await + teste 500 (2.4) · flood → rate-limit por banco (A9) · N+1/rename → bulk por lessonId (5.1) · CSP → zero ajuste; smoke (6.2).

## Gate obrigatório

Submetido ao `/nid:gate` (**4 rodadas de red-team**). **GO + aprovação humana concedida em 2026-06-18** → `/nid:implement` liberado. Ordem de implementação: respeitar dependências (**1.3 antes de 3.1**; **2.1 antes da Fase 4**; 4.1→4.2→4.3→4.4).

## Registro de execução (2026-06-18)

Implementado via `/nid:implement`, fase a fase com TDD e gate (`build` + `tsc` + `test`) verde a cada fase. Commits:

| Fase | Entrega | Commit |
|---|---|---|
| 1 | Fundação: `QuizAttempt`, `stripQuizAnswers`, `validateContentDoc` recursivo + gate no publish | `55dad6f` |
| 2 | Backend: `upsertLessonProgress` (latch), `correctQuiz`/`extractQuizBlock`, rota `POST /quiz/attempt` | `9e01fb2` |
| 3 | Autoria: `QuizBlock.tsx` + registro no editor + guards | `15c596a` |
| 4 | Render aluno: strip em `page.tsx`, `case 'quiz'`, `QuizClient`, ocultar `MarkComplete` | `7f76aee` |
| 5 | Admin: `getQuizResults` + rota GET + UI por aluno | `47a4d0d` |
| 6 | Endurecimento pós-auditoria adversarial (A07 na page, `select` sem gabarito, validação de `corretaIdx`, timeout, rate-cap, logs) | `effd985` |

**Gate técnico de saída:** `npm run build` ok · `npx tsc --noEmit` = 0 · `npm run test` = **180/180** (40 testes novos, TDD red-first). `db:push` aplicou `quiz_attempts` no Neon.

**Auditoria adversarial de saída** (workflow `wf_4ad9bffe-175`, 3 lentes — segurança/falhas-silenciosas/aderência): **nenhum STOP-SHIP**; tripé de defesa do gabarito confirmado (strip server-side + re-validação read-time estreita + resposta sem `answers`). Achados ATENÇÃO/NIT corrigidos no commit `effd985`.

**PENDENTE — smoke ao vivo (6.2):** a lição-alvo está semeada no Neon (`quiz-smoke-fase08`, via `scripts/seed-quiz-smoke.ts`) e o driver focado está em `scripts/smoke-quiz-fase08.mjs`. Não executado nesta sessão: a porta :3000 tinha um dev server pré-existente em estado quebrado (500) e não é seguro subir um 2º sobre o mesmo `.next` (corrompe chunks). **Rodar em ambiente limpo:**
```
npx tsx scripts/seed-quiz-smoke.ts            # (já rodado; idempotente)
npm install --no-save playwright@1.60.0 && npx playwright install chromium
npm run dev                                    # server limpo em :3000 (sem outro dev server no mesmo .next)
SMOKE_BASE=http://localhost:3000 node scripts/smoke-quiz-fase08.mjs
```
O smoke prova: aluno abre a lição, **gabarito ausente no HTML**, responde, passa, conclusão refletida, **zero violação de CSP**. Limpeza opcional depois: remover a lição `quiz-smoke-fase08` e as `QuizAttempt` dela (via DB).

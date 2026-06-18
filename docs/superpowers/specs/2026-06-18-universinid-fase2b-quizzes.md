# UniversiNID Fase 2b — Quizzes (Spec)

- **Data:** 2026-06-18
- **Projeto:** nid-planeta · branch `feature/nid-planeta`
- **Status:** ✅ **aprovada em 2026-06-18** (`aprovada`) — habilita `/nid:plan` → `/nid:gate`.
- **Tipo:** web (feature do UniversiNID) · materializa a **FASE-08** do quadro (`especificacoes/2-fila/FASE-08-quizzes-fase-2b`)
- **Origem:** `/nid:specify` → `superpowers:brainstorming` (8 decisões respondidas pelo dono do quadro) sobre o insumo da pré-spec `especificacoes/2-fila/FASE-08-quizzes-fase-2b/SPEC.md`. Fundação técnica verificada por workflow de 4 exploradores read-only (`wf_f11c1a8e-655`, 267k tokens) em 2026-06-18.
- **Continuação de:** `2026-06-02-universinid-fase2-arquitetura-decisao.md` (decisão de produto #4 — "quiz vem depois") e `2026-06-03-universinid-fase2a.md` (Fase 2a, concluída 100%).

> A Fase 2a (autoria no-code de texto/imagem/embed) foi desenhada com a **porta aberta**
> para o quiz entrar como **mais um tipo de bloco** no documento BlockNote, sem migração
> nova e sem quebrar conteúdo publicado. Esta spec exerce essa porta.

---

## 1. Contexto

Hoje o UniversiNID tem lições com conteúdo rico (texto, imagem, vídeo embed) e progresso
por lição (`LessonProgress`, chave `userId + lessonSlug`, marcado manualmente pelo botão
`MarkComplete`). Não há **avaliação**: não dá para verificar se o aluno aprendeu, nem
condicionar a conclusão a um critério objetivo. Para um treinamento corporativo interno,
isso limita o valor — não há como atestar competência ao fim de uma lição.

A arquitetura travada na Fase 2a (ADR-0001) impõe o **mecanismo** do quiz; o que faltava
era a **intenção de produto**, agora decidida (§3).

## 2. Objetivo

Entregar **avaliação somativa por lição**: ao final de uma lição, um quiz de múltipla
escolha verifica o aprendizado; **passar (≥ nota de corte) conclui a lição
automaticamente**. O admin autora o quiz sem codar e acompanha quem passou.

## 3. Decisões de produto (respondidas no brainstorm 2026-06-18)

| # | Pergunta (pré-spec §7) | Decisão | Consequência |
|---|---|---|---|
| 1 | Propósito | **Somativo** (avaliação real) | Correção server-side obrigatória; nota de corte; faz sentido snapshot + anti-abuso |
| 2 | Nota mínima | **Configurável por quiz, padrão 70%** | Um campo `notaCorte` nas props do bloco (default 70) |
| 3 | Tentativas | **Ilimitadas, vale a melhor** | Guardamos TODAS as tentativas; aprovação = `max(score)`; sem `@@unique` |
| 4 | Quiz ↔ `COMPLETED` | **Passar marca COMPLETED automaticamente** | Submissão aprovada chama o `markLessonProgress` existente; botão manual oculto em lições com quiz |
| 5 | Feedback | **Mostra quais errou + explicação autorada** | Trade-off aceito: com tentativas ilimitadas, revelar erros facilita "decorar" — ok para treinamento |
| 6 | Tipos de questão | **Só múltipla escolha, 1 correta** | Cobre verdadeiro/falso (2 alternativas); correção automática trivial |
| 7 | Quizzes por lição | **1 por lição** | Chave da tentativa = `lessonSlug` (sem `blockId`, sem risco de órfão); define sem ambiguidade qual quiz conclui a lição |
| 8 | Resultados no admin | **Por aluno (histórico)** | Nova visão: por aluno, quizzes feitos com melhor score e aprovado/não |
| 9 | Correção server-side vs client | **Server-side** (fixado — consequência de "somativo") | Gabarito nunca chega ao cliente antes da submissão |
| 10 | Relação `QuizAttempt` ↔ `User` | **join-por-valor (`userId` sem FK)** | Espelha `LessonProgress`; ZERO mudança no model `User` → **sem ADR de exceção à regra #2** |

> Decisões de mecânica não perguntadas (consequência direta de "somativo"):
> **submissão em uma vez** (aluno responde tudo e envia; sem correção incremental por questão);
> **snapshot** das questões/respostas gravado na tentativa (sustenta o histórico do admin e
> resolve a deriva pós-republicação).

## 4. Escopo

### IN — o que faremos
- [ ] Bloco custom `quiz` no editor BlockNote (`createReactBlockSpec`), registrado no `editor-schema.ts`.
- [ ] Formulário de autoria do quiz (N questões; cada uma: enunciado, 2–N alternativas, 1 correta, explicação opcional; campo `notaCorte` default 70).
- [ ] Validação **write-time** das props do quiz em `sanitize-content.ts` (Zod, `z.unknown()`).
- [ ] `RenderBlocks` `case 'quiz'` → componente client `QuizClient` recebendo **só enunciado + alternativas** (gabarito omitido no servidor).
- [ ] Rota `POST /api/universinid/quiz/attempt` com `withAuth(['STUDENT','ADMIN'])`: correção server-side contra `contentPublished`, grava `QuizAttempt` (com snapshot), e se aprovado chama `markLessonProgress(COMPLETED/100)`.
- [ ] Tabela nova `QuizAttempt` (join-por-valor, sem FK) via `db:push` + `db:generate`.
- [ ] Página da lição: detectar quiz em `contentPublished` e ocultar o botão manual `MarkComplete` nessa lição (lições sem quiz seguem como hoje).
- [ ] Visão admin **por aluno**: histórico de quizzes (melhor score + aprovado/não), lendo `QuizAttempt`.
- [ ] Testes TDD cobrindo correção, gating, ausência de gabarito no payload, auth e round-trip do bloco.

### OUT — o que NÃO faremos no v1 (portas abertas p/ depois)
- N quizzes por lição (exigiria `blockId` + tratar órfão) — *motivo: YAGNI; 1/lição cobre o caso*.
- Questões de múltiplas corretas e de texto aberto — *motivo: shape e correção mais complexos; texto aberto quebra o auto-complete (exigiria correção manual)*.
- Tentativas limitadas / bloqueio após N — *motivo: é treinamento, objetivo é aprender*.
- Export CSV e visão admin **por lição** — *motivo: a visão por aluno cobre o v1; export some depois*.
- Submissão no **preview do admin** (DRAFT) — *motivo: manter a fonte de gabarito inequívoca (`contentPublished`); preview mostra o quiz mas com submit desabilitado*.

## 5. Modelo de dados

**Tabela nova — única mudança de schema.** `User` e `LessonProgress` **não mudam**.

```prisma
// Aplicar via `npm run db:push` + `npm run db:generate` (NÃO existe prisma migrate aqui).
model QuizAttempt {
  id         String   @id @default(cuid())
  userId     String   // join-por-valor, SEM FK (espelha LessonProgress; User intocado)
  lessonSlug String   // join-por-valor, SEM FK (mesmo contrato do LessonProgress)
  score      Int      // % de acerto, 0–100
  passed     Boolean  // score >= notaCorte no momento da submissão
  answers    Json     // SNAPSHOT: { notaCorte, itens: [{ enunciado, alternativas, escolhidaIdx, corretaIdx, acertou }] }
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([lessonSlug])
  @@index([userId, lessonSlug])
  @@map("quiz_attempts")
  // SEM @@unique — guardamos TODAS as tentativas; "vale a melhor" = max(score) por (userId, lessonSlug)
}
```

**Config do quiz** (questões, alternativas, gabarito, explicações, `notaCorte`) **não vai
para o banco relacional** — vive nas **props do bloco** dentro de `Lesson.contentDraft` /
`contentPublished`, serializada como JSON estruturado. As props do BlockNote são
primitivas; o array de questões será guardado como JSON serializado numa prop e
editado via o formulário do bloco (não inline).

Forma das props do bloco (write-time / read-time, validada por Zod `z.unknown()`):
```ts
type QuizBlockProps = {
  notaCorte: number            // default 70
  questoes: Array<{
    enunciado: string
    alternativas: string[]     // 2..N
    corretaIdx: number         // índice da alternativa correta — REMOVIDO no render do aluno
    explicacao?: string        // texto opcional — REMOVIDO no render, devolvido só como feedback pós-submissão
  }>
}
```

## 6. Fluxos

### 6.1 Autoria (admin)
`editor-schema.ts` registra `quiz` → no editor o admin insere o bloco e abre seu formulário
(precedente: `EmbedBlock.tsx`). Salva em `contentDraft` via o autosave debounced existente;
`validateContentDoc` (`sanitize-content.ts`) ganha um ramo que valida as props do quiz.
Publicar copia `contentDraft → contentPublished` (fluxo de publish já existente).

### 6.2 Render + submissão (aluno) — gabarito nunca vaza
1. `licao/[slug]/page.tsx` (Server Component) lê `contentPublished`.
2. `RenderBlocks` `case 'quiz'` → `<QuizClient>` recebendo **só** `{ enunciado, alternativas }` por questão (servidor **remove** `corretaIdx`/`explicacao` antes de serializar ao client).
3. Aluno responde tudo → `POST /api/universinid/quiz/attempt` `{ lessonSlug, respostas: number[] }` com `withAuth(['STUDENT','ADMIN'])`.
4. **Correção server-side**: a rota resolve a lição por `resolveLessonBySlug`, exige `status PUBLISHED`, lê o gabarito de `contentPublished`, calcula `score`/`passed` contra `notaCorte`, grava `QuizAttempt` com snapshot. **Se `passed`**, chama `markLessonProgress(slug, COMPLETED, 100)`.
5. Resposta ao cliente: `{ score, passed, feedback: [{ acertou, explicacao? }] }`. `QuizClient` mostra resultado + quais errou + explicações.

### 6.3 Resultados no admin (por aluno)
Nova visão em `/universinid/admin` (junto de Usuários/Conteúdo): seleciona um aluno → lista
de lições com quiz que ele tentou, com **melhor score** (`max(score)`) e **aprovado/não**.
Leitura agregada de `QuizAttempt` por `userId`.

## 7. Segurança — riscos da pré-spec endereçados

| Risco (pré-spec) | Mitigação nesta spec |
|---|---|
| #1 Vazamento de gabarito | Correção **server-side**; render do aluno **omite** `corretaIdx`/`explicacao` |
| #2 Tentativa órfã de bloco | **1 quiz/lição** → chave = `lessonSlug`, sem `blockId` |
| #3 Gabarito muda pós-republicação | **Snapshot** das questões/respostas em `QuizAttempt.answers` |
| #4 Regra "NUNCA alterar `User`" | **join-por-valor** (`userId` sem FK) → zero mudança em `User`; **sem ADR de exceção** |
| #5 Acoplamento ao `catalogo.ts` legado | A rota usa `resolveLessonBySlug` (banco), **não** amplia o catálogo hardcoded |
| #6 CSP vs interatividade | `QuizClient` sem inline script/style fora da política; smoke com CSP no gate |
| #7 Editor quebra com bloco custom | Registrar o spec do bloco `quiz` no schema **antes** de hidratar docs que o contenham; teste de round-trip |
| #8 Submissão sem auth | `withAuth(['STUDENT','ADMIN'])` explícito (middleware não cobre `/api`) + testes 401/403 |
| Anti-abuso | Rota exige lição PUBLISHED + valida slug; abuso mais fino fica OUT do v1 |

## 8. Critérios de sucesso

- Admin cria um quiz numa lição decomposta publicada, **sem codar**, e o quiz aparece para o aluno.
- Aluno responde; **passar (≥ nota de corte) marca a lição COMPLETED** automaticamente (visível no dashboard); reprovar não conclui.
- **Gabarito não está presente** no payload entregue ao navegador do aluno antes da submissão (verificável via DevTools/RSC) — defesa #1.
- Admin vê, por aluno, **quem passou** em cada lição com quiz.
- Conteúdo publicado **antes** do renderer conhecer `quiz` continua abrindo (degrada para nada, sem quebrar) — retrocompat.
- Gate de saída: `npm run build` + `npx tsc --noEmit` + `npm run test` verdes; smoke com CSP ativa.

## 9. Testes (TDD — vitest, imports explícitos, `vi.hoisted` + `vi.mock('@/lib/prisma'|'@/lib/auth')`)

- Correção server-side: score correto; `passed` no limite exato da `notaCorte`; reprovação não conclui.
- Auto-complete: aprovação chama `markLessonProgress(COMPLETED/100)`; reprovação não.
- **Gabarito ausente**: o que `RenderBlocks`/server passa ao `QuizClient` não contém `corretaIdx`/`explicacao`.
- Rota: 401 (sem sessão), 403 (papel errado), 422 (body inválido / lição DRAFT), 200 (fluxo ok).
- Validação write-time: props de quiz inválidas rejeitadas em `validateContentDoc`.
- Round-trip editor↔banco: doc com bloco `quiz` hidrata no editor sem crash.
- Retrocompat: bloco `quiz` desconhecido por renderer antigo degrada (warn + null).

## 10. Stakeholders

- **Sponsor / dono do quadro:** Henrique Emiliano (NID).
- **Usuário final:** alunos do UniversiNID (colaboradores Delp) + admin/instrutor (autoria e acompanhamento).
- **Responsável NID:** Henrique Emiliano.

## 11. Riscos remanescentes / pontos para o `/nid:gate`

- **Props complexas no BlockNote:** array de questões como JSON serializado numa prop — validar no plano que o `createReactBlockSpec` aceita o shape e que o autosave/round-trip não corrompe (risco #7).
- **`QuizClient` sob CSP:** garantir que a interatividade não exija `unsafe-inline`; o gate exige smoke com CSP ativa (risco #6).
- **Resolução por alias na leitura de tentativas:** se uma lição for renomeada, `QuizAttempt.lessonSlug` antigo precisa ser resolvido por `LessonSlugAlias` na visão do admin (espelhar o que `resolveLessonBySlug` já faz).
- **Preview do admin:** decidir no plano a UX de "submit desabilitado no preview" (mensagem clara).
- Espera-se **riders novos** no espírito dos A1–A8 saindo do red-team.

## 12. Pontos de integração no código (verificados 2026-06-18)

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | + model `QuizAttempt` (sem tocar `User`/`LessonProgress`) |
| `src/components/universinid/admin/editor-schema.ts` | registrar bloco `quiz` |
| `src/components/universinid/admin/QuizBlock.tsx` (novo) | bloco + formulário de autoria (precedente: `EmbedBlock.tsx`) |
| `src/lib/universinid/content-types.ts` | + tipo `QuizBlock` na união `UniBlock` |
| `src/lib/universinid/sanitize-content.ts` | + ramo de validação das props do quiz (Zod `z.unknown()`) |
| `src/components/universinid/RenderBlocks.tsx` | + `case 'quiz'` → `<QuizClient>` (omitindo gabarito) |
| `src/components/universinid/QuizClient.tsx` (novo) | render interativo + submissão |
| `src/app/api/universinid/quiz/attempt/route.ts` (novo) | correção server-side + grava tentativa + auto-complete |
| `src/lib/universinid/validators.ts` | + schema Zod da submissão de tentativa |
| `src/app/universinid/(app)/licao/[slug]/page.tsx` | ocultar `MarkComplete` se a lição tiver quiz |
| `src/app/universinid/admin/**` + `src/hooks/universinid/use-admin-content.ts` | + visão/consulta de resultados por aluno |
| `src/app/universinid/universinid.css` | classes `.uni-quiz*` (escopado; nunca `globals.css`) |
| testes co-locados `*.test.ts(x)` | conforme §9 |

---

> **Próximo passo após aprovação:** marcar `Status: aprovada`, então `/nid:plan` (plano técnico
> com tarefas TDD, agentes e dependências) → `/nid:gate` (red-team adversarial, GO/NO-GO).
> Se o gate exigir, registrar ADR para qualquer decisão arquitetural relevante.

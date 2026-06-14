# ADR-0003 — UniversiNID: revogação de sessão de usuário desativado via re-check no banco (não maxAge)

> **Nota de numeração:** originalmente commitado como ADR-0002 (commit `c96266c`); renumerado para
> 0003 por colisão com `0002-universinid-csp-baseline-hardening.md`, criado em paralelo (`66646f0`).
> A mensagem de `c96266c` ainda referencia "ADR-0002" por anterioridade — não reescrita para não
> mexer em histórico já com descendentes.

- **Status:** ✅ Aceito (2026-06-14)
- **Projeto:** nid-planeta · UniversiNID (segurança)
- **Contexto-fonte:** Revisão de segurança FASE-07 — gap OWASP A07 confirmado (confiança 0.9)
- **Decisores:** Henrique Emiliano (aprovação das 2 escolhas) + Claude (análise/implementação)

## Contexto

A sessão do UniversiNID é **JWT com `maxAge` de 8h** (`src/lib/auth.config.ts`). O callback `jwt`
copia para o token apenas `uid/nome/role` — **nunca `isActive`**. O flag `isActive` só é verificado
no **login** (`src/lib/auth.ts`, no `authorize`).

Os dois chokepoints de autorização do servidor — `withAuth()` (`src/lib/api-utils.ts`, todas as
12 rotas `/api/**`) e `exigirSessao()`/`exigirAdmin()` (`src/lib/universinid/actions.ts`, todos os
server actions / data de RSC) — inspecionavam **somente a sessão decodificada** (presença + role),
sem tocar no banco.

Consequência: `toggleUserActive` desativa a conta de verdade, mas **o JWT já emitido continua
autorizando por até 8h**. Janela de revogação = vida do token. É o **OWASP A07 (Identification and
Authentication Failures)** na forma "sessão não revogável".

## Decisão

**Re-checar `isActive` no banco a cada operação autenticada do servidor**, nos dois chokepoints:

```ts
const ativo = await prisma.user.findUnique({
  where: { id, isActive: true },   // Prisma 7: filtro não-único junto do PK
  select: { id: true },
});
// null ⇒ conta inexistente OU inativa ⇒ negar
```

- Em `withAuth()`: `null` → `401 "Conta inativa"` (o role-check de 403 roda **antes**, então requests
  barrados por role nem consultam o banco).
- Em `exigirSessao()`: `null` → lança `'Conta inativa'` (`exigirAdmin` herda, pois chama `exigirSessao`).

**Duas escolhas explícitas do aprovador (2026-06-14):**
1. **Status `401`** (não 403): conta desativada = identidade revogada → forçar novo login (que então
   falha no `authorize`). 403 ("sem permissão para este recurso") tem semântica errada aqui.
2. **`maxAge` permanece 8h** — a query já fecha a janela; mexer no token seria mitigação redundante
   com custo de UX. Ver alternativa A.

**Schema inalterado** (regra inegociável #2 do CLAUDE.md — `User`/`LessonProgress` não se tocam).

## Alternativas consideradas

| # | Alternativa | Veredito |
|---|---|---|
| **A** | **Reduzir `maxAge`** (ex.: 15min–1h) | ❌ Rejeitada. **Mitiga, não corrige**: só encurta a janela, nunca a zera; piora UX (re-logins). Complementar, não substituta. |
| **B** | **Copiar `isActive` no token** + invalidar | ❌ Rejeitada. O token é *stale by design*; sem um server-side check (lista de revogação / version bump) a desativação só vale no próximo refresh — ou seja, ainda precisaria de query. Não fecha a janela sozinha. |
| **C** | **Re-check no middleware (edge)** | ❌ Inviável. O `middleware.ts` roda `NextAuth(authConfig)` com `providers: []` **de propósito** para ficar sem Prisma no edge (ADR-0001 / arquitetura). O edge só enxerga o token, jamais o banco. |
| **D** | **Re-check por request nos 2 chokepoints Node** | ✅ **ESCOLHIDA.** Único ponto que cobre 100% das rotas e actions, em runtime Node (com Prisma), sem tocar edge nem schema. |

## Consequências

**Positivas:**
- A janela **fecha de verdade**: revogação vale no próximo request autenticado (~imediato), não em 8h.
- Defesa em ponto único: todo gate de auth já passa por `withAuth`/`exigirSessao` (regra #4 do CLAUDE.md).
- Edge intacto; schema intacto; `maxAge` intacto. Mudança mínima e proporcional.
- Custo trivial: 1 `findUnique` por PK (`User.id` é indexado), `select: { id }`, sem joins.

**Negativas / dívidas assumidas:**
- **+1 query no banco por request autenticada.** Aceito — plataforma de treinamento interno, baixo QPS;
  e as rotas já consultam o Prisma logo em seguida.
- **UX degradada para o desativado:** o middleware (edge) deixa o token válido passar, então ele ainda
  **carrega o shell** de uma página, mas todo caminho de **dado** nega — inclusive `getDashboardData`
  (chama `exigirSessao` no render) → erro/negação, **não** um logout limpo. Endereçável depois, fora
  do escopo deste fix.
- `withAuth` passa a ter dependência de banco (antes era pura sobre a sessão); se o Prisma cair, a auth
  falha — mas a rota falharia no próximo `prisma.*` de qualquer modo.

## Evidência (verificada)

- TDD: teste falhou primeiro (RED) e passou após o fix (GREEN) em `src/lib/api-utils.test.ts`
  e `src/lib/universinid/actions.test.ts`; **teste de rota** ponta-a-ponta em
  `lessons.test.ts` (ADMIN válido + `isActive=false` → 401, sem `lessonCreate`).
- Blast radius do chokepoint: 5 suites de rota (`lessons/modules/courses/upload/reseed`) passaram a
  exigir stub de `prisma.user.findUnique` (default "ativo").
- Gates: **107/107** testes · `tsc --noEmit` exit 0 · `npm run build` exit 0 (Middleware 87.5 kB →
  confirma que o `import prisma` em `api-utils.ts` **não** vazou para o edge).
- Memória de arquitetura: `project_universinid_session_revocation`.

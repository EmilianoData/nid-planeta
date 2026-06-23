# UniversiNID Plataforma · Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o UniversiNID (HTML estático) em uma plataforma de aprendizado com login gerenciado por admin, progresso persistido por lição, dashboard do aluno e command palette — rodando sobre o conteúdo HTML atual.

**Architecture:** App Next.js 15 (App Router) monolítica. NextAuth v5 (Credentials, e-mail+senha, JWT) espelhando o padrão do `c:\dev\apontdelp`. Prisma 7.5 + Postgres (Neon) via `@prisma/adapter-pg`. Catálogo de lições como dado em código (slug estável = chave de progresso); cada lição embute a tela correspondente do `public/universinid.html` via iframe em modo "embed". Lógica pura (catálogo, agregação de dashboard, hash de senha) coberta por testes Vitest; páginas/middleware validados por build + verificação manual.

**Tech Stack:** Next.js 15, React 19, TypeScript, NextAuth v5, Prisma 7.5, Postgres (Neon), bcryptjs, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-29-universinid-plataforma-fase1-design.md`

---

## File Structure

**Criar:**
- `vitest.config.ts` — runner de testes (env node, resolve `@/`)
- `prisma/schema.prisma` — modelos User, LessonProgress
- `prisma/seed.ts` — cria admin inicial
- `.env.example` — documenta variáveis
- `src/generated/prisma/**` — client gerado (gitignored)
- `src/lib/prisma.ts` — singleton PrismaClient + PrismaPg
- `src/lib/auth.config.ts` — config NextAuth Edge-safe
- `src/lib/auth.ts` — NextAuth com Credentials + Prisma
- `src/lib/password.ts` — hashPassword/verifyPassword
- `src/types/next-auth.d.ts` — tipos de sessão
- `src/middleware.ts` — gate de `/universinid/**`
- `src/app/api/auth/[...nextauth]/route.ts` — handlers NextAuth
- `src/lib/universinid/catalogo.ts` — módulos/lições/metadados/screenId + helpers
- `src/lib/universinid/catalogo.test.ts` — integridade do catálogo
- `src/lib/universinid/dashboard.ts` — `buildDashboard` (função pura)
- `src/lib/universinid/dashboard.test.ts` — testes de agregação
- `src/lib/universinid/actions.ts` — server actions (progresso, dashboard, admin)
- `src/app/universinid/universinid.css` — estilos da plataforma
- `src/app/universinid/layout.tsx` — casca (SessionProvider, sidebar, topbar, ⌘K)
- `src/app/universinid/page.tsx` — dashboard
- `src/app/universinid/login/page.tsx` + `LoginForm.tsx`
- `src/app/universinid/licao/[slug]/page.tsx`
- `src/app/universinid/admin/page.tsx` + `AdminUsers.tsx`
- `src/components/universinid/Sidebar.tsx`
- `src/components/universinid/Topbar.tsx`
- `src/components/universinid/CommandPalette.tsx`
- `src/components/universinid/MarkComplete.tsx`

**Modificar:**
- `package.json` — deps + scripts
- `.gitignore` — `src/generated/`
- `public/universinid.html` — modo `?embed=1` (esconde chrome antigo)
- `next.config.mjs` — remover rewrite legado `/universinid`
- `src/components/landing/PortalDock.tsx` — link `/universinid` continua válido (verificar)

---

## Task 1: Test runner (Vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/__smoke__.test.ts`

- [ ] **Step 1: Instalar dependências de teste**

Run:
```bash
npm install -D vitest vite-tsconfig-paths
```

- [ ] **Step 2: Criar config do Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Adicionar script de teste**

In `package.json`, dentro de `"scripts"`, adicionar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Escrever teste smoke que falha**

Create `src/lib/__smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('test runner', () => {
  it('soma', () => {
    expect(1 + 1).toBe(3);
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `expected 2 to be 3`.

- [ ] **Step 6: Corrigir para passar**

Em `src/lib/__smoke__.test.ts`, trocar `toBe(3)` por `toBe(2)`.

- [ ] **Step 7: Rodar e ver passar**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/__smoke__.test.ts
git commit -m "chore(test): configurar Vitest"
```

---

## Task 2: Banco — deps, schema Prisma, client, env

**Files:**
- Modify: `package.json`, `.gitignore`
- Create: `prisma/schema.prisma`, `src/lib/prisma.ts`, `.env.example`

- [ ] **Step 1: Instalar dependências de banco/auth**

Run:
```bash
npm install next-auth@^5.0.0-beta.30 @auth/prisma-adapter @prisma/client@^7.5.0 @prisma/adapter-pg pg bcryptjs zod@^3.23.8
npm install -D prisma@^7.5.0 tsx @types/bcryptjs @types/pg
```

- [ ] **Step 2: Criar schema Prisma**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String           @id @default(cuid())
  email        String           @unique
  name         String
  passwordHash String
  role         Role             @default(STUDENT)
  isActive     Boolean          @default(true)
  createdAt    DateTime         @default(now())
  progress     LessonProgress[]

  @@map("users")
}

enum Role {
  STUDENT
  ADMIN
}

model LessonProgress {
  id         String         @id @default(cuid())
  userId     String
  lessonSlug String
  status     ProgressStatus @default(NOT_STARTED)
  pct        Int            @default(0)
  updatedAt  DateTime       @updatedAt
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonSlug])
  @@index([userId])
  @@map("lesson_progress")
}

enum ProgressStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}
```

- [ ] **Step 3: Ignorar client gerado**

In `.gitignore`, adicionar linha:
```
src/generated/
```

- [ ] **Step 4: Scripts de banco no package.json**

In `package.json` `"scripts"`, adicionar:
```json
"db:push": "prisma db push",
"db:studio": "prisma studio",
"db:seed": "tsx prisma/seed.ts",
"db:generate": "prisma generate",
"postinstall": "prisma generate"
```
E no nível raiz do JSON adicionar:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 5: Documentar variáveis de ambiente**

Create `.env.example`:
```
# Postgres (Neon) — criar projeto em https://neon.tech e colar a connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST/db?sslmode=require"

# Segredo do NextAuth v5 — gerar com: npx auth secret
AUTH_SECRET="troque-por-um-segredo-forte"

# Admin inicial criado pelo seed
SEED_ADMIN_EMAIL="henrique.emiliano@delp.com.br"
SEED_ADMIN_NAME="Henrique Emiliano"
SEED_ADMIN_PASSWORD="troque-no-primeiro-login"
```

- [ ] **Step 6: Criar `.env` local (não commitado)**

Criar Neon DB, copiar a connection string para `DATABASE_URL` em `.env` (mesmas chaves do
`.env.example`). Gerar o `AUTH_SECRET` (NextAuth v5 lê essa variável) com:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
e colar em `.env`. **Não** usar `npx auth secret` — esse comando baixa o pacote `better-auth`
e imprime `BETTER_AUTH_SECRET` (nome errado para o NextAuth).

- [ ] **Step 7: Criar o client singleton**

Create `src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 8,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => console.error('Unexpected PG pool error:', err));
  const adapter = new PrismaPg(pool as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 8: Gerar client e aplicar schema**

Run:
```bash
npm run db:generate
npm run db:push
```
Expected: `prisma generate` cria `src/generated/prisma`; `db:push` aplica as tabelas `users` e `lesson_progress` no Neon (mensagem "Your database is now in sync").

- [ ] **Step 9: Verificar tabelas**

Run: `npm run db:studio`
Expected: Prisma Studio abre mostrando `users` e `lesson_progress` vazias. Fechar.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma src/lib/prisma.ts .env.example .gitignore
git commit -m "feat(db): Prisma 7.5 + Postgres (Neon), modelos User e LessonProgress"
```

---

## Task 3: Catálogo de lições + teste de integridade

**Files:**
- Create: `src/lib/universinid/catalogo.ts`
- Test: `src/lib/universinid/catalogo.test.ts`

- [ ] **Step 1: Escrever o teste de integridade (falha primeiro)**

Create `src/lib/universinid/catalogo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGO, todasLicoes, getLicao } from './catalogo';

const html = readFileSync(join(process.cwd(), 'public/universinid.html'), 'utf8');

describe('catálogo UniversiNID', () => {
  it('tem 6 módulos e 39 lições', () => {
    expect(CATALOGO).toHaveLength(6);
    expect(todasLicoes()).toHaveLength(39);
  });

  it('todo screenId existe como painel no universinid.html', () => {
    for (const licao of todasLicoes()) {
      expect(html).toContain(`class="screen" id="${licao.screenId}"`);
    }
  });

  it('slugs são únicos', () => {
    const slugs = todasLicoes().map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('getLicao resolve por slug e retorna o módulo', () => {
    const r = getLicao('agent-orchestration');
    expect(r?.licao.screenId).toBe('s0-3');
    expect(r?.modulo.id).toBe('m0');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/universinid/catalogo.test.ts`
Expected: FAIL — módulo `./catalogo` não existe.

- [ ] **Step 3: Criar o catálogo**

Create `src/lib/universinid/catalogo.ts`:
```ts
export type Dificuldade = 'Iniciante' | 'Intermediário' | 'Avançado';

export interface Licao {
  slug: string;        // chave ESTÁVEL de progresso (não muda na migração MDX)
  titulo: string;
  ordem: number;
  tempoMin: number;
  dificuldade: Dificuldade;
  screenId: string;    // âncora no public/universinid.html
}

export interface Modulo {
  id: string;
  titulo: string;
  emoji: string;
  ordem: number;
  licoes: Licao[];
}

export const CATALOGO: Modulo[] = [
  {
    id: 'm0', emoji: '🧠', titulo: 'Fundamentos', ordem: 0, licoes: [
      { slug: 'sdd-spec-driven-development', titulo: 'SDD — Spec-Driven Development', ordem: 1, tempoMin: 8, dificuldade: 'Iniciante', screenId: 's0-1' },
      { slug: 'llm-o-que-e', titulo: 'LLM — O que é e como usar bem', ordem: 2, tempoMin: 6, dificuldade: 'Iniciante', screenId: 's0-2' },
      { slug: 'agent-orchestration', titulo: 'Agent Orchestration — como agentes trabalham juntos', ordem: 3, tempoMin: 9, dificuldade: 'Iniciante', screenId: 's0-3' },
      { slug: 'por-que-ia-agentica', titulo: 'Por que o NID adotou IA agêntica', ordem: 4, tempoMin: 7, dificuldade: 'Iniciante', screenId: 's0-4' },
      { slug: 'glossario-visual', titulo: 'Glossário Visual', ordem: 5, tempoMin: 5, dificuldade: 'Iniciante', screenId: 's0-5' },
    ],
  },
  {
    id: 'm1', emoji: '🚀', titulo: 'Básico', ordem: 1, licoes: [
      { slug: 'instalacao-nid-spec-kit', titulo: 'Instalação do nid-spec-kit', ordem: 1, tempoMin: 6, dificuldade: 'Iniciante', screenId: 's1-1' },
      { slug: 'casual-vs-formal', titulo: 'Casual vs Formal — dois modos de uso', ordem: 2, tempoMin: 7, dificuldade: 'Iniciante', screenId: 's1-2' },
      { slug: 'primeira-skill-dax-medidas', titulo: 'Primeira skill — usando nid-dax-medidas', ordem: 3, tempoMin: 8, dificuldade: 'Iniciante', screenId: 's1-3' },
      { slug: 'primeiro-agente-bi-engineer', titulo: 'Primeiro agente — nid-bi-engineer', ordem: 4, tempoMin: 8, dificuldade: 'Iniciante', screenId: 's1-4' },
      { slug: 'dez-principios-constituicao', titulo: 'Os 10 Princípios da Constituição NID', ordem: 5, tempoMin: 10, dificuldade: 'Iniciante', screenId: 's1-5' },
      { slug: 'modo-didatico', titulo: 'Modo Didático — aprender enquanto entrega', ordem: 6, tempoMin: 6, dificuldade: 'Iniciante', screenId: 's1-6' },
    ],
  },
  {
    id: 'm2', emoji: '⚙️', titulo: 'Intermediário', ordem: 2, licoes: [
      { slug: 'ciclo-sdd', titulo: 'Ciclo SDD — do brief ao código', ordem: 1, tempoMin: 10, dificuldade: 'Intermediário', screenId: 's2-1' },
      { slug: 'nid-gate-checkpoint', titulo: '/nid:gate — o checkpoint bloqueante', ordem: 2, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's2-2' },
      { slug: 'verificacao-por-midia', titulo: 'Verificação por mídia — VBC na prática', ordem: 3, tempoMin: 9, dificuldade: 'Intermediário', screenId: 's2-3' },
      { slug: 'arvore-decisao-agente', titulo: 'Árvore de decisão — qual agente usar?', ordem: 4, tempoMin: 7, dificuldade: 'Intermediário', screenId: 's2-4' },
      { slug: 'knowledge-base-uso', titulo: 'Knowledge base — como usar e manter', ordem: 5, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's2-5' },
    ],
  },
  {
    id: 'm3', emoji: '🔬', titulo: 'Avançado', ordem: 3, licoes: [
      { slug: 'skill-create', titulo: '/nid:skill-create — criando novas skills', ordem: 1, tempoMin: 12, dificuldade: 'Avançado', screenId: 's3-1' },
      { slug: 'rules-distill', titulo: '/nid:rules-distill — extraindo padrões de exemplos', ordem: 2, tempoMin: 11, dificuldade: 'Avançado', screenId: 's3-2' },
      { slug: 'nid-eval', titulo: '/nid:eval — avaliando skills e agentes', ordem: 3, tempoMin: 10, dificuldade: 'Avançado', screenId: 's3-3' },
      { slug: 'manter-knowledge-curador', titulo: 'Manter knowledge — o curador do kit', ordem: 4, tempoMin: 9, dificuldade: 'Avançado', screenId: 's3-4' },
      { slug: 'contribuir-pr', titulo: 'Contribuir com PR — fluxo de contribuição', ordem: 5, tempoMin: 10, dificuldade: 'Avançado', screenId: 's3-5' },
      { slug: 'override-constituicao-adr', titulo: 'Override de constituição — quando e como usar ADR', ordem: 6, tempoMin: 9, dificuldade: 'Avançado', screenId: 's3-6' },
    ],
  },
  {
    id: 'm4', emoji: '📋', titulo: 'Playbooks', ordem: 4, licoes: [
      { slug: 'playbook-bi-dax', titulo: 'Playbook BI / DAX', ordem: 1, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-1' },
      { slug: 'playbook-etl-python', titulo: 'Playbook ETL Python', ordem: 2, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-2' },
      { slug: 'playbook-ai-engineering', titulo: 'Playbook AI Engineering', ordem: 3, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-3' },
      { slug: 'playbook-azure-ai', titulo: 'Playbook Azure AI', ordem: 4, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-4' },
      { slug: 'playbook-azure-data', titulo: 'Playbook Azure Data', ordem: 5, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-5' },
      { slug: 'playbook-m365-power-platform', titulo: 'Playbook M365 / Power Platform', ordem: 6, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-6' },
      { slug: 'playbook-web-mes-apontdelp', titulo: 'Playbook Web / MES (ApontDELP)', ordem: 7, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-7' },
      { slug: 'playbook-rpa-n8n', titulo: 'Playbook RPA / N8N', ordem: 8, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-8' },
      { slug: 'playbook-api-postman', titulo: 'Playbook API / Postman', ordem: 9, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-9' },
      { slug: 'playbook-slides-comunicacao', titulo: 'Playbook Slides / Comunicação', ordem: 10, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-10' },
      { slug: 'playbook-sharepoint-html-embed', titulo: 'Playbook SharePoint HTML Embed', ordem: 11, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-11' },
      { slug: 'playbook-propostas', titulo: 'Playbook Propostas (referência)', ordem: 12, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-12' },
    ],
  },
  {
    id: 'm5', emoji: '⚡', titulo: 'Referência Rápida', ordem: 5, licoes: [
      { slug: 'cheatsheet-comandos', titulo: 'Cheatsheet — 12 comandos /nid:*', ordem: 1, tempoMin: 4, dificuldade: 'Iniciante', screenId: 's5-1' },
      { slug: 'cheatsheet-agentes', titulo: 'Cheatsheet — 28 agentes nid-*', ordem: 2, tempoMin: 4, dificuldade: 'Iniciante', screenId: 's5-2' },
      { slug: 'cheatsheet-skills', titulo: 'Cheatsheet — 45 skills nid-*', ordem: 3, tempoMin: 4, dificuldade: 'Iniciante', screenId: 's5-3' },
      { slug: 'glossario-delp', titulo: 'Glossário DELP', ordem: 4, tempoMin: 5, dificuldade: 'Iniciante', screenId: 's5-4' },
      { slug: 'faq', titulo: 'FAQ — Perguntas frequentes', ordem: 5, tempoMin: 5, dificuldade: 'Iniciante', screenId: 's5-5' },
    ],
  },
];

export function todasLicoes(): Licao[] {
  return CATALOGO.flatMap((m) => m.licoes);
}

export function getLicao(slug: string): { licao: Licao; modulo: Modulo } | null {
  for (const modulo of CATALOGO) {
    const licao = modulo.licoes.find((l) => l.slug === slug);
    if (licao) return { licao, modulo };
  }
  return null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/universinid/catalogo.test.ts`
Expected: PASS (4 tests). Se algum screenId falhar, corrigir o screenId no catálogo conforme o HTML.

- [ ] **Step 5: Commit**

```bash
git add src/lib/universinid/catalogo.ts src/lib/universinid/catalogo.test.ts
git commit -m "feat(universinid): catálogo de lições com teste de integridade"
```

---

## Task 4: Agregação do dashboard (`buildDashboard`)

**Files:**
- Create: `src/lib/universinid/dashboard.ts`
- Test: `src/lib/universinid/dashboard.test.ts`

- [ ] **Step 1: Escrever os testes (falha primeiro)**

Create `src/lib/universinid/dashboard.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildDashboard, type ProgressRow } from './dashboard';

const d = (s: string) => new Date(s + 'T12:00:00Z');

describe('buildDashboard', () => {
  it('sem progresso: 0%, próxima = primeira lição, streak 0', () => {
    const r = buildDashboard([], d('2026-05-29'));
    expect(r.totalLicoes).toBe(39);
    expect(r.licoesConcluidas).toBe(0);
    expect(r.pctGeral).toBe(0);
    expect(r.modulosAtivos).toBe(0);
    expect(r.streakDias).toBe(0);
    expect(r.proxima?.slug).toBe('sdd-spec-driven-development');
  });

  it('com concluídas: pct e próxima corretos', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
      { lessonSlug: 'llm-o-que-e', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
      { lessonSlug: 'agent-orchestration', status: 'IN_PROGRESS', pct: 60, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'));
    expect(r.licoesConcluidas).toBe(2);
    expect(r.pctGeral).toBe(Math.round((2 / 39) * 100));
    expect(r.modulosAtivos).toBe(1);
    expect(r.proxima?.slug).toBe('agent-orchestration'); // IN_PROGRESS tem prioridade
    expect(r.proxima?.pct).toBe(60);
  });

  it('próxima pula concluídas para a primeira não-concluída', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'));
    expect(r.proxima?.slug).toBe('llm-o-que-e');
  });

  it('streak conta dias consecutivos terminando hoje', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-27') },
      { lessonSlug: 'llm-o-que-e', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-28') },
      { lessonSlug: 'agent-orchestration', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-29') },
    ];
    expect(buildDashboard(rows, d('2026-05-29')).streakDias).toBe(3);
  });

  it('streak quebrado: só conta o bloco que termina hoje/ontem', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-20') },
      { lessonSlug: 'agent-orchestration', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-29') },
    ];
    expect(buildDashboard(rows, d('2026-05-29')).streakDias).toBe(1);
  });

  it('trilha = lições do módulo da próxima lição, com status', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'));
    expect(r.trilha.moduloTitulo).toBe('Fundamentos');
    expect(r.trilha.licoes).toHaveLength(5);
    expect(r.trilha.licoes[0].status).toBe('COMPLETED');
    expect(r.trilha.licoes[1].status).toBe('NOT_STARTED');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/universinid/dashboard.test.ts`
Expected: FAIL — módulo `./dashboard` não existe.

- [ ] **Step 3: Implementar `buildDashboard`**

Create `src/lib/universinid/dashboard.ts`:
```ts
import { CATALOGO, todasLicoes, getLicao, type Dificuldade } from './catalogo';

export type Status = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ProgressRow {
  lessonSlug: string;
  status: Status;
  pct: number;
  updatedAt: Date;
}

export interface DashboardData {
  totalLicoes: number;
  licoesConcluidas: number;
  pctGeral: number;
  modulosAtivos: number;
  streakDias: number;
  proxima: { slug: string; titulo: string; moduloTitulo: string; pct: number } | null;
  trilha: {
    moduloTitulo: string;
    licoes: { slug: string; titulo: string; tempoMin: number; dificuldade: Dificuldade; status: Status }[];
  };
}

function statusDe(slug: string, bySlug: Map<string, ProgressRow>): Status {
  return bySlug.get(slug)?.status ?? 'NOT_STARTED';
}

function diaUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calcStreak(rows: ProgressRow[], now: Date): number {
  const dias = new Set(rows.map((r) => diaUTC(r.updatedAt)));
  if (dias.size === 0) return 0;
  // Âncora: hoje se houve atividade hoje, senão ontem (permite contar streak "vivo")
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!dias.has(diaUTC(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!dias.has(diaUTC(cursor))) return 0;
  }
  let streak = 0;
  while (dias.has(diaUTC(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function buildDashboard(rows: ProgressRow[], now: Date): DashboardData {
  const bySlug = new Map(rows.map((r) => [r.lessonSlug, r]));
  const licoes = todasLicoes();
  const totalLicoes = licoes.length;
  const licoesConcluidas = rows.filter((r) => r.status === 'COMPLETED').length;
  const pctGeral = totalLicoes === 0 ? 0 : Math.round((licoesConcluidas / totalLicoes) * 100);

  const modulosAtivos = CATALOGO.filter((m) =>
    m.licoes.some((l) => {
      const s = bySlug.get(l.slug)?.status;
      return s === 'IN_PROGRESS' || s === 'COMPLETED';
    }),
  ).length;

  // Próxima: primeira IN_PROGRESS na ordem; senão primeira não-concluída
  const emCurso = licoes.find((l) => statusDe(l.slug, bySlug) === 'IN_PROGRESS');
  const naoConcluida = licoes.find((l) => statusDe(l.slug, bySlug) !== 'COMPLETED');
  const alvo = emCurso ?? naoConcluida ?? null;

  let proxima: DashboardData['proxima'] = null;
  let trilhaModuloId = CATALOGO[0].id;
  if (alvo) {
    const ref = getLicao(alvo.slug)!;
    proxima = {
      slug: alvo.slug,
      titulo: alvo.titulo,
      moduloTitulo: ref.modulo.titulo,
      pct: bySlug.get(alvo.slug)?.pct ?? 0,
    };
    trilhaModuloId = ref.modulo.id;
  }

  const modulo = CATALOGO.find((m) => m.id === trilhaModuloId) ?? CATALOGO[0];
  const trilha = {
    moduloTitulo: modulo.titulo,
    licoes: modulo.licoes.map((l) => ({
      slug: l.slug,
      titulo: l.titulo,
      tempoMin: l.tempoMin,
      dificuldade: l.dificuldade,
      status: statusDe(l.slug, bySlug),
    })),
  };

  return {
    totalLicoes,
    licoesConcluidas,
    pctGeral,
    modulosAtivos,
    streakDias: calcStreak(rows, now),
    proxima,
    trilha,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/universinid/dashboard.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/universinid/dashboard.ts src/lib/universinid/dashboard.test.ts
git commit -m "feat(universinid): agregação de dashboard (buildDashboard) com testes"
```

---

## Task 5: Hash de senha (`password.ts`)

**Files:**
- Create: `src/lib/password.ts`
- Test: `src/lib/password.test.ts`

- [ ] **Step 1: Escrever o teste (falha primeiro)**

Create `src/lib/password.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('hash não é igual ao texto puro e verifica corretamente', async () => {
    const hash = await hashPassword('segredo123');
    expect(hash).not.toBe('segredo123');
    expect(hash.startsWith('$2')).toBe(true);
    expect(await verifyPassword('segredo123', hash)).toBe(true);
    expect(await verifyPassword('errado', hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/password.test.ts`
Expected: FAIL — módulo `./password` não existe.

- [ ] **Step 3: Implementar**

Create `src/lib/password.ts`:
```ts
import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/password.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/password.ts src/lib/password.test.ts
git commit -m "feat(auth): util de hash de senha (bcrypt)"
```

---

## Task 6: Seed do admin inicial

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Escrever o seed**

Create `prisma/seed.ts`:
```ts
import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) }); // eslint-disable-line @typescript-eslint/no-explicit-any

async function main() {
  const email = process.env['SEED_ADMIN_EMAIL'];
  const name = process.env['SEED_ADMIN_NAME'];
  const password = process.env['SEED_ADMIN_PASSWORD'];
  if (!email || !name || !password) {
    throw new Error('Defina SEED_ADMIN_EMAIL, SEED_ADMIN_NAME e SEED_ADMIN_PASSWORD no .env');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: 'ADMIN', isActive: true },
    create: { email, name, passwordHash, role: 'ADMIN', isActive: true },
  });
  console.log(`Admin pronto: ${user.email} (${user.role})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
```

- [ ] **Step 2: Rodar o seed**

Run: `npm run db:seed`
Expected: `Admin pronto: <email> (ADMIN)`.

- [ ] **Step 3: Verificar no Studio**

Run: `npm run db:studio`
Expected: `users` tem 1 registro com role ADMIN. Fechar.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(db): seed do admin inicial"
```

---

## Task 7: NextAuth v5 (config, auth, route, tipos, middleware)

**Files:**
- Create: `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/types/next-auth.d.ts`, `src/middleware.ts`, `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Config Edge-safe**

Create `src/lib/auth.config.ts`:
```ts
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/universinid/login' },
  providers: [], // preenchido em auth.ts (mantém middleware sem Prisma)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.nome = (user as { nome: string }).nome;
        token.role = (user as { role: 'STUDENT' | 'ADMIN' }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.uid as string,
        nome: token.nome as string,
        role: token.role as 'STUDENT' | 'ADMIN',
      };
      return session;
    },
  },
};
```

- [ ] **Step 2: NextAuth com Credentials + Prisma**

Create `src/lib/auth.ts`:
```ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { authConfig } from '@/lib/auth.config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'E-mail e senha',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, nome: user.name, role: user.role };
      },
    }),
  ],
});
```

- [ ] **Step 3: Tipos de sessão**

Create `src/types/next-auth.d.ts`:
```ts
import 'next-auth';

declare module 'next-auth' {
  interface User {
    nome: string;
    role: 'STUDENT' | 'ADMIN';
  }
  interface Session {
    user: {
      id: string;
      email: string;
      nome: string;
      role: 'STUDENT' | 'ADMIN';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: string;
    nome: string;
    role: 'STUDENT' | 'ADMIN';
  }
}
```

- [ ] **Step 4: Route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 5: Middleware — protege só `/universinid/**`**

Create `src/middleware.ts`:
```ts
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Login e endpoints de auth sempre liberados
  if (pathname.startsWith('/universinid/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Sem sessão → redireciona para login com callback
  if (!req.auth) {
    const url = new URL('/universinid/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Admin só para ADMIN
  if (pathname.startsWith('/universinid/admin') && req.auth.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/universinid', req.url));
  }

  return NextResponse.next();
});

// matcher: SOMENTE rotas /universinid — landing, /sistema-solar, /pipeline ficam públicas
export const config = {
  matcher: ['/universinid/:path*'],
};
```

> Nota: o matcher cobre `/universinid` e subrotas. A rota `/universinid/login` é
> explicitamente liberada no corpo. As demais (`/universinid`, `/universinid/licao/*`,
> `/universinid/admin`) exigem sessão.

- [ ] **Step 6: Verificar build (typecheck)**

Run: `npx tsc --noEmit`
Expected: sem erros de tipo nos arquivos de auth.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.config.ts src/lib/auth.ts src/types/next-auth.d.ts src/middleware.ts "src/app/api/auth/[...nextauth]/route.ts"
git commit -m "feat(auth): NextAuth v5 (e-mail+senha) + middleware gate /universinid"
```

---

## Task 8: Server actions (progresso, dashboard, admin)

**Files:**
- Create: `src/lib/universinid/actions.ts`

- [ ] **Step 1: Implementar as server actions**

Create `src/lib/universinid/actions.ts`:
```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { getLicao } from './catalogo';
import { buildDashboard, type ProgressRow, type DashboardData } from './dashboard';

async function exigirSessao() {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  return session.user;
}

async function exigirAdmin() {
  const user = await exigirSessao();
  if (user.role !== 'ADMIN') throw new Error('Acesso restrito a administradores');
  return user;
}

const progressSchema = z.object({
  slug: z.string().min(1),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  pct: z.number().int().min(0).max(100),
});

export async function markLessonProgress(input: z.infer<typeof progressSchema>) {
  const user = await exigirSessao();
  const { slug, status, pct } = progressSchema.parse(input);
  if (!getLicao(slug)) throw new Error(`Lição inexistente: ${slug}`);

  await prisma.lessonProgress.upsert({
    where: { userId_lessonSlug: { userId: user.id, lessonSlug: slug } },
    update: { status, pct },
    create: { userId: user.id, lessonSlug: slug, status, pct },
  });

  revalidatePath('/universinid');
  revalidatePath(`/universinid/licao/${slug}`);
}

export async function getDashboardData(): Promise<DashboardData & { nome: string }> {
  const user = await exigirSessao();
  const rows = await prisma.lessonProgress.findMany({ where: { userId: user.id } });
  const progress: ProgressRow[] = rows.map((r) => ({
    lessonSlug: r.lessonSlug,
    status: r.status,
    pct: r.pct,
    updatedAt: r.updatedAt,
  }));
  return { ...buildDashboard(progress, new Date()), nome: user.nome };
}

export async function getProgressMap(): Promise<Record<string, { status: string; pct: number }>> {
  const user = await exigirSessao();
  const rows = await prisma.lessonProgress.findMany({ where: { userId: user.id } });
  return Object.fromEntries(rows.map((r) => [r.lessonSlug, { status: r.status, pct: r.pct }]));
}

// ---- Admin ----
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['STUDENT', 'ADMIN']).default('STUDENT'),
});

export async function listUsers() {
  await exigirAdmin();
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  await exigirAdmin();
  const { email, name, password, role } = createUserSchema.parse(input);
  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { email, name, passwordHash, role } });
  revalidatePath('/universinid/admin');
}

export async function toggleUserActive(userId: string) {
  await exigirAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Usuário não encontrado');
  await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
  revalidatePath('/universinid/admin');
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros (note que `prisma.lessonProgress`, enums e `userId_lessonSlug` vêm do client gerado na Task 2).

- [ ] **Step 3: Commit**

```bash
git add src/lib/universinid/actions.ts
git commit -m "feat(universinid): server actions de progresso, dashboard e admin"
```

---

## Task 9: Modo embed no universinid.html

**Files:**
- Modify: `public/universinid.html`

- [ ] **Step 1: Adicionar CSS de embed**

Em `public/universinid.html`, dentro do `<style>` (logo após a regra do `body`, perto da linha 32), adicionar:
```css
/* ── Modo embed (dentro da plataforma React) ── */
body.embed #topbar, body.embed #sidebar { display: none !important; }
body.embed #layout { height: 100vh; }
body.embed #content { padding-top: 16px; }
```

- [ ] **Step 2: Ler a query `embed` no load**

Localizar o handler `window.addEventListener('load', () => {` (≈ linha 6415). Logo na primeira linha dentro dele, adicionar:
```js
  if (new URLSearchParams(location.search).has('embed')) {
    document.body.classList.add('embed');
  }
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev` (se ainda não estiver rodando) e abrir:
`http://localhost:3000/universinid.html?embed=1#s0-3`
Expected: mostra a tela 0.3 **sem** a topbar/sidebar antigas.

- [ ] **Step 4: Commit**

```bash
git add public/universinid.html
git commit -m "feat(universinid): modo embed (?embed=1) para uso dentro da plataforma"
```

---

## Task 10: CSS + casca da plataforma (layout, Sidebar, Topbar)

**Files:**
- Create: `src/app/universinid/universinid.css`, `src/app/universinid/layout.tsx`
- Create: `src/components/universinid/Sidebar.tsx`, `src/components/universinid/Topbar.tsx`

- [ ] **Step 1: CSS da plataforma**

Create `src/app/universinid/universinid.css`:
```css
.uni-shell { --p:#3C3489; --pm:#534AB7; --pl:#f0eeff; --red:#cc0f10; --org:#dd8f1a;
  --ink:#1d1840; --muted:#7c799c; --line:#ececf6; --bg:#faf9ff;
  font-family: "Barlow","Open Sans",system-ui,sans-serif; color:var(--ink);
  background:var(--bg); min-height:100vh; display:flex; flex-direction:column; }
.uni-shell *{ box-sizing:border-box; }

/* topbar */
.uni-top{ height:56px; background:#fff; border-bottom:1px solid var(--line);
  display:flex; align-items:center; gap:16px; padding:0 18px; position:sticky; top:0; z-index:20; }
.uni-wm{ font-weight:800; letter-spacing:.4px; color:var(--ink); font-size:1.05rem; text-decoration:none; }
.uni-wm b{ color:var(--red); }
.uni-k{ margin-left:8px; flex:1; max-width:360px; display:flex; align-items:center; gap:8px;
  background:#f3f2fb; border:1px solid #e7e5f4; border-radius:10px; padding:8px 12px;
  color:#9794b5; font-size:.85rem; cursor:pointer; }
.uni-k .cmd{ margin-left:auto; font-size:.68rem; background:#fff; border:1px solid #e2e0f0;
  border-radius:5px; padding:1px 6px; color:#6b6890; font-family:ui-monospace,monospace; }
.uni-streak{ display:flex; align-items:center; gap:6px; font-size:.85rem; font-weight:700; color:var(--org); }
.uni-av{ width:34px; height:34px; border-radius:50%; border:none; cursor:pointer;
  background:radial-gradient(circle at 35% 30%,#7a6ff0,#3C3489 65%); box-shadow:0 0 0 1px #d9d6ee; color:#fff; font-weight:700; }

/* body layout */
.uni-body{ display:flex; flex:1; }
.uni-side{ width:230px; background:#fff; border-right:1px solid var(--line); padding:16px 12px;
  flex-shrink:0; overflow-y:auto; }
.uni-lbl{ font-size:.62rem; letter-spacing:1.2px; color:#a6a3c4; font-weight:700; margin:8px 8px 8px; }
.uni-nav{ display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:9px;
  margin-bottom:2px; font-size:.85rem; color:#4a4770; text-decoration:none; }
.uni-nav:hover{ background:#f5f4ff; }
.uni-nav.on{ background:var(--pl); color:var(--p); font-weight:650; }
.uni-rg{ width:18px; height:18px; border-radius:50%; flex-shrink:0; }
.uni-main{ flex:1; padding:26px 30px; max-width:1100px; }

/* dashboard */
.uni-hi{ font-size:1.5rem; font-weight:800; margin:0 0 2px; }
.uni-hi span{ color:var(--red); }
.uni-sub{ color:var(--muted); font-size:.9rem; margin:0 0 20px; }
.uni-cont{ position:relative; overflow:hidden; border-radius:16px; padding:22px 24px;
  background:linear-gradient(115deg,#3C3489,#534AB7 60%,#6a3fb0); color:#fff; margin-bottom:20px; }
.uni-cont::after{ content:""; position:absolute; right:-30px; top:-30px; width:140px; height:140px;
  border-radius:50%; background:radial-gradient(circle at 35% 35%,#ffd9a0,#dd8f1a 60%,transparent 73%); opacity:.45; }
.uni-cont .tg{ font-size:.64rem; letter-spacing:1.5px; opacity:.85; font-weight:700; }
.uni-cont .ti{ font-size:1.15rem; font-weight:700; margin:5px 0 4px; max-width:70%; }
.uni-cont .mod{ font-size:.78rem; opacity:.78; margin-bottom:14px; }
.uni-cont .bar{ height:7px; border-radius:4px; background:rgba(255,255,255,.22); overflow:hidden; max-width:62%; margin-bottom:7px; }
.uni-cont .bar i{ display:block; height:100%; background:linear-gradient(90deg,#ffd9a0,#dd8f1a); }
.uni-cont .pct{ font-size:.72rem; opacity:.85; }
.uni-cont .go{ position:absolute; right:24px; bottom:22px; background:#fff; color:var(--p);
  font-weight:750; font-size:.82rem; padding:9px 18px; border-radius:10px; text-decoration:none; }
.uni-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
.uni-stat{ background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
.uni-stat .n{ font-size:1.5rem; font-weight:800; }
.uni-stat .n small{ font-size:.78rem; color:#a6a3c4; font-weight:600; }
.uni-stat.acc .n{ color:var(--org); }
.uni-stat .t{ font-size:.72rem; color:#8a87a8; margin-top:2px; }
.uni-sec{ font-size:.82rem; font-weight:750; color:#4a4770; margin:0 0 12px; }
.uni-sec b{ color:#a6a3c4; font-weight:600; }
.uni-cards{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.uni-ls{ background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px; text-decoration:none; color:inherit; display:block; }
.uni-ls:hover{ border-color:#cdbffb; box-shadow:0 6px 16px rgba(60,52,137,.1); }
.uni-ls.cur{ border-color:#cdbffb; box-shadow:0 0 0 1.5px #cdbffb; }
.uni-ls .top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:9px; }
.uni-ls .ico{ width:32px; height:32px; border-radius:8px; background:var(--pl); display:flex; align-items:center; justify-content:center; }
.uni-ls .done{ width:20px; height:20px; border-radius:50%; background:#0B861D; color:#fff; display:flex; align-items:center; justify-content:center; font-size:.66rem; }
.uni-ls h4{ font-size:.85rem; margin:0 0 8px; font-weight:650; line-height:1.25; }
.uni-ls .met{ display:flex; gap:8px; font-size:.66rem; color:#9794b5; }
.uni-ls .chip{ background:#f3f2fb; border-radius:20px; padding:2px 8px; }

/* lição (iframe) */
.uni-lesson{ flex:1; display:flex; flex-direction:column; }
.uni-lesson-bar{ display:flex; align-items:center; gap:14px; padding:14px 30px; border-bottom:1px solid var(--line); background:#fff; }
.uni-lesson-bar h2{ font-size:1rem; margin:0; flex:1; }
.uni-frame{ flex:1; border:none; width:100%; background:#fff; }
.uni-btn{ background:var(--p); color:#fff; border:none; border-radius:10px; padding:9px 16px; font-weight:700; font-size:.82rem; cursor:pointer; }
.uni-btn.ok{ background:#0B861D; }
.uni-btn:disabled{ opacity:.6; cursor:default; }

/* login (Split Brand) */
.uni-login{ min-height:100vh; display:flex; font-family:"Barlow",system-ui,sans-serif; }
.uni-login .brand{ width:52%; position:relative; overflow:hidden; padding:48px 44px;
  background:linear-gradient(150deg,#3C3489 0%,#534AB7 45%,#cc0f10 135%);
  display:flex; flex-direction:column; justify-content:space-between; color:#fff; }
.uni-login .brand img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.28; }
.uni-login .brand .wm{ font-size:1.4rem; font-weight:800; position:relative; z-index:1; }
.uni-login .brand .wm span{ color:#ffd9a0; }
.uni-login .brand .tag{ font-size:1.6rem; font-weight:700; line-height:1.25; position:relative; z-index:1; max-width:340px; }
.uni-login .brand::after{ content:""; position:absolute; width:260px; height:260px; border-radius:50%;
  right:-90px; bottom:-90px; background:radial-gradient(circle at 35% 30%,#ffd9a0,#dd8f1a 55%,transparent 72%); opacity:.6; }
.uni-login .form{ width:48%; background:#fff; display:flex; flex-direction:column; justify-content:center; padding:0 9%; }
.uni-login .form h1{ font-size:1.5rem; margin:0 0 4px; color:var(--ink); }
.uni-login .form p{ color:var(--muted); margin:0 0 24px; font-size:.9rem; }
.uni-login label{ display:block; font-size:.78rem; font-weight:650; margin:0 0 6px; color:#4a4770; }
.uni-login input{ width:100%; padding:11px 13px; border:1.5px solid #e2e0f0; border-radius:10px;
  font-size:.92rem; margin-bottom:16px; outline:none; }
.uni-login input:focus{ border-color:var(--pm); }
.uni-login .submit{ width:100%; background:var(--red); color:#fff; border:none; border-radius:10px;
  padding:13px; font-size:.95rem; font-weight:700; cursor:pointer; }
.uni-login .err{ background:#fdecec; color:#cc0f10; border-radius:8px; padding:10px 12px; font-size:.82rem; margin-bottom:16px; }
@media (max-width:820px){ .uni-login .brand{ display:none; } .uni-login .form{ width:100%; } }

/* admin */
.uni-table{ width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
.uni-table th,.uni-table td{ text-align:left; padding:11px 14px; font-size:.85rem; border-bottom:1px solid var(--line); }
.uni-table th{ background:#f7f6fd; color:#6b6890; font-size:.72rem; letter-spacing:.5px; text-transform:uppercase; }
.uni-badge{ font-size:.68rem; font-weight:700; padding:2px 9px; border-radius:20px; }
.uni-badge.on{ background:#e7f7ec; color:#0B861D; }
.uni-badge.off{ background:#fdecec; color:#cc0f10; }
```

- [ ] **Step 2: Componente Topbar**

Create `src/components/universinid/Topbar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

export function Topbar({ streak, onOpenPalette }: { streak: number; onOpenPalette: () => void }) {
  return (
    <header className="uni-top">
      <Link href="/universinid" className="uni-wm">Universi<b>NID</b></Link>
      <button className="uni-k" onClick={onOpenPalette} aria-label="Abrir busca">
        🔍 Buscar lições, skills, agentes… <span className="cmd">⌘K</span>
      </button>
      <span className="uni-streak">🔥 {streak} dias</span>
      <button className="uni-av" onClick={() => signOut({ callbackUrl: '/universinid/login' })} title="Sair">⎋</button>
    </header>
  );
}
```

- [ ] **Step 3: Componente Sidebar**

Create `src/components/universinid/Sidebar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATALOGO } from '@/lib/universinid/catalogo';

type StatusMap = Record<string, { status: string; pct: number }>;

function anel(pct: number, concluido: boolean): string {
  const cor = concluido ? '#0B861D' : '#3C3489';
  return `conic-gradient(${cor} 0 ${pct}%, #e2e0f0 ${pct}% 100%)`;
}

export function Sidebar({ progress }: { progress: StatusMap }) {
  const pathname = usePathname();
  return (
    <nav className="uni-side">
      {CATALOGO.map((m) => {
        const total = m.licoes.length;
        const concl = m.licoes.filter((l) => progress[l.slug]?.status === 'COMPLETED').length;
        const pct = Math.round((concl / total) * 100);
        const ativo = m.licoes.some((l) => pathname.includes(l.slug));
        return (
          <div key={m.id}>
            <div className="uni-lbl">{m.emoji} {m.titulo.toUpperCase()}</div>
            {m.licoes.map((l) => {
              const st = progress[l.slug]?.status ?? 'NOT_STARTED';
              const p = st === 'COMPLETED' ? 100 : (progress[l.slug]?.pct ?? 0);
              return (
                <Link key={l.slug} href={`/universinid/licao/${l.slug}`}
                  className={`uni-nav ${pathname.endsWith(l.slug) ? 'on' : ''}`}>
                  <span className="uni-rg" style={{ background: anel(p, st === 'COMPLETED') }} />
                  {l.titulo}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Layout da plataforma**

Create `src/app/universinid/layout.tsx`:
```tsx
import './universinid.css';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProgressMap, getDashboardData } from '@/lib/universinid/actions';
import { ShellChrome } from './ShellChrome';

export default async function UniversinidLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/universinid/login');

  const [progress, dash] = await Promise.all([getProgressMap(), getDashboardData()]);

  return (
    <div className="uni-shell">
      <ShellChrome progress={progress} streak={dash.streakDias} isAdmin={session.user.role === 'ADMIN'}>
        {children}
      </ShellChrome>
    </div>
  );
}
```

- [ ] **Step 5: Chrome client (junta Topbar + Sidebar + ⌘K)**

Create `src/app/universinid/ShellChrome.tsx`:
```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { Topbar } from '@/components/universinid/Topbar';
import { Sidebar } from '@/components/universinid/Sidebar';
import { CommandPalette } from '@/components/universinid/CommandPalette';

type StatusMap = Record<string, { status: string; pct: number }>;

export function ShellChrome({ progress, streak, isAdmin, children }:
  { progress: StatusMap; streak: number; isAdmin: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Topbar streak={streak} onOpenPalette={() => setOpen(true)} />
      <div className="uni-body">
        <Sidebar progress={progress} />
        {children}
      </div>
      <CommandPalette open={open} onClose={() => setOpen(false)} isAdmin={isAdmin} />
    </>
  );
}
```

> `CommandPalette` é criado na Task 14. Para esta task compilar, criar primeiro um stub:
> `src/components/universinid/CommandPalette.tsx` exportando
> `export function CommandPalette(_: { open: boolean; onClose: () => void; isAdmin: boolean }) { return null; }`
> (será substituído na Task 14).

- [ ] **Step 6: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/app/universinid/universinid.css src/app/universinid/layout.tsx src/app/universinid/ShellChrome.tsx src/components/universinid/Topbar.tsx src/components/universinid/Sidebar.tsx src/components/universinid/CommandPalette.tsx
git commit -m "feat(universinid): casca da plataforma (CSS, layout, topbar, sidebar)"
```

---

## Task 11: Página de login (Split Brand)

**Files:**
- Create: `src/app/universinid/login/page.tsx`, `src/app/universinid/login/LoginForm.tsx`, `src/app/universinid/login/actions.ts`

- [ ] **Step 1: Server action de autenticação (arquivo `'use server'` dedicado)**

> Importante: a action **não** pode morar em `src/lib/auth.ts`, porque o `LoginForm`
> (`'use client'`) a importa — isso puxaria NextAuth/Prisma para o bundle do cliente.
> Um arquivo com `'use server'` no topo cria a fronteira correta.

Create `src/app/universinid/login/actions.ts`:
```ts
'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth';

export async function authenticate(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: (formData.get('callbackUrl') as string) || '/universinid',
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) return 'Credenciais inválidas.';
    throw error; // redirect lança um erro especial — deixar propagar
  }
}
```

- [ ] **Step 2: Form client**

Create `src/app/universinid/login/LoginForm.tsx`:
```tsx
'use client';

import { useActionState } from 'react';
import { authenticate } from './actions';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, formAction, pending] = useActionState(authenticate, undefined);
  return (
    <form action={formAction} className="form">
      <h1>Bem-vindo</h1>
      <p>Acesso restrito à equipe NID · DELP</p>
      {error && <div className="err">{error}</div>}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" required autoComplete="email" />
      <label htmlFor="password">Senha</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" />
      <button className="submit" type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Página de login**

Create `src/app/universinid/login/page.tsx`:
```tsx
import '../universinid.css';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginForm } from './LoginForm';

// Caminho da imagem do painel esquerdo (mascote/arte) — trocar quando houver asset definitivo.
const BRAND_IMAGE = ''; // ex: '/nid/mascote-login.png'

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth();
  if (session?.user) redirect('/universinid');
  const { callbackUrl } = await searchParams;

  return (
    <main className="uni-login">
      <aside className="brand">
        {BRAND_IMAGE && <img src={BRAND_IMAGE} alt="" />}
        <div className="wm">Universi<span>NID</span></div>
        <div className="tag">Onde o NID DELP aprende a construir com IA.</div>
        <div style={{ position: 'relative', zIndex: 1, fontSize: '.8rem', opacity: .8 }}>NID · DELP</div>
      </aside>
      <LoginForm callbackUrl={callbackUrl ?? '/universinid'} />
    </main>
  );
}
```

> O `BRAND_IMAGE` é o slot configurável combinado no brainstorm. Vazio = só o gradiente
> de marca. Quando houver a arte do mascote, definir o caminho (ex: `/nid/mascote-login.png`).

- [ ] **Step 4: Verificar login no navegador**

Run: `npm run dev`
Abrir `http://localhost:3000/universinid` → deve redirecionar para `/universinid/login`.
Logar com o admin do seed. Expected: redireciona para `/universinid` (dashboard — ainda a construir na Task 12, pode dar erro de página por enquanto; o importante é o login autenticar e não voltar para login).

- [ ] **Step 5: Commit**

```bash
git add src/app/universinid/login/page.tsx src/app/universinid/login/LoginForm.tsx src/app/universinid/login/actions.ts
git commit -m "feat(universinid): login Split Brand (e-mail+senha)"
```

---

## Task 12: Dashboard do aluno

**Files:**
- Create: `src/app/universinid/page.tsx`

- [ ] **Step 1: Página do dashboard**

Create `src/app/universinid/page.tsx`:
```tsx
import Link from 'next/link';
import { getDashboardData } from '@/lib/universinid/actions';

const ICON_BY_STATUS: Record<string, string> = { COMPLETED: '✓', IN_PROGRESS: '▸', NOT_STARTED: '○' };

export default async function DashboardPage() {
  const d = await getDashboardData();
  const faltam = d.totalLicoes - d.licoesConcluidas;

  return (
    <main className="uni-main">
      <h1 className="uni-hi">Olá, <span>{d.nome.split(' ')[0]}</span> 👋</h1>
      <p className="uni-sub">
        {d.proxima
          ? <>Você está a {faltam} lições de concluir o UniversiNID.</>
          : <>Você concluiu todas as lições. 🎉</>}
      </p>

      {d.proxima && (
        <section className="uni-cont">
          <div className="tg">CONTINUE DE ONDE PAROU</div>
          <div className="ti">{d.proxima.titulo}</div>
          <div className="mod">{d.proxima.moduloTitulo}</div>
          <div className="bar"><i style={{ width: `${d.proxima.pct}%` }} /></div>
          <div className="pct">{d.proxima.pct}% concluído</div>
          <Link className="go" href={`/universinid/licao/${d.proxima.slug}`}>Retomar →</Link>
        </section>
      )}

      <div className="uni-stats">
        <div className="uni-stat"><div className="n">{d.pctGeral}<small>%</small></div><div className="t">Progresso geral</div></div>
        <div className="uni-stat"><div className="n">{d.licoesConcluidas}<small>/{d.totalLicoes}</small></div><div className="t">Lições concluídas</div></div>
        <div className="uni-stat acc"><div className="n">{d.modulosAtivos}</div><div className="t">Módulos ativos</div></div>
        <div className="uni-stat"><div className="n">{d.streakDias}<small> dias</small></div><div className="t">Sequência (streak)</div></div>
      </div>

      <h3 className="uni-sec">Continuar na trilha <b>· {d.trilha.moduloTitulo}</b></h3>
      <div className="uni-cards">
        {d.trilha.licoes.map((l) => (
          <Link key={l.slug} href={`/universinid/licao/${l.slug}`}
            className={`uni-ls ${l.slug === d.proxima?.slug ? 'cur' : ''}`}>
            <div className="top">
              <div className="ico">{ICON_BY_STATUS[l.status]}</div>
              {l.status === 'COMPLETED'
                ? <div className="done">✓</div>
                : l.slug === d.proxima?.slug
                  ? <span style={{ fontSize: '.62rem', color: '#3C3489', fontWeight: 700 }}>EM CURSO</span>
                  : null}
            </div>
            <h4>{l.titulo}</h4>
            <div className="met"><span className="chip">{l.tempoMin} min</span><span className="chip">{l.dificuldade}</span></div>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verificar no navegador**

Run: `npm run dev` e abrir `http://localhost:3000/universinid` (logado).
Expected: dashboard renderiza — saudação, card "continue de onde parou" (primeira lição), 4 stats (0%, 0/39, 0, 0 dias) e os cards da trilha de Fundamentos.

- [ ] **Step 3: Commit**

```bash
git add src/app/universinid/page.tsx
git commit -m "feat(universinid): dashboard do aluno"
```

---

## Task 13: Página de lição (iframe + marcar concluída)

**Files:**
- Create: `src/app/universinid/licao/[slug]/page.tsx`, `src/components/universinid/MarkComplete.tsx`

- [ ] **Step 1: Botão "marcar como concluída" (client)**

Create `src/components/universinid/MarkComplete.tsx`:
```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markLessonProgress } from '@/lib/universinid/actions';

export function MarkComplete({ slug, concluida }: { slug: string; concluida: boolean }) {
  const [done, setDone] = useState(concluida);
  const [pending, start] = useTransition();
  const router = useRouter();

  function marcar() {
    start(async () => {
      await markLessonProgress({ slug, status: 'COMPLETED', pct: 100 });
      setDone(true);
      router.refresh();
    });
  }

  if (done) return <button className="uni-btn ok" disabled>✓ Concluída</button>;
  return (
    <button className="uni-btn" onClick={marcar} disabled={pending}>
      {pending ? 'Salvando…' : 'Marcar como concluída'}
    </button>
  );
}
```

- [ ] **Step 2: Marcar IN_PROGRESS ao abrir (client, efeito)**

Adicionar ao mesmo arquivo `MarkComplete.tsx`, um componente que registra a abertura:
```tsx
'use client';
import { useEffect } from 'react';

export function TrackOpen({ slug, jaIniciada }: { slug: string; jaIniciada: boolean }) {
  useEffect(() => {
    if (!jaIniciada) {
      import('@/lib/universinid/actions').then(({ markLessonProgress }) => {
        markLessonProgress({ slug, status: 'IN_PROGRESS', pct: 10 }).catch((e) => console.error('track open', e));
      });
    }
  }, [slug, jaIniciada]);
  return null;
}
```

- [ ] **Step 3: Página da lição**

Create `src/app/universinid/licao/[slug]/page.tsx`:
```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLicao } from '@/lib/universinid/catalogo';
import { getProgressMap } from '@/lib/universinid/actions';
import { MarkComplete, TrackOpen } from '@/components/universinid/MarkComplete';

export default async function LicaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ref = getLicao(slug);
  if (!ref) notFound();

  const progress = await getProgressMap();
  const st = progress[slug]?.status ?? 'NOT_STARTED';

  return (
    <div className="uni-lesson">
      <div className="uni-lesson-bar">
        <Link href="/universinid" className="uni-wm" style={{ fontSize: '.85rem' }}>← Voltar</Link>
        <h2>{ref.modulo.emoji} {ref.licao.titulo}</h2>
        <span className="uni-ls met"><span className="chip">{ref.licao.tempoMin} min</span><span className="chip">{ref.licao.dificuldade}</span></span>
        <MarkComplete slug={slug} concluida={st === 'COMPLETED'} />
      </div>
      <TrackOpen slug={slug} jaIniciada={st !== 'NOT_STARTED'} />
      <iframe
        className="uni-frame"
        src={`/universinid.html?embed=1#${ref.licao.screenId}`}
        title={ref.licao.titulo}
      />
    </div>
  );
}
```

> Nota de layout: a página de lição usa o espaço à direita da sidebar (o `.uni-body` do
> layout já é flex). O `.uni-lesson` ocupa `flex:1` e o iframe preenche a altura.

- [ ] **Step 4: Verificar no navegador**

Run: `npm run dev`, abrir `http://localhost:3000/universinid/licao/agent-orchestration`.
Expected: barra com título + tempo/dificuldade + botão; iframe mostra a tela 0.3 **sem chrome antigo**. Clicar "Marcar como concluída" → vira "✓ Concluída" e, ao voltar ao dashboard, o stat de concluídas sobe e a sidebar mostra o anel verde.

- [ ] **Step 5: Verificar slug inexistente**

Abrir `http://localhost:3000/universinid/licao/nao-existe`.
Expected: página 404.

- [ ] **Step 6: Commit**

```bash
git add "src/app/universinid/licao/[slug]/page.tsx" src/components/universinid/MarkComplete.tsx
git commit -m "feat(universinid): página de lição (iframe embed + progresso)"
```

---

## Task 14: Command palette (⌘K)

**Files:**
- Modify: `src/components/universinid/CommandPalette.tsx` (substitui o stub da Task 10)

- [ ] **Step 1: Implementar o palette**

Replace `src/components/universinid/CommandPalette.tsx`:
```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { todasLicoes } from '@/lib/universinid/catalogo';

export function CommandPalette({ open, onClose, isAdmin }:
  { open: boolean; onClose: () => void; isAdmin: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const itens = useMemo(() => {
    const base = todasLicoes().map((l) => ({ label: l.titulo, href: `/universinid/licao/${l.slug}`, hint: 'Lição' }));
    const extra = [
      { label: 'Dashboard', href: '/universinid', hint: 'Página' },
      ...(isAdmin ? [{ label: 'Gestão de usuários', href: '/universinid/admin', hint: 'Admin' }] : []),
    ];
    return [...extra, ...base];
  }, [isAdmin]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return itens.slice(0, 8);
    return itens.filter((i) => i.label.toLowerCase().includes(t)).slice(0, 10);
  }, [q, itens]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open ? onClose() : window.dispatchEvent(new CustomEvent('uni-open-palette'));
      }
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    setQ('');
    router.push(href);
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,15,46,.45)', zIndex: 100,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px,92vw)', background: '#fff', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(20,15,46,.4)' }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar lições, páginas…"
          style={{ width: '100%', padding: '16px 18px', border: 'none', borderBottom: '1px solid #ececf6',
            fontSize: '1rem', outline: 'none' }} />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtrados.length === 0 && <div style={{ padding: 18, color: '#9794b5' }}>Nada encontrado.</div>}
          {filtrados.map((i) => (
            <button key={i.href + i.label} onClick={() => go(i.href)}
              style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, padding: '12px 18px',
                border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.9rem', alignItems: 'center' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ flex: 1 }}>{i.label}</span>
              <span style={{ fontSize: '.66rem', color: '#a6a3c4' }}>{i.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Conectar o atalho global ao ShellChrome**

Em `src/app/universinid/ShellChrome.tsx`, dentro do componente, adicionar um efeito que abre o palette via o evento custom:
```tsx
import { useEffect } from 'react';
// ...dentro de ShellChrome, após o useState:
useEffect(() => {
  const openPalette = () => setOpen(true);
  window.addEventListener('uni-open-palette', openPalette);
  return () => window.removeEventListener('uni-open-palette', openPalette);
}, []);
```

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev`, em qualquer página `/universinid`, apertar `Ctrl+K` (ou `⌘K`).
Expected: abre o palette; digitar "agente" filtra lições; Enter/clique navega; `Esc` fecha. O botão de busca na topbar também abre.

- [ ] **Step 4: Commit**

```bash
git add src/components/universinid/CommandPalette.tsx src/app/universinid/ShellChrome.tsx
git commit -m "feat(universinid): command palette (⌘K)"
```

---

## Task 15: Página de admin (gestão de usuários)

**Files:**
- Create: `src/app/universinid/admin/page.tsx`, `src/app/universinid/admin/AdminUsers.tsx`

- [ ] **Step 1: Form + tabela (client)**

Create `src/app/universinid/admin/AdminUsers.tsx`:
```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createUser, toggleUserActive } from '@/lib/universinid/actions';

type Row = { id: string; email: string; name: string; role: string; isActive: boolean };

export function AdminUsers({ users }: { users: Row[] }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function onCreate(formData: FormData) {
    setErro(null);
    start(async () => {
      try {
        await createUser({
          email: String(formData.get('email')),
          name: String(formData.get('name')),
          password: String(formData.get('password')),
          role: (String(formData.get('role')) as 'STUDENT' | 'ADMIN') || 'STUDENT',
        });
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao criar usuário');
      }
    });
  }

  return (
    <main className="uni-main">
      <h1 className="uni-hi">Gestão de usuários</h1>
      <p className="uni-sub">Crie e desative acessos. Sem auto-cadastro — você controla quem entra.</p>

      <form action={onCreate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, alignItems: 'flex-end' }}>
        <div><label>Nome</label><br /><input name="name" required style={inp} /></div>
        <div><label>E-mail</label><br /><input name="email" type="email" required style={inp} /></div>
        <div><label>Senha inicial</label><br /><input name="password" type="text" minLength={6} required style={inp} /></div>
        <div><label>Papel</label><br />
          <select name="role" style={inp}><option value="STUDENT">Aluno</option><option value="ADMIN">Admin</option></select>
        </div>
        <button className="uni-btn" type="submit" disabled={pending}>{pending ? 'Criando…' : 'Criar usuário'}</button>
      </form>
      {erro && <div className="uni-login" style={{ minHeight: 'auto', marginBottom: 16 }}><div className="err" style={{ width: '100%' }}>{erro}</div></div>}

      <table className="uni-table">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td><td>{u.email}</td><td>{u.role === 'ADMIN' ? 'Admin' : 'Aluno'}</td>
              <td><span className={`uni-badge ${u.isActive ? 'on' : 'off'}`}>{u.isActive ? 'Ativo' : 'Inativo'}</span></td>
              <td>
                <button className="uni-btn" style={{ padding: '5px 11px', fontSize: '.74rem', background: u.isActive ? '#cc0f10' : '#0B861D' }}
                  onClick={() => start(async () => { await toggleUserActive(u.id); router.refresh(); })} disabled={pending}>
                  {u.isActive ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const inp: React.CSSProperties = { padding: '9px 11px', border: '1.5px solid #e2e0f0', borderRadius: 8, fontSize: '.88rem' };
```

- [ ] **Step 2: Página admin (server)**

Create `src/app/universinid/admin/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listUsers } from '@/lib/universinid/actions';
import { AdminUsers } from './AdminUsers';

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/universinid');
  const users = await listUsers();
  return <AdminUsers users={users} />;
}
```

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev`, logado como admin, abrir `http://localhost:3000/universinid/admin`.
Expected: tabela com o admin; criar um aluno (e-mail/senha) → aparece na tabela; desativar/ativar funciona. Fazer logout e tentar logar com o aluno desativado → "Credenciais inválidas".

- [ ] **Step 4: Verificar bloqueio de não-admin**

Logar como o aluno criado (após reativar) e abrir `/universinid/admin`.
Expected: redireciona para `/universinid`.

- [ ] **Step 5: Commit**

```bash
git add src/app/universinid/admin/page.tsx src/app/universinid/admin/AdminUsers.tsx
git commit -m "feat(universinid): página de admin (gestão de usuários)"
```

---

## Task 16: Remover rewrite legado + limpeza + verificação final

**Files:**
- Modify: `next.config.mjs`
- Verify: `src/components/landing/PortalDock.tsx`, `src/components/UniversiNIDView.tsx`, `src/components/UniversiNIDButton.tsx`

- [ ] **Step 1: Remover o rewrite legado**

Em `next.config.mjs`, remover o bloco `rewrites` que aponta `/universinid → /universinid.html`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['three'],
};
export default nextConfig;
```
Agora `/universinid` é servido pela app React (a rota App Router), e o HTML é acessado
diretamente em `/universinid.html` (consumido pelo iframe das lições).

- [ ] **Step 2: Verificar links que apontam para `/universinid`**

Run: `npx grep -rn "universinid" src/components/landing/PortalDock.tsx src/components/UniversiNIDView.tsx src/components/UniversiNIDButton.tsx`
(ou usar a busca do editor). Confirmar que os links para `/universinid` continuam corretos —
agora levam ao dashboard (que exige login). Nenhuma mudança de código necessária se os
links já usam `/universinid`. Se algum componente embutia o `.html` via iframe apontando
para `/universinid`, atualizar para `/universinid.html`.

- [ ] **Step 3: Rodar todos os testes**

Run: `npm test`
Expected: PASS — smoke, catálogo (4), dashboard (6), password (1).

- [ ] **Step 4: Typecheck + build**

Run:
```bash
npx tsc --noEmit
npm run build
```
Expected: build conclui sem erros.

- [ ] **Step 5: Smoke manual do fluxo completo**

Run: `npm run dev`. Percorrer:
1. `/` (landing) carrega **sem** exigir login.
2. `/universinid` → redireciona para login.
3. Logar como admin → dashboard.
4. Abrir uma lição → conteúdo no iframe sem chrome antigo → marcar concluída → stat sobe.
5. `⌘K` navega.
6. `/universinid/admin` cria aluno; aluno desativado não loga.
7. `/sistema-solar` carrega sem login.

Expected: todos os passos OK.

- [ ] **Step 6: Commit**

```bash
git add next.config.mjs
git commit -m "chore(universinid): remover rewrite legado; /universinid agora é a app React"
```

---

## Notas de execução

- **Ordem de dependências:** Task 2 (Prisma client) deve rodar antes de qualquer task que
  importe de `@/generated/prisma` ou use `prisma.*`. Tasks 3–6 são independentes entre si.
  Tasks 10–15 dependem das actions (Task 8) e da auth (Task 7).
- **Segredos:** nunca commitar `.env`. Confirmar que `.env` está no `.gitignore` (o
  `.gitignore` do Next já inclui `.env*`).
- **Banco de teste:** os testes Vitest são todos sobre lógica pura/arquivo — **não** tocam
  o banco. Não há necessidade de DB para `npm test`.
- **Fonte:** Barlow é o padrão DELP (já usado no `universinid.html`). Garantir que a fonte
  esteja disponível (import no `globals.css` ou `<link>` no root layout) — se ainda não
  estiver, adicionar `@import` do Google Fonts Barlow no `globals.css`.

## Cobertura do spec (self-review)

- Login Split Brand admin-managed → Tasks 7, 11, 15 ✓
- Gate só `/universinid/**` → Task 7 (middleware matcher) ✓
- E-mail+senha → Tasks 5, 7 ✓
- Progresso por slug estável → Tasks 3, 8, 13 ✓
- Dashboard aprovado → Tasks 4, 12 ✓
- Metadados tempo/dificuldade → Task 3 (catálogo) + 12/13 (exibição) ✓
- Command palette ⌘K → Task 14 ✓
- Ponte de conteúdo (iframe embed, mesmo slug p/ Fase 2) → Tasks 9, 13 ✓
- Modelo de dados Prisma → Task 2 ✓
- Server actions → Task 8 ✓
- Tratamento de erros (login genérico, 404 slug, 403 admin) → Tasks 7, 11, 13, 15 ✓
- Ajustes do mockup (badges→módulos ativos; sem favoritos/conquistas) → Task 12 ✓
- Remover rewrite legado → Task 16 ✓
- Fora de escopo (dark mode no conteúdo, notas, quizzes, badges) → não implementado (Fases 2/3) ✓

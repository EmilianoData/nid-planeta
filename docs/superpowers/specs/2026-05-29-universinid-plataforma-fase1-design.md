# UniversiNID → Plataforma de Aprendizado · Fase 1 (Design)

- **Data:** 2026-05-29
- **Projeto:** nid-planeta
- **Status:** Aprovado para planejamento
- **Autor:** Henrique Emiliano + Claude

## Contexto

O módulo de treinamento do NID — **UniversiNID** — hoje é um arquivo HTML estático
(`public/universinid.html`, ~6.451 linhas, ~24 telas com Mermaid/SVG) embutido via
iframe (`src/components/UniversiNIDView.tsx`) e servido na rota `/universinid` (rewrite
para o `.html`).

O objetivo é elevá-lo para **parecer e funcionar como uma plataforma de aprendizado
avançada**, com login, backend e persistência — usada pela equipe NID/DELP, com a
sensação de exclusividade que vem de acessos gerenciados por um administrador.

## Decisões tomadas no brainstorm

| Tema | Decisão |
|------|---------|
| Escopo total | 9 blocos (progresso, dashboard, trilhas, tempo/dificuldade, ⌘K, quizzes, badges, notas, dark mode) — **faseados** |
| Faseamento | **Fase 1 primeiro** (este spec); Fases 2 e 3 ganham specs próprios |
| Estratégia de conteúdo | **Migrar para React + MDX** (destino de longo prazo, na Fase 2) |
| Visual do login | **Split Brand** — painel de marca à esquerda com **imagem configurável** (mascote NID/Petronius), formulário à direita |
| Visual do dashboard | Aprovado: sidebar de trilhas com anéis de progresso, card "continue de onde parou", stats, cards de lição com tempo/dificuldade |
| Stack | **Espelhar o apontdelp** (app irmã): NextAuth v5 + Prisma 7.5 + Postgres/Neon + bcryptjs |
| Identidade de login | **E-mail + senha** (preparado para expansão futura fora da DELP) |
| Banco | **Neon novo** dedicado a este projeto |
| Gestão de logins | Admin-managed, **sem signup público** (a exclusividade) |

## Princípio do faseamento

Um spec monolítico (login + banco + 9 features) numa app que hoje tem **zero backend**
é a receita clássica de "nunca sai do papel". As três fases isolam a decisão mais cara
(estratégia de conteúdo) na Fase 2, sem travar a entrega de valor.

- **Fase 1 (este spec) — Sensação + exclusividade.** Login, progresso, dashboard,
  metadados, ⌘K. Roda **sobre o HTML atual**, sem reescrever as 6.451 linhas.
- **Fase 2 — Conteúdo nativo.** Migração para MDX → destrava modo escuro no conteúdo,
  notas por lição, quizzes inline. Reusa os mesmos `slug`s de lição.
- **Fase 3 — Gamificação.** Badges, certificados, conclusão de trilha.

## Arquitetura (Fase 1)

Monolito dentro do nid-planeta. "Robustez" = **um** Postgres + Prisma + server actions —
não microserviços. Espelha os padrões do `c:\dev\apontdelp`:

- **Next.js 15 (App Router)** — já existente
- **NextAuth v5** (provider Credentials) — sessão JWT
- **Prisma 7.5** + `@prisma/adapter-pg` + **Postgres (Neon)**
- **bcryptjs** para hash de senha
- **Zod** (já no projeto) para validação nas boundaries

### Dependências a adicionar

`next-auth@^5`, `@auth/prisma-adapter`, `@prisma/client@^7.5`, `@prisma/adapter-pg`,
`prisma@^7.5` (dev), `bcryptjs`, `@types/bcryptjs` (dev). Scripts de package:
`db:push`, `db:studio`, `db:seed` (via `tsx`), `db:generate`, `postinstall: prisma generate`.

## Autenticação & exclusividade

- Login **Split Brand** em `/universinid/login`. Painel esquerdo = **slot de imagem
  configurável** (constante em código na Fase 1: caminho da imagem do mascote/arte).
- **Middleware** (`src/middleware.ts`) protege **apenas `/universinid/**`** (exceto
  `/universinid/login`). A landing `/`, `/sistema-solar` e `/pipeline` permanecem
  **públicas**. Usuário não autenticado em rota protegida → redirect para login.
- Identidade: **e-mail + senha**. Sem fluxo de auto-cadastro.
- Admin gerencia logins via:
  1. **Seed de admin** (`prisma/seed.ts`) — cria o primeiro usuário ADMIN.
  2. Página protegida **`/universinid/admin`** (role ADMIN) — criar usuário (e-mail,
     nome, senha inicial), ativar/desativar. Mínimo viável.

## Ponte de conteúdo (Fase 1 sobe sobre o HTML atual)

- **Catálogo como dado** — `src/lib/universinid/catalogo.ts`:
  ```ts
  type Licao = {
    slug: string;       // chave ESTÁVEL de progresso (sobrevive à migração MDX)
    titulo: string;
    moduloId: string;
    ordem: number;
    tempoMin: number;   // metadado de duração
    dificuldade: 'Iniciante' | 'Intermediário' | 'Avançado';
    screenId: string;   // âncora no universinid.html atual (ex: 's0-3')
  };
  type Modulo = { id: string; titulo: string; ordem: number; licoes: Licao[] };
  ```
  O `slug` é a **chave estável de progresso** — não muda quando o conteúdo virar MDX
  na Fase 2.
- Rota **`/universinid/licao/[slug]`** renderiza a **casca React** (sidebar + topo) e
  embute a tela correspondente do `universinid.html` atual via **iframe apontando para
  `#screenId`**. Na Fase 2 o iframe é trocado por conteúdo MDX **no mesmo slug** → o
  progresso registrado na Fase 1 não se perde.

## Modelo de dados (Prisma)

```prisma
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

enum Role { STUDENT ADMIN }

model LessonProgress {
  id          String         @id @default(cuid())
  userId      String
  lessonSlug  String
  status      ProgressStatus @default(NOT_STARTED)
  pct         Int            @default(0)
  updatedAt   DateTime       @updatedAt
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, lessonSlug])
  @@index([userId])
  @@map("lesson_progress")
}

enum ProgressStatus { NOT_STARTED IN_PROGRESS COMPLETED }
```

> Metadados de tempo/dificuldade vivem no **catálogo em código**, não no banco — são
> conteúdo, não estado do usuário.

## Rotas / Telas da Fase 1

| Rota | Conteúdo | Acesso |
|------|----------|--------|
| `/universinid/login` | Login Split Brand | público |
| `/universinid` | **Dashboard** aprovado (saudação, continue de onde parou, 4 stats, trilha) | STUDENT+ |
| `/universinid/licao/[slug]` | Casca + conteúdo (iframe) + botão "marcar como concluída" | STUDENT+ |
| `/universinid/admin` | Gestão de usuários | ADMIN |

A rota legada `/universinid` que hoje faz rewrite para o `.html` é **substituída** pela
nova app React. O `universinid.html` permanece em `public/` como **fonte de conteúdo do
iframe** (consumido por `licao/[slug]`) até a migração da Fase 2.

### Ajustes do mockup para o escopo da Fase 1

O mockup aprovado antecipa elementos de fases futuras. Na Fase 1:

- O 4º stat **"Badges ganhos"** é Fase 3 → substituído por **"Módulos ativos"** (ou
  "Lições restantes"). O stat de badges entra com a Fase 3.
- Itens de sidebar **"Meus favoritos"** (Fase 2) e **"Conquistas"** (Fase 3) **não
  aparecem** na Fase 1 — ou aparecem como "em breve" desabilitados. A sidebar da Fase 1
  mostra: trilha atual (com anéis de progresso) + "Todos os módulos".
- **Streak** é derivado de `updatedAt` (dias consecutivos com progresso) — permanece na
  Fase 1, pois não depende de gamificação.

## Server Actions / API

- `markLessonProgress(slug, status, pct)` — upsert em `LessonProgress` (usuário da sessão).
- `getDashboardData()` — agrega progresso do usuário + catálogo → % geral, lições
  concluídas, próxima lição ("continue de onde parou"), streak (derivado de `updatedAt`).
- `createUser(email, name, senhaInicial)` / `toggleUserActive(userId)` — ADMIN only;
  validam role na server action.

Todas as server actions validam sessão e, quando aplicável, role ADMIN. Entradas
validadas com **Zod**.

## Command palette (⌘K)

- Componente client-side que indexa o **catálogo** (lições + skills/agentes citados).
- Atalho `⌘K` / `Ctrl+K`, navegação por teclado, vai para `/universinid/licao/[slug]`.
- Sem backend — opera sobre o catálogo em memória.

## Componentes principais (estrutura proposta)

```
src/app/universinid/
  layout.tsx               // casca: SessionProvider, sidebar, topbar, ⌘K
  page.tsx                 // dashboard
  login/page.tsx           // Split Brand
  licao/[slug]/page.tsx    // casca + iframe + marcar concluída
  admin/page.tsx           // gestão de usuários
src/components/universinid/
  Sidebar.tsx  Topbar.tsx  CommandPalette.tsx
  ContinueCard.tsx  StatGrid.tsx  LessonCard.tsx  LoginForm.tsx
src/lib/universinid/
  catalogo.ts              // módulos/lições/metadados/screenId
  progress.ts              // server actions de progresso/dashboard
src/lib/auth.ts            // NextAuth config (espelha apontdelp)
src/middleware.ts          // gate de /universinid/**
prisma/schema.prisma
prisma/seed.ts             // admin inicial
```

## Tratamento de erros

- Login inválido / usuário inativo → mensagem genérica ("credenciais inválidas"),
  sem vazar qual campo falhou.
- Rota protegida sem sessão → redirect `/universinid/login?redirect=<rota>`.
- Server action sem permissão → erro 403 tratado, sem stack trace ao cliente.
- Slug de lição inexistente → 404 na `licao/[slug]`.
- Falha de DB → erro logado com contexto; UI mostra estado de erro, **nunca** silencia
  (sem `catch {}` vazio).

## Identidade visual

- Paleta DELP/NID obrigatória: NID purple `#3C3489`, purple-med `#534AB7`, DELP red
  `#cc0f10`, orange `#dd8f1a`. Contraste mínimo WCAG AA.
- Fonte: Barlow (padrão DELP) como primária no produto.
- Login Split Brand e dashboard seguem os mockups aprovados no brainstorm.

## Testes

- **Auth:** login válido/ inválido, usuário inativo bloqueado, middleware redireciona
  rota protegida, rota pública acessível sem sessão.
- **Progresso:** `markLessonProgress` faz upsert correto; `getDashboardData` agrega
  % e "próxima lição" corretamente; isolamento por usuário.
- **Admin:** STUDENT não acessa `/universinid/admin` nem as actions de admin.
- **Catálogo:** todo `screenId` referenciado existe no `universinid.html`.

## Fora de escopo (Fase 1)

- Modo escuro **no conteúdo**, notas por lição, quizzes inline → **Fase 2** (dependem do MDX).
- Badges, certificados, conclusão de trilha → **Fase 3**.
- Migração do conteúdo HTML → MDX → **Fase 2**.
- Recuperação de senha self-service / e-mail transacional (admin reseta na Fase 1).

## Riscos & mitigações

- **Iframe + tema:** na Fase 1 o conteúdo no iframe não recebe o tema da casca. Aceitável
  — modo escuro no conteúdo é explicitamente Fase 2.
- **Drift catálogo ↔ HTML:** teste valida que todo `screenId` existe no HTML.
- **Estabilidade do slug:** slugs definidos no catálogo são contrato; a migração Fase 2
  deve preservá-los para não perder progresso.
- **Segredos:** `DATABASE_URL`, `AUTH_SECRET` em `.env` (não commitado); documentar em
  `.env.example`.

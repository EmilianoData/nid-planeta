---
date: 2026-06-23
spec: docs/superpowers/specs/2026-06-23-universinid-navegacao-perfil.md
status: implementado
gate: DISPENSADO pelo dono em 2026-06-23 (decisão explícita "ir direto para implement"; frente pequena/baixo risco — sem schema/dados/CSP/landing). Rigor mantido no gate de SAÍDA.
implementado_em: 2026-06-23 (commit e52f6c2; build+tsc+test 186/186; denylist limpa; isolamento íntegro; rota /universinid/perfil no build; a11y revisada no código. Smoke interativo → preview Vercel, pois o dev local não renderiza a casca autenticada (Neon frio).)
tipo: web
fase_quadro: Frente A (navegação + perfil) — pós Fase de Design, antes da FASE-09
---

# Navegação (menu da conta) + Página de Perfil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar tarefa-a-tarefa. Steps usam checkbox (`- [ ]`).

**Goal:** Trocar o avatar-que-desloga por um **menu da conta** (Meu perfil · Admin se ADMIN · Sair) e adicionar a página **`/universinid/perfil`** somente-leitura (identidade + resumo de progresso).

**Architecture:** Componente client `AccountMenu` (hand-rolled, acessível, sem dep nova) renderizado pela `Topbar` no lugar do botão de avatar; estado de identidade vem do layout (`nome`/`isAdmin`). Página `/perfil` é Server Component sob o layout logado (auth-gate já existe), com um server action dedicado `getPerfil()` para identidade autoritativa + reuso dos números do dashboard. CSS escopado em `universinid.css`.

**Tech Stack:** Next 15 App Router + React 19, Tailwind 3.4 + `universinid.css` (tokens `.uni-*`), `Icon.tsx` (SVG inline), NextAuth v5 (`signOut`/`auth`), Prisma (`@/lib/prisma`).

## Global Constraints (verbatim da spec)
- CSS **só** em `src/app/universinid/universinid.css`; cor **só** via `var(--token)`/`.uni-*` — proibido `[#hex]` arbitrário.
- **Sem dependência/CDN nova** (CSP `connect-src 'self'`); menu hand-rolled (sem `@radix-ui/react-dropdown-menu`).
- **NUNCA** tocar `globals.css`, landing (`/`), kiosk (`/sistema-solar`), CSP (`src/middleware.ts`), schema, `User`/`LessonProgress`/`slug`.
- Paleta marinho Delp (`#213D75` + neutros); **sem** roxo/âmbar. WCAG 2.2 AA; foco visível (`--focus-ring`); avatar 44×44. Strings pt-BR. `git add` com caminhos explícitos.

## File Structure
- **Create** `src/components/universinid/AccountMenu.tsx` — menu da conta (client; estado open, a11y, signOut).
- **Modify** `src/components/universinid/Topbar.tsx` — avatar vira `<AccountMenu>`; recebe `nome`/`isAdmin`.
- **Modify** `src/app/universinid/ShellChrome.tsx` — repassa `nome`/`isAdmin` à `Topbar`.
- **Modify** `src/app/universinid/(app)/layout.tsx` — passa `nome={dash.nome}` à `ShellChrome`.
- **Modify** `src/lib/universinid/actions.ts` — novo server action `getPerfil()`.
- **Create** `src/app/universinid/(app)/perfil/page.tsx` — página de perfil (server).
- **Modify** `src/app/universinid/universinid.css` — classes `.uni-acct-*` e `.uni-profile*`.

---

## Fase 1 — Menu da conta

### Tarefa 1.1 — `AccountMenu` + wiring + CSS
- **Agente:** `nid-frontend-engineer` (revisão `nid-accessibility-engineer`)
- **Consumes:** `Icon` (`user`/`settings`/`logout` — já existem em `Icon.tsx`); `signOut` de `next-auth/react`.
- **Produces:** `AccountMenu({ nome: string; isAdmin: boolean })`.
- **Depende de:** nenhuma.

- [ ] **Step 1 — Criar `AccountMenu.tsx`:**
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Icon } from './ui/Icon';

export function AccountMenu({ nome, isAdmin }: { nome: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const iniciais =
    nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

  // Esc fecha e devolve foco ao gatilho (WCAG 2.4.3); clique-fora fecha.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); }
    }
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  // Ao abrir, foca o 1º item (a11y de menu).
  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  return (
    <div className="uni-acct" ref={rootRef}>
      <button ref={btnRef} className="uni-av" onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu" aria-expanded={open} aria-label="Menu da conta">
        <span aria-hidden="true">{iniciais}</span>
      </button>
      {open && (
        <div className="uni-acct-menu" role="menu" aria-label="Menu da conta">
          <div className="uni-acct-head"><span className="nome">{nome}</span></div>
          <Link role="menuitem" className="uni-acct-item" href="/universinid/perfil" onClick={() => setOpen(false)}>
            <Icon name="user" size={18} /> Meu perfil
          </Link>
          {isAdmin && (
            <Link role="menuitem" className="uni-acct-item" href="/universinid/admin" onClick={() => setOpen(false)}>
              <Icon name="settings" size={18} /> Admin
            </Link>
          )}
          <button role="menuitem" type="button" className="uni-acct-item"
            onClick={() => signOut({ callbackUrl: '/universinid/login' })}>
            <Icon name="logout" size={18} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 — CSS em `universinid.css`** (append ao fim; só tokens):
```css
/* Menu da conta (avatar → dropdown à direita). */
.uni-acct{ position:relative; }
.uni-acct-menu{ position:absolute; right:0; top:calc(100% + 8px); min-width:208px; background:var(--card);
  border:1px solid var(--line); border-radius:12px; box-shadow:var(--shadow-hover); padding:6px; z-index:60; }
.uni-acct-head{ padding:8px 10px 8px; border-bottom:1px solid var(--line); margin-bottom:4px; }
.uni-acct-head .nome{ font-size:.85rem; font-weight:700; color:var(--ink); }
.uni-acct-item{ display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:9px 10px;
  border:none; background:transparent; border-radius:8px; font-size:.85rem; color:var(--ink); cursor:pointer;
  text-decoration:none; font-family:inherit; }
.uni-acct-item:hover{ background:var(--soft); }
.uni-acct-item:focus-visible{ outline:var(--focus-ring); outline-offset:-2px; }
```

- [ ] **Step 3 — `Topbar.tsx`:** trocar o botão de avatar pelo `AccountMenu`. Substituir a linha do `<button className="uni-av" ...>` por `<AccountMenu nome={nome} isAdmin={isAdmin} />`; importar `AccountMenu`; estender a assinatura para `{ streak, onOpenPalette, nome, isAdmin }`. **Remover** o import de `signOut` da Topbar (migrou para o AccountMenu).
```tsx
import { AccountMenu } from './AccountMenu';
// ...
export function Topbar({ streak, onOpenPalette, nome, isAdmin }:
  { streak: number; onOpenPalette: () => void; nome: string; isAdmin: boolean }) {
  // ...mantém logo + busca + streak...
  // troca o <button className="uni-av" ...> por:
  //   <AccountMenu nome={nome} isAdmin={isAdmin} />
}
```

- [ ] **Step 4 — `ShellChrome.tsx`:** aceitar `nome` e repassar à `Topbar`. Assinatura: adicionar `nome: string`; no JSX `<Topbar streak={streak} onOpenPalette={() => setOpen(true)} nome={nome} isAdmin={isAdmin} />`.

- [ ] **Step 5 — `(app)/layout.tsx`:** passar `nome={dash.nome}` ao `<ShellChrome ...>` (o `dash` já é obtido de `getDashboardData()`).

- [ ] **Step 6 — Verificar (preview):** `npx tsc --noEmit` (0 erros) + `preview_start`; logar; clicar o avatar → menu abre com "Meu perfil"/"Sair" (+ "Admin" só p/ ADMIN); **Tab** percorre os itens, **Esc** fecha e devolve foco ao avatar, clique-fora fecha; `Sair` desloga. Grep `#[0-9a-fA-F]` / `[#` em `AccountMenu.tsx` = só tokens. **Evidência:** screenshot/eval do menu aberto + role=menu + foco; `npm run build` verde.

- [ ] **Step 7 — Commit:**
```bash
git add src/components/universinid/AccountMenu.tsx src/components/universinid/Topbar.tsx \
  src/app/universinid/ShellChrome.tsx "src/app/universinid/(app)/layout.tsx" \
  src/app/universinid/universinid.css
git commit -m "feat(universinid): Frente A.1 — menu da conta no avatar (perfil/admin/sair, a11y)"
```

---

## Fase 2 — Página de perfil

### Tarefa 2.1 — `getPerfil()` + `(app)/perfil/page.tsx` + CSS
- **Agente:** `nid-frontend-engineer` (apoio `nid-backend-engineer` no action)
- **Consumes:** `getDashboardData` (progresso), `auth`/`prisma` (identidade), `Icon`.
- **Produces:** rota `/universinid/perfil`.
- **Depende de:** 1.1 (o item "Meu perfil" aponta para esta rota).

- [ ] **Step 1 — `getPerfil()` em `actions.ts`** (server action; identidade autoritativa por PK + números do dashboard). Adicionar após `getDashboardData`:
```ts
export async function getPerfil(): Promise<{
  nome: string; email: string; role: string;
  pctGeral: number; licoesConcluidas: number; totalLicoes: number;
  modulosAtivos: number; streakDias: number;
}> {
  const user = await exigirSessao();
  const [conta, dash] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, role: true } }),
    getDashboardData(),
  ]);
  return {
    nome: dash.nome,
    email: conta?.email ?? '',
    role: conta?.role ?? 'STUDENT',
    pctGeral: dash.pctGeral,
    licoesConcluidas: dash.licoesConcluidas,
    totalLicoes: dash.totalLicoes,
    modulosAtivos: dash.modulosAtivos,
    streakDias: dash.streakDias,
  };
}
```
> Nota: progresso **reusa `getDashboardData`** (sem query nova de progresso); identidade é um único `findUnique` por PK (e-mail/papel autoritativos). Sem N+1, sem schema novo.

- [ ] **Step 2 — Criar `(app)/perfil/page.tsx`:**
```tsx
import Link from 'next/link';
import { getPerfil } from '@/lib/universinid/actions';
import { Icon } from '@/components/universinid/ui/Icon';

const PAPEL: Record<string, string> = { ADMIN: 'Administrador', STUDENT: 'Aluno' };

export default async function PerfilPage() {
  const p = await getPerfil();
  const iniciais =
    p.nome.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('') || '?';

  return (
    <main className="uni-main">
      <Link className="uni-back" href="/universinid"><Icon name="chevron-left" size={16} /> Voltar ao início</Link>

      <section className="uni-profile">
        <div className="uni-profile-id">
          <div className="ava" aria-hidden="true">{iniciais}</div>
          <div>
            <h1>{p.nome}</h1>
            <p className="email">{p.email}</p>
            <span className="uni-badge on">{PAPEL[p.role] ?? p.role}</span>
          </div>
        </div>

        <h2 className="uni-sec">Seu progresso</h2>
        <div className="uni-stats">
          <div className="uni-stat"><div className="n">{p.pctGeral}<small>%</small></div><div className="t">Progresso geral</div></div>
          <div className="uni-stat"><div className="n">{p.licoesConcluidas}<small>/{p.totalLicoes}</small></div><div className="t">Lições concluídas</div></div>
          <div className="uni-stat acc"><div className="n">{p.modulosAtivos}</div><div className="t">Módulos ativos</div></div>
          <div className="uni-stat"><div className="n">{p.streakDias}<small> dias</small></div><div className="t">Sequência (streak)</div></div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3 — CSS em `universinid.css`** (append):
```css
/* Página de perfil. */
.uni-profile{ max-width:760px; }
.uni-profile-id{ display:flex; align-items:center; gap:16px; margin:8px 0 24px; }
.uni-profile-id .ava{ width:64px; height:64px; border-radius:50%; background:var(--navy); color:#fff;
  display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.3rem; flex-shrink:0; }
.uni-profile-id h1{ font-size:1.4rem; font-weight:800; margin:0 0 2px; }
.uni-profile-id .email{ color:var(--muted); font-size:.88rem; margin:0 0 6px; }
```

- [ ] **Step 4 — Verificar (preview):** `npx tsc --noEmit`; abrir `/universinid/perfil` logado → mostra iniciais+nome+email+badge de papel + 4 stats de progresso batendo com a home; chegar lá pelo menu da conta ("Meu perfil"). Grep de cor nos arquivos novos = só tokens. `npm run build` verde; `npm run test` segue ≥186 verdes.

- [ ] **Step 5 — Commit:**
```bash
git add src/lib/universinid/actions.ts "src/app/universinid/(app)/perfil/page.tsx" \
  src/app/universinid/universinid.css
git commit -m "feat(universinid): Frente A.2 — pagina /perfil (identidade + resumo de progresso)"
```

---

## Fase 3 — Gate de saída

### Tarefa 3.1 — Auditoria a11y (axe-core)
- **Agente:** `nid-accessibility-engineer`
- **O que faz:** axe nas rotas com a casca (`/universinid`, `/universinid/perfil`) com o **menu da conta aberto** → zero violação serious/critical; confirma `role="menu"`/`menuitem`, `aria-haspopup`/`aria-expanded`, foco no 1º item, Esc devolve foco, `:focus-visible` em todos os itens; avatar 44×44.
- **Evidência:** relatório axe (violations vazio) + nota dos pares de contraste (marinho/branco já documentados).
- **Depende de:** 1.1, 2.1.

### Tarefa 3.2 — Gate técnico + smoke + denylist
- **Agente:** `nid-qa-engineer` + `nid-code-reviewer`
- **O que faz:** `build`+`tsc`+`test` (verdes) + smoke contra **`next start`**: login → avatar abre menu → "Meu perfil" → `/perfil` renderiza → "Admin" aparece p/ ADMIN e some p/ STUDENT → "Sair" desloga; **zero violação de CSP**. **Denylist de cor** (qualquer hex fora da paleta) nos arquivos tocados + `git diff` confirma `globals.css`/landing/kiosk/middleware/schema/`User`/`LessonProgress`/slug **intactos**. Sem `dangerouslySetInnerHTML`/`any`; pt-BR.
- **Evidência:** outputs verdes + log do smoke (zero CSP) + saída do grep de cor vazia (salvo paleta).
- **Depende de:** 1.1, 2.1.

---

## Estimativa
| Fase | Tarefas | Estimativa |
|------|---------|------------|
| 1 — Menu da conta | 1 | 0,5 dia |
| 2 — Página de perfil | 1 | 0,5 dia |
| 3 — Gate de saída | 2 | 0,25 dia |
| **Total** | **4** | **~1,25 dia** |

## Riscos técnicos
- **A11y do menu hand-rolled** (foco/Esc/clique-fora/teclado) → padrões do `CommandPalette` reusados; axe no gate (3.1).
- **Sessão sem `email`** → `getPerfil` lê e-mail/papel autoritativos por PK (`findUnique`), não depende do JWT.
- **Mudança de hábito do avatar** (era logout direto) → "Sair" é item claro do menu; `signOut` preservado.
- **Regressão na casca** → só o gatilho do avatar muda; logo/⌘K/streak/Sidebar intactos; smoke cobre.
- **Cor órfã / regra de isolamento** → grep denylist + `git diff` no gate (3.2).

## Gate obrigatório
Este plano será submetido ao **`/nid:gate`** (red-team adversarial bloqueante) antes de qualquer implementação. Sem **GO**, nada de código.

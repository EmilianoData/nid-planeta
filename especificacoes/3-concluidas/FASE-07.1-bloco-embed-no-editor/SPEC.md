---
fase: FASE-07.1
nome: Bloco custom `embed` no editor (fecha o round-trip de vídeo — critério #1)
origem: docs/superpowers/plans/2026-06-03-universinid-fase2a.md (follow-up registrado da FASE-07 — §"Descoberta importante" + critério #1 🟡 Parcial) — SPEC corretiva da Fase 2a
status: concluida
gate: GO ✅ (2026-06-14) — red-team 6 dimensões, 0 bloqueante; ajustes 🟡 1–4 dobrados nos snippets
executada: 2026-06-14 — commits 07.1.1…07.1.6; tsc 0, test 120/120, build ok, smoke e2e 14/14 (next start). Ver §9 Registro de execução.
modelo_executor: sonnet-4.6 (siga esta SPEC literalmente; em caso de divergência, PARE e reporte)
atualizado: 2026-06-14
---

# 🔨 FASE-07.1 — Bloco custom `embed` no editor (fecha o round-trip de vídeo)

## 1. Por que esta fase existe

O critério #1 da Fase 2a ("ADMIN cria os 3 tipos de bloco: texto, imagem, **vídeo embed**")
está **🟡 Parcial**: o **round-trip de vídeo está quebrado nas duas direções**.

- **Editor → leitura:** o editor monta com o **schema PADRÃO** do BlockNote
  (`LessonEditor.tsx:35`, `useCreateBlockNote` sem `schema`). O schema padrão tem um bloco
  `video` (para **arquivo de mídia** / `<video>`), **não** um bloco `embed`. Quando o autor usa
  o item "Video" do slash-menu, gera `{type:'video'}` — que **`RenderBlocks` não conhece**
  (`RenderBlocks.tsx:66-124` trata `paragraph/heading/image/embed/legacy-embed`+listas; `video`
  cai no `default` → `console.warn` + `null`). O vídeo **persiste mas some no read**. Pior: o
  write-time (`validateContentDoc`) valida `image`/`embed`, **não** `video` → some sem nem 422.
- **Leitura → editor:** `RenderBlocks` e `validateContentDoc` já falam `embed` (com teste verde),
  mas o editor **não produz** `embed` e **nem carrega** um doc que o contenha — `embed` não está
  no schema do editor, então `useCreateBlockNote` **lança no hydrate** (o crash "client-side
  exception" registrado na FASE-07, reproduzido só na fixture `licao-de-teste-fase-5`).

A **spec de design** (fonte de verdade) é literal: *"Vídeo: **embed-only (iframe
YouTube/Vimeo/Stream) — nunca upload/hospedagem**"* (`2026-06-03-universinid-fase2a-design.md`
§"Vídeo", L111). O editor entregue oferece o **oposto** (upload/arquivo `video`) e **omite** o
`embed`.

**Ao final desta fase:** o editor expõe um item de slash-menu "Vídeo (embed)" que insere um bloco
custom `type:'embed'` casando 1:1 com `EmbedBlock` (`content-types.ts:12`), `RenderBlocks`
(`case 'embed'`) e `validateContentDoc` (`embed`) — o autor cola um link de YouTube/Vimeo/Stream,
ele é **normalizado** para a forma embedável, validado no **write-time E no read**, e renderiza
como `<iframe>` para o aluno. O bloco `video` (e `audio`/`file`, mídia-por-arquivo igualmente
descartada no read) sai do schema; um **guard de load** garante que docs antigos com esses tipos
**não derrubem o editor**. Critério #1 passa a **✅ end-to-end** para o terceiro tipo de bloco.

**Guard-rails respeitados:** sem `dangerouslySetInnerHTML` (Regra #3 / Risco #2); defesa em
profundidade **mantida** (normaliza no input → `validateContentDoc` no PATCH → `isAllowedEmbed`
no `RenderBlocks`); CSS só em `universinid.css` (Regra #7); zero mudança em `slug`/`User`/
`LessonProgress` (Regra #2); zero toque em `globals.css`/rotas-raiz (Regra #1). **Zero dep nova**
(usa `@blocknote/*` 0.51.4 já instalado).

> **Não exige ADR novo.** O ADR-0001 já decide "BlockNote ... **custom blocks**" e "render por
> whitelist sem `dangerouslySetInnerHTML`" — um bloco custom `embed` é detalhe de implementação
> sob a decisão já aceita. Se o gate concluir que a remoção de `video`/`audio`/`file` é
> ADR-worthy, registrar um refinamento curto no ADR-0001 (não um ADR novo).

## 2. Estado ao iniciar (verificado por leitura de código em 2026-06-14 — confirme os números antes de começar)

**Fatos verificados lendo o código (com referência):**

| Fato | Onde | Estado |
|---|---|---|
| Editor usa schema PADRÃO (sem `schema`) | `src/components/universinid/admin/LessonEditor.tsx:35-38` | ✅ confirmado |
| Schema padrão tem `video`, **não** `embed` | `@blocknote/core` `defaultBlockSpecs` (audio/…/video; sem embed) | ✅ confirmado |
| `RenderBlocks` trata `embed`, **não** `video` | `src/components/universinid/RenderBlocks.tsx:100` (embed) e `:121` (default) | ✅ confirmado |
| Tipo `EmbedBlock` já existe (`provider?: youtube\|vimeo\|stream`) | `src/lib/universinid/content-types.ts:12` | ✅ confirmado |
| Write-time valida `embed`, **não** `video` | `src/lib/universinid/sanitize-content.ts:31` | ✅ confirmado |
| Write-time é ENFORCED no save (PATCH → 422) | `src/app/api/universinid/admin/lessons/[id]/route.ts:17-20` | ✅ confirmado |
| Testes read/write de `embed` já verdes | `RenderBlocks.test.tsx:11`, `sanitize-content.test.ts:6-7`, `lessons.test.ts:141` | ✅ confirmado |
| Smoke autora texto (passo 10) e checa render nativo (passo 12) | `scripts/smoke-universinid.mjs:157,198` | ✅ confirmado |

**Baseline a CONFIRMAR (rode antes de tocar em código — se divergir, PARE):**

```powershell
npm run test          # esperado: 100% verde (baseline FASE-07: 103/103) — anote o número real
npx tsc --noEmit      # esperado: 0 erros
npm run build         # esperado: sucesso
```

🚨 **O working tree contém a frente paralela landing 3D não-commitada** (`src/components/landing/**`,
`src/lib/landing/**`, `public/avatars/`, `public/nid/`, `data_projects/*.xlsx`, `.gitignore`, etc.).
**NADA disso entra nos commits desta fase.** Todo `git add` usa caminhos explícitos.

**Arquivos DESTA fase (os únicos que os commits 07.1.x podem tocar):**
- `src/lib/universinid/embed-url.ts` (**novo** — tarefa 1)
- `src/lib/universinid/embed-url.test.ts` (**novo** — tarefa 1)
- `src/lib/universinid/content-types.ts` (**modificado**: + `keepEditableBlocks` — tarefa 3)
- `src/lib/universinid/content-types.test.ts` (**modificado**: + testes do guard — tarefa 3)
- `src/app/api/universinid/admin/lessons/lessons.test.ts` (**modificado**: + caso PATCH 200 embed — tarefa 3)
- `src/components/universinid/admin/EmbedBlock.tsx` (**novo** — tarefa 2)
- `src/components/universinid/admin/editor-schema.ts` (**novo** — tarefa 2)
- `src/components/universinid/admin/LessonEditor.tsx` (**modificado** — tarefa 3)
- `src/app/universinid/universinid.css` (**modificado**, só se precisar de estilo do form do embed — tarefa 2)
- `scripts/smoke-universinid.mjs` (**modificado** — tarefa 4)
- `docs/superpowers/plans/2026-06-03-universinid-fase2a.md` (registro — tarefa 5)

## 3. Regras inegociáveis desta fase

1. **NUNCA `dangerouslySetInnerHTML`** — nem no editor, nem no render. O preview do embed é um
   `<iframe>` React real; o input é `<input>` controlado. Evidência: `git grep -n
   dangerouslySetInnerHTML src/` → vazio.
2. **Validar embed no WRITE-TIME E no READ** (defesa em profundidade): a URL salva DEVE passar
   por `normalizeEmbedUrl` (input) **e** por `validateContentDoc`/`isAllowedEmbed` (PATCH) **e**
   por `isAllowedEmbed` (`RenderBlocks`). Não enfraquecer nenhuma das três camadas.
3. **Embed-only** — `video`/`audio`/`file` (mídia por arquivo) saem do schema do editor; NÃO
   adicionar caminho de upload de vídeo. NÃO adicionar host fora de `EMBED_HOSTS`/`VIDEODELIVERY`
   (`sanitize-content.ts:1-2`) sem aprovação do dono do quadro.
4. **O guard de load não pode lançar** — abrir uma lição com bloco `video`/`audio`/`file`/legado
   (ou qualquer tipo fora do schema) deve montar o editor (filtrando), **nunca** crashar.
5. NÃO tocar `src/app/globals.css`, rotas-raiz (`/`, `/sistema-solar`) nem a frente landing 3D.
6. NÃO alterar `slug` de lição, `User`/`LessonProgress`, nem rodar `db:push`/`db:seed` (sem
   mudança de schema nesta fase).
7. `git add` SEMPRE com caminhos explícitos. `git add -A`/`git add .` PROIBIDO.

## 4. Tarefas

### Tarefa 07.1.1 — `normalizeEmbedUrl` (módulo PURO, TDD)
**Agente sugerido:** `nid-spec-kit:verticals:nid-backend-engineer` + `nid-spec-kit:quality:nid-tdd-coach`
**Evidência exigida:** `npm run test -- embed-url` FAIL no Step 2 → PASS no Step 4; `npx tsc --noEmit` 0 erros.

> A normalização converte a URL "de navegador" (que o autor cola) para a forma **embedável** cujo
> host casa COM a allowlist (`isAllowedEmbed`) **E** com a CSP `frame-src` do middleware (rider B4).
> Isso também **fecha a Decisão-em-aberto #1 da FASE-07** (host "nu" `youtube.com`/`vimeo.com`
> passava no write-time mas era barrado pela CSP no render).

- [ ] **Step 1 — Conferir baseline:** `npm run test` e `npx tsc --noEmit` (ver §2). Se algo
  falhar: PARE (skill `superpowers:systematic-debugging`) antes de qualquer edição.
- [ ] **Step 2 — Teste falho primeiro** — criar `src/lib/universinid/embed-url.test.ts` (molde:
  imports explícitos do Vitest, env `node`, sem mock — é função pura; ver `sanitize-content.test.ts`):
  ```ts
  import { describe, it, expect } from 'vitest';
  import { normalizeEmbedUrl } from './embed-url';
  import { isAllowedEmbed } from './sanitize-content';

  describe('normalizeEmbedUrl', () => {
    it('youtube watch?v= → /embed/<id>', () => {
      expect(normalizeEmbedUrl('https://www.youtube.com/watch?v=abc123')).toEqual({ url: 'https://www.youtube.com/embed/abc123', provider: 'youtube' });
    });
    it('youtu.be/<id> → /embed/<id>', () => {
      expect(normalizeEmbedUrl('https://youtu.be/abc123')?.url).toBe('https://www.youtube.com/embed/abc123');
    });
    it('youtube /embed/<id> → mantém canônico www', () => {
      expect(normalizeEmbedUrl('https://youtube.com/embed/abc123')?.url).toBe('https://www.youtube.com/embed/abc123');
    });
    it('vimeo.com/<id> → player.vimeo.com/video/<id>', () => {
      expect(normalizeEmbedUrl('https://vimeo.com/123456789')).toEqual({ url: 'https://player.vimeo.com/video/123456789', provider: 'vimeo' });
    });
    it('player.vimeo.com/video/<id> → mantém', () => {
      expect(normalizeEmbedUrl('https://player.vimeo.com/video/123456789')?.provider).toBe('vimeo');
    });
    it('cloudflare stream (videodelivery.net) → mantém, provider stream', () => {
      const r = normalizeEmbedUrl('https://iframe.videodelivery.net/abcDEF');
      expect(r?.provider).toBe('stream');
    });
    it('a saída SEMPRE passa por isAllowedEmbed (casa allowlist + CSP)', () => {
      for (const raw of ['https://www.youtube.com/watch?v=x', 'https://youtu.be/x', 'https://vimeo.com/123']) {
        const out = normalizeEmbedUrl(raw);
        expect(out).not.toBeNull();
        expect(isAllowedEmbed(out!.url)).toBe(true);
      }
    });
    it('rejeita http, host desconhecido, userinfo, vazio, não-string', () => {
      expect(normalizeEmbedUrl('http://www.youtube.com/watch?v=x')).toBeNull(); // só https
      expect(normalizeEmbedUrl('https://evil.com/watch?v=x')).toBeNull();
      expect(normalizeEmbedUrl('https://user:pass@www.youtube.com/embed/x')).toBeNull();
      expect(normalizeEmbedUrl('')).toBeNull();
      expect(normalizeEmbedUrl(undefined)).toBeNull();
    });
  });
  ```
  Rodar `npm run test -- embed-url` → **FAIL** (módulo não existe).
- [ ] **Step 3 — Implementar** `src/lib/universinid/embed-url.ts`:
  ```ts
  // Normaliza a URL que o autor COLA para a forma embedável em <iframe> cujo host casa COM
  // a allowlist (isAllowedEmbed) E com a CSP frame-src (rider B4). null = host não suportado
  // → o editor rejeita com mensagem clara; nada inválido é salvo. Defesa em profundidade: o
  // write-time (validateContentDoc) e o read (RenderBlocks/isAllowedEmbed) revalidam.
  export type EmbedProvider = 'youtube' | 'vimeo' | 'stream';
  export interface NormalizedEmbed { url: string; provider: EmbedProvider; }

  function seg(pathname: string, i: number): string | undefined {
    return pathname.split('/').filter(Boolean)[i];
  }

  export function normalizeEmbedUrl(raw: unknown): NormalizedEmbed | null {
    if (typeof raw !== 'string' || raw.trim() === '') return null;
    let u: URL;
    try { u = new URL(raw.trim()); } catch { return null; }
    if (u.protocol !== 'https:') return null;       // só https (iframe/CSP)
    if (u.username || u.password) return null;       // userinfo = deception (cf. isSafeHttpUrl)
    const host = u.hostname.toLowerCase();

    // YouTube → https://www.youtube.com/embed/<id>
    if (host === 'youtu.be') {
      const id = seg(u.pathname, 0);
      return id ? { url: `https://www.youtube.com/embed/${id}`, provider: 'youtube' } : null;
    }
    if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
      const id = u.pathname.startsWith('/embed/') ? seg(u.pathname, 1) : u.searchParams.get('v');
      return id ? { url: `https://www.youtube.com/embed/${id}`, provider: 'youtube' } : null;
    }
    // Vimeo → https://player.vimeo.com/video/<id>
    if (host === 'vimeo.com' || host === 'www.vimeo.com') {
      const id = seg(u.pathname, 0);
      return id && /^\d+$/.test(id) ? { url: `https://player.vimeo.com/video/${id}`, provider: 'vimeo' } : null;
    }
    if (host === 'player.vimeo.com') {
      const id = seg(u.pathname, 1); // /video/<id>
      return id && /^\d+$/.test(id) ? { url: `https://player.vimeo.com/video/${id}`, provider: 'vimeo' } : null;
    }
    // Cloudflare Stream — já é uma URL de iframe (*.videodelivery.net); mantém
    if (host.endsWith('.videodelivery.net')) return { url: u.toString(), provider: 'stream' };

    return null;
  }
  ```
- [ ] **Step 4 — Verde:** `npm run test -- embed-url` → PASS; `npx tsc --noEmit` → 0 erros.
- [ ] **Step 5 — Commit (escopo estrito):**
  ```powershell
  git add src/lib/universinid/embed-url.ts src/lib/universinid/embed-url.test.ts
  git commit -m "feat(universinid): normalizeEmbedUrl (YouTube/Vimeo/Stream -> embedavel, casa allowlist+CSP) (07.1.1)"
  ```

### Tarefa 07.1.2 — Bloco custom `embed` + schema do editor
**Agente sugerido:** `nid-spec-kit:verticals:nid-frontend-engineer`
**Evidência exigida:** `npx tsc --noEmit` 0 erros; o bloco compila e é registrado no schema. (O
render do editor é React+DOM/BlockNote → **não** unit-testável no env `node`; sua prova fim-a-fim
é o smoke da tarefa 07.1.4. O `tsc` é o gate da assinatura da lib.)

> ⚠️ **Assinatura da lib:** `createReactBlockSpec(config, impl)` em 0.51.4 retorna uma factory
> `(options?) => BlockSpec`. Registre como `embed: embedBlock` e rode `tsc`. **Se** o `tsc`
> acusar que `embed` é função (não `BlockSpec`), chame a factory: `embed: embedBlock()`. Docs:
> https://www.blocknotejs.org/docs/custom-schemas e .../features/custom-schemas/custom-blocks.

- [ ] **Step 1 — Criar** `src/components/universinid/admin/EmbedBlock.tsx`:
  ```tsx
  'use client';
  import { createReactBlockSpec } from '@blocknote/react';
  import { useState } from 'react';
  import { isAllowedEmbed } from '@/lib/universinid/sanitize-content';
  import { normalizeEmbedUrl } from '@/lib/universinid/embed-url';

  // Bloco custom `embed`: type/props casam 1:1 com EmbedBlock (content-types.ts), RenderBlocks
  // (case 'embed') e validateContentDoc. content:'none' (sem texto inline). SEM dangerouslySetInnerHTML.
  export const embedBlock = createReactBlockSpec(
    {
      type: 'embed',
      propSchema: { url: { default: '' }, provider: { default: '' } },
      content: 'none',
    },
    {
      render: ({ block, editor }) => {
        const url = String(block.props.url ?? '');
        if (url && isAllowedEmbed(url)) {
          return (
            <div className="uni-embed" contentEditable={false}>
              <iframe
                src={url}
                title="Vídeo incorporado"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          );
        }
        // Sem URL válida ainda → form de colar link (controlado).
        return <EmbedForm onConfirm={(u, p) => editor.updateBlock(block, { type: 'embed', props: { url: u, provider: p } })} />;
      },
    },
  );

  function EmbedForm({ onConfirm }: { onConfirm: (url: string, provider: string) => void }) {
    const [raw, setRaw] = useState('');
    const [err, setErr] = useState('');
    return (
      <div className="uni-embed-form" contentEditable={false}>
        <input
          type="url"
          aria-label="Link do vídeo (YouTube, Vimeo ou Stream)"
          placeholder="Cole o link do YouTube, Vimeo ou Cloudflare Stream"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            const n = normalizeEmbedUrl(raw);
            if (!n) { setErr('Link não suportado. Use YouTube, Vimeo ou Cloudflare Stream.'); return; }
            setErr('');
            onConfirm(n.url, n.provider);
          }}
        >
          Inserir vídeo
        </button>
        {err ? <p role="alert" className="uni-embed-err">{err}</p> : null}
      </div>
    );
  }
  ```
- [ ] **Step 2 — Criar** `src/components/universinid/admin/editor-schema.ts`:
  ```ts
  import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
  import { embedBlock } from './EmbedBlock';

  // Embed-only (design spec §"Vídeo": embed-only, nunca upload/hospedagem): removemos os blocos
  // de mídia POR ARQUIVO do schema padrão (video/audio/file) — RenderBlocks não os renderiza
  // (cairiam no default → somem no read). Adicionamos o bloco custom `embed`.
  const { video, audio, file, ...keep } = defaultBlockSpecs;
  void video, void audio, void file; // descartados de propósito (embed-only) — sem unused-var

  export const editorSchema = BlockNoteSchema.create({
    // CONFIRMADO em 0.51.4: createReactBlockSpec retorna factory `(options?) => BlockSpec` → chamar embedBlock().
    blockSpecs: { ...keep, embed: embedBlock() },
  });

  // Tipos que o editor CONSEGUE montar — usado pelo guard de load (tarefa 07.1.3).
  export const KNOWN_BLOCK_TYPES: string[] = [...Object.keys(keep), 'embed'];
  ```
- [ ] **Step 3 — (se necessário) estilo do form** em `src/app/universinid/universinid.css` (escopado;
  NÃO tocar `globals.css`): `.uni-embed-form{display:flex;gap:.5rem;flex-wrap:wrap;...}` +
  `.uni-embed-err{color:#b00020}`. Reaproveitar `.uni-embed` existente para o preview.
- [ ] **Step 4 — Verde:** `npx tsc --noEmit` → 0 erros (aplicar o fallback `embed: embedBlock()`
  da nota acima se o `tsc` exigir). `npm run test` → ainda 100% verde (nada quebrado).
- [ ] **Step 5 — Commit:**
  ```powershell
  git add src/components/universinid/admin/EmbedBlock.tsx src/components/universinid/admin/editor-schema.ts src/app/universinid/universinid.css
  git commit -m "feat(universinid): bloco custom embed (createReactBlockSpec) + schema embed-only (07.1.2)"
  ```

### Tarefa 07.1.3 — Ligar schema + slash-menu + guard de load no `LessonEditor`
**Agente sugerido:** `nid-spec-kit:verticals:nid-frontend-engineer`
**Evidência exigida:** `npm run test -- content-types` FAIL→PASS (guard); `npx tsc --noEmit` 0;
build verde; verificação manual no navegador (Step 5).

- [ ] **Step 1 — Teste falho do guard** — adicionar a `src/lib/universinid/content-types.test.ts`:
  ```ts
  import { keepEditableBlocks } from './content-types';

  describe('keepEditableBlocks (guard de load do editor)', () => {
    const KNOWN = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'image', 'embed'];
    it('mantém blocos conhecidos e descarta os fora do schema (ex.: video)', () => {
      const doc = [
        { id: 'p', type: 'paragraph', props: {}, content: [] },
        { id: 'v', type: 'video', props: { url: 'https://x/y.mp4' } },
        { id: 'e', type: 'embed', props: { url: 'https://www.youtube.com/embed/x' } },
      ];
      const out = keepEditableBlocks(doc, KNOWN);
      expect(out.map((b: { type: string }) => b.type)).toEqual(['paragraph', 'embed']);
    });
    it('recursa em children: descarta video ANINHADO (senão o hydrate crasha — Regra #4)', () => {
      const doc = [
        { id: 'p', type: 'paragraph', props: {}, content: [], children: [
          { id: 'v', type: 'video', props: { url: 'https://x/y.mp4' } },
          { id: 'h', type: 'heading', props: { level: 2 }, content: [], children: [] },
        ] },
      ];
      const out = keepEditableBlocks(doc, KNOWN) as Array<{ children: Array<{ type: string }> }>;
      expect(out[0].children.map((c) => c.type)).toEqual(['heading']);
    });
    it('array vazio/não-array → []', () => {
      expect(keepEditableBlocks(undefined, KNOWN)).toEqual([]);
      expect(keepEditableBlocks([], KNOWN)).toEqual([]);
    });
  });
  ```
  `npm run test -- content-types` → **FAIL** (função não existe).
- [ ] **Step 2 — Implementar o guard** em `src/lib/universinid/content-types.ts` (ao lado de
  `stripIncompleteImages`):
  ```ts
  // Mantém só blocos cujo `type` o editor consegue montar. Removendo `video`/`audio`/`file`
  // do schema (embed-only), um doc antigo que os contenha QUEBRARIA o useCreateBlockNote no
  // hydrate — este guard os filtra ANTES de hidratar (mesmo princípio de stripIncompleteImages
  // e do guard de legacy-embed). O 1º save grava o doc filtrado. RECURSA em `children` — um
  // bloco não-suportado ANINHADO também derruba o hydrate (Regra #4 desta fase).
  export function keepEditableBlocks(doc: unknown, known: string[]): unknown[] {
    if (!Array.isArray(doc)) return [];
    const set = new Set(known);
    const walk = (blocks: unknown[]): unknown[] =>
      blocks
        .filter((b) => set.has((b as { type?: string })?.type ?? ''))
        .map((b) => {
          const block = b as { children?: unknown[] };
          return Array.isArray(block.children) ? { ...block, children: walk(block.children) } : block;
        });
    return walk(doc);
  }
  ```
- [ ] **Step 3 — Verde do guard:** `npm run test -- content-types` → PASS.
- [ ] **Step 3.5 — Teste de aceitação write-time do embed (ajuste 🟡 #4)** — adicionar a
  `src/app/api/universinid/admin/lessons/lessons.test.ts` (ao lado do caso 422 existente,
  `:141`) um caso que prova que um embed **normalizado** é ACEITO (200):
  ```ts
  it('PATCH salva embed normalizado (YouTube /embed) -> 200', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'l1' });
    lessonUpdate.mockResolvedValue({ id: 'l1' });
    const doc = [{ type: 'embed', id: 'b1', props: { url: 'https://www.youtube.com/embed/abc', provider: 'youtube' } }];
    const res = await PATCH(patchReq({ contentDraft: doc }), ctx('l1'));
    expect(res.status).toBe(200);
    expect(lessonUpdate).toHaveBeenCalled();
  });
  ```
  `npm run test -- lessons` → PASS (o handler já valida `embed` via `validateContentDoc`; isto
  blinda contra regressão da camada write-time).
  Trocar os imports do topo e o `useCreateBlockNote`, e injetar o slash-menu custom no
  `BlockNoteView`:
  ```tsx
  // imports (adicionar/ajustar):
  import { useCreateBlockNote } from '@blocknote/react';
  import { BlockNoteView } from '@blocknote/mantine';
  import { getDefaultReactSlashMenuItems, SuggestionMenuController } from '@blocknote/react';
  import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
  import { isLegacyEmbed, stripIncompleteImages, keepEditableBlocks } from '@/lib/universinid/content-types';
  import { editorSchema, KNOWN_BLOCK_TYPES } from './editor-schema';
  // ...
  // dentro de LessonEditor, ao montar o cleaned:
  const legacy = isLegacyEmbed(initial);
  // guard de load: descarta imagem incompleta E qualquer bloco fora do schema (ex.: video antigo)
  const cleaned = legacy ? [] : keepEditableBlocks(stripIncompleteImages(initial), KNOWN_BLOCK_TYPES);
  const editor = useCreateBlockNote({
    schema: editorSchema,                              // ← embed-only + bloco custom embed
    initialContent: cleaned.length ? (cleaned as PartialBlock[]) : undefined,
    uploadFile: uploadImage,
  });
  // ...
  // no return, dar slash-menu próprio ao BlockNoteView:
  return (
    <div>
      {legacy && (/* banner legacy existente — manter */)}
      <BlockNoteView editor={editor} slashMenu={false} onChange={handleChange}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                {
                  title: 'Vídeo (embed)',
                  subtext: 'YouTube, Vimeo ou Cloudflare Stream',
                  group: 'Mídia',
                  aliases: ['video', 'vídeo', 'youtube', 'vimeo', 'embed'],
                  onItemClick: () => {
                    // Consome a query "/video" do bloco atual (mesmo comportamento dos itens
                    // padrão do slash-menu); NÃO usar insertBlocks 'after' (deixaria o texto "/video").
                    insertOrUpdateBlockForSlashMenu(editor, { type: 'embed' });
                  },
                },
              ],
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
  ```
  > ⚠️ `PartialBlock` agora vem do schema custom — se o `tsc` reclamar do tipo do `import type
  > { PartialBlock }`, troque por `import type { PartialBlock } from '@blocknote/core'` parametrizado
  > ou use o tipo inferido `typeof editorSchema.PartialBlock`. O `tsc` é o gate; mantenha o cast mínimo.
- [ ] **Step 5 — Verificação manual no navegador** (`npm run dev`, logar como admin — credenciais
  com o dono do quadro; console aberto, **0 erro**):
  - [ ] Abrir `/universinid/admin/licao/<id>` de uma lição decomposta → editor monta normal.
  - [ ] `/` no editor → item **"Vídeo (embed)"** aparece no slash-menu; **não** há mais "Video"
    (arquivo). Inserir → aparece o form; colar `https://www.youtube.com/watch?v=...` → vira preview `<iframe>`.
  - [ ] Colar um link inválido (`https://evil.com/x`) → mensagem de erro, nada é inserido.
  - [ ] Aguardar autosave (debounce 800ms) → `PATCH .../lessons/<id>` **200** (não 422 — a URL
    normalizada passa no `validateContentDoc`). Recarregar a página → o embed reaparece (round-trip).
  - [ ] Abrir uma lição cujo draft tenha (ou simular) um bloco `video` antigo → editor **monta**
    (guard filtra), **não** crasha. (Se não houver, pular e anotar.)
  - [ ] **Regressão de remover `file`/`video`/`audio`:** inserir um bloco de **imagem** e fazer
    upload (ou colar uma imagem) ainda funciona normalmente (mantivemos `image` + `uploadFile`).
  - [ ] Não-regressão: a landing `/` e o `/sistema-solar` intactos.
- [ ] **Step 6 — Verde + commit:** `npm run test` (100% verde) e `npm run build` (sucesso).
  ```powershell
  git add src/lib/universinid/content-types.ts src/lib/universinid/content-types.test.ts src/app/api/universinid/admin/lessons/lessons.test.ts src/components/universinid/admin/LessonEditor.tsx
  git commit -m "feat(universinid): editor usa schema embed-only + slash-menu Video(embed) + guard de load (07.1.3)"
  ```

### Tarefa 07.1.4 — Estender o smoke e2e (autorar embed → publicar → aluno vê iframe)
**Agente sugerido:** `nid-spec-kit:quality:nid-qa-engineer`
**Evidência exigida:** saída do smoke com o passo do embed `OK`, `CONSOLE ERRORS (0)`/`PAGE ERRORS (0)`, exit 0.

> **ESTENDER, não reescrever** `scripts/smoke-universinid.mjs`. No passo **10** (autorar), após
> digitar o parágrafo, inserir um embed; no passo **12** (ver como aluno), além de checar render
> nativo, **afirmar** que existe `.uni-embed iframe` apontando para `youtube.com/embed`.

- [ ] **Step 1 — No passo 10**, após o `page.keyboard.type(...)` do parágrafo, abrir o slash-menu
  e inserir o embed (seletores do BlockNote/Mantine; ajustar se a UI divergir):
  ```js
  // nova linha → abre slash-menu → escolhe "Vídeo (embed)"
  await page.keyboard.press('Enter');
  await page.keyboard.type('/video');
  await page.getByText('Vídeo (embed)', { exact: false }).click();
  // form do bloco: colar link e confirmar
  await page.getByLabel(/Link do vídeo/i).fill('https://www.youtube.com/watch?v=smoke12345');
  await page.getByRole('button', { name: /Inserir vídeo/i }).click();
  // aguardar autosave (PATCH 200) — reusar o waitForResponse já usado no passo de texto
  ```
- [ ] **Step 2 — No passo 12** (contexto do aluno, lição publicada), acrescentar:
  ```js
  await sp.waitForSelector('.uni-embed iframe', { timeout: 15000 });
  const src = await sp.locator('.uni-embed iframe').first().getAttribute('src');
  if (!src || !src.includes('youtube.com/embed/smoke12345')) {
    throw new Error('embed não renderizou como iframe normalizado para o aluno');
  }
  ```
- [ ] **Step 3 — Rodar:**
  ```powershell
  node scripts/smoke-universinid.mjs
  ```
  Esperado: todos os passos `OK` (inclusive o embed), `==== CONSOLE ERRORS (0) ====`,
  `==== PAGE ERRORS (0) ====`, exit 0.
- [ ] **Step 4 — Commit:**
  ```powershell
  git add scripts/smoke-universinid.mjs
  git commit -m "test(universinid): smoke cobre embed (autorar -> publicar -> aluno ve iframe) (07.1.4)"
  ```

### Tarefa 07.1.5 — Atualizar o registro do plano + critério #1
**Evidência exigida:** diff do plano; critério #1 vira ✅ (texto+vídeo) com evidência; commit de docs.

- [ ] **Step 1 — Editar** `docs/superpowers/plans/2026-06-03-universinid-fase2a.md`: registrar a
  FASE-07.1 (commits 07.1.1–07.1.4, evidências), e na tabela "Critérios de sucesso" mudar o
  **#1** de 🟡 Parcial para **✅** na parte de **vídeo embed** (citar smoke 07.1.4 + teste
  `embed-url`); a parte de **imagem** segue ⏳ até a 7.4 (preview) do dono do quadro.
- [ ] **Step 2 — Commit:**
  ```powershell
  git add docs/superpowers/plans/2026-06-03-universinid-fase2a.md
  git commit -m "docs(universinid): fecha round-trip de video no editor (criterio #1) (07.1.5)"
  ```

## 5. Verificação final da fase (gate de saída)

Rodar e colar a saída real de cada um:

```powershell
npm run test                          # esperado: 100% verde, INCLUI embed-url + guard; 0 falhas
npx tsc --noEmit                      # esperado: 0 erros
npm run build                         # esperado: sucesso
node scripts/smoke-universinid.mjs    # esperado: todos OK (inclui embed), 0 console/page errors, exit 0
git grep -n dangerouslySetInnerHTML src/  # esperado: só o comentário JSDoc do RenderBlocks
git diff src/app/globals.css          # esperado: vazio
git status --short                    # esperado: NENHUM arquivo do escopo pendente (restam só os da landing 3D)
git log --oneline -6                  # esperado: commits 07.1.1 … 07.1.5
```

E o checklist manual do Step 5 da tarefa 07.1.3 100% marcado, com descrição do observado.

## 6. Ritual de conclusão (dono do quadro — ver PROTOCOLO-DE-EXECUCAO.md §5)

1. Promover esta pasta de `2-fila/` para `1-fase-atual/` ao iniciar a execução (e mover a
   FASE-07 para `3-concluidas/` se o ritual dela ainda não tiver ocorrido). Ao concluir, mover
   esta para `3-concluidas/`.
2. Atualizar a tabela de status em `especificacoes/README.md` (FASE-07.1 e critério #1).
3. Atualizar `ARQUITETURA.md` se a decisão "embed-only / video fora do schema" merecer registro.
4. Acrescentar aqui a seção "Registro de execução" (commits + evidências + desvios).

## 7. Prompt de kickoff (copiar e colar na sessão do executor)

```text
Você vai executar a FASE-07.1 do projeto nid-planeta. Trabalhe em C:\dev\nid-planeta.

1. Leia INTEIROS, antes de qualquer edição:
   - especificacoes/1-fase-atual/FASE-07.1-bloco-embed-no-editor/SPEC.md (esta SPEC)
   - especificacoes/0-contexto/ARQUITETURA.md
   - especificacoes/0-contexto/PROTOCOLO-DE-EXECUCAO.md
2. Confirme o baseline da seção 2 (test/tsc/build). Se algo falhar, PARE e reporte.
3. Use os skills superpowers:test-driven-development (tarefas 07.1.1 e o guard da 07.1.3 — teste
   falha primeiro), superpowers:executing-plans e superpowers:verification-before-completion (gate).
4. Execute NA ORDEM: 07.1.1 → 07.1.2 → 07.1.3 → 07.1.4 → 07.1.5.
   - Sem dangerouslySetInnerHTML; embed validado no write-time E no read.
   - createReactBlockSpec: se o tsc acusar factory, chame embed: embedBlock(). O tsc é o gate.
   - 07.1.4: ESTENDA o smoke (não reescreva os passos existentes).
5. Cada tarefa termina com a evidência exigida + commit com a mensagem da SPEC.
   git add SOMENTE dos caminhos listados; git add -A é PROIBIDO (há a frente landing 3D no working tree).
6. Nos passos de verificação manual, suba npm run dev e descreva o que observou; se não puder
   operar o navegador, pare nesse passo e me peça para verificar.
7. Se QUALQUER coisa divergir da SPEC, pare e reporte. Não improvise.
8. Ao final, rode o gate de saída (seção 5) e cole as saídas reais.
```

## 8. Decisões em aberto — RESOLVIDAS (execução autônoma autorizada pelo dono, 2026-06-14)

1. **Outros blocos do schema padrão que TAMBÉM somem no read** → **RESOLVIDO (07.1.6, opção a):**
   o schema do editor foi restrito a `paragraph/heading/bulletListItem/numberedListItem/image/embed`
   (exatamente o que o `RenderBlocks` renderiza). `codeBlock`/`quote`/`table`/`checkListItem`/
   `divider`/`toggleListItem` ficam FORA — habilitá-los é feature futura **deliberada** (render no
   `RenderBlocks` + sanitize + teste, em conjunto). Elimina toda a classe "bloco autorado some no read".
2. **Strip silencioso no load** → **RESOLVIDO (07.1.6, banner):** `LessonEditor` mostra um banner
   `role="status"` quando o guard de load remove blocos não-suportados de docs antigos; o conteúdo
   suportado é mantido e o 1º save consolida.
3. **Promoção na fila** → arquivo movido para `3-concluidas/` (concluída). **Pendente do dono:**
   atualizar a tabela de status em `especificacoes/README.md` (a maior parte de `especificacoes/`
   está untracked no working tree — consolidação cross-sessão é do dono). FASE-08 segue pré-spec.

## 9. Registro de execução (2026-06-14)

Executada nesta sessão com autonomia (ordem 07.1.1 → 07.1.6). Commits em `feature/nid-planeta`
— **NÃO pushados**: o dono consolida e pusha junto com as alterações de outras sessões.

| Tarefa | Commit | Resumo |
|---|---|---|
| SPEC+gate | `c0202f7` | SPEC corretiva (TEMPLATE A) + gate GO (red-team 6 dimensões) |
| 07.1.1 | `19363d6` | `normalizeEmbedUrl` (TDD, 8 testes); casa allowlist + CSP `frame-src` |
| 07.1.2 | `954f204` | bloco custom `embed` (`createReactBlockSpec` factory) + schema |
| 07.1.3 | `c9412e7` | editor usa schema + slash-menu "Vídeo (embed)" + guard recursivo + testes (guard/lessons) |
| 07.1.3b | `a1405f6` | `validateContentDoc` tolera embed incompleto (paridade com image) |
| 07.1.4 | `5872501` | smoke e2e cobre embed (passos 10b/12) |
| 07.1.5 | `6163281`/`f93f58e` | docs do plano (critério #1 vídeo → ✅) + registro do smoke |
| 07.1.6 | `1fe42e5` | §8a schema restrito ao suportado + §8b banner de strip |

**Gate de saída (2026-06-14):** `npx tsc --noEmit` 0 · `npm run test` **120/120** · `npm run build`
ok · `node scripts/smoke-universinid.mjs` (build de produção, `next start` :3100) **14/14 OK · 0
console/page errors · exit 0** (rodado 2×: após 07.1.4 e após 07.1.6) · `git diff globals.css`
vazio · 0 `dangerouslySetInnerHTML` (só comentários). Defesa em profundidade: normaliza no input →
`validateContentDoc` no PATCH → `isAllowedEmbed` no `RenderBlocks`.

**Resíduo de smoke no Neon** (Decisão #4 do plano): cursos/lições `smoke-fase2a-<ts>` (despublicados
no passo 14) + progresso do aluno de teste — limpeza opcional via DB (DELETE responde 409 por A3 com progresso).

**Pendente (dono):** atualizar `especificacoes/README.md`; item 7.4 da FASE-07 (upload de imagem em
deploy de preview — independente desta fase); **push da branch**.

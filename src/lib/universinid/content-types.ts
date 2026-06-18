export interface InlineText { type: 'text'; text: string; styles: Record<string, unknown>; }
export interface InlineLink { type: 'link'; href: string; content: InlineText[]; }
export type InlineContent = InlineText | InlineLink;

export interface BaseBlock { id: string; props: Record<string, unknown>; content?: InlineContent[]; children?: UniBlock[]; }
export interface LegacyEmbedBlock { type: 'legacy-embed'; props: { screenId: string }; }
export interface ParagraphBlock extends BaseBlock { type: 'paragraph'; }
export interface HeadingBlock extends BaseBlock { type: 'heading'; props: { level: 1 | 2 | 3 } & Record<string, unknown>; }
export interface BulletListBlock extends BaseBlock { type: 'bulletListItem'; }
export interface NumberedListBlock extends BaseBlock { type: 'numberedListItem'; }
export interface ImageBlock { type: 'image'; id: string; props: { url: string; caption?: string; previewWidth?: number } & Record<string, unknown>; }
export interface EmbedBlock { type: 'embed'; id: string; props: { url: string; provider?: 'youtube' | 'vimeo' | 'stream' } & Record<string, unknown>; }

// Quiz (FASE-08): questões vivem como JSON serializado numa prop string (propSchema do
// BlockNote só aceita primitivos). `corretaIdx`/`explicacao` são o GABARITO — removidos no
// servidor (stripQuizAnswers) antes de chegar ao cliente.
export interface Questao { enunciado: string; alternativas: string[]; corretaIdx: number; explicacao?: string; }
export interface QuizBlock { type: 'quiz'; id: string; props: { notaCorte?: number; questoesJson?: string } & Record<string, unknown>; }

export type UniBlock =
  | LegacyEmbedBlock | ParagraphBlock | HeadingBlock
  | BulletListBlock | NumberedListBlock | ImageBlock | EmbedBlock | QuizBlock
  | { type: string; id?: string; props?: Record<string, unknown>; content?: InlineContent[]; children?: UniBlock[] };

export type UniBlockDoc = UniBlock[];

export function legacyEmbedDoc(screenId: string): UniBlockDoc {
  return [{ type: 'legacy-embed', props: { screenId } }];
}
export function isLegacyEmbed(doc: unknown): boolean {
  return Array.isArray(doc) && doc.length === 1 && (doc[0] as { type?: string })?.type === 'legacy-embed';
}

// Remove blocos de imagem sem URL (incompletos/abandonados — ex.: upload que falhou ou foi
// interrompido). Persistidos, eles quebram o BlockNote ao recarregar (RangeError "Index 0 out
// of range"). Imagens em upload ATIVO vivem em memória e não passam por aqui (só no load).
export function stripIncompleteImages(doc: unknown): unknown[] {
  if (!Array.isArray(doc)) return [];
  return doc.filter((b) => {
    const block = b as { type?: string; props?: { url?: unknown } };
    if (block?.type === 'image') {
      return typeof block.props?.url === 'string' && block.props.url.length > 0;
    }
    return true;
  });
}

// Mantém só blocos cujo `type` o editor consegue montar. Removendo `video`/`audio`/`file` do
// schema (embed-only), um doc antigo que os contenha QUEBRARIA o useCreateBlockNote no hydrate —
// este guard os filtra ANTES de hidratar (mesmo princípio de stripIncompleteImages e do guard de
// legacy-embed). O 1º save grava o doc filtrado. RECURSA em `children` — um bloco não-suportado
// ANINHADO também derruba o hydrate.
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

// Remove o GABARITO (corretaIdx/explicacao) de TODO bloco `quiz` do doc, no SERVIDOR, ANTES de
// o doc chegar ao RenderBlocks/QuizClient (props de client viajam no payload RSC). Reduz cada
// questão ao contrato público `{ enunciado, alternativas }`. RECURSA em `children`. Idempotente.
// Tolera `questoesJson` inválido (caminho de read) neutralizando para `[]` — NUNCA lança.
// A correção é server-side (rota lê o gabarito do banco); aqui é defesa em profundidade (A2).
function stripQuestoesJson(raw: unknown): string {
  let parsed: unknown;
  try { parsed = JSON.parse(typeof raw === 'string' ? raw : '[]'); } catch { return '[]'; }
  if (!Array.isArray(parsed)) return '[]';
  const publicas = parsed.map((q) => {
    const qq = (q ?? {}) as { enunciado?: unknown; alternativas?: unknown };
    return {
      enunciado: typeof qq.enunciado === 'string' ? qq.enunciado : '',
      alternativas: Array.isArray(qq.alternativas) ? qq.alternativas : [],
    };
  });
  return JSON.stringify(publicas);
}
export function stripQuizAnswers(doc: unknown): UniBlockDoc {
  if (!Array.isArray(doc)) return [];
  const walk = (blocks: unknown[]): UniBlock[] =>
    blocks.map((b) => {
      let block = b as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
      if (block?.type === 'quiz') {
        block = { ...block, props: { ...block.props, questoesJson: stripQuestoesJson(block.props?.['questoesJson']) } };
      }
      if (Array.isArray(block.children)) {
        block = { ...block, children: walk(block.children) as UniBlock[] };
      }
      return block as UniBlock;
    });
  return walk(doc);
}

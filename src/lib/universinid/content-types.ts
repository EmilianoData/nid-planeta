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

export type UniBlock =
  | LegacyEmbedBlock | ParagraphBlock | HeadingBlock
  | BulletListBlock | NumberedListBlock | ImageBlock | EmbedBlock
  | { type: string; id?: string; props?: Record<string, unknown>; content?: InlineContent[]; children?: UniBlock[] };

export type UniBlockDoc = UniBlock[];

export function legacyEmbedDoc(screenId: string): UniBlockDoc {
  return [{ type: 'legacy-embed', props: { screenId } }];
}
export function isLegacyEmbed(doc: unknown): boolean {
  return Array.isArray(doc) && doc.length === 1 && (doc[0] as { type?: string })?.type === 'legacy-embed';
}

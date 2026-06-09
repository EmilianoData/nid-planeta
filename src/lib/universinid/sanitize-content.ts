const EMBED_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com'];
const VIDEODELIVERY = /\.videodelivery\.net$/;

export function isSafeHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  try { const u = new URL(raw); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}
export function isAllowedEmbed(raw: unknown): boolean {
  if (!isSafeHttpUrl(raw)) return false;
  try { const h = new URL(raw).hostname; return EMBED_HOSTS.includes(h) || VIDEODELIVERY.test(h); } catch { return false; }
}
export interface ContentCheck { ok: boolean; error?: string; }
export function validateContentDoc(doc: unknown): ContentCheck {
  if (!Array.isArray(doc)) return { ok: false, error: 'conteúdo deve ser um array de blocos' };
  for (const block of doc) {
    const b = block as { type?: string; props?: { url?: unknown } };
    if (b?.type === 'image') {
      // URL vazia/ausente = bloco de imagem incompleto (recém-inserido, upload em andamento) → permite,
      // senão o autosave debounced rejeita (422) durante o upload. URL PRESENTE deve ser http(s) seguro
      // (bloqueia javascript:/data:/etc.); o whitelist de leitura (RenderBlocks, Fase 5.1) é a defesa final.
      const url = b.props?.url;
      const incompleta = url === undefined || url === null || url === '';
      if (!incompleta && !isSafeHttpUrl(url)) return { ok: false, error: 'imagem: URL deve ser http(s)' };
    }
    if (b?.type === 'embed' && !isAllowedEmbed(b.props?.url)) return { ok: false, error: 'embed: só YouTube/Vimeo/Stream' };
  }
  return { ok: true };
}

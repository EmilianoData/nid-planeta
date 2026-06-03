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
    if (b?.type === 'image' && !isSafeHttpUrl(b.props?.url)) return { ok: false, error: 'imagem: URL deve ser http(s)' };
    if (b?.type === 'embed' && !isAllowedEmbed(b.props?.url)) return { ok: false, error: 'embed: só YouTube/Vimeo/Stream' };
  }
  return { ok: true };
}

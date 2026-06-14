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

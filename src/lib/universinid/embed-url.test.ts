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

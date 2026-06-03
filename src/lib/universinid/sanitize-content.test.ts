import { describe, it, expect } from 'vitest';
import { validateContentDoc, isAllowedEmbed, isSafeHttpUrl } from './sanitize-content';
describe('validateContentDoc (XSS)', () => {
  it('rejeita image com javascript:', () => { expect(validateContentDoc([{ type: 'image', props: { url: 'javascript:alert(1)' } }]).ok).toBe(false); });
  it('rejeita image com data:', () => { expect(validateContentDoc([{ type: 'image', props: { url: 'data:text/html,<script>' } }]).ok).toBe(false); });
  it('rejeita embed de host fora da allowlist', () => { expect(validateContentDoc([{ type: 'embed', props: { url: 'https://evil.com/x' } }]).ok).toBe(false); });
  it('aceita embed YouTube e imagem https', () => { expect(validateContentDoc([{ type: 'embed', props: { url: 'https://youtube.com/embed/x' } }, { type: 'image', props: { url: 'https://blob.vercel.com/a.png' } }]).ok).toBe(true); });
  it('isSafeHttpUrl rejeita javascript: e aceita https', () => { expect(isSafeHttpUrl('javascript:1')).toBe(false); expect(isSafeHttpUrl('https://x.com')).toBe(true); });
});

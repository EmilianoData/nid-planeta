import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from './button';

// FASE-10 — touch target ≥44px (WCAG 2.5.5). Piso só na variante md; sm fica
// compacto (exceção consciente WCAG 2.5.8 — alvos inline em UI densa de admin).
describe('Button — touch target (FASE-10)', () => {
  it('size md (default) recebe o piso min-h-[var(--touch-min)]', () => {
    const html = renderToStaticMarkup(<Button>ok</Button>);
    expect(html).toContain('min-h-[var(--touch-min)]');
  });

  it('size sm NÃO recebe o piso (exceção WCAG 2.5.8)', () => {
    const html = renderToStaticMarkup(<Button size="sm">ok</Button>);
    expect(html).not.toContain('min-h-[var(--touch-min)]');
  });
});

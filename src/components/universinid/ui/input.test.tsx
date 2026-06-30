import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Input } from './input';

// FASE-10 — touch target ≥44px (WCAG 2.5.5).
describe('Input — touch target (FASE-10)', () => {
  it('recebe o piso min-h-[var(--touch-min)]', () => {
    const html = renderToStaticMarkup(<Input />);
    expect(html).toContain('min-h-[var(--touch-min)]');
  });
});

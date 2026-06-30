import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Select } from './select';

// FASE-10 — touch target ≥44px (WCAG 2.5.5).
describe('Select — touch target (FASE-10)', () => {
  it('recebe o piso min-h-[var(--touch-min)]', () => {
    const html = renderToStaticMarkup(
      <Select>
        <option value="a">a</option>
      </Select>
    );
    expect(html).toContain('min-h-[var(--touch-min)]');
  });
});

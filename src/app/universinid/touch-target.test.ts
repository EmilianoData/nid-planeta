import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// FASE-10 — gate D3 (honra o D6 da spec): prova AUTOMÁTICA, sem depender do olho,
// de que cada classe interativa do escopo carrega o piso de toque 44px no CSS.
// (O tamanho RENDERIZADO em px segue sendo verificado no preview; isto fecha o
// falso-verde de "classe ausente / token apagado por edição".)
const css = readFileSync(
  join(process.cwd(), 'src/app/universinid/universinid.css'),
  'utf8'
);

function corpoDaRegra(seletor: string): string {
  const start = css.indexOf(seletor + '{');
  if (start === -1) throw new Error(`seletor não encontrado no CSS: ${seletor}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open, close);
}

// 11 seletores CSS do escopo FASE-10 (os primitivos ui/* são cobertos pelos render-tests).
const SELETORES = [
  '.uni-back',
  '.uni-k',
  '.uni-cmd-item',
  '.uni-btn',
  '.uni-nav',
  '.uni-acct-item',
  '.uni-pick',
  '.uni-tab',
  '.uni-cont .go',
  '.uni-wm',
  '.uni-login input',
];

describe('FASE-10 — touch target nas classes .uni-* (assert de CSS)', () => {
  it('o token --touch-min:44px existe em :root', () => {
    expect(css).toContain('--touch-min:44px');
  });

  for (const sel of SELETORES) {
    it(`${sel} carrega min-height:var(--touch-min)`, () => {
      expect(corpoDaRegra(sel)).toContain('min-height:var(--touch-min)');
    });
  }
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGO, todasLicoes, getLicao } from './catalogo';

const html = readFileSync(join(process.cwd(), 'public/universinid.html'), 'utf8');

describe('catálogo UniversiNID', () => {
  it('tem 6 módulos e 39 lições', () => {
    expect(CATALOGO).toHaveLength(6);
    expect(todasLicoes()).toHaveLength(39);
  });

  it('todo screenId existe como painel no universinid.html', () => {
    for (const licao of todasLicoes()) {
      expect(html).toContain(`class="screen" id="${licao.screenId}"`);
    }
  });

  it('slugs são únicos', () => {
    const slugs = todasLicoes().map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('getLicao resolve por slug e retorna o módulo', () => {
    const r = getLicao('agent-orchestration');
    expect(r?.licao.screenId).toBe('s0-3');
    expect(r?.modulo.id).toBe('m0');
  });
});

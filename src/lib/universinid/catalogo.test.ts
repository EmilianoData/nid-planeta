import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGO, todasLicoes, getLicao } from './catalogo';

const html = readFileSync(join(process.cwd(), 'public/universinid.html'), 'utf8');

// ⚠️ NÃO APOSENTAR ENQUANTO HOUVER LIÇÃO LEGACY-EMBED.
// Este teste garante a paridade catálogo ↔ public/universinid.html (screenIds do
// iframe legado). Desde a FASE-06, vitrine/sidebar leem do banco, mas o catálogo
// continua sendo a fonte do seed e do conteúdo legado. Aposentar este teste somente
// quando TODAS as 39 lições estiverem decompostas (nenhum doc legacy-embed restante)
// — ver docs/superpowers/plans/2026-06-03-universinid-fase2a.md, Fase 6, Step 3.
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

  it('ordem de cada lição bate com a posição no array', () => {
    for (const m of CATALOGO) {
      m.licoes.forEach((l, i) => expect(l.ordem).toBe(i + 1));
    }
  });
});

import { describe, it, expect } from 'vitest';
import { badgesGanhos, badgeSlugModulo, badgeSlugCurso, type BadgeAlvo } from './badges';

const alvos: BadgeAlvo[] = [
  { slug: 'mod-a', escopo: 'MODULE', licaoSlugs: ['l1', 'l2'] },
  { slug: 'mod-b', escopo: 'MODULE', licaoSlugs: ['l3'] },
  { slug: 'curso-x', escopo: 'COURSE', licaoSlugs: ['l1', 'l2', 'l3'] },
];

describe('badgeSlug*', () => {
  it('gera slugs estáveis e distintos por escopo', () => {
    expect(badgeSlugModulo('m1')).toBe('mod-m1');
    expect(badgeSlugCurso('c1')).toBe('curso-c1');
  });
});

describe('badgesGanhos', () => {
  it('módulo com todas as lições concluídas é ganho', () => {
    expect(badgesGanhos(alvos, new Set(['l1', 'l2']))).toEqual(['mod-a']);
  });

  it('módulo parcial NÃO é ganho', () => {
    expect(badgesGanhos(alvos, new Set(['l1']))).toEqual([]);
  });

  it('curso só é ganho com TODAS as lições de todos os módulos', () => {
    expect(badgesGanhos(alvos, new Set(['l1', 'l2', 'l3']))).toEqual(['mod-a', 'mod-b', 'curso-x']);
  });

  it('alvo sem lições nunca é ganho (evita medalha vazia)', () => {
    expect(badgesGanhos([{ slug: 'mod-vazio', escopo: 'MODULE', licaoSlugs: [] }], new Set(['l1']))).toEqual([]);
  });

  it('conjunto vazio de progresso = nenhum ganho', () => {
    expect(badgesGanhos(alvos, new Set())).toEqual([]);
  });
});

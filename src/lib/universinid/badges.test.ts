import { describe, it, expect } from 'vitest';
import { badgesGanhos, badgeSlugModulo, badgeSlugCurso, montarAlvos, type BadgeAlvo } from './badges';

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

describe('montarAlvos', () => {
  it('gera 1 alvo MODULE por módulo (suas lições) + 1 COURSE por curso (união das lições)', () => {
    const cursos = [
      {
        id: 'c1',
        modules: [
          { id: 'm1', lessons: [{ slug: 'l1' }, { slug: 'l2' }] },
          { id: 'm2', lessons: [{ slug: 'l3' }] },
        ],
      },
    ];
    expect(montarAlvos(cursos)).toEqual([
      { slug: 'mod-m1', escopo: 'MODULE', licaoSlugs: ['l1', 'l2'] },
      { slug: 'mod-m2', escopo: 'MODULE', licaoSlugs: ['l3'] },
      { slug: 'curso-c1', escopo: 'COURSE', licaoSlugs: ['l1', 'l2', 'l3'] },
    ]);
  });

  it('cursos múltiplos: alvos concatenados por curso, sem cruzar lições entre cursos', () => {
    const cursos = [
      { id: 'c1', modules: [{ id: 'm1', lessons: [{ slug: 'l1' }] }] },
      { id: 'c2', modules: [{ id: 'm2', lessons: [{ slug: 'l2' }] }] },
    ];
    expect(montarAlvos(cursos)).toEqual([
      { slug: 'mod-m1', escopo: 'MODULE', licaoSlugs: ['l1'] },
      { slug: 'curso-c1', escopo: 'COURSE', licaoSlugs: ['l1'] },
      { slug: 'mod-m2', escopo: 'MODULE', licaoSlugs: ['l2'] },
      { slug: 'curso-c2', escopo: 'COURSE', licaoSlugs: ['l2'] },
    ]);
  });

  it('curso sem módulos → COURSE com licaoSlugs vazio (badgesGanhos depois descarta a medalha vazia)', () => {
    expect(montarAlvos([{ id: 'c3', modules: [] }])).toEqual([
      { slug: 'curso-c3', escopo: 'COURSE', licaoSlugs: [] },
    ]);
  });
});

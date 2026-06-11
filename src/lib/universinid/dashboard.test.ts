import { describe, it, expect } from 'vitest';
import { buildDashboard, type ProgressRow, type DashModulo } from './dashboard';

const d = (s: string) => new Date(s + 'T12:00:00Z');

// Fixture explícita (E2): o dashboard é função da ÁRVORE PUBLICADA, não do catálogo.
const MODULOS: DashModulo[] = [
  {
    id: 'm0', titulo: 'Fundamentos', licoes: [
      { slug: 'sdd-spec-driven-development', titulo: 'SDD — Spec-Driven Development', tempoMin: 8, dificuldade: 'Iniciante' },
      { slug: 'llm-o-que-e', titulo: 'LLM — O que é e como usar bem', tempoMin: 6, dificuldade: 'Iniciante' },
    ],
  },
  {
    id: 'm5', titulo: 'Referência Rápida', licoes: [
      { slug: 'cheatsheet-comandos', titulo: 'Cheatsheet — 12 comandos /nid:*', tempoMin: 5, dificuldade: 'Iniciante' },
      { slug: 'faq', titulo: 'FAQ — Perguntas frequentes', tempoMin: 4, dificuldade: 'Iniciante' },
    ],
  },
];

describe('buildDashboard', () => {
  it('sem progresso: 0%, próxima = primeira lição da árvore, streak 0', () => {
    const r = buildDashboard([], d('2026-05-29'), MODULOS);
    expect(r.totalLicoes).toBe(4);
    expect(r.licoesConcluidas).toBe(0);
    expect(r.pctGeral).toBe(0);
    expect(r.modulosAtivos).toBe(0);
    expect(r.streakDias).toBe(0);
    expect(r.proxima?.slug).toBe('sdd-spec-driven-development');
  });

  it('com concluídas: pct e próxima corretos', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
      { lessonSlug: 'llm-o-que-e', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
      { lessonSlug: 'cheatsheet-comandos', status: 'IN_PROGRESS', pct: 60, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'), MODULOS);
    expect(r.licoesConcluidas).toBe(2);
    expect(r.pctGeral).toBe(Math.round((2 / 4) * 100));
    expect(r.modulosAtivos).toBe(2);
    expect(r.proxima?.slug).toBe('cheatsheet-comandos'); // IN_PROGRESS tem prioridade
    expect(r.proxima?.pct).toBe(60);
  });

  it('próxima pula concluídas para a primeira não-concluída', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'), MODULOS);
    expect(r.proxima?.slug).toBe('llm-o-que-e');
  });

  it('lição nova publicada entra na conta (denominador dinâmico)', () => {
    const comNova: DashModulo[] = [
      MODULOS[0],
      {
        ...MODULOS[1],
        licoes: [...MODULOS[1].licoes, { slug: 'licao-nova', titulo: 'Lição Nova', tempoMin: 3, dificuldade: 'Iniciante' }],
      },
    ];
    const r = buildDashboard([], d('2026-05-29'), comNova);
    expect(r.totalLicoes).toBe(5);
  });

  it('árvore vazia não quebra: zeros e proxima null', () => {
    const r = buildDashboard([], d('2026-05-29'), []);
    expect(r.totalLicoes).toBe(0);
    expect(r.pctGeral).toBe(0);
    expect(r.modulosAtivos).toBe(0);
    expect(r.proxima).toBeNull();
    expect(r.trilha.licoes).toHaveLength(0);
  });

  it('streak conta dias consecutivos terminando hoje', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-27') },
      { lessonSlug: 'llm-o-que-e', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-28') },
      { lessonSlug: 'cheatsheet-comandos', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-29') },
    ];
    expect(buildDashboard(rows, d('2026-05-29'), MODULOS).streakDias).toBe(3);
  });

  it('streak quebrado: só conta o bloco que termina hoje/ontem', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-20') },
      { lessonSlug: 'cheatsheet-comandos', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-29') },
    ];
    expect(buildDashboard(rows, d('2026-05-29'), MODULOS).streakDias).toBe(1);
  });

  it('trilha = lições do módulo da próxima lição, com status', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'), MODULOS);
    expect(r.trilha.moduloTitulo).toBe('Fundamentos');
    expect(r.trilha.licoes).toHaveLength(2);
    expect(r.trilha.licoes[0].status).toBe('COMPLETED');
    expect(r.trilha.licoes[1].status).toBe('NOT_STARTED');
  });

  it('tudo concluído: proxima=null, trilha aponta para módulo da lição mais recente', () => {
    const baseDate = d('2026-05-01');
    const rows: ProgressRow[] = MODULOS.flatMap((m) => m.licoes).map((l) => ({
      lessonSlug: l.slug,
      status: 'COMPLETED' as const,
      pct: 100,
      updatedAt: baseDate,
    }));
    const faqIdx = rows.findIndex((r) => r.lessonSlug === 'faq');
    rows[faqIdx] = { ...rows[faqIdx], updatedAt: d('2026-05-29') };

    const r = buildDashboard(rows, d('2026-05-29'), MODULOS);
    expect(r.proxima).toBeNull();
    expect(r.trilha.moduloTitulo).toBe('Referência Rápida');
  });
});

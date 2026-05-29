import { describe, it, expect } from 'vitest';
import { buildDashboard, type ProgressRow } from './dashboard';

const d = (s: string) => new Date(s + 'T12:00:00Z');

describe('buildDashboard', () => {
  it('sem progresso: 0%, próxima = primeira lição, streak 0', () => {
    const r = buildDashboard([], d('2026-05-29'));
    expect(r.totalLicoes).toBe(39);
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
      { lessonSlug: 'agent-orchestration', status: 'IN_PROGRESS', pct: 60, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'));
    expect(r.licoesConcluidas).toBe(2);
    expect(r.pctGeral).toBe(Math.round((2 / 39) * 100));
    expect(r.modulosAtivos).toBe(1);
    expect(r.proxima?.slug).toBe('agent-orchestration'); // IN_PROGRESS tem prioridade
    expect(r.proxima?.pct).toBe(60);
  });

  it('próxima pula concluídas para a primeira não-concluída', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'));
    expect(r.proxima?.slug).toBe('llm-o-que-e');
  });

  it('streak conta dias consecutivos terminando hoje', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-27') },
      { lessonSlug: 'llm-o-que-e', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-28') },
      { lessonSlug: 'agent-orchestration', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-29') },
    ];
    expect(buildDashboard(rows, d('2026-05-29')).streakDias).toBe(3);
  });

  it('streak quebrado: só conta o bloco que termina hoje/ontem', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-20') },
      { lessonSlug: 'agent-orchestration', status: 'IN_PROGRESS', pct: 10, updatedAt: d('2026-05-29') },
    ];
    expect(buildDashboard(rows, d('2026-05-29')).streakDias).toBe(1);
  });

  it('trilha = lições do módulo da próxima lição, com status', () => {
    const rows: ProgressRow[] = [
      { lessonSlug: 'sdd-spec-driven-development', status: 'COMPLETED', pct: 100, updatedAt: d('2026-05-29') },
    ];
    const r = buildDashboard(rows, d('2026-05-29'));
    expect(r.trilha.moduloTitulo).toBe('Fundamentos');
    expect(r.trilha.licoes).toHaveLength(5);
    expect(r.trilha.licoes[0].status).toBe('COMPLETED');
    expect(r.trilha.licoes[1].status).toBe('NOT_STARTED');
  });
});

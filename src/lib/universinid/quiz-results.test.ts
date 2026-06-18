import { describe, it, expect, vi, beforeEach } from 'vitest';

const { quizFindMany, userFindMany, lessonFindMany, aliasFindMany } = vi.hoisted(() => ({
  quizFindMany: vi.fn(), userFindMany: vi.fn(), lessonFindMany: vi.fn(), aliasFindMany: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    quizAttempt: { findMany: quizFindMany },
    user: { findMany: userFindMany },
    lesson: { findMany: lessonFindMany },
    lessonSlugAlias: { findMany: aliasFindMany },
  },
}));

import { getQuizResults } from './quiz-results';

describe('getQuizResults (relatório admin por aluno)', () => {
  beforeEach(() => {
    quizFindMany.mockReset(); userFindMany.mockReset(); lessonFindMany.mockReset(); aliasFindMany.mockReset();
    quizFindMany.mockResolvedValue([
      { userId: 'u1', lessonSlug: 'aula-a', score: 60, passed: false, notaCorte: 70 },
      { userId: 'u1', lessonSlug: 'aula-a', score: 80, passed: true, notaCorte: 70 },
      { userId: 'u1', lessonSlug: 'slug-antigo', score: 90, passed: true, notaCorte: 70 },
      { userId: 'u1', lessonSlug: 'slug-novo', score: 50, passed: false, notaCorte: 70 },
      { userId: 'adm', lessonSlug: 'aula-a', score: 100, passed: true, notaCorte: 70 },
      { userId: 'u-ghost', lessonSlug: 'removida-xyz', score: 30, passed: false, notaCorte: 70 },
    ]);
    userFindMany.mockResolvedValue([
      { id: 'u1', name: 'Aluno Um', email: 'u1@x', role: 'STUDENT' },
      { id: 'adm', name: 'Admin', email: 'a@x', role: 'ADMIN' },
    ]);
    lessonFindMany.mockResolvedValue([
      { id: 'L1', slug: 'aula-a', title: 'Aula A' },
      { id: 'L2', slug: 'slug-novo', title: 'Aula Nova' },
    ]);
    aliasFindMany.mockResolvedValue([{ oldSlug: 'slug-antigo', lesson: { id: 'L2', title: 'Aula Nova' } }]);
  });

  it('NUNCA seleciona o campo answers (gabarito não vaza p/ o relatório)', async () => {
    await getQuizResults();
    const selectArg = quizFindMany.mock.calls[0][0].select as Record<string, unknown>;
    expect(Object.keys(selectArg)).not.toContain('answers');
  });

  it('exclui tentativas de ADMIN; inclui alunos e órfãos', async () => {
    const res = await getQuizResults();
    const ids = res.map((a) => a.userId);
    expect(ids).toContain('u1');
    expect(ids).toContain('u-ghost');
    expect(ids).not.toContain('adm');
  });

  it('consolida slug antigo + novo no MESMO grupo (lessonId canônico) — não 2 grupos', async () => {
    const u1 = (await getQuizResults()).find((a) => a.userId === 'u1')!;
    expect(u1.licoes).toHaveLength(2); // aula-a (L1) + L2 (slug-antigo∪slug-novo)
    const l2 = u1.licoes.find((l) => l.lessonId === 'L2')!;
    expect(l2.totalTentativas).toBe(2);
    expect(l2.melhorScore).toBe(90);
    expect(l2.aprovado).toBe(true);
  });

  it('melhor score + aprovado por lição (aula-a: 60/80 → 80, aprovado)', async () => {
    const u1 = (await getQuizResults()).find((a) => a.userId === 'u1')!;
    const aulaA = u1.licoes.find((l) => l.lessonId === 'L1')!;
    expect(aulaA.melhorScore).toBe(80);
    expect(aulaA.aprovado).toBe(true);
    expect(aulaA.totalTentativas).toBe(2);
  });

  it('aluno removido (userId sem User) é rotulado; lição removida tem lessonId null', async () => {
    const ghost = (await getQuizResults()).find((a) => a.userId === 'u-ghost')!;
    expect(ghost.removido).toBe(true);
    expect(ghost.nome).toContain('removido');
    expect(ghost.licoes[0]!.lessonId).toBeNull();
  });

  it('bulk — sem N+1: lesson.findMany e alias.findMany chamados 1x cada', async () => {
    await getQuizResults();
    expect(lessonFindMany).toHaveBeenCalledTimes(1);
    expect(aliasFindMany).toHaveBeenCalledTimes(1);
    expect(userFindMany).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { updateMany, upsert } = vi.hoisted(() => ({ updateMany: vi.fn(), upsert: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { lessonProgress: { updateMany, upsert } } }));

import { upsertLessonProgress } from './progress-utils';

describe('upsertLessonProgress — latch de conclusão', () => {
  beforeEach(() => {
    updateMany.mockReset();
    upsert.mockReset();
    upsert.mockResolvedValue({});
  });

  it('linha existe e não-COMPLETED: updateMany aplica (guard status!=COMPLETED), upsert NÃO roda', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await upsertLessonProgress('u1', 'aula', 'IN_PROGRESS', 10);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', lessonSlug: 'aula', status: { not: 'COMPLETED' } } }),
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('linha ausente: updateMany count 0 → upsert cria', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await upsertLessonProgress('u1', 'aula', 'COMPLETED', 100);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_lessonSlug: { userId: 'u1', lessonSlug: 'aula' } },
        create: { userId: 'u1', lessonSlug: 'aula', status: 'COMPLETED', pct: 100 },
        update: {},
      }),
    );
  });

  it('LATCH: COMPLETED não regride — IN_PROGRESS posterior não rebaixa (guard exclui → upsert update:{} no-op)', async () => {
    updateMany.mockResolvedValue({ count: 0 }); // status já é COMPLETED → guard status!=COMPLETED não casa
    await upsertLessonProgress('u1', 'aula', 'IN_PROGRESS', 10);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
  });

  it('aceita client de transação (tx) para rodar dentro de $transaction', async () => {
    const tx = { lessonProgress: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), upsert: vi.fn() } };
    await upsertLessonProgress('u1', 'aula', 'COMPLETED', 100, tx as never);
    expect(tx.lessonProgress.updateMany).toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled(); // usou o tx, não o client global
  });
});

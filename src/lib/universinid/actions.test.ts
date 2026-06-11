import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authMock, lessonFindUnique, aliasFindUnique, progressUpsert } = vi.hoisted(() => ({
  authMock: vi.fn(),
  lessonFindUnique: vi.fn(),
  aliasFindUnique: vi.fn(),
  progressUpsert: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  lesson: { findUnique: lessonFindUnique },
  lessonSlugAlias: { findUnique: aliasFindUnique },
  lessonProgress: { upsert: progressUpsert },
} }));

import { markLessonProgress } from './actions';

const USER = { user: { id: 'u1', role: 'STUDENT', nome: 'Aluno' } };

describe('markLessonProgress — guarda no banco (extensão E3)', () => {
  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue(USER);
    lessonFindUnique.mockReset();
    aliasFindUnique.mockReset();
    progressUpsert.mockReset();
    progressUpsert.mockResolvedValue({});
  });

  it('aceita lição que existe no BANCO mesmo fora do catálogo estático', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'l1', slug: 'licao-nova-do-banco' });
    await markLessonProgress({ slug: 'licao-nova-do-banco', status: 'IN_PROGRESS', pct: 10 });
    expect(progressUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_lessonSlug: { userId: 'u1', lessonSlug: 'licao-nova-do-banco' } },
      }),
    );
  });

  it('rejeita slug que não existe no banco (nem por alias); upsert NÃO roda', async () => {
    lessonFindUnique.mockResolvedValue(null);
    aliasFindUnique.mockResolvedValue(null);
    await expect(
      markLessonProgress({ slug: 'nao-existe', status: 'COMPLETED', pct: 100 }),
    ).rejects.toThrow('Lição inexistente');
    expect(progressUpsert).not.toHaveBeenCalled();
  });

  it('aceita slug renomeado resolvido por alias (risco #1)', async () => {
    lessonFindUnique.mockResolvedValue(null);
    aliasFindUnique.mockResolvedValue({ lesson: { id: 'l2', slug: 'slug-novo' } });
    await markLessonProgress({ slug: 'slug-antigo', status: 'COMPLETED', pct: 100 });
    // A chave de progresso continua sendo o slug RECEBIDO (assinatura/chave inalteradas).
    expect(progressUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_lessonSlug: { userId: 'u1', lessonSlug: 'slug-antigo' } },
      }),
    );
  });

  it('sem sessão: rejeita sem tocar no banco', async () => {
    authMock.mockResolvedValue(null);
    await expect(
      markLessonProgress({ slug: 'llm-o-que-e', status: 'IN_PROGRESS', pct: 10 }),
    ).rejects.toThrow('Não autenticado');
    expect(progressUpsert).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authMock, lessonFindUnique, aliasFindUnique, progressUpsert, progressUpdateMany, userFindUnique, grantBadgesMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  lessonFindUnique: vi.fn(),
  aliasFindUnique: vi.fn(),
  progressUpsert: vi.fn(),
  progressUpdateMany: vi.fn(),
  userFindUnique: vi.fn(),
  grantBadgesMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  lesson: { findUnique: lessonFindUnique },
  lessonSlugAlias: { findUnique: aliasFindUnique },
  lessonProgress: { upsert: progressUpsert, updateMany: progressUpdateMany },
  user: { findUnique: userFindUnique },
} }));
// Isola a concessão (FASE-09): testada à parte em badges-grant.test.ts. Aqui só verificamos o gancho.
vi.mock('./badges-grant', () => ({
  grantBadges: grantBadgesMock,
  contarConquistas: vi.fn().mockResolvedValue(0),
  getConquistasDoUsuario: vi.fn(),
}));

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
    progressUpdateMany.mockReset();
    progressUpdateMany.mockResolvedValue({ count: 0 }); // força o caminho de create → mantém as asserções de upsert
    userFindUnique.mockReset();
    userFindUnique.mockResolvedValue({ id: 'u1' }); // padrão: conta existe E está ativa
    grantBadgesMock.mockReset();
    grantBadgesMock.mockResolvedValue(undefined);
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

  it('conta desativada (token válido, isActive=false): rejeita; upsert NÃO roda — OWASP A07', async () => {
    userFindUnique.mockResolvedValue(null); // findUnique({ id, isActive: true }) não acha → conta inativa
    await expect(
      markLessonProgress({ slug: 'llm-o-que-e', status: 'IN_PROGRESS', pct: 10 }),
    ).rejects.toThrow('Conta inativa');
    expect(progressUpsert).not.toHaveBeenCalled();
  });

  // FASE-09 — gancho de concessão de medalhas (best-effort, após o latch de progresso).
  it('concluir lição (COMPLETED) dispara grantBadges para o usuário', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'l1', slug: 'llm-o-que-e' });
    await markLessonProgress({ slug: 'llm-o-que-e', status: 'COMPLETED', pct: 100 });
    expect(grantBadgesMock).toHaveBeenCalledWith('u1');
  });

  it('progresso não-final (IN_PROGRESS) NÃO dispara grantBadges (hot path enxuto)', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'l1', slug: 'llm-o-que-e' });
    await markLessonProgress({ slug: 'llm-o-que-e', status: 'IN_PROGRESS', pct: 40 });
    expect(grantBadgesMock).not.toHaveBeenCalled();
  });
});

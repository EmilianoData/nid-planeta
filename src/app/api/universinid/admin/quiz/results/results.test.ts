import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authMock, userFindUnique, quizFindMany, userFindMany, lessonFindMany, aliasFindMany } = vi.hoisted(() => ({
  authMock: vi.fn(), userFindUnique: vi.fn(),
  quizFindMany: vi.fn(), userFindMany: vi.fn(), lessonFindMany: vi.fn(), aliasFindMany: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique, findMany: userFindMany },
    quizAttempt: { findMany: quizFindMany },
    lesson: { findMany: lessonFindMany },
    lessonSlugAlias: { findMany: aliasFindMany },
  },
}));

import { GET } from './route';

describe('GET /api/universinid/admin/quiz/results', () => {
  beforeEach(() => {
    authMock.mockReset();
    userFindUnique.mockReset(); userFindUnique.mockResolvedValue({ id: 'a' });
    quizFindMany.mockReset(); quizFindMany.mockResolvedValue([]);
    userFindMany.mockReset(); userFindMany.mockResolvedValue([]);
    lessonFindMany.mockReset(); lessonFindMany.mockResolvedValue([]);
    aliasFindMany.mockReset(); aliasFindMany.mockResolvedValue([]);
  });

  it('401 sem sessão', async () => {
    authMock.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it('403 para STUDENT (rota é admin-only)', async () => {
    authMock.mockResolvedValue({ user: { id: 's', role: 'STUDENT' } });
    expect((await GET()).status).toBe(403);
  });

  it('200 para ADMIN; resposta nunca contém answers/corretaIdx', async () => {
    authMock.mockResolvedValue({ user: { id: 'a', role: 'ADMIN' } });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).not.toContain('answers');
    expect(body).not.toContain('corretaIdx');
  });
});

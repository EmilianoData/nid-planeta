import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  authMock, userFindUnique, lessonFindUnique, aliasFindUnique,
  quizCount, quizCreate, txUpdateMany, txUpsert, transactionMock, grantBadgesMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(), userFindUnique: vi.fn(),
  lessonFindUnique: vi.fn(), aliasFindUnique: vi.fn(),
  quizCount: vi.fn(), quizCreate: vi.fn(),
  txUpdateMany: vi.fn(), txUpsert: vi.fn(), transactionMock: vi.fn(), grantBadgesMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    lesson: { findUnique: lessonFindUnique },
    lessonSlugAlias: { findUnique: aliasFindUnique },
    quizAttempt: { count: quizCount, create: quizCreate },
    $transaction: transactionMock,
  },
}));
// FASE-09: a concessão é best-effort e testada à parte (badges-grant.test.ts). Aqui só
// verificamos o GANCHO (disparado após o commit, só p/ aluno que passou) — sem exercer o pipeline.
vi.mock('@/lib/universinid/badges-grant', () => ({ grantBadges: grantBadgesMock }));

import { POST } from './route';

const QUESTOES = [{ enunciado: 'P', alternativas: ['certa', 'errada'], corretaIdx: 0 }];
const publishedLesson = (extra: Record<string, unknown> = {}) => ({
  id: 'l1', slug: 'aula', status: 'PUBLISHED',
  contentPublished: [{ id: 'q', type: 'quiz', props: { notaCorte: 70, questoesJson: JSON.stringify(QUESTOES) } }],
  ...extra,
});
const req = (body: unknown) => new NextRequest('http://t/api/universinid/quiz/attempt', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
});
const STUDENT = { user: { id: 'u1', role: 'STUDENT' } };

describe('POST /api/universinid/quiz/attempt', () => {
  beforeEach(() => {
    authMock.mockReset(); authMock.mockResolvedValue(STUDENT);
    userFindUnique.mockReset(); userFindUnique.mockResolvedValue({ id: 'u1' }); // conta ativa
    lessonFindUnique.mockReset(); lessonFindUnique.mockResolvedValue(publishedLesson());
    aliasFindUnique.mockReset(); aliasFindUnique.mockResolvedValue(null);
    quizCount.mockReset(); quizCount.mockResolvedValue(0);
    quizCreate.mockReset(); quizCreate.mockResolvedValue({ id: 'a1' });
    txUpdateMany.mockReset(); txUpdateMany.mockResolvedValue({ count: 1 });
    txUpsert.mockReset(); txUpsert.mockResolvedValue({});
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({ quizAttempt: { create: quizCreate }, lessonProgress: { updateMany: txUpdateMany, upsert: txUpsert } }),
    );
    grantBadgesMock.mockReset(); grantBadgesMock.mockResolvedValue(undefined);
  });

  it('401 sem sessão', async () => {
    authMock.mockResolvedValue(null);
    expect((await POST(req({ lessonSlug: 'aula', respostas: [0] }))).status).toBe(401);
  });

  it('403 quando o papel não é permitido (sem role)', async () => {
    authMock.mockResolvedValue({ user: { id: 'x' } });
    expect((await POST(req({ lessonSlug: 'aula', respostas: [0] }))).status).toBe(403);
  });

  it('422 body inválido (respostas não é array de números)', async () => {
    expect((await POST(req({ lessonSlug: 'aula', respostas: 'nope' }))).status).toBe(422);
  });

  it('404 quando a lição não existe (nem por alias)', async () => {
    lessonFindUnique.mockResolvedValue(null);
    expect((await POST(req({ lessonSlug: 'fantasma', respostas: [0] }))).status).toBe(404);
  });

  it('422 quando a lição está DRAFT', async () => {
    lessonFindUnique.mockResolvedValue(publishedLesson({ status: 'DRAFT' }));
    expect((await POST(req({ lessonSlug: 'aula', respostas: [0] }))).status).toBe(422);
  });

  it('404 quando a lição publicada não tem bloco quiz', async () => {
    lessonFindUnique.mockResolvedValue(publishedLesson({ contentPublished: [{ id: 'p', type: 'paragraph', props: {} }] }));
    expect((await POST(req({ lessonSlug: 'aula', respostas: [0] }))).status).toBe(404);
  });

  it('422 quando questoesJson está corrompido (QuizDataError → 422, não 500)', async () => {
    lessonFindUnique.mockResolvedValue(publishedLesson({ contentPublished: [{ id: 'q', type: 'quiz', props: { questoesJson: '{quebrado' } }] }));
    expect((await POST(req({ lessonSlug: 'aula', respostas: [0] }))).status).toBe(422);
  });

  it('429 quando excede o rate-limit (>=5 em 60s)', async () => {
    quizCount.mockResolvedValue(5);
    expect((await POST(req({ lessonSlug: 'aula', respostas: [0] }))).status).toBe(429);
    expect(quizCreate).not.toHaveBeenCalled();
  });

  it('200: aluno passa → grava tentativa E marca COMPLETED (auto-complete)', async () => {
    const res = await POST(req({ lessonSlug: 'aula', respostas: [0] })); // acerta → 100% >= 70
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ id: 'a1', score: 100, passed: true });
    expect(quizCreate).toHaveBeenCalled();
    expect(txUpdateMany).toHaveBeenCalled(); // upsertLessonProgress(COMPLETED) rodou na tx
    expect(grantBadgesMock).toHaveBeenCalledWith('u1'); // FASE-09: concessão após o commit
  });

  it('aluno reprova → grava tentativa mas NÃO marca COMPLETED', async () => {
    const res = await POST(req({ lessonSlug: 'aula', respostas: [1] })); // erra → 0%
    expect(res.status).toBe(200);
    expect((await res.json()).data.passed).toBe(false);
    expect(quizCreate).toHaveBeenCalled();
    expect(txUpdateMany).not.toHaveBeenCalled();
    expect(grantBadgesMock).not.toHaveBeenCalled(); // não passou → nada a conceder
  });

  it('ADMIN passa → grava tentativa mas NÃO marca progresso (admin não é aluno)', async () => {
    authMock.mockResolvedValue({ user: { id: 'adm', role: 'ADMIN' } });
    const res = await POST(req({ lessonSlug: 'aula', respostas: [0] }));
    expect(res.status).toBe(200);
    expect(quizCreate).toHaveBeenCalled();
    expect(txUpdateMany).not.toHaveBeenCalled();
    expect(grantBadgesMock).not.toHaveBeenCalled(); // admin não rastreia progresso/medalha
  });

  it('resposta NUNCA contém corretaIdx nem answers (gabarito não vaza)', async () => {
    const body = await (await POST(req({ lessonSlug: 'aula', respostas: [0] }))).text();
    expect(body).not.toContain('corretaIdx');
    expect(body).not.toContain('answers');
  });

  it('falha ao marcar progresso é awaited → 500 (não engole; não retorna 200 falso)', async () => {
    txUpdateMany.mockRejectedValue(new Error('db down'));
    txUpsert.mockRejectedValue(new Error('db down'));
    const res = await POST(req({ lessonSlug: 'aula', respostas: [0] }));
    expect(res.status).toBe(500);
  });
});

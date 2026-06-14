import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  authMock,
  lessonFindMany,
  lessonCreate,
  lessonFindUnique,
  lessonUpdate,
  lessonDelete,
  lessonAggregate,
  lessonUpdateMany,
  transactionMock,
  lessonProgressCount,
  userFindUnique,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  lessonFindMany: vi.fn(),
  lessonCreate: vi.fn(),
  lessonFindUnique: vi.fn(),
  lessonUpdate: vi.fn(),
  lessonDelete: vi.fn(),
  lessonAggregate: vi.fn(),
  lessonUpdateMany: vi.fn(),
  transactionMock: vi.fn(),
  lessonProgressCount: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lesson: {
      findMany: lessonFindMany,
      create: lessonCreate,
      findUnique: lessonFindUnique,
      update: lessonUpdate,
      delete: lessonDelete,
      aggregate: lessonAggregate,
      updateMany: lessonUpdateMany,
    },
    lessonProgress: { count: lessonProgressCount },
    user: { findUnique: userFindUnique },
    $transaction: transactionMock,
  },
}));

import { POST } from './route';
import { PATCH, DELETE } from './[id]/route';
import { POST as REORDER } from './reorder/route';
import { POST as PUBLISH } from './[id]/publish/route';

const ADMIN = { user: { id: 'a', role: 'ADMIN' } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function postReq(body: unknown, path = 'http://t/api/universinid/admin/lessons') {
  return new NextRequest(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}
function patchReq(body: unknown, path = 'http://t/api/universinid/admin/lessons/l1') {
  return new NextRequest(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('lessons route', () => {
  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue(ADMIN);
    userFindUnique.mockReset();
    userFindUnique.mockResolvedValue({ id: 'a' });
    lessonFindMany.mockReset();
    lessonCreate.mockReset();
    lessonFindUnique.mockReset();
    lessonUpdate.mockReset();
    lessonDelete.mockReset();
    lessonAggregate.mockReset();
    lessonUpdateMany.mockReset();
    transactionMock.mockReset();
    lessonProgressCount.mockReset();
    lessonProgressCount.mockResolvedValue(0);
  });

  it('POST 403 p/ não-admin', async () => {
    authMock.mockResolvedValue({ user: { id: 's', role: 'STUDENT' } });
    const res = await POST(postReq({ moduleId: 'm1', slug: 'aula-1', title: 'Aula 1' }));
    expect(res.status).toBe(403);
  });

  it('POST 401 quando a conta foi desativada (token ADMIN válido, isActive=false) — OWASP A07', async () => {
    userFindUnique.mockResolvedValue(null); // sessão ADMIN ok, mas a conta já foi desativada no banco
    const res = await POST(postReq({ moduleId: 'm1', slug: 'aula-x', title: 'Aula X' }));
    expect(res.status).toBe(401);
    expect(lessonCreate).not.toHaveBeenCalled();
  });

  it('POST 422 quando slug inválido', async () => {
    const res = await POST(postReq({ moduleId: 'm1', slug: 'Maiúsculo!', title: 'Aula 1' }));
    expect(res.status).toBe(422);
  });

  it('POST cria com position = max+1, status DRAFT, contentDraft/contentPublished = []', async () => {
    lessonAggregate.mockResolvedValue({ _max: { position: 1 } });
    lessonCreate.mockResolvedValue({ id: 'l2', position: 2 });
    const res = await POST(postReq({ moduleId: 'm1', slug: 'aula-2', title: 'Aula 2' }));
    expect(res.status).toBe(201);
    expect(lessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moduleId: 'm1',
          slug: 'aula-2',
          position: 2,
          status: 'DRAFT',
          contentDraft: [],
          contentPublished: [],
        }),
      }),
    );
  });

  it('PATCH salva metadados', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'l1' });
    lessonUpdate.mockResolvedValue({ id: 'l1', title: 'Novo título' });
    const res = await PATCH(patchReq({ title: 'Novo título', tempoMin: 10 }), ctx('l1'));
    expect(res.status).toBe(200);
    expect(lessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'l1' },
        data: expect.objectContaining({ title: 'Novo título', tempoMin: 10 }),
      }),
    );
  });

  it('PATCH salva contentDraft válido -> 200 e update chamado com contentDraft', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'l1' });
    lessonUpdate.mockResolvedValue({ id: 'l1' });
    const doc = [{ type: 'image', id: 'b1', props: { url: 'https://cdn.example.com/foto.png' } }];
    const res = await PATCH(patchReq({ contentDraft: doc }), ctx('l1'));
    expect(res.status).toBe(200);
    expect(lessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'l1' },
        data: expect.objectContaining({ contentDraft: doc }),
      }),
    );
  });

  it('PATCH com conteúdo INVÁLIDO (embed host não permitido) -> 422 e NENHUM update', async () => {
    const doc = [{ type: 'embed', id: 'b1', props: { url: 'https://notallowed.com/v/123' } }];
    const res = await PATCH(patchReq({ contentDraft: doc }), ctx('l1'));
    expect(res.status).toBe(422);
    expect(lessonUpdate).not.toHaveBeenCalled();
  });

  it('PATCH salva embed normalizado (YouTube /embed) -> 200', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'l1' });
    lessonUpdate.mockResolvedValue({ id: 'l1' });
    const doc = [{ type: 'embed', id: 'b1', props: { url: 'https://www.youtube.com/embed/abc', provider: 'youtube' } }];
    const res = await PATCH(patchReq({ contentDraft: doc }), ctx('l1'));
    expect(res.status).toBe(200);
    expect(lessonUpdate).toHaveBeenCalled();
  });

  it('PATCH 404 quando lição inexistente', async () => {
    lessonFindUnique.mockResolvedValue(null);
    const res = await PATCH(patchReq({ title: 'X' }), ctx('nope'));
    expect(res.status).toBe(404);
    expect(lessonUpdate).not.toHaveBeenCalled();
  });

  it('DELETE 404 quando inexistente; 200 quando existe', async () => {
    lessonFindUnique.mockResolvedValueOnce(null);
    const r404 = await DELETE(
      new NextRequest('http://t/api/universinid/admin/lessons/x', { method: 'DELETE' }),
      ctx('x'),
    );
    expect(r404.status).toBe(404);
    lessonFindUnique.mockResolvedValueOnce({ id: 'l1', slug: 'aula-1' });
    lessonDelete.mockResolvedValue({ id: 'l1' });
    const r200 = await DELETE(
      new NextRequest('http://t/api/universinid/admin/lessons/l1', { method: 'DELETE' }),
      ctx('l1'),
    );
    expect(r200.status).toBe(200);
    expect(lessonDelete).toHaveBeenCalledWith({ where: { id: 'l1' } });
  });

  it('DELETE 409 quando há progresso de alunos na lição', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'l1', slug: 'aula-1' });
    lessonProgressCount.mockResolvedValue(2);
    const res = await DELETE(
      new NextRequest('http://t/api/universinid/admin/lessons/l1', { method: 'DELETE' }),
      ctx('l1'),
    );
    expect(res.status).toBe(409);
    expect(lessonDelete).not.toHaveBeenCalled();
  });

  it('PUBLISH copia contentDraft -> contentPublished + status PUBLISHED', async () => {
    const draft = [{ type: 'paragraph', id: 'b1', props: {}, content: [] }];
    lessonFindUnique.mockResolvedValue({ id: 'l1', contentDraft: draft });
    lessonUpdate.mockResolvedValue({ id: 'l1', status: 'PUBLISHED' });
    const res = await PUBLISH(
      new NextRequest('http://t/api/universinid/admin/lessons/l1/publish', { method: 'POST' }),
      ctx('l1'),
    );
    expect(res.status).toBe(200);
    expect(lessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'l1' },
        data: expect.objectContaining({ status: 'PUBLISHED', contentPublished: draft }),
      }),
    );
  });

  it('PUBLISH 404 quando inexistente', async () => {
    lessonFindUnique.mockResolvedValue(null);
    const res = await PUBLISH(
      new NextRequest('http://t/api/universinid/admin/lessons/x/publish', { method: 'POST' }),
      ctx('x'),
    );
    expect(res.status).toBe(404);
    expect(lessonUpdate).not.toHaveBeenCalled();
  });

  it('reorder 401 sem sessão', async () => {
    authMock.mockResolvedValue(null);
    const res = await REORDER(
      postReq({ parentId: 'm1', items: [{ id: 'l1', position: 0 }] }, 'http://t/api/universinid/admin/lessons/reorder'),
    );
    expect(res.status).toBe(401);
  });

  it('reorder 400 sem parentId', async () => {
    const res = await REORDER(
      postReq({ items: [{ id: 'l1', position: 0 }] }, 'http://t/api/universinid/admin/lessons/reorder'),
    );
    expect(res.status).toBe(400);
  });

  it('reorder parent-scoped (where contém moduleId)', async () => {
    transactionMock.mockResolvedValue([]);
    lessonUpdateMany.mockReturnValue({});
    const res = await REORDER(
      postReq(
        { parentId: 'm1', items: [{ id: 'l1', position: 0 }, { id: 'l2', position: 1 }] },
        'http://t/api/universinid/admin/lessons/reorder',
      ),
    );
    expect(res.status).toBe(200);
    expect(lessonUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'l1', moduleId: 'm1' }) }),
    );
    expect(lessonUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'l2', moduleId: 'm1' }) }),
    );
  });
});

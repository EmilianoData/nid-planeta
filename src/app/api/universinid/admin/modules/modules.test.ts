import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
const {
  authMock,
  moduleFindMany,
  moduleCreate,
  moduleAggregate,
  moduleUpdateMany,
  moduleFindUnique,
  moduleUpdate,
  moduleDelete,
  lessonFindMany,
  lessonProgressCount,
  transactionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  moduleFindMany: vi.fn(),
  moduleCreate: vi.fn(),
  moduleAggregate: vi.fn(),
  moduleUpdateMany: vi.fn(),
  moduleFindUnique: vi.fn(),
  moduleUpdate: vi.fn(),
  moduleDelete: vi.fn(),
  lessonFindMany: vi.fn(),
  lessonProgressCount: vi.fn(),
  transactionMock: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    module: { findMany: moduleFindMany, create: moduleCreate, aggregate: moduleAggregate, updateMany: moduleUpdateMany, findUnique: moduleFindUnique, update: moduleUpdate, delete: moduleDelete },
    lesson: { findMany: lessonFindMany },
    lessonProgress: { count: lessonProgressCount },
    $transaction: transactionMock,
  },
}));
import { GET, POST } from './route';
import { PATCH, DELETE } from './[id]/route';
import { POST as REORDER } from './reorder/route';
const ADMIN = { user: { id: 'a', role: 'ADMIN' } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function getReq(courseId?: string) {
  const url = courseId
    ? `http://t/api/universinid/admin/modules?courseId=${courseId}`
    : 'http://t/api/universinid/admin/modules';
  return new NextRequest(url, { method: 'GET' });
}
function postReq(body: unknown, path = 'http://t/api/universinid/admin/modules') {
  return new NextRequest(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}
describe('modules route', () => {
  beforeEach(() => {
    authMock.mockReset(); authMock.mockResolvedValue(ADMIN);
    moduleFindMany.mockReset(); moduleCreate.mockReset(); moduleAggregate.mockReset();
    moduleUpdateMany.mockReset(); transactionMock.mockReset();
    moduleFindUnique.mockReset(); moduleUpdate.mockReset(); moduleDelete.mockReset();
    lessonFindMany.mockReset(); lessonFindMany.mockResolvedValue([]);
    lessonProgressCount.mockReset(); lessonProgressCount.mockResolvedValue(0);
  });
  it('GET 200 lista módulos do curso', async () => {
    moduleFindMany.mockResolvedValue([{ id: 'm1', position: 0 }]);
    const res = await GET(getReq('c1'));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
    expect(moduleFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { courseId: 'c1' } }));
  });
  it('GET 400 sem courseId', async () => { expect((await GET(getReq())).status).toBe(400); });
  it('GET 401 sem sessão', async () => { authMock.mockResolvedValue(null); expect((await GET(getReq('c1'))).status).toBe(401); });
  it('POST 403 p/ não-admin', async () => {
    authMock.mockResolvedValue({ user: { id: 's', role: 'STUDENT' } });
    expect((await POST(postReq({ courseId: 'c1', title: 'X', emoji: '📘' }))).status).toBe(403);
  });
  it('POST cria com position = max+1 e status DRAFT', async () => {
    moduleAggregate.mockResolvedValue({ _max: { position: 2 } });
    moduleCreate.mockResolvedValue({ id: 'm2', position: 3 });
    const res = await POST(postReq({ courseId: 'c1', title: 'Novo', emoji: '🚀' }));
    expect(res.status).toBe(201);
    expect(moduleCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ courseId: 'c1', position: 3, status: 'DRAFT' }) }));
  });
  it('POST 422 quando courseId ausente', async () => {
    expect((await POST(postReq({ title: 'X', emoji: '📘' }))).status).toBe(422);
  });
  it('reorder 401 sem sessão', async () => {
    authMock.mockResolvedValue(null);
    expect((await REORDER(postReq({ parentId: 'c1', items: [{ id: 'm1', position: 0 }] }, 'http://t/api/universinid/admin/modules/reorder'))).status).toBe(401);
  });
  it('reorder 400 sem parentId', async () => {
    expect((await REORDER(postReq({ items: [{ id: 'm1', position: 0 }] }, 'http://t/api/universinid/admin/modules/reorder'))).status).toBe(400);
  });
  it('reorder scoping por parentId (where contém courseId)', async () => {
    transactionMock.mockResolvedValue([]);
    moduleUpdateMany.mockReturnValue({});
    const res = await REORDER(postReq({ parentId: 'c1', items: [{ id: 'm1', position: 0 }, { id: 'm2', position: 1 }] }, 'http://t/api/universinid/admin/modules/reorder'));
    expect(res.status).toBe(200);
    expect(moduleUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'm1', courseId: 'c1' }) }));
    expect(moduleUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'm2', courseId: 'c1' }) }));
  });

  it('DELETE 404 quando módulo inexistente', async () => {
    moduleFindUnique.mockResolvedValue(null);
    const res = await DELETE(
      new NextRequest('http://t/api/universinid/admin/modules/x', { method: 'DELETE' }),
      ctx('x'),
    );
    expect(res.status).toBe(404);
    expect(moduleDelete).not.toHaveBeenCalled();
  });

  it('DELETE 200 quando módulo existe e sem progresso', async () => {
    moduleFindUnique.mockResolvedValue({ id: 'm1' });
    moduleDelete.mockResolvedValue({ id: 'm1' });
    const res = await DELETE(
      new NextRequest('http://t/api/universinid/admin/modules/m1', { method: 'DELETE' }),
      ctx('m1'),
    );
    expect(res.status).toBe(200);
    expect(moduleDelete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('DELETE 409 quando há progresso de alunos no módulo', async () => {
    moduleFindUnique.mockResolvedValue({ id: 'm1' });
    lessonFindMany.mockResolvedValue([{ slug: 'aula-1' }, { slug: 'aula-2' }]);
    lessonProgressCount.mockResolvedValue(1);
    const res = await DELETE(
      new NextRequest('http://t/api/universinid/admin/modules/m1', { method: 'DELETE' }),
      ctx('m1'),
    );
    expect(res.status).toBe(409);
    expect(moduleDelete).not.toHaveBeenCalled();
  });
});

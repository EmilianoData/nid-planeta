import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
const {
  authMock,
  courseFindMany,
  courseCreate,
  courseAggregate,
  courseFindUnique,
  courseUpdate,
  courseDelete,
  lessonFindMany,
  lessonProgressCount,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  courseFindMany: vi.fn(),
  courseCreate: vi.fn(),
  courseAggregate: vi.fn(),
  courseFindUnique: vi.fn(),
  courseUpdate: vi.fn(),
  courseDelete: vi.fn(),
  lessonFindMany: vi.fn(),
  lessonProgressCount: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findMany: courseFindMany, create: courseCreate, aggregate: courseAggregate, findUnique: courseFindUnique, update: courseUpdate, delete: courseDelete },
    lesson: { findMany: lessonFindMany },
    lessonProgress: { count: lessonProgressCount },
  },
}));
import { GET, POST } from './route';
import { PATCH, DELETE } from './[id]/route';
const ADMIN = { user: { id: 'a', role: 'ADMIN' } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function req(body?: unknown) {
  return new NextRequest('http://t/api/universinid/admin/courses', {
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });
}
describe('courses route', () => {
  beforeEach(() => {
    authMock.mockReset(); authMock.mockResolvedValue(ADMIN);
    courseFindMany.mockReset(); courseCreate.mockReset(); courseAggregate.mockReset();
    courseFindUnique.mockReset(); courseUpdate.mockReset(); courseDelete.mockReset();
    lessonFindMany.mockReset(); lessonFindMany.mockResolvedValue([]);
    lessonProgressCount.mockReset(); lessonProgressCount.mockResolvedValue(0);
  });
  it('GET 200 lista cursos ordenados', async () => { courseFindMany.mockResolvedValue([{ id: 'c1', position: 0 }]); const res = await GET(); expect(res.status).toBe(200); expect((await res.json()).data).toHaveLength(1); });
  it('GET 401 sem sessão', async () => { authMock.mockResolvedValue(null); expect((await GET()).status).toBe(401); });
  it('POST 403 p/ não-admin', async () => { authMock.mockResolvedValue({ user: { id: 's', role: 'STUDENT' } }); expect((await POST(req({ title: 'X', slug: 'x' }))).status).toBe(403); });
  it('POST cria com position = max+1 e status DRAFT', async () => { courseAggregate.mockResolvedValue({ _max: { position: 4 } }); courseCreate.mockResolvedValue({ id: 'c2', position: 5 }); const res = await POST(req({ title: 'Novo', slug: 'novo' })); expect(res.status).toBe(201); expect(courseCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ position: 5, status: 'DRAFT' }) })); });
  it('POST 422 quando slug inválido', async () => { expect((await POST(req({ title: 'X', slug: 'Maiúsculo!' }))).status).toBe(422); });

  it('DELETE 404 quando curso inexistente', async () => {
    courseFindUnique.mockResolvedValue(null);
    const res = await DELETE(
      new NextRequest('http://t/api/universinid/admin/courses/x', { method: 'DELETE' }),
      ctx('x'),
    );
    expect(res.status).toBe(404);
    expect(courseDelete).not.toHaveBeenCalled();
  });

  it('DELETE 200 quando curso existe e sem progresso', async () => {
    courseFindUnique.mockResolvedValue({ id: 'c1' });
    courseDelete.mockResolvedValue({ id: 'c1' });
    const res = await DELETE(
      new NextRequest('http://t/api/universinid/admin/courses/c1', { method: 'DELETE' }),
      ctx('c1'),
    );
    expect(res.status).toBe(200);
    expect(courseDelete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('DELETE 409 quando há progresso de alunos no curso', async () => {
    courseFindUnique.mockResolvedValue({ id: 'c1' });
    lessonFindMany.mockResolvedValue([{ slug: 'modulo-1-aula-1' }]);
    lessonProgressCount.mockResolvedValue(5);
    const res = await DELETE(
      new NextRequest('http://t/api/universinid/admin/courses/c1', { method: 'DELETE' }),
      ctx('c1'),
    );
    expect(res.status).toBe(409);
    expect(courseDelete).not.toHaveBeenCalled();
  });
});

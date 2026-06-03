import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
const { authMock, courseFindMany, courseCreate, courseAggregate } = vi.hoisted(() => ({
  authMock: vi.fn(), courseFindMany: vi.fn(), courseCreate: vi.fn(), courseAggregate: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({ prisma: { course: { findMany: courseFindMany, create: courseCreate, aggregate: courseAggregate } } }));
import { GET, POST } from './route';
const ADMIN = { user: { id: 'a', role: 'ADMIN' } };
function req(body?: unknown) {
  return new NextRequest('http://t/api/universinid/admin/courses', {
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });
}
describe('courses route', () => {
  beforeEach(() => { authMock.mockReset(); authMock.mockResolvedValue(ADMIN); courseFindMany.mockReset(); courseCreate.mockReset(); courseAggregate.mockReset(); });
  it('GET 200 lista cursos ordenados', async () => { courseFindMany.mockResolvedValue([{ id: 'c1', position: 0 }]); const res = await GET(); expect(res.status).toBe(200); expect((await res.json()).data).toHaveLength(1); });
  it('GET 401 sem sessão', async () => { authMock.mockResolvedValue(null); expect((await GET()).status).toBe(401); });
  it('POST 403 p/ não-admin', async () => { authMock.mockResolvedValue({ user: { id: 's', role: 'STUDENT' } }); expect((await POST(req({ title: 'X', slug: 'x' }))).status).toBe(403); });
  it('POST cria com position = max+1 e status DRAFT', async () => { courseAggregate.mockResolvedValue({ _max: { position: 4 } }); courseCreate.mockResolvedValue({ id: 'c2', position: 5 }); const res = await POST(req({ title: 'Novo', slug: 'novo' })); expect(res.status).toBe(201); expect(courseCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ position: 5, status: 'DRAFT' }) })); });
  it('POST 422 quando slug inválido', async () => { expect((await POST(req({ title: 'X', slug: 'Maiúsculo!' }))).status).toBe(422); });
});

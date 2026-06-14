import { describe, it, expect, vi, beforeEach } from 'vitest';
const { authMock, userFindUnique } = vi.hoisted(() => ({ authMock: vi.fn(), userFindUnique: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: userFindUnique } } }));
import { withAuth, apiError, apiResponse } from './api-utils';

describe('withAuth', () => {
  beforeEach(() => {
    authMock.mockReset();
    userFindUnique.mockReset();
    userFindUnique.mockResolvedValue({ id: 'u' }); // padrão: conta existe E está ativa
  });
  it('401 sem sessão', async () => { authMock.mockResolvedValue(null); const { error } = await withAuth(['ADMIN']); expect(error?.status).toBe(401); });
  it('403 quando role não permitido', async () => { authMock.mockResolvedValue({ user: { id: 'u', role: 'STUDENT' } }); const { error } = await withAuth(['ADMIN']); expect(error?.status).toBe(403); });
  it('passa quando ADMIN ativo', async () => { authMock.mockResolvedValue({ user: { id: 'u', role: 'ADMIN' } }); const { error, session } = await withAuth(['ADMIN']); expect(error).toBeNull(); expect(session?.user.role).toBe('ADMIN'); });
  it('401 quando a conta foi desativada (token válido, isActive=false) — OWASP A07', async () => { authMock.mockResolvedValue({ user: { id: 'u', role: 'ADMIN' } }); userFindUnique.mockResolvedValue(null); const { error, session } = await withAuth(['ADMIN']); expect(error?.status).toBe(401); expect(session).toBeNull(); });
  it('re-checa isActive no banco escopado ao id da própria sessão', async () => { authMock.mockResolvedValue({ user: { id: 'u-42', role: 'ADMIN' } }); await withAuth(['ADMIN']); expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u-42', isActive: true } })); });
});
describe('helpers', () => {
  it('apiResponse embrulha em {success,data}', async () => { const res = apiResponse({ a: 1 }, 201); expect(res.status).toBe(201); expect(await res.json()).toEqual({ success: true, data: { a: 1 } }); });
  it('apiError embrulha em {success:false,error}', async () => { const res = apiError('x', 404); expect(res.status).toBe(404); expect(await res.json()).toEqual({ success: false, error: 'x' }); });
});

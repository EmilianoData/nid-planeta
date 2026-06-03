import { describe, it, expect, vi, beforeEach } from 'vitest';
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: authMock }));
import { withAuth, apiError, apiResponse } from './api-utils';

describe('withAuth', () => {
  beforeEach(() => authMock.mockReset());
  it('401 sem sessão', async () => { authMock.mockResolvedValue(null); const { error } = await withAuth(['ADMIN']); expect(error?.status).toBe(401); });
  it('403 quando role não permitido', async () => { authMock.mockResolvedValue({ user: { id: 'u', role: 'STUDENT' } }); const { error } = await withAuth(['ADMIN']); expect(error?.status).toBe(403); });
  it('passa quando ADMIN', async () => { authMock.mockResolvedValue({ user: { id: 'u', role: 'ADMIN' } }); const { error, session } = await withAuth(['ADMIN']); expect(error).toBeNull(); expect(session?.user.role).toBe('ADMIN'); });
});
describe('helpers', () => {
  it('apiResponse embrulha em {success,data}', async () => { const res = apiResponse({ a: 1 }, 201); expect(res.status).toBe(201); expect(await res.json()).toEqual({ success: true, data: { a: 1 } }); });
  it('apiError embrulha em {success:false,error}', async () => { const res = apiError('x', 404); expect(res.status).toBe(404); expect(await res.json()).toEqual({ success: false, error: 'x' }); });
});

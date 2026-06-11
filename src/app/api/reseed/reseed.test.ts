import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authMock, execMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  execMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('node:child_process', () => ({ exec: execMock }));

import { POST } from './route';

describe('reseed route — exige ADMIN (C1)', () => {
  beforeEach(() => {
    authMock.mockReset();
    execMock.mockReset();
    // exec estilo callback (promisify embrulha): sucesso sem rodar o seed de verdade
    execMock.mockImplementation(
      (_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) =>
        cb(null, 'seed ok', ''),
    );
  });

  it('401 sem sessão; seed NÃO executa', async () => {
    authMock.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(execMock).not.toHaveBeenCalled();
  });

  it('403 p/ role STUDENT; seed NÃO executa', async () => {
    authMock.mockResolvedValue({ user: { id: 's', role: 'STUDENT' } });
    const res = await POST();
    expect(res.status).toBe(403);
    expect(execMock).not.toHaveBeenCalled();
  });

  it('com ADMIN a rota prossegue e dispara o seed', async () => {
    authMock.mockResolvedValue({ user: { id: 'a', role: 'ADMIN' } });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(execMock).toHaveBeenCalledTimes(1);
  });
});

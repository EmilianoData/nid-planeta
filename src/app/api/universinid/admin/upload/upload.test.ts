import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, putMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@vercel/blob', () => ({ put: putMock }));

import { POST } from './route';

const ADMIN = { user: { id: 'a', role: 'ADMIN' } };

function uploadReq(opts: {
  filename?: string;
  contentType?: string;
  contentLength?: number;
  body?: BodyInit | null;
}) {
  const url = opts.filename
    ? `http://t/api/universinid/admin/upload?filename=${opts.filename}`
    : 'http://t/api/universinid/admin/upload';
  const headers: Record<string, string> = {};
  if (opts.contentType) headers['content-type'] = opts.contentType;
  if (opts.contentLength !== undefined) headers['content-length'] = String(opts.contentLength);
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: opts.body === undefined ? 'fakebytes' : opts.body,
  });
}

describe('upload route', () => {
  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue(ADMIN);
    putMock.mockReset();
    putMock.mockResolvedValue({ url: 'https://blob/x.png' });
  });

  it('403 p/ não-admin', async () => {
    authMock.mockResolvedValue({ user: { id: 's', role: 'STUDENT' } });
    const res = await POST(uploadReq({ filename: 'x.png', contentType: 'image/png', contentLength: 10 }));
    expect(res.status).toBe(403);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('400 quando content-type não é imagem', async () => {
    const res = await POST(uploadReq({ filename: 'x.txt', contentType: 'text/plain', contentLength: 10 }));
    expect(res.status).toBe(400);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('413 quando content-length > 4.5MB', async () => {
    const res = await POST(
      uploadReq({ filename: 'big.png', contentType: 'image/png', contentLength: 5 * 1024 * 1024 }),
    );
    expect(res.status).toBe(413);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('200 retorna { url } p/ imagem pequena válida', async () => {
    const res = await POST(
      uploadReq({ filename: 'foto.png', contentType: 'image/png', contentLength: 1024 }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.url).toBe('https://blob/x.png');
    expect(putMock).toHaveBeenCalled();
  });
});

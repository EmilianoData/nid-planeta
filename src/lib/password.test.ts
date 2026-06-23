import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('hash não é igual ao texto puro e verifica corretamente', async () => {
    const hash = await hashPassword('segredo123');
    expect(hash).not.toBe('segredo123');
    expect(hash.startsWith('$2')).toBe(true);
    expect(await verifyPassword('segredo123', hash)).toBe(true);
    expect(await verifyPassword('errado', hash)).toBe(false);
  });
});

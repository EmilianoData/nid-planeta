import { describe, it, expect } from 'vitest';
import { createCourseSchema } from './validators';

describe('createCourseSchema', () => {
  it('rejeita slug com maiúsculas/símbolos', () => {
    expect(createCourseSchema.safeParse({ title: 'x', slug: 'Maiúsculo!' }).success).toBe(false);
  });
  it('aceita título e slug válidos', () => {
    expect(createCourseSchema.safeParse({ title: 'x', slug: 'meu-curso-1' }).success).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
const { lessonFindUnique, aliasFindUnique } = vi.hoisted(() => ({ lessonFindUnique: vi.fn(), aliasFindUnique: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  lesson: { findUnique: lessonFindUnique },
  lessonSlugAlias: { findUnique: aliasFindUnique },
} }));
import { resolveLessonBySlug } from './content-queries';

describe('resolveLessonBySlug', () => {
  beforeEach(() => { lessonFindUnique.mockReset(); aliasFindUnique.mockReset(); });
  it('retorna a lição quando o slug é direto', async () => {
    lessonFindUnique.mockResolvedValue({ id: 'L1', slug: 'llm-o-que-e' });
    const res = await resolveLessonBySlug('llm-o-que-e');
    expect(res?.id).toBe('L1');
    expect(aliasFindUnique).not.toHaveBeenCalled();
  });
  it('cai no alias quando o slug não existe direto', async () => {
    lessonFindUnique.mockResolvedValueOnce(null);
    aliasFindUnique.mockResolvedValue({ oldSlug: 'antigo', lessonId: 'L9', lesson: { id: 'L9', slug: 'novo' } });
    const res = await resolveLessonBySlug('antigo');
    expect(res?.id).toBe('L9');
  });
  it('retorna null quando não há lição nem alias', async () => {
    lessonFindUnique.mockResolvedValue(null);
    aliasFindUnique.mockResolvedValue(null);
    expect(await resolveLessonBySlug('inexistente')).toBeNull();
  });
});

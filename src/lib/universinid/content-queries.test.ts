import { describe, it, expect, vi, beforeEach } from 'vitest';
const { lessonFindUnique, aliasFindUnique, lessonProgressCount } = vi.hoisted(() => ({
  lessonFindUnique: vi.fn(),
  aliasFindUnique: vi.fn(),
  lessonProgressCount: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: {
  lesson: { findUnique: lessonFindUnique },
  lessonSlugAlias: { findUnique: aliasFindUnique },
  lessonProgress: { count: lessonProgressCount },
} }));
import { resolveLessonBySlug, hasStudentProgress } from './content-queries';

describe('hasStudentProgress', () => {
  beforeEach(() => { lessonProgressCount.mockReset(); });

  it('retorna false para array vazio sem chamar prisma', async () => {
    const result = await hasStudentProgress([]);
    expect(result).toBe(false);
    expect(lessonProgressCount).not.toHaveBeenCalled();
  });

  it('retorna false quando count = 0', async () => {
    lessonProgressCount.mockResolvedValue(0);
    const result = await hasStudentProgress(['aula-1', 'aula-2']);
    expect(result).toBe(false);
  });

  it('retorna true quando count > 0', async () => {
    lessonProgressCount.mockResolvedValue(3);
    const result = await hasStudentProgress(['aula-1']);
    expect(result).toBe(true);
  });

  it('filtra status com { not: NOT_STARTED }', async () => {
    lessonProgressCount.mockResolvedValue(1);
    await hasStudentProgress(['aula-x']);
    expect(lessonProgressCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: 'NOT_STARTED' },
        }),
      }),
    );
  });
});

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

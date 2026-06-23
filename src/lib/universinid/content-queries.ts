import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export async function hasStudentProgress(lessonSlugs: string[]): Promise<boolean> {
  if (lessonSlugs.length === 0) return false;
  const n = await prisma.lessonProgress.count({
    where: { lessonSlug: { in: lessonSlugs }, status: { not: 'NOT_STARTED' } },
  });
  return n > 0;
}

export async function resolveLessonBySlug(slug: string) {
  const direct = await prisma.lesson.findUnique({ where: { slug } });
  if (direct) return direct;
  const alias = await prisma.lessonSlugAlias.findUnique({ where: { oldSlug: slug }, include: { lesson: true } });
  return alias?.lesson ?? null;
}

// cache() dedup das múltiplas chamadas no mesmo render (layout + page + getDashboardData),
// como buscarLinhasProgresso em actions.ts. Não muda a interface nem o select (risco #4 intacto).
export const getPublishedTree = cache(async () => {
  return prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { position: 'asc' },
    select: {
      id: true, slug: true, title: true, subtitle: true,
      modules: {
        where: { status: 'PUBLISHED' }, orderBy: { position: 'asc' },
        select: {
          id: true, title: true, emoji: true,
          lessons: {
            where: { status: 'PUBLISHED' }, orderBy: { position: 'asc' },
            select: { id: true, slug: true, title: true, tempoMin: true, dificuldade: true },
          },
        },
      },
    },
  });
});

// Tipo da árvore publicada (derivado do select — propositalmente SEM content*).
export type PublishedTree = Awaited<ReturnType<typeof getPublishedTree>>;
export type PublishedCourse = PublishedTree[number];

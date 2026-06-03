import { prisma } from '@/lib/prisma';

export async function resolveLessonBySlug(slug: string) {
  const direct = await prisma.lesson.findUnique({ where: { slug } });
  if (direct) return direct;
  const alias = await prisma.lessonSlugAlias.findUnique({ where: { oldSlug: slug }, include: { lesson: true } });
  return alias?.lesson ?? null;
}

export async function getPublishedTree() {
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
}

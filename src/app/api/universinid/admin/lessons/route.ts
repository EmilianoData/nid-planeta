import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, parseBody } from '@/lib/api-utils';
import { createLessonSchema } from '@/lib/universinid/validators';

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const parsed = await parseBody(request, createLessonSchema);
  if (parsed instanceof Response) return parsed;
  const max = await prisma.lesson.aggregate({ where: { moduleId: parsed.moduleId }, _max: { position: true } });
  const lesson = await prisma.lesson.create({
    data: {
      moduleId: parsed.moduleId,
      slug: parsed.slug,
      title: parsed.title,
      tempoMin: parsed.tempoMin,
      dificuldade: parsed.dificuldade,
      position: (max._max.position ?? -1) + 1,
      status: 'DRAFT',
      contentDraft: [],
      contentPublished: [],
    },
  });
  return apiResponse(lesson, 201);
}

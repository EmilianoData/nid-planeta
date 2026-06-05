import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) return apiError('Lição não encontrada', 404);
  const updated = await prisma.lesson.update({
    where: { id },
    data: { status: 'PUBLISHED', contentPublished: lesson.contentDraft ?? [] },
  });
  return apiResponse(updated);
}

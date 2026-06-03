import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError, parseBody } from '@/lib/api-utils';
import { updateCourseSchema } from '@/lib/universinid/validators';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await parseBody(request, updateCourseSchema);
  if (parsed instanceof Response) return parsed;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return apiError('Curso não encontrado', 404);
  const updated = await prisma.course.update({ where: { id }, data: parsed });
  return apiResponse(updated);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return apiError('Curso não encontrado', 404);
  await prisma.course.delete({ where: { id } });
  return apiResponse({ deleted: true });
}

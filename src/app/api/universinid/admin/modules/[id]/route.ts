import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError, parseBody } from '@/lib/api-utils';
import { updateModuleSchema } from '@/lib/universinid/validators';
import { hasStudentProgress } from '@/lib/universinid/content-queries';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await parseBody(request, updateModuleSchema);
  if (parsed instanceof Response) return parsed;
  const existing = await prisma.module.findUnique({ where: { id } });
  if (!existing) return apiError('Módulo não encontrado', 404);
  const updated = await prisma.module.update({ where: { id }, data: parsed });
  return apiResponse(updated);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const existing = await prisma.module.findUnique({ where: { id } });
  if (!existing) return apiError('Módulo não encontrado', 404);
  const lessons = await prisma.lesson.findMany({ where: { moduleId: id }, select: { slug: true } });
  const slugs = lessons.map((l) => l.slug);
  if (await hasStudentProgress(slugs)) {
    return apiError('Há progresso de alunos neste módulo — despublique em vez de excluir.', 409);
  }
  await prisma.module.delete({ where: { id } });
  return apiResponse({ deleted: true });
}

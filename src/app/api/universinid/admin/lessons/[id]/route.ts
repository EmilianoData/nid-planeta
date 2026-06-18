import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError, parseBody } from '@/lib/api-utils';
import { updateLessonSchema } from '@/lib/universinid/validators';
import { validateContentDoc } from '@/lib/universinid/sanitize-content';
import { hasStudentProgress } from '@/lib/universinid/content-queries';
import type { Prisma } from '@/generated/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await parseBody(request, updateLessonSchema);
  if (parsed instanceof Response) return parsed;
  if (parsed.contentDraft !== undefined) {
    const check = validateContentDoc(parsed.contentDraft);
    if (!check.ok) return apiError(check.error ?? 'conteúdo inválido', 422);
  }
  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) return apiError('Lição não encontrada', 404);
  const { contentDraft, ...rest } = parsed;
  const data: Prisma.LessonUpdateInput = {
    ...rest,
    ...(contentDraft !== undefined ? { contentDraft: contentDraft as PrismaJson.BlockDoc } : {}),
  };
  // select de summary: NÃO retorna contentDraft/contentPublished (gabarito do quiz) no wire —
  // o hook trata a resposta como LessonSummary e só invalida a árvore (não lê o conteúdo).
  const updated = await prisma.lesson.update({
    where: { id }, data,
    select: { id: true, slug: true, title: true, status: true, position: true, tempoMin: true, dificuldade: true, updatedAt: true },
  });
  return apiResponse(updated);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) return apiError('Lição não encontrada', 404);
  if (await hasStudentProgress([existing.slug])) {
    return apiError('Há progresso de alunos nesta lição — despublique em vez de excluir.', 409);
  }
  await prisma.lesson.delete({ where: { id } });
  return apiResponse({ deleted: true });
}

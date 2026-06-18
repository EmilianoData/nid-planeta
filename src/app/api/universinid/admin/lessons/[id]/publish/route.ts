import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError } from '@/lib/api-utils';
import { validateContentDoc } from '@/lib/universinid/sanitize-content';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, ctx: Ctx) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const { id } = await ctx.params;
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) return apiError('Lição não encontrada', 404);
  // Gate forte de publicação (FASE-08): o autosave é leniente, mas publicar exige conteúdo
  // completo — ex.: quiz com ≥1 questão, ≥2 alternativas e alternativa correta marcada.
  // Sem isso, um quiz incompleto chegaria ao aluno em contentPublished.
  const check = validateContentDoc(lesson.contentDraft ?? [], 'publish');
  if (!check.ok) return apiError(check.error ?? 'Conteúdo inválido para publicação', 422);
  const updated = await prisma.lesson.update({
    where: { id },
    data: { status: 'PUBLISHED', contentPublished: lesson.contentDraft ?? [] },
  });
  return apiResponse(updated);
}

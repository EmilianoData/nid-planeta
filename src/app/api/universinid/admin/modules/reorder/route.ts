import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError, parseBody } from '@/lib/api-utils';
import { reorderSchema } from '@/lib/universinid/validators';

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const parsed = await parseBody(request, reorderSchema);
  if (parsed instanceof Response) return parsed;
  if (!parsed.parentId) return apiError('parentId (courseId) é obrigatório', 400);
  const parentId = parsed.parentId;
  const updated = await prisma.$transaction(
    parsed.items.map((it) => prisma.module.updateMany({ where: { id: it.id, courseId: parentId }, data: { position: it.position } })),
  );
  return apiResponse(updated);
}

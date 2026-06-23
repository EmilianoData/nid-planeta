import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, parseBody } from '@/lib/api-utils';
import { reorderSchema } from '@/lib/universinid/validators';

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const parsed = await parseBody(request, reorderSchema);
  if (parsed instanceof Response) return parsed;
  const updated = await prisma.$transaction(
    parsed.items.map((it) => prisma.course.update({ where: { id: it.id }, data: { position: it.position } })),
  );
  return apiResponse(updated);
}

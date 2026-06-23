import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError, parseBody } from '@/lib/api-utils';
import { createModuleSchema } from '@/lib/universinid/validators';

export async function GET(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!courseId) return apiError('courseId é obrigatório', 400);
  const modules = await prisma.module.findMany({
    where: { courseId }, orderBy: { position: 'asc' },
    include: { lessons: { orderBy: { position: 'asc' }, select: { id: true, slug: true, title: true, status: true, position: true } } },
  });
  return apiResponse(modules);
}

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const parsed = await parseBody(request, createModuleSchema);
  if (parsed instanceof Response) return parsed;
  const max = await prisma.module.aggregate({ where: { courseId: parsed.courseId }, _max: { position: true } });
  const mod = await prisma.module.create({ data: { courseId: parsed.courseId, title: parsed.title, emoji: parsed.emoji, position: (max._max.position ?? -1) + 1, status: 'DRAFT' } });
  return apiResponse(mod, 201);
}

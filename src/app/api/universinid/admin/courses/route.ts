import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, parseBody } from '@/lib/api-utils';
import { createCourseSchema } from '@/lib/universinid/validators';

export async function GET() {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const courses = await prisma.course.findMany({
    orderBy: { position: 'asc' },
    include: { modules: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' }, select: { id: true, slug: true, title: true, status: true, position: true } } } } },
  });
  return apiResponse(courses);
}

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const parsed = await parseBody(request, createCourseSchema);
  if (parsed instanceof Response) return parsed;
  const max = await prisma.course.aggregate({ _max: { position: true } });
  const course = await prisma.course.create({
    data: { title: parsed.title, slug: parsed.slug, subtitle: parsed.subtitle ?? null, position: (max._max.position ?? -1) + 1, status: 'DRAFT' },
  });
  return apiResponse(course, 201);
}

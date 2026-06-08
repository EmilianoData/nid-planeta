import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LessonEditorPanel } from '@/components/universinid/admin/LessonEditorPanel';
import type { UniBlockDoc } from '@/lib/universinid/content-types';

// Rota de AUTORIA admin de uma lição. Server Component: valida ADMIN, busca a lição
// (com o contentDraft) e entrega ao Panel cliente, que carrega o editor via dynamic ssr:false.
export default async function AdminLicaoEditarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/universinid');

  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, contentDraft: true },
  });
  if (!lesson) notFound();

  return (
    <LessonEditorPanel
      lessonId={lesson.id}
      title={lesson.title}
      status={lesson.status as 'DRAFT' | 'PUBLISHED'}
      initialContent={(lesson.contentDraft ?? null) as UniBlockDoc | null}
    />
  );
}

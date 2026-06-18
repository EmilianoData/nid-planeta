import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getQuizResults } from '@/lib/universinid/quiz-results';
import { QuizResults } from './QuizResults';

export default async function QuizResultsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/universinid');
  // OWASP A07: re-checa isActive no banco (o JWT de 8h não carrega isActive) — desativar a conta
  // revoga o acesso imediatamente, como withAuth/exigirSessao fazem nos demais pontos admin.
  const ativo = await prisma.user.findUnique({ where: { id: session.user.id, isActive: true }, select: { id: true } });
  if (!ativo) redirect('/universinid');
  const resultados = await getQuizResults();
  return <QuizResults resultados={resultados} />;
}

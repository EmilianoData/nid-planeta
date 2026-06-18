import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getQuizResults } from '@/lib/universinid/quiz-results';
import { QuizResults } from './QuizResults';

export default async function QuizResultsPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/universinid');
  const resultados = await getQuizResults();
  return <QuizResults resultados={resultados} />;
}

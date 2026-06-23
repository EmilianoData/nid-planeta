import { withAuth, apiResponse } from '@/lib/api-utils';
import { getQuizResults } from '@/lib/universinid/quiz-results';

// Relatório de quizzes por aluno (FASE-08). withAuth(['ADMIN']) explícito — o middleware NÃO
// cobre /api (rider A5). Serve EXCLUSIVAMENTE getQuizResults (select sem `answers`) — proibido
// `prisma.quizAttempt` cru aqui, p/ não reintroduzir o gabarito na resposta.
export async function GET() {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  return apiResponse(await getQuizResults());
}

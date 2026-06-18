import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, apiResponse, apiError, parseBody } from '@/lib/api-utils';
import { submitQuizSchema } from '@/lib/universinid/validators';
import { resolveLessonBySlug } from '@/lib/universinid/content-queries';
import { correctQuiz, extractQuizBlock, QuizDataError } from '@/lib/universinid/quiz';
import { upsertLessonProgress } from '@/lib/universinid/progress-utils';

const RATE_LIMIT = 5; // máx. submissões por janela
const RATE_WINDOW_MS = 60_000; // 60s

// Submissão de tentativa de quiz pelo aluno (FASE-08). Auth explícita — o middleware NÃO cobre
// /api (rider A5). Correção 100% server-side: o gabarito é lido do BANCO (contentPublished),
// NUNCA do corpo da requisição; a resposta nunca inclui corretaIdx/answers.
export async function POST(request: NextRequest) {
  const { error, session } = await withAuth(['STUDENT', 'ADMIN']);
  if (error) return error;

  const parsed = await parseBody(request, submitQuizSchema);
  if (parsed instanceof Response) return parsed;
  const { lessonSlug, respostas } = parsed;
  const userId = session.user.id;

  try {
    // Rate-limit anti-flood baseado no BANCO (correto em serverless multi-instância — um Map
    // in-memory é zerado por cold start e não compartilha entre instâncias na Vercel).
    const recentes = await prisma.quizAttempt.count({
      where: { userId, lessonSlug, createdAt: { gt: new Date(Date.now() - RATE_WINDOW_MS) } },
    });
    if (recentes >= RATE_LIMIT) return apiError('Muitas tentativas em pouco tempo. Aguarde um instante.', 429);

    const lesson = await resolveLessonBySlug(lessonSlug);
    if (!lesson) return apiError('Lição não encontrada', 404);
    if (lesson.status !== 'PUBLISHED') return apiError('Lição não publicada', 422);

    const quiz = extractQuizBlock(lesson.contentPublished); // lê o gabarito do banco (server-side)
    if (!quiz) return apiError('Esta lição não possui quiz', 404);

    const { score, passed, snapshot, feedback } = correctQuiz(respostas, quiz.questoes, quiz.notaCorte);
    const isStudent = session.user.role === 'STUDENT';

    // Atomicidade: a tentativa e o progresso não divergem. Passar marca COMPLETED só para
    // ALUNO (admin testando o quiz não rastreia progresso de aluno).
    const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({
        data: { userId, lessonSlug, score, passed, notaCorte: quiz.notaCorte, answers: snapshot },
        select: { id: true },
      });
      if (passed && isStudent) await upsertLessonProgress(userId, lessonSlug, 'COMPLETED', 100, tx);
      return created;
    });

    // Resposta ao aluno: SEM corretaIdx/answers (defesa em profundidade).
    return apiResponse({ id: attempt.id, score, passed, itens: feedback.itens });
  } catch (e) {
    if (e instanceof QuizDataError) return apiError('Conteúdo do quiz corrompido', 422);
    return apiError('Erro interno', 500);
  }
}

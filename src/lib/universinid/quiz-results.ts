import { prisma } from '@/lib/prisma';

// Resultado de quiz por aluno, para o relatório do admin. NUNCA inclui `answers` (snapshot com
// gabarito) — o `select` é explícito e o tipo de retorno não tem o campo.
export interface LicaoResultado {
  lessonId: string | null; // null = lição removida (órfã)
  slug: string;
  titulo: string;
  melhorScore: number;
  aprovado: boolean;
  notaCorte: number; // do melhor attempt (passed é imutável; notaCorte da época)
  totalTentativas: number;
}
export interface AlunoResultados {
  userId: string;
  nome: string;
  email: string | null;
  removido: boolean; // userId sem User correspondente (conta removida)
  licoes: LicaoResultado[];
}

/**
 * Agrega QuizAttempt POR ALUNO. Bulk (sem N+1): 1 query de attempts + 1 de users + 1 de lessons +
 * 1 de aliases. Agrupa por `lessonId` CANÔNICO (consolida slug antigo+novo pós-rename). Exclui
 * tentativas de ADMIN (não são alunos). Órfãos rotulados (aluno/lição removidos), nunca omitidos.
 */
export async function getQuizResults(): Promise<AlunoResultados[]> {
  // SELECT explícito — sem `answers`. O tipo inferido não expõe o gabarito ao restante do app.
  const attempts = await prisma.quizAttempt.findMany({
    select: { userId: true, lessonSlug: true, score: true, passed: true, notaCorte: true },
    orderBy: { createdAt: 'asc' },
  });
  if (attempts.length === 0) return [];

  const userIds = [...new Set(attempts.map((a) => a.userId))];
  const slugs = [...new Set(attempts.map((a) => a.lessonSlug))];

  // Bulk: usuários (p/ nome/email + filtrar ADMIN) e lições (slug direto).
  const [users, lessons] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, role: true } }),
    prisma.lesson.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true, title: true } }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const lessonBySlug = new Map(lessons.map((l) => [l.slug, l]));

  // Slugs não resolvidos diretamente → tentar alias (slug renomeado) em bulk.
  const naoResolvidos = slugs.filter((s) => !lessonBySlug.has(s));
  const aliasBySlug = new Map<string, { id: string; title: string }>();
  if (naoResolvidos.length) {
    const aliases = await prisma.lessonSlugAlias.findMany({
      where: { oldSlug: { in: naoResolvidos } },
      select: { oldSlug: true, lesson: { select: { id: true, title: true } } },
    });
    for (const a of aliases) if (a.lesson) aliasBySlug.set(a.oldSlug, a.lesson);
  }

  const resolveLesson = (slug: string): { lessonId: string | null; titulo: string } => {
    const direct = lessonBySlug.get(slug);
    if (direct) return { lessonId: direct.id, titulo: direct.title };
    const alias = aliasBySlug.get(slug);
    if (alias) return { lessonId: alias.id, titulo: alias.title };
    return { lessonId: null, titulo: `(lição removida: ${slug})` };
  };

  // Agrupa por aluno → por lessonId canônico (ou `orphan:slug` se removida).
  const porAluno = new Map<string, Map<string, LicaoResultado>>();
  for (const at of attempts) {
    const user = userById.get(at.userId);
    if (user && user.role === 'ADMIN') continue; // tentativas de admin não entram no relatório
    const { lessonId, titulo } = resolveLesson(at.lessonSlug);
    const groupKey = lessonId ?? `orphan:${at.lessonSlug}`;
    let licoes = porAluno.get(at.userId);
    if (!licoes) { licoes = new Map(); porAluno.set(at.userId, licoes); }
    const atual = licoes.get(groupKey);
    if (!atual) {
      licoes.set(groupKey, {
        lessonId, slug: at.lessonSlug, titulo,
        melhorScore: at.score, aprovado: at.passed, notaCorte: at.notaCorte, totalTentativas: 1,
      });
    } else {
      atual.totalTentativas += 1;
      atual.aprovado = atual.aprovado || at.passed;
      if (at.score > atual.melhorScore) { atual.melhorScore = at.score; atual.notaCorte = at.notaCorte; }
    }
  }

  return [...porAluno.entries()].map(([userId, licoesMap]) => {
    const user = userById.get(userId);
    return {
      userId,
      nome: user?.name ?? '(aluno removido)',
      email: user?.email ?? null,
      removido: !user,
      licoes: [...licoesMap.values()],
    };
  });
}

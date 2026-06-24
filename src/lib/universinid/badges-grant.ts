// FASE-09 — concessão e leitura de medalhas (camada de I/O). A elegibilidade pura vive em
// badges.ts (badgesGanhos/montarAlvos). Este módulo NÃO é 'use server': grantBadges é chamado
// internamente pelos callers de conclusão (markLessonProgress + rota de quiz) e NUNCA deve virar
// um server action público (evita disparo de concessão para userId arbitrário).
import { prisma } from '@/lib/prisma';
import type { Badge } from '@/generated/prisma';
import { getPublishedTree } from './content-queries';
import { badgesGanhos, montarAlvos } from './badges';

/**
 * Concede (idempotentemente) todas as medalhas que o usuário já faz jus, dado o progresso atual.
 *
 * - Best-effort: envolto em try/catch — uma falha de concessão NUNCA propaga para o caller de
 *   progresso (latch de conclusão intacto). O erro é LOGADO com contexto (não silenciado).
 * - Idempotente: `createMany({ skipDuplicates: true })` + `@@unique([userId, badgeId])` no schema —
 *   reexecutar (refazer lição, backfill, re-render) não cria duplicatas (R2).
 * - Resiliente a catálogo incompleto (R3): se o Badge do slug ganho ainda não foi semeado,
 *   simplesmente não concede (self-heal no próximo run após o seed).
 */
export async function grantBadges(userId: string): Promise<void> {
  try {
    // MVP: recomputa TODO o universo de alvos a cada conclusão (2 reads + 1 write awaited no hot
    // path). Simples e self-healing — recupera medalhas perdidas por qualquer motivo. Aceitável na
    // escala atual do catálogo; se crescer, escopar aos alvos que contêm o slug recém-concluído.
    const [tree, rows] = await Promise.all([
      getPublishedTree(),
      prisma.lessonProgress.findMany({ where: { userId }, select: { lessonSlug: true, status: true } }),
    ]);

    const completed = new Set(
      rows.filter((r) => r.status === 'COMPLETED').map((r) => r.lessonSlug),
    );
    const ganhos = badgesGanhos(montarAlvos(tree), completed);
    if (ganhos.length === 0) return;

    const badges = await prisma.badge.findMany({
      where: { slug: { in: ganhos } },
      select: { id: true },
    });
    if (badges.length === 0) return;

    await prisma.userBadge.createMany({
      data: badges.map((b) => ({ userId, badgeId: b.id })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error('[badges:grant] falha ao conceder medalhas', {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Retroatividade (R6): roda grantBadges para todos os userId distintos já presentes em
 * LessonProgress. Não é migração — é idempotente; 2ª execução converge ao mesmo estado.
 */
export async function backfillBadges(): Promise<{ usuarios: number }> {
  const usuarios = await prisma.lessonProgress.findMany({
    distinct: ['userId'],
    select: { userId: true },
  });
  for (const u of usuarios) await grantBadges(u.userId);
  return { usuarios: usuarios.length };
}

/**
 * Dados da página /conquistas: catálogo completo (ordenado escopo→position) + as concessões do
 * usuário. Retorno propositalmente serializável (arrays, sem Map) para atravessar o RSC sem atrito.
 */
export async function getConquistasDoUsuario(userId: string): Promise<{
  catalogo: Badge[];
  ganhos: { badgeId: string; awardedAt: Date }[];
}> {
  const [catalogo, ganhos] = await Promise.all([
    prisma.badge.findMany({ orderBy: [{ escopo: 'asc' }, { position: 'asc' }] }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true, awardedAt: true } }),
  ]);
  return { catalogo, ganhos };
}

/** Contagem de medalhas do usuário — 5º stat do dashboard (augmentação leve em getDashboardData). */
export async function contarConquistas(userId: string): Promise<number> {
  return prisma.userBadge.count({ where: { userId } });
}

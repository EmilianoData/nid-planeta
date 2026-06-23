import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@/generated/prisma';

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
// Aceita o client global OU um client de transação (tx) — para compor dentro de `$transaction`.
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Upsert de LessonProgress com LATCH de conclusão.
 *
 * - `userId` e `slug` DEVEM vir já validados pelo chamador (withAuth/exigirSessao). Esta função
 *   NÃO autentica nem re-resolve o slug.
 * - Chaveia pelo slug RECEBIDO — contrato vivo do LessonProgress (39 chaves em produção, regra #2).
 * - Latch de dois passos: `updateMany` com guard `status != COMPLETED` (atômico no banco) +
 *   `upsert` create-only (`update: {}` no-op) para criar quando ausente sem regredir um
 *   COMPLETED já existente. Atômico dentro de `$transaction` (serial); fora dela, o `update:{}`
 *   no-op é o backstop que preserva COMPLETED sob corrida. O Prisma NÃO aceita predicado no
 *   `where` do `upsert` (só a chave única) — por isso o guard vive no `updateMany`.
 */
export async function upsertLessonProgress(
  userId: string,
  slug: string,
  status: ProgressStatus,
  pct: number,
  client: Db = prisma,
): Promise<void> {
  const updated = await client.lessonProgress.updateMany({
    where: { userId, lessonSlug: slug, status: { not: 'COMPLETED' } },
    data: { status, pct },
  });
  if (updated.count === 0) {
    // Ou a linha não existe (create), ou já está COMPLETED (update:{} no-op preserva o latch).
    await client.lessonProgress.upsert({
      where: { userId_lessonSlug: { userId, lessonSlug: slug } },
      create: { userId, lessonSlug: slug, status, pct },
      update: {},
    });
  }
}

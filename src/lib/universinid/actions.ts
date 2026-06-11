'use server';

import { cache } from 'react';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { Prisma } from '@/generated/prisma';
import { getLicao } from './catalogo';
import { getPublishedTree } from './content-queries';
import { buildDashboard, type ProgressRow, type DashboardData, type DashModulo, type Dificuldade } from './dashboard';

const buscarLinhasProgresso = cache((userId: string) =>
  prisma.lessonProgress.findMany({ where: { userId } }),
);

async function exigirSessao() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Não autenticado');
  return session.user;
}

async function exigirAdmin() {
  const user = await exigirSessao();
  if (user.role !== 'ADMIN') throw new Error('Acesso restrito a administradores');
  return user;
}

const progressSchema = z.object({
  slug: z.string().min(1),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  pct: z.number().int().min(0).max(100),
});

export async function markLessonProgress(input: z.infer<typeof progressSchema>) {
  const user = await exigirSessao();
  const { slug, status, pct } = progressSchema.parse(input);
  if (!getLicao(slug)) throw new Error(`Lição inexistente: ${slug}`);

  await prisma.lessonProgress.upsert({
    where: { userId_lessonSlug: { userId: user.id, lessonSlug: slug } },
    update: { status, pct },
    create: { userId: user.id, lessonSlug: slug, status, pct },
  });

  revalidatePath('/universinid');
  revalidatePath(`/universinid/licao/${slug}`);
}

const DIFICULDADE_LABEL: Record<string, Dificuldade> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
};

export async function getDashboardData(): Promise<DashboardData & { nome: string }> {
  const user = await exigirSessao();
  const [rows, tree] = await Promise.all([buscarLinhasProgresso(user.id), getPublishedTree()]);
  const progress: ProgressRow[] = rows.map((r) => ({
    lessonSlug: r.lessonSlug,
    status: r.status as ProgressRow['status'],
    pct: r.pct,
    updatedAt: r.updatedAt,
  }));
  // Achata Course→Module na estrutura mínima do dashboard (E2): os números
  // passam a ser função da árvore PUBLICADA, não do catálogo estático.
  const modulos: DashModulo[] = tree.flatMap((c) =>
    c.modules.map((m) => ({
      id: m.id,
      titulo: m.title,
      licoes: m.lessons.map((l) => ({
        slug: l.slug,
        titulo: l.title,
        tempoMin: l.tempoMin,
        dificuldade: DIFICULDADE_LABEL[l.dificuldade] ?? 'Iniciante',
      })),
    })),
  );
  return { ...buildDashboard(progress, new Date(), modulos), nome: user.nome };
}

export async function getProgressMap(): Promise<Record<string, { status: string; pct: number }>> {
  const user = await exigirSessao();
  const rows = await buscarLinhasProgresso(user.id);
  return Object.fromEntries(rows.map((r) => [r.lessonSlug, { status: r.status, pct: r.pct }]));
}

// ---- Admin ----
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6).refine(
    (s) => new TextEncoder().encode(s).length <= 72,
    { message: 'Senha muito longa' },
  ),
  role: z.enum(['STUDENT', 'ADMIN']).default('STUDENT'),
});

export async function listUsers() {
  await exigirAdmin();
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  await exigirAdmin();
  const { email, name, password, role } = createUserSchema.parse(input);
  const passwordHash = await hashPassword(password);
  try {
    await prisma.user.create({ data: { email, name, passwordHash, role } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error('E-mail já cadastrado');
    }
    throw err;
  }
  revalidatePath('/universinid/admin');
}

export async function toggleUserActive(userId: string) {
  await exigirAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Usuário não encontrado');
  if (user.role === 'ADMIN' && user.isActive) {
    const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (activeAdmins <= 1) throw new Error('Não é possível desativar o único administrador ativo');
  }
  await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
  revalidatePath('/universinid/admin');
}

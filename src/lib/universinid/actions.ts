'use server';

import { cache } from 'react';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { Prisma } from '@/generated/prisma';
import { getPublishedTree, resolveLessonBySlug } from './content-queries';
import { upsertLessonProgress } from './progress-utils';
import { grantBadges, getConquistasDoUsuario, contarConquistas } from './badges-grant';
import { buildDashboard, type ProgressRow, type DashboardData, type DashModulo, type Dificuldade } from './dashboard';

const buscarLinhasProgresso = cache((userId: string) =>
  prisma.lessonProgress.findMany({ where: { userId } }),
);

async function exigirSessao() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Não autenticado');
  // OWASP A07: o JWT (8h) não carrega isActive. Re-checa no banco a cada server
  // action sensível para que desativar a conta revogue o acesso imediatamente,
  // sem esperar o token expirar. null = conta inexistente OU inativa.
  const ativo = await prisma.user.findUnique({
    where: { id: session.user.id, isActive: true },
    select: { id: true },
  });
  if (!ativo) throw new Error('Conta inativa');
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
  // Guarda no BANCO (extensão E3): lições criadas no admin também rastreiam
  // progresso. Resolve por slug direto e por alias (risco #1 — slug renomeado).
  if (!(await resolveLessonBySlug(slug))) throw new Error(`Lição inexistente: ${slug}`);

  // Latch de conclusão compartilhado (FASE-08): COMPLETED nunca regride. Chaveia pelo slug
  // RECEBIDO (contrato vivo). Mesma função usada pela rota de submissão de quiz.
  await upsertLessonProgress(user.id, slug, status, pct);

  // FASE-09: concede medalhas após o latch — só quando algo foi concluído (hot path enxuto).
  // Best-effort: grantBadges nunca propaga erro, então o registro de progresso fica intacto.
  if (status === 'COMPLETED') await grantBadges(user.id);

  revalidatePath('/universinid');
  revalidatePath(`/universinid/licao/${slug}`);
}

const DIFICULDADE_LABEL: Record<string, Dificuldade> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
};

export async function getDashboardData(): Promise<DashboardData & { nome: string; conquistas: number }> {
  const user = await exigirSessao();
  // `conquistas` é AUGMENTAÇÃO aqui (não em buildDashboard): preserva a fn pura + seus testes.
  const [rows, tree, conquistas] = await Promise.all([
    buscarLinhasProgresso(user.id),
    getPublishedTree(),
    contarConquistas(user.id),
  ]);
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
  return { ...buildDashboard(progress, new Date(), modulos), nome: user.nome, conquistas };
}

// FASE-09 — server action da página /conquistas. Wrapper fino: autentica e delega à camada de
// I/O (getConquistasDoUsuario), espelhando o padrão de getDashboardData → buildDashboard.
export async function getConquistas() {
  const user = await exigirSessao();
  return getConquistasDoUsuario(user.id);
}

// Página de perfil (somente leitura): identidade autoritativa (e-mail/papel por PK)
// + os mesmos números do dashboard. Progresso reusa getDashboardData (sem query nova
// de progresso); identidade é um único findUnique por PK.
export async function getPerfil(): Promise<{
  nome: string; email: string; role: string;
  pctGeral: number; licoesConcluidas: number; totalLicoes: number;
  modulosAtivos: number; streakDias: number;
}> {
  const user = await exigirSessao();
  const [conta, dash] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { email: true, role: true } }),
    getDashboardData(),
  ]);
  return {
    nome: dash.nome,
    email: conta?.email ?? '',
    role: conta?.role ?? 'STUDENT',
    pctGeral: dash.pctGeral,
    licoesConcluidas: dash.licoesConcluidas,
    totalLicoes: dash.totalLicoes,
    modulosAtivos: dash.modulosAtivos,
    streakDias: dash.streakDias,
  };
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

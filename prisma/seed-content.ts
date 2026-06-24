import { prisma } from '../src/lib/prisma';
import { buildSeedPlan } from '../src/lib/universinid/seed-plan';
import { badgeSlugModulo, badgeSlugCurso } from '../src/lib/universinid/badges';

export async function runSeedContent(): Promise<void> {
  const plan = buildSeedPlan();
  const course = await prisma.course.upsert({
    where: { slug: plan.course.slug },
    update: { title: plan.course.title, subtitle: plan.course.subtitle, status: 'PUBLISHED' },
    create: { slug: plan.course.slug, title: plan.course.title, subtitle: plan.course.subtitle, position: 0, status: 'PUBLISHED' },
  });

  const moduleIdByOrdem = new Map<number, string>();
  for (const m of plan.modules) {
    const existing = await prisma.module.findFirst({ where: { courseId: course.id, title: m.title } });
    const row = existing
      ? await prisma.module.update({ where: { id: existing.id }, data: { emoji: m.emoji, position: m.position, status: 'PUBLISHED' } })
      : await prisma.module.create({ data: { courseId: course.id, title: m.title, emoji: m.emoji, position: m.position, status: 'PUBLISHED' } });
    moduleIdByOrdem.set(m.ordem, row.id);
  }

  for (const l of plan.lessons) {
    const moduleId = moduleIdByOrdem.get(l.moduleOrdem)!;
    await prisma.lesson.upsert({
      where: { slug: l.slug },
      // ⚠️ update NÃO sobrescreve content* (só metadados) → re-seed não apaga lição já decomposta. Conteúdo só no create.
      update: { moduleId, title: l.title, position: l.position, tempoMin: l.tempoMin, dificuldade: l.dificuldade },
      create: {
        moduleId, slug: l.slug, title: l.title, position: l.position, tempoMin: l.tempoMin,
        dificuldade: l.dificuldade, status: 'PUBLISHED',
        contentDraft: l.contentDraft, contentPublished: l.contentPublished,
      },
    });
  }

  await seedBadges(course.id, course.title);
}

// FASE-09 — catálogo de medalhas: 1 Badge por módulo PUBLICADO + 1 pela trilha (curso).
// Idempotente por slug (badgeSlug* derivado do id — join-por-valor). Semeado só de conteúdo
// PUBLISHED: é exatamente o que grantBadges (via getPublishedTree) consegue conceder — evita
// medalha "eternamente bloqueada" de rascunho no catálogo. Em ambientes onde o PG direto é
// bloqueado (rede DELP, P1001), aplicar via Neon MCP com o mesmo formato de slug/nome.
async function seedBadges(courseId: string, courseTitle: string): Promise<void> {
  const modulos = await prisma.module.findMany({
    where: { courseId, status: 'PUBLISHED' },
    select: { id: true, title: true, position: true },
    orderBy: { position: 'asc' },
  });
  for (const m of modulos) {
    const slug = badgeSlugModulo(m.id);
    const nome = `Módulo: ${m.title}`;
    const descricao = `Conclua todas as lições do módulo "${m.title}".`;
    await prisma.badge.upsert({
      where: { slug },
      update: { nome, descricao, escopo: 'MODULE', alvoId: m.id, icone: 'award', position: m.position },
      create: { slug, nome, descricao, escopo: 'MODULE', alvoId: m.id, icone: 'award', position: m.position },
    });
  }
  const slug = badgeSlugCurso(courseId);
  const nome = `Trilha completa: ${courseTitle}`;
  const descricao = 'Conclua todas as lições da trilha.';
  await prisma.badge.upsert({
    where: { slug },
    update: { nome, descricao, escopo: 'COURSE', alvoId: courseId, icone: 'trophy', position: 0 },
    create: { slug, nome, descricao, escopo: 'COURSE', alvoId: courseId, icone: 'trophy', position: 0 },
  });
}

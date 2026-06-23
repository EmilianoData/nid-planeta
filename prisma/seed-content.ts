import { prisma } from '../src/lib/prisma';
import { buildSeedPlan } from '../src/lib/universinid/seed-plan';

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
}

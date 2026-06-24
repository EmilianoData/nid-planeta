// FASE-09 — lógica de medalhas/conquistas (pura, sem I/O). A concessão (grantBadges),
// a leitura (getConquistas) e o catálogo (seed) vivem em actions.ts/seed.ts e consomem isto.

export type BadgeEscopo = 'MODULE' | 'COURSE';

// Slug estável do Badge derivado do id do alvo (módulo não tem slug próprio; curso tem,
// mas usamos o id para uniformidade). Compartilhado por seed e concessão.
export const badgeSlugModulo = (moduleId: string): string => `mod-${moduleId}`;
export const badgeSlugCurso = (courseId: string): string => `curso-${courseId}`;

// Alvo de concessão: um Badge (módulo ou curso) e as lições cuja conclusão o desbloqueia.
export interface BadgeAlvo {
  slug: string;
  escopo: BadgeEscopo;
  licaoSlugs: string[];
}

/**
 * Quais badges o usuário já ganhou, dado o conjunto de lições concluídas.
 * Ganho = TODAS as lições do alvo estão em `completed` (e o alvo tem ≥1 lição —
 * evita "medalha vazia" para módulo/curso sem lições publicadas). Pura e idempotente.
 */
export function badgesGanhos(alvos: BadgeAlvo[], completed: Set<string>): string[] {
  return alvos
    .filter((a) => a.licaoSlugs.length > 0 && a.licaoSlugs.every((s) => completed.has(s)))
    .map((a) => a.slug);
}

// Shape MÍNIMO da árvore publicada de que a concessão precisa (estruturalmente compatível
// com PublishedTree de content-queries, mas SEM acoplar a Prisma — mantém badges.ts puro).
export interface AlvoModulo { id: string; lessons: { slug: string }[] }
export interface AlvoCurso { id: string; modules: AlvoModulo[] }

/**
 * Traduz a árvore publicada em alvos de concessão: 1 Badge MODULE por módulo (suas lições)
 * + 1 Badge COURSE por curso (união das lições de todos os seus módulos). Pura — alimenta
 * badgesGanhos. Slugs derivados do id (join-por-valor estável, sem depender do slug da lição).
 */
export function montarAlvos(cursos: AlvoCurso[]): BadgeAlvo[] {
  const alvos: BadgeAlvo[] = [];
  for (const curso of cursos) {
    const licoesDoCurso: string[] = [];
    for (const modulo of curso.modules) {
      const licaoSlugs = modulo.lessons.map((l) => l.slug);
      alvos.push({ slug: badgeSlugModulo(modulo.id), escopo: 'MODULE', licaoSlugs });
      licoesDoCurso.push(...licaoSlugs);
    }
    alvos.push({ slug: badgeSlugCurso(curso.id), escopo: 'COURSE', licaoSlugs: licoesDoCurso });
  }
  return alvos;
}

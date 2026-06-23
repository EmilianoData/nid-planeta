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

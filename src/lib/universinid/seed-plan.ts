import { CATALOGO } from './catalogo';
import { legacyEmbedDoc, type UniBlockDoc } from './content-types';

export const COURSE_SLUG = 'ia-agentica-no-nid';

export const DIFICULDADE_MAP = {
  'Iniciante': 'INICIANTE',
  'Intermediário': 'INTERMEDIARIO',
  'Avançado': 'AVANCADO',
} as const;

export interface SeedLesson {
  slug: string; title: string; position: number; tempoMin: number;
  dificuldade: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
  moduleOrdem: number; screenId: string;
  contentDraft: UniBlockDoc; contentPublished: UniBlockDoc;
}
export interface SeedModule { ordem: number; title: string; emoji: string; position: number; }
export interface SeedPlan {
  course: { slug: string; title: string; subtitle: string };
  modules: SeedModule[];
  lessons: SeedLesson[];
}

export function buildSeedPlan(): SeedPlan {
  const modules: SeedModule[] = CATALOGO.map((m) => ({
    ordem: m.ordem, title: m.titulo, emoji: m.emoji, position: m.ordem,
  }));
  const lessons: SeedLesson[] = CATALOGO.flatMap((m) =>
    m.licoes.map((l) => {
      const doc = legacyEmbedDoc(l.screenId);
      return {
        slug: l.slug, title: l.titulo, position: l.ordem, tempoMin: l.tempoMin,
        dificuldade: DIFICULDADE_MAP[l.dificuldade], moduleOrdem: m.ordem,
        screenId: l.screenId, contentDraft: doc, contentPublished: doc,
      };
    }),
  );
  return {
    course: { slug: COURSE_SLUG, title: 'IA Agêntica no NID — nid-spec-kit', subtitle: 'Do brief ao código com o nid-spec-kit' },
    modules, lessons,
  };
}

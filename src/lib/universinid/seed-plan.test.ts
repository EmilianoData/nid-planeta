import { describe, it, expect } from 'vitest';
import { buildSeedPlan, DIFICULDADE_MAP } from './seed-plan';
import { todasLicoes, CATALOGO } from './catalogo';
import { isLegacyEmbed } from './content-types';

describe('seed-plan (migração 39 slugs)', () => {
  const plan = buildSeedPlan();
  it('1 curso guarda-chuva + 6 módulos + 39 lições', () => {
    expect(plan.course.slug).toBe('ia-agentica-no-nid');
    expect(plan.modules).toHaveLength(CATALOGO.length);
    expect(plan.lessons).toHaveLength(todasLicoes().length);
  });
  it('cobre exatamente os slugs do catálogo (0 órfão, 0 extra)', () => {
    const seeded = new Set(plan.lessons.map((l) => l.slug));
    const catalog = new Set(todasLicoes().map((l) => l.slug));
    expect(seeded).toEqual(catalog);
  });
  it('toda lição nasce com legacy-embed apontando pro screenId', () => {
    for (const l of plan.lessons) {
      expect(isLegacyEmbed(l.contentDraft)).toBe(true);
      expect(l.contentDraft[0]).toMatchObject({ type: 'legacy-embed', props: { screenId: l.screenId } });
      expect(l.contentPublished).toEqual(l.contentDraft);
    }
  });
  it('mapeia dificuldade do catálogo p/ enum', () => {
    expect(DIFICULDADE_MAP['Iniciante']).toBe('INICIANTE');
    expect(DIFICULDADE_MAP['Intermediário']).toBe('INTERMEDIARIO');
    expect(DIFICULDADE_MAP['Avançado']).toBe('AVANCADO');
  });
});

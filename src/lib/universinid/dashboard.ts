import { CATALOGO, todasLicoes, getLicao, type Dificuldade } from './catalogo';

export type Status = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ProgressRow {
  lessonSlug: string;
  status: Status;
  pct: number;
  updatedAt: Date;
}

export interface DashboardData {
  totalLicoes: number;
  licoesConcluidas: number;
  pctGeral: number;
  modulosAtivos: number;
  streakDias: number;
  proxima: { slug: string; titulo: string; moduloTitulo: string; pct: number } | null;
  trilha: {
    moduloTitulo: string;
    licoes: { slug: string; titulo: string; tempoMin: number; dificuldade: Dificuldade; status: Status }[];
  };
}

function statusDe(slug: string, bySlug: Map<string, ProgressRow>): Status {
  return bySlug.get(slug)?.status ?? 'NOT_STARTED';
}

function diaUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calcStreak(rows: ProgressRow[], now: Date): number {
  const dias = new Set(rows.map((r) => diaUTC(r.updatedAt)));
  if (dias.size === 0) return 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!dias.has(diaUTC(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!dias.has(diaUTC(cursor))) return 0;
  }
  let streak = 0;
  while (dias.has(diaUTC(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function buildDashboard(rows: ProgressRow[], now: Date): DashboardData {
  const bySlug = new Map(rows.map((r) => [r.lessonSlug, r]));
  const licoes = todasLicoes();
  const totalLicoes = licoes.length;
  const licoesConcluidas = rows.filter((r) => r.status === 'COMPLETED').length;
  const pctGeral = totalLicoes === 0 ? 0 : Math.round((licoesConcluidas / totalLicoes) * 100);

  const modulosAtivos = CATALOGO.filter((m) =>
    m.licoes.some((l) => {
      const s = bySlug.get(l.slug)?.status;
      return s === 'IN_PROGRESS' || s === 'COMPLETED';
    }),
  ).length;

  const emCurso = licoes.find((l) => statusDe(l.slug, bySlug) === 'IN_PROGRESS');
  const naoConcluida = licoes.find((l) => statusDe(l.slug, bySlug) !== 'COMPLETED');
  const alvo = emCurso ?? naoConcluida ?? null;

  let proxima: DashboardData['proxima'] = null;
  let trilhaModuloId = CATALOGO[0].id;
  if (alvo) {
    const ref = getLicao(alvo.slug)!;
    proxima = {
      slug: alvo.slug,
      titulo: alvo.titulo,
      moduloTitulo: ref.modulo.titulo,
      pct: bySlug.get(alvo.slug)?.pct ?? 0,
    };
    trilhaModuloId = ref.modulo.id;
  }

  const modulo = CATALOGO.find((m) => m.id === trilhaModuloId) ?? CATALOGO[0];
  const trilha = {
    moduloTitulo: modulo.titulo,
    licoes: modulo.licoes.map((l) => ({
      slug: l.slug,
      titulo: l.titulo,
      tempoMin: l.tempoMin,
      dificuldade: l.dificuldade,
      status: statusDe(l.slug, bySlug),
    })),
  };

  return {
    totalLicoes,
    licoesConcluidas,
    pctGeral,
    modulosAtivos,
    streakDias: calcStreak(rows, now),
    proxima,
    trilha,
  };
}

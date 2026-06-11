export type Status = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// Rótulo pt-BR (o enum do banco INICIANTE/INTERMEDIARIO/AVANCADO é convertido
// por getDashboardData antes de chegar aqui).
export type Dificuldade = 'Iniciante' | 'Intermediário' | 'Avançado';

export interface ProgressRow {
  lessonSlug: string;
  status: Status;
  pct: number;
  updatedAt: Date;
}

// Estrutura mínima da árvore publicada que o dashboard precisa (E2):
// módulos achatados (curso é irrelevante para os números) + lições por position.
export interface DashModulo {
  id: string;
  titulo: string;
  licoes: { slug: string; titulo: string; tempoMin: number; dificuldade: Dificuldade }[];
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

export function buildDashboard(rows: ProgressRow[], now: Date, modulos: DashModulo[]): DashboardData {
  const bySlug = new Map(rows.map((r) => [r.lessonSlug, r]));
  const moduloDe = new Map(modulos.flatMap((m) => m.licoes.map((l) => [l.slug, m] as const)));
  const licoes = modulos.flatMap((m) => m.licoes);
  const totalLicoes = licoes.length;
  const licoesConcluidas = licoes.filter(
    (l) => bySlug.get(l.slug)?.status === 'COMPLETED',
  ).length;
  const pctGeral = totalLicoes === 0 ? 0 : Math.round((licoesConcluidas / totalLicoes) * 100);

  const modulosAtivos = modulos.filter((m) =>
    m.licoes.some((l) => {
      const s = bySlug.get(l.slug)?.status;
      return s === 'IN_PROGRESS' || s === 'COMPLETED';
    }),
  ).length;

  const emCurso = licoes.find((l) => statusDe(l.slug, bySlug) === 'IN_PROGRESS');
  const naoConcluida = licoes.find((l) => statusDe(l.slug, bySlug) !== 'COMPLETED');
  const alvo = emCurso ?? naoConcluida ?? null;

  let proxima: DashboardData['proxima'] = null;
  let trilhaModuloId = modulos[0]?.id;
  if (!alvo && rows.length > 0) {
    const maisRecente = [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    const mod = moduloDe.get(maisRecente.lessonSlug);
    if (mod) trilhaModuloId = mod.id;
  }
  if (alvo) {
    const mod = moduloDe.get(alvo.slug)!;
    proxima = {
      slug: alvo.slug,
      titulo: alvo.titulo,
      moduloTitulo: mod.titulo,
      pct: bySlug.get(alvo.slug)?.pct ?? 0,
    };
    trilhaModuloId = mod.id;
  }

  const modulo = modulos.find((m) => m.id === trilhaModuloId) ?? modulos[0] ?? null;
  const trilha = {
    moduloTitulo: modulo?.titulo ?? '',
    licoes: (modulo?.licoes ?? []).map((l) => ({
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

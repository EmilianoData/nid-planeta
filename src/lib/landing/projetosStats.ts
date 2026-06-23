/**
 * Agregados da carteira NID — calculados client-side a partir do JSON seedado.
 *
 * O esquema do XLSX é "sujo" (chaves com espaços, valores em string formatada),
 * então tudo passa por normalizadores tolerantes.
 */

export type Bucket = 'encerrados' | 'em-testes' | 'em-execucao' | 'em-backlog';

export interface ProjetoRow {
  id?: string;
  nome?: string;
  status?: string | null;
  setor?: string | null;
  [k: string]: unknown;
}

export interface NidAggregate {
  total: number;
  buckets: Record<Bucket, number>;
  encerrados: {
    count: number;
    retornoGerado: number;
    retornoPrevisto: number;
    horasAnuais: number;
    capexGasto: number;
  };
  byStatus: Record<string, number>;
}

/**
 * Mapeamento dos status crus (vindos do XLSX) para os 4 buckets visíveis.
 * Ponto único de verdade — ajuste aqui se a regra de negócio mudar.
 */
const STATUS_TO_BUCKET: Record<string, Bucket> = {
  Encerrado: 'encerrados',
  Estabilização: 'em-testes',
  'Go Live': 'em-testes',
  Execução: 'em-execucao',
  'Prototipagem/BC': 'em-execucao',
  Planejamento: 'em-execucao',
  Backlog: 'em-backlog',
};

const norm = (s: unknown): string | null =>
  typeof s === 'string' && s.trim() ? s.trim() : null;

const parseMoney = (raw: unknown): number => {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^0-9.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const parseNum = (raw: unknown): number => {
  if (raw == null) return 0;
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Pega um valor por uma lista de chaves possíveis (chaves com espaços/cifras). */
const pick = (row: ProjetoRow, keys: string[]): unknown => {
  for (const k of keys) {
    if (k in row) return row[k];
  }
  return null;
};

export function aggregate(rows: ProjetoRow[]): NidAggregate {
  const buckets: Record<Bucket, number> = {
    'encerrados': 0,
    'em-testes': 0,
    'em-execucao': 0,
    'em-backlog': 0,
  };
  const byStatus: Record<string, number> = {};

  let encerradosCount = 0;
  let retornoGerado = 0;
  let retornoPrevisto = 0;
  let horasAnuais = 0;
  let capexGasto = 0;

  for (const r of rows) {
    const status = norm(r.status) || '(sem status)';
    byStatus[status] = (byStatus[status] ?? 0) + 1;

    const bucket = STATUS_TO_BUCKET[status] ?? 'em-backlog';
    buckets[bucket] += 1;

    if (status === 'Encerrado') {
      encerradosCount += 1;
      retornoGerado += parseMoney(pick(r, [' Retorno Gerado $ ', 'Retorno Gerado $', 'Retorno Gerado']));
      retornoPrevisto += parseMoney(pick(r, [' Retorno Previsto $ ', 'Retorno Previsto $', 'Retorno Previsto']));
      horasAnuais += parseNum(pick(r, ['Horas economizadas anuais', 'horas_anuais']));
      capexGasto += parseMoney(pick(r, ['spent_capex', 'Capex Gasto']));
    }
  }

  return {
    total: rows.length,
    buckets,
    encerrados: { count: encerradosCount, retornoGerado, retornoPrevisto, horasAnuais, capexGasto },
    byStatus,
  };
}

export const moneyBR = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export const numberBR = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

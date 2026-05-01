'use client';

import { useEffect, useState } from 'react';

export type CarteiraStatus = 'running' | 'pending' | 'late' | 'backlog';
export type StackKey = 'bi-stack' | 'ia-stack' | 'sw-stack' | 'rpa-stack' | 'erp-stack' | 'gen-stack';

export type CarteiraProject = {
  id: string;
  nome: string;
  squad: string;
  stackKey: StackKey;
  rawStatus: string;
  status: CarteiraStatus;
  statusLabel: string;
  bp: string | null;
  sponsor: string | null;
  setor: string | null;
  desenvolvedor: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  dataFimReal: Date | null;
  progresso: number | null;
  descricao: string | null;
  capex: number | null;
  opex: number | null;
  expectedRoi: number | null;
  paybackMonths: number | null;
  retornoPrevisto: number | null;
  diasAtraso: number;
};

export type StackAggregate = {
  stackKey: StackKey;
  total: number;
  running: number;
  pending: number;
  late: number;
  backlog: number;
};

const SQUAD_TO_STACK: Record<string, StackKey> = {
  'Automações RPA': 'rpa-stack',
  'BI & Eng. Dados': 'bi-stack',
  Software: 'sw-stack',
  IA: 'ia-stack',
  'Melhoria ERP': 'erp-stack',
  Geral: 'gen-stack',
};

const RUNNING_RAW = new Set(['Encerrado', 'Go Live', 'Estabilização']);
const PENDING_RAW = new Set(['Execução', 'Prototipagem/BC', 'Planejamento']);

const STATUS_LABEL: Record<string, string> = {
  Encerrado: 'Encerr',
  'Go Live': 'Go Live',
  'Estabilização': 'Estab',
  'Execução': 'Exec',
  'Prototipagem/BC': 'Proto',
  Planejamento: 'Planej',
  Backlog: 'Backlog',
};

function parseDate(raw: unknown): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s || s === '-') return null;
  // xlsx export uses M/D/YY (e.g. "12/1/25" or "12/20/25")
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

function parseMoney(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/[R$\s.]/g, '').replace(',', '.').replace(/-$/, '');
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function parseNum(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'string' ? Number(raw.trim()) : Number(raw);
  return isNaN(n) ? null : n;
}

function deriveStatus(rawStatus: string, dataFim: Date | null, today: Date): { status: CarteiraStatus; diasAtraso: number } {
  const s = rawStatus.trim();
  if (RUNNING_RAW.has(s)) return { status: 'running', diasAtraso: 0 };
  if (s === 'Backlog') return { status: 'backlog', diasAtraso: 0 };
  if (PENDING_RAW.has(s) || s === '') {
    if (dataFim && dataFim.getTime() < today.getTime()) {
      const dias = Math.floor((today.getTime() - dataFim.getTime()) / 86400000);
      return { status: 'late', diasAtraso: dias };
    }
    return { status: 'pending', diasAtraso: 0 };
  }
  return { status: 'pending', diasAtraso: 0 };
}

type RawRow = Record<string, unknown>;

function normalize(row: RawRow): CarteiraProject | null {
  const squad = typeof row.squad === 'string' ? row.squad.trim() : '';
  const status = typeof row.status === 'string' ? row.status.trim() : '';
  const stackKey = SQUAD_TO_STACK[squad];
  if (!squad || !status || !stackKey) return null;

  const dataFim = parseDate(row.data_fim);
  const today = new Date();
  const { status: derived, diasAtraso } = deriveStatus(status, dataFim, today);

  return {
    id: String(row.id ?? ''),
    nome: String(row.nome ?? '').trim(),
    squad,
    stackKey,
    rawStatus: status,
    status: derived,
    statusLabel: STATUS_LABEL[status] ?? status,
    bp: typeof row.bp === 'string' && row.bp.trim() ? row.bp.trim() : null,
    sponsor: typeof row.sponsor === 'string' && row.sponsor.trim() ? row.sponsor.trim() : null,
    setor: typeof row.setor === 'string' && row.setor.trim() ? row.setor.trim() : null,
    desenvolvedor: typeof row.desenvolvedor === 'string' && row.desenvolvedor.trim() ? row.desenvolvedor.trim() : null,
    dataInicio: parseDate(row.data_inicio),
    dataFim,
    dataFimReal: parseDate(row.data_fim_real),
    progresso: parseNum(row[' progresso_pct ']),
    descricao: typeof row.descricao === 'string' && row.descricao.trim() ? row.descricao.trim() : null,
    capex: parseMoney(row.capex),
    opex: parseMoney(row.opex),
    expectedRoi: parseNum(row.expected_roi),
    paybackMonths: parseNum(row.payback_months),
    retornoPrevisto: parseMoney(row[' Retorno Previsto $ ']),
    diasAtraso,
  };
}

export function aggregateStack(projects: CarteiraProject[], stackKey: StackKey): StackAggregate {
  const list = projects.filter((p) => p.stackKey === stackKey);
  return {
    stackKey,
    total: list.length,
    running: list.filter((p) => p.status === 'running').length,
    pending: list.filter((p) => p.status === 'pending').length,
    late: list.filter((p) => p.status === 'late').length,
    backlog: list.filter((p) => p.status === 'backlog').length,
  };
}

export function formatStackSubtitle(agg: StackAggregate): string {
  const parts: string[] = [];
  if (agg.running) parts.push(`${agg.running}R`);
  if (agg.pending) parts.push(`${agg.pending}P`);
  if (agg.late) parts.push(`${agg.late}L`);
  if (agg.backlog) parts.push(`${agg.backlog}B`);
  const breakdown = parts.length ? ' · ' + parts.join(' ') : '';
  return `${agg.total} Proj${breakdown}`;
}

let cache: CarteiraProject[] | null = null;
let inflight: Promise<CarteiraProject[]> | null = null;

export function useCarteira(): CarteiraProject[] | null {
  const [data, setData] = useState<CarteiraProject[] | null>(cache);
  useEffect(() => {
    if (cache) return;
    if (!inflight) {
      inflight = fetch('/data/projetos.json')
        .then((r) => r.json() as Promise<RawRow[]>)
        .then((rows) => {
          cache = rows.map(normalize).filter((p): p is CarteiraProject => p !== null);
          return cache;
        });
    }
    inflight.then(setData);
  }, []);
  return data;
}

import { enrich, setorColor, type Projeto, type ProjetoRaw } from './projetos';

export type BodyKind = 'setor' | 'nid' | 'porto-acu' | 'houston';

export type Body = {
  id: string;
  nome: string;
  sub?: string;
  color: string;
  kind: BodyKind;
  orbit: number;       // distance from sun (or parent)
  size: number;        // render radius
  speed: number;       // rad/sec
  phase: number;       // initial angle
  projetos: Projeto[];
  parentId?: string;   // for moon
};

export type MembroRaw = {
  id: string;
  nome: string | null;
  cargo: string | null;
  setor: string | null;
  squad: string | null;
  is_active: string | null;
};

export type Ship = { id: string; nome: string; cargo: string; color: string };

export type Comet = {
  id: string;
  nome: string;
  kind: 'stack' | 'missao';
  color: string;
  orbitA: number;
  orbitB: number;
  tilt: number;
  incline: number;
  speed: number;
  phase: number;
  size: number;
};

export type SolarSystem = {
  sun: { size: number; color: string };
  bodies: Body[];
  ships: Ship[];
  comets: Comet[];
};

const BACKLOG_LABEL = 'Backlog · Não alocado';
const SHIP_PALETTE = ['#FF6B1A', '#21D4FD', '#00E5A0', '#FFD233'];

const STACKS = [
  { nome: 'I.A', color: '#B14AED' },
  { nome: 'B.I', color: '#21D4FD' },
  { nome: 'Eng. Dados', color: '#00E5A0' },
  { nome: 'Software', color: '#FF6B1A' },
];

const MISSOES = [
  { nome: 'DATA LAKE DELP', color: '#21D4FD' },
  { nome: 'APONTAMENTO DIGITAL', color: '#FFD233' },
  { nome: 'SOC', color: '#00E5A0' },
  { nome: 'DATABOOK DIGITAL', color: '#B14AED' },
  { nome: 'KAIZEKA GPT', color: '#FF6B1A' },
];

// Orbital bands — tuned so planets don't overlap with 16 setores
const RINGS = [2.6, 3.6, 4.6, 5.8];

export function buildSolarSystem(rawProj: ProjetoRaw[], rawMem: MembroRaw[]): SolarSystem {
  const projetos = rawProj.map(enrich);

  // Group by setor
  const groups = new Map<string, Projeto[]>();
  for (const p of projetos) {
    const k = p.setor && p.setor.trim() ? p.setor : BACKLOG_LABEL;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(p);
  }

  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  const bodies: Body[] = [];

  // NID = planeta especial na 1a órbita
  bodies.push({
    id: 'nid',
    nome: 'NID',
    sub: 'Núcleo de Inovação',
    color: '#FF6B1A',
    kind: 'nid',
    orbit: RINGS[0],
    size: 0.42,
    speed: 0.09,
    phase: 0,
    projetos: [],
  });

  // Distribute setores on rings by bucket (bigger ones inner)
  sorted.forEach(([nome, projs], i) => {
    const ringIdx = Math.min(Math.floor(i / 5), RINGS.length - 1);
    const positionInRing = i % 5;
    const ringCount = Math.max(1, Math.min(5, sorted.length - ringIdx * 5));
    const phaseOffset = ringIdx === 0 ? Math.PI / 2.3 : 0; // avoid NID at phase 0
    const phase = phaseOffset + (positionInRing / ringCount) * Math.PI * 2;
    const isBacklog = nome === BACKLOG_LABEL;
    bodies.push({
      id: `setor-${i}`,
      nome,
      color: isBacklog ? '#3A4A60' : setorColor(nome),
      kind: 'setor',
      orbit: RINGS[ringIdx],
      size: Math.max(0.18, Math.min(0.42, 0.14 + Math.sqrt(projs.length) * 0.06)),
      speed: 0.05 + 0.06 / (ringIdx + 1),
      phase,
      projetos: projs,
    });
  });

  // Porto do Açu — planeta distante
  bodies.push({
    id: 'porto-acu',
    nome: 'Porto do Açu',
    sub: 'RJ · Expansão futura',
    color: '#21D4FD',
    kind: 'porto-acu',
    orbit: 9.2,
    size: 0.55,
    speed: 0.015,
    phase: 1.8,
    projetos: [],
  });

  // Houston — a LUA (orbita Porto do Açu)
  bodies.push({
    id: 'houston',
    nome: 'Houston',
    sub: 'TX · Missão lunar',
    color: '#B14AED',
    kind: 'houston',
    orbit: 1.2,
    size: 0.18,
    speed: 0.45,
    phase: 0,
    projetos: [],
    parentId: 'porto-acu',
  });

  // Naves exploradoras — 4 membros ativos do NID
  const ships: Ship[] = rawMem
    .filter((m) => m.nome && m.is_active === '1')
    .slice(0, 4)
    .map((m, i) => ({
      id: m.id,
      nome: m.nome as string,
      cargo: m.cargo ?? '',
      color: SHIP_PALETTE[i] ?? '#F2F7FC',
    }));

  // Cometas — stacks (núcleo) + missões NID
  const comets: Comet[] = [
    ...STACKS.map((s, i) => ({
      id: `stack-${i}`,
      nome: s.nome,
      kind: 'stack' as const,
      color: s.color,
      orbitA: 11 + i * 1.6,
      orbitB: 6.5 + i * 0.9,
      tilt: (i / STACKS.length) * Math.PI * 2,
      incline: 1.6 + i * 0.35,
      speed: 0.035 + i * 0.01,
      phase: (i / STACKS.length) * Math.PI * 2,
      size: 0.22,
    })),
    ...MISSOES.map((m, i) => ({
      id: `missao-${i}`,
      nome: m.nome,
      kind: 'missao' as const,
      color: m.color,
      orbitA: 8.5 + i * 1.3,
      orbitB: 5.2 + i * 0.7,
      tilt: ((i + 0.5) / MISSOES.length) * Math.PI * 2,
      incline: 0.9 + i * 0.3,
      speed: 0.045 + i * 0.008,
      phase: ((i + 0.3) / MISSOES.length) * Math.PI * 2,
      size: 0.3,
    })),
  ];

  return {
    sun: { size: 0.9, color: '#FFB45A' },
    bodies,
    ships,
    comets,
  };
}

export function cometPos(c: Comet, t: number, out: { x: number; y: number; z: number }) {
  const a = c.phase + t * c.speed;
  const lx = Math.cos(a) * c.orbitA;
  const lz = Math.sin(a) * c.orbitB;
  const cos = Math.cos(c.tilt);
  const sin = Math.sin(c.tilt);
  out.x = lx * cos - lz * sin;
  out.z = lx * sin + lz * cos;
  out.y = Math.sin(a * 0.7) * c.incline;
}

export function findBody(sys: SolarSystem | null, id: string | null): Body | null {
  if (!sys || !id) return null;
  return sys.bodies.find((b) => b.id === id) ?? null;
}

import * as THREE from 'three';

export type ProjetoStatus = 'construido' | 'em_obra' | 'planejado';

export type ProjetoRaw = {
  id: string;
  nome: string;
  squad?: string | null;
  status: string | null;
  setor?: string | null;
  descricao?: string | null;
  ' progresso_pct '?: string | null;
  'Horas economizadas anuais'?: string | null;
};

export type Projeto = ProjetoRaw & {
  slug: ProjetoStatus;
  setorColor: string;
  progresso: number;
  horas: number;
};

const STATUS_MAP: Record<string, ProjetoStatus> = {
  Encerrado: 'construido',
  'Go Live': 'construido',
  Estabilização: 'construido',
  Execução: 'em_obra',
  'Prototipagem/BC': 'em_obra',
  Backlog: 'planejado',
  Planejamento: 'planejado',
};

// Paleta curada — matizes bem espaçados no círculo cromático pra nenhum setor
// vizinho parecer "igual". Hues progridem em ~22° e alternam saturação/luminosidade
// pra quebrar monotonia.
export const SETOR_PALETTE = [
  '#FF3D5A', // vermelho-coral
  '#FF8A2B', // laranja-brasa
  '#FFD233', // âmbar
  '#A8E63B', // verde-lima
  '#00E5A0', // verde-esmeralda
  '#21D4FD', // ciano
  '#3FB0E8', // azul-piscina
  '#5E81FF', // azul-elétrico
  '#9A6BFF', // violeta
  '#B14AED', // roxo magenta
  '#F06292', // rosa
  '#FF6B1A', // laranja Delp
  '#4DD0E1', // teal claro
  '#E8A84B', // ouro velho
  '#81C784', // verde-sálvia
  '#FF5C8A', // pink framboesa
  '#00B8A9', // turquesa
  '#D4A5FF', // lilás pálido
  '#6BDC7D', // verde menta
  '#F2784B', // tangerine
];

export function statusSlug(status: string | null): ProjetoStatus {
  if (!status) return 'planejado';
  return STATUS_MAP[status] ?? 'planejado';
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return h;
}

export function setorColor(setor: string | null | undefined): string {
  if (!setor) return '#8A9BB0';
  return SETOR_PALETTE[hashString(setor) % SETOR_PALETTE.length];
}

function toNum(v: string | null | undefined): number {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.,-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

export function enrich(p: ProjetoRaw): Projeto {
  return {
    ...p,
    slug: statusSlug(p.status),
    setorColor: setorColor(p.setor),
    progresso: toNum(p[' progresso_pct ']),
    horas: toNum(p['Horas economizadas anuais']),
  };
}

// Even-ish distribution of N directions inside a spherical cap centered on `center`
// with angular radius `cap` (radians). Uses Fibonacci-like golden-angle spiral.
export function distributeOnCap(
  center: THREE.Vector3,
  cap: number,
  count: number,
): THREE.Vector3[] {
  const z = center.clone().normalize();
  const up = Math.abs(z.y) < 0.98 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  const phi0 = Math.PI * (3 - Math.sqrt(5)); // golden angle
  const positions: THREE.Vector3[] = [];
  const effCap = cap * 0.82; // leave a margin from the coast
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const r = Math.sqrt(t) * effCap;                // uniform area on the cap
    const a = i * phi0;
    const dir = new THREE.Vector3()
      .addScaledVector(z, Math.cos(r))
      .addScaledVector(x, Math.sin(r) * Math.cos(a))
      .addScaledVector(y, Math.sin(r) * Math.sin(a))
      .normalize();
    positions.push(dir);
  }
  return positions;
}

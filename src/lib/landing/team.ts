/**
 * NID team roster shown on the bench in Act 2.
 * Petronius is the host (always central). The other 5 rotate through the
 * 4 lateral slots driven by `--p2` (option C from the brief).
 */
export type CrewRole =
  | 'tech-lead'
  | 'rpa'
  | 'host'
  | 'bi'
  | 'po'
  | 'devsec';

export interface CrewMember {
  /** Stable id — used for keys and snippet lookup. */
  id: CrewRole;
  /** Display name on the nameplate (Geist Display). */
  name: string;
  /** Short role line under the name (JetBrains Mono). */
  role: string;
  /** Hex color for the monitor glow + nameplate accent. */
  color: string;
  /** Subtle nameplate sublabel (uppercase, optional). */
  area?: string;
}

export const PETRONIUS: CrewMember = {
  id: 'host',
  name: 'PETRONIUS',
  role: 'IA Companion · NID Delp',
  color: '#DD8F1A',
  area: 'Orquestrador',
};

/** The 5 humans who rotate through the 4 lateral slots in Act 2. */
export const CREW: CrewMember[] = [
  {
    id: 'tech-lead',
    name: 'Henrique Emiliano',
    role: 'Tech Lead',
    color: '#21D4FD',
    area: 'Arquitetura',
  },
  {
    id: 'rpa',
    name: 'Luis Castro',
    role: 'RPA · Automações · Agentes IA',
    color: '#A89BF0',
    area: 'Business Partner',
  },
  {
    id: 'bi',
    name: 'Lucas França',
    role: 'B.I. · Dados · RPA',
    color: '#38E0A0',
    area: 'Business Partner',
  },
  {
    id: 'po',
    name: 'Rafael',
    role: 'Product Owner',
    color: '#FF6B9D',
    area: 'Business Partner',
  },
  {
    id: 'devsec',
    name: 'César Augustus',
    role: 'DevSecOps',
    color: '#FFB45A',
    area: 'Plataforma',
  },
];

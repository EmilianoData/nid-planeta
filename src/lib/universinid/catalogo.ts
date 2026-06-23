export type Dificuldade = 'Iniciante' | 'Intermediário' | 'Avançado';

export interface Licao {
  slug: string;        // chave ESTÁVEL de progresso (não muda na migração MDX)
  titulo: string;
  ordem: number;
  tempoMin: number;
  dificuldade: Dificuldade;
  screenId: string;    // âncora no public/universinid.html
}

export interface Modulo {
  id: string;
  titulo: string;
  emoji: string;
  ordem: number;
  licoes: Licao[];
}

export const CATALOGO: Modulo[] = [
  {
    id: 'm0', emoji: '🧠', titulo: 'Fundamentos', ordem: 0, licoes: [
      { slug: 'sdd-spec-driven-development', titulo: 'SDD — Spec-Driven Development', ordem: 1, tempoMin: 8, dificuldade: 'Iniciante', screenId: 's0-1' },
      { slug: 'llm-o-que-e', titulo: 'LLM — O que é e como usar bem', ordem: 2, tempoMin: 6, dificuldade: 'Iniciante', screenId: 's0-2' },
      { slug: 'agent-orchestration', titulo: 'Agent Orchestration — como agentes trabalham juntos', ordem: 3, tempoMin: 9, dificuldade: 'Iniciante', screenId: 's0-3' },
      { slug: 'por-que-ia-agentica', titulo: 'Por que o NID adotou IA agêntica', ordem: 4, tempoMin: 7, dificuldade: 'Iniciante', screenId: 's0-4' },
      { slug: 'glossario-visual', titulo: 'Glossário Visual', ordem: 5, tempoMin: 5, dificuldade: 'Iniciante', screenId: 's0-5' },
    ],
  },
  {
    id: 'm1', emoji: '🚀', titulo: 'Básico', ordem: 1, licoes: [
      { slug: 'instalacao-nid-spec-kit', titulo: 'Instalação do nid-spec-kit', ordem: 1, tempoMin: 6, dificuldade: 'Iniciante', screenId: 's1-1' },
      { slug: 'casual-vs-formal', titulo: 'Casual vs Formal — dois modos de uso', ordem: 2, tempoMin: 7, dificuldade: 'Iniciante', screenId: 's1-2' },
      { slug: 'primeira-skill-dax-medidas', titulo: 'Primeira skill — usando nid-dax-medidas', ordem: 3, tempoMin: 8, dificuldade: 'Iniciante', screenId: 's1-3' },
      { slug: 'primeiro-agente-bi-engineer', titulo: 'Primeiro agente — nid-bi-engineer', ordem: 4, tempoMin: 8, dificuldade: 'Iniciante', screenId: 's1-4' },
      { slug: 'dez-principios-constituicao', titulo: 'Os 10 Princípios da Constituição NID', ordem: 5, tempoMin: 10, dificuldade: 'Iniciante', screenId: 's1-5' },
      { slug: 'modo-didatico', titulo: 'Modo Didático — aprender enquanto entrega', ordem: 6, tempoMin: 6, dificuldade: 'Iniciante', screenId: 's1-6' },
    ],
  },
  {
    id: 'm2', emoji: '⚙️', titulo: 'Intermediário', ordem: 2, licoes: [
      { slug: 'ciclo-sdd', titulo: 'Ciclo SDD — do brief ao código', ordem: 1, tempoMin: 10, dificuldade: 'Intermediário', screenId: 's2-1' },
      { slug: 'nid-gate-checkpoint', titulo: '/nid:gate — o checkpoint bloqueante', ordem: 2, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's2-2' },
      { slug: 'verificacao-por-midia', titulo: 'Verificação por mídia — VBC na prática', ordem: 3, tempoMin: 9, dificuldade: 'Intermediário', screenId: 's2-3' },
      { slug: 'arvore-decisao-agente', titulo: 'Árvore de decisão — qual agente usar?', ordem: 4, tempoMin: 7, dificuldade: 'Intermediário', screenId: 's2-4' },
      { slug: 'knowledge-base-uso', titulo: 'Knowledge base — como usar e manter', ordem: 5, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's2-5' },
    ],
  },
  {
    id: 'm3', emoji: '🔬', titulo: 'Avançado', ordem: 3, licoes: [
      { slug: 'skill-create', titulo: '/nid:skill-create — criando novas skills', ordem: 1, tempoMin: 12, dificuldade: 'Avançado', screenId: 's3-1' },
      { slug: 'rules-distill', titulo: '/nid:rules-distill — extraindo padrões de exemplos', ordem: 2, tempoMin: 11, dificuldade: 'Avançado', screenId: 's3-2' },
      { slug: 'nid-eval', titulo: '/nid:eval — avaliando skills e agentes', ordem: 3, tempoMin: 10, dificuldade: 'Avançado', screenId: 's3-3' },
      { slug: 'manter-knowledge-curador', titulo: 'Manter knowledge — o curador do kit', ordem: 4, tempoMin: 9, dificuldade: 'Avançado', screenId: 's3-4' },
      { slug: 'contribuir-pr', titulo: 'Contribuir com PR — fluxo de contribuição', ordem: 5, tempoMin: 10, dificuldade: 'Avançado', screenId: 's3-5' },
      { slug: 'override-constituicao-adr', titulo: 'Override de constituição — quando e como usar ADR', ordem: 6, tempoMin: 9, dificuldade: 'Avançado', screenId: 's3-6' },
    ],
  },
  {
    id: 'm4', emoji: '📋', titulo: 'Playbooks', ordem: 4, licoes: [
      { slug: 'playbook-bi-dax', titulo: 'Playbook BI / DAX', ordem: 1, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-1' },
      { slug: 'playbook-etl-python', titulo: 'Playbook ETL Python', ordem: 2, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-2' },
      { slug: 'playbook-ai-engineering', titulo: 'Playbook AI Engineering', ordem: 3, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-3' },
      { slug: 'playbook-azure-ai', titulo: 'Playbook Azure AI', ordem: 4, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-4' },
      { slug: 'playbook-azure-data', titulo: 'Playbook Azure Data', ordem: 5, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-5' },
      { slug: 'playbook-m365-power-platform', titulo: 'Playbook M365 / Power Platform', ordem: 6, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-6' },
      { slug: 'playbook-web-mes-apontdelp', titulo: 'Playbook Web / MES (ApontDELP)', ordem: 7, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-7' },
      { slug: 'playbook-rpa-n8n', titulo: 'Playbook RPA / N8N', ordem: 8, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-8' },
      { slug: 'playbook-api-postman', titulo: 'Playbook API / Postman', ordem: 9, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-9' },
      { slug: 'playbook-slides-comunicacao', titulo: 'Playbook Slides / Comunicação', ordem: 10, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-10' },
      { slug: 'playbook-sharepoint-html-embed', titulo: 'Playbook SharePoint HTML Embed', ordem: 11, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-11' },
      { slug: 'playbook-propostas', titulo: 'Playbook Propostas (referência)', ordem: 12, tempoMin: 8, dificuldade: 'Intermediário', screenId: 's4-12' },
    ],
  },
  {
    id: 'm5', emoji: '⚡', titulo: 'Referência Rápida', ordem: 5, licoes: [
      { slug: 'cheatsheet-comandos', titulo: 'Cheatsheet — 12 comandos /nid:*', ordem: 1, tempoMin: 4, dificuldade: 'Iniciante', screenId: 's5-1' },
      { slug: 'cheatsheet-agentes', titulo: 'Cheatsheet — 28 agentes nid-*', ordem: 2, tempoMin: 4, dificuldade: 'Iniciante', screenId: 's5-2' },
      { slug: 'cheatsheet-skills', titulo: 'Cheatsheet — 45 skills nid-*', ordem: 3, tempoMin: 4, dificuldade: 'Iniciante', screenId: 's5-3' },
      { slug: 'glossario-delp', titulo: 'Glossário DELP', ordem: 4, tempoMin: 5, dificuldade: 'Iniciante', screenId: 's5-4' },
      { slug: 'faq', titulo: 'FAQ — Perguntas frequentes', ordem: 5, tempoMin: 5, dificuldade: 'Iniciante', screenId: 's5-5' },
    ],
  },
];

export function todasLicoes(): Licao[] {
  return CATALOGO.flatMap((m) => m.licoes);
}

export function getLicao(slug: string): { licao: Licao; modulo: Modulo } | null {
  for (const modulo of CATALOGO) {
    const licao = modulo.licoes.find((l) => l.slug === slug);
    if (licao) return { licao, modulo };
  }
  return null;
}

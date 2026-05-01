'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useSolarSystem } from '@/lib/dataLoader';

// Metadados curados por cometa — descrição humana que não vem do dataset.
// Chave = comet.nome (string original de STACKS / MISSOES).
const COMET_INFO: Record<
  string,
  { kind: 'stack' | 'missao'; descricao: string; recursos?: string[]; status?: string }
> = {
  'I.A': {
    kind: 'stack',
    descricao:
      'Stack de Inteligência Artificial — modelos generativos, visão computacional e agentes que automatizam decisão no chão de fábrica.',
    recursos: ['LLMs (Claude, GPT)', 'YOLO/Vision', 'Embeddings', 'RAG'],
  },
  'B.I': {
    kind: 'stack',
    descricao:
      'Stack de Business Intelligence — dashboards executivos, KPIs de produção e visualização de dados operacionais.',
    recursos: ['Power BI', 'Streamlit', 'Next.js viz'],
  },
  'Eng. Dados': {
    kind: 'stack',
    descricao:
      'Stack de Engenharia de Dados — pipelines, ingestão, modelagem e governança do Data Lake Delp.',
    recursos: ['Airflow', 'dbt', 'Supabase', 'Data Lake'],
  },
  Software: {
    kind: 'stack',
    descricao:
      'Stack de Software — produtos SaaS internos da Delp, APIs, integrações e apps web/mobile.',
    recursos: ['Next.js', 'React', 'Node', 'Supabase', 'Vercel'],
  },
  'DATA LAKE DELP': {
    kind: 'missao',
    descricao:
      'Missão-fundação: unificar dados operacionais, financeiros e de engenharia da Delp num único lake governado.',
    status: 'Em obra',
  },
  'APONTAMENTO DIGITAL': {
    kind: 'missao',
    descricao:
      'Apontamento em tempo real da produção — substitui planilhas e papel por leitura contínua de ordens, paradas e OEE.',
    status: 'Em obra',
  },
  SOC: {
    kind: 'missao',
    descricao:
      'Software de gestão da saúde, meio ambiente e segurança — planejamento, treinamento e conformidade.',
    status: 'Planejamento',
  },
  'DATABOOK DIGITAL': {
    kind: 'missao',
    descricao:
      'Automatização do fluxo de processos vinculados ao documento DataBook.',
    status: 'Em obra',
  },
  'KAIZEKA GPT': {
    kind: 'missao',
    descricao:
      'Agente conversacional da Delp treinado em procedimentos internos — apoia operadores, técnicos e gestão com respostas de contexto.',
    status: 'Prototipagem',
  },
};

export default function CometPanel() {
  const view = useStore((s) => s.view);
  const cometId = useStore((s) => s.cometId);
  const focusComet = useStore((s) => s.focusComet);
  const sys = useSolarSystem();

  const comet = useMemo(() => {
    if (!sys || !cometId) return null;
    return sys.comets.find((c) => c.id === cometId) ?? null;
  }, [sys, cometId]);

  if (view === 'pipeline') return null;
  if (!comet) return null;

  const info = COMET_INFO[comet.nome];
  const isStack = comet.kind === 'stack';

  return (
    <aside
      className="fixed top-1/2 right-8 z-30 pointer-events-auto"
      style={{
        transform: 'translateY(-50%)',
        width: 360,
        background: 'linear-gradient(180deg, rgba(10,22,40,0.96), rgba(5,11,22,0.96))',
        border: `1px solid ${comet.color}`,
        borderLeft: `4px solid ${comet.color}`,
        boxShadow: `0 0 40px ${comet.color}50, 0 0 80px ${comet.color}20`,
        backdropFilter: 'blur(8px)',
        padding: '22px 24px',
        fontFamily: 'Barlow, sans-serif',
      }}
    >
      <button
        onClick={() => focusComet(null)}
        style={{
          position: 'absolute',
          top: 14,
          right: 16,
          background: 'none',
          border: 0,
          color: '#8A9BB0',
          fontSize: 20,
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
          color: comet.color,
          marginBottom: 6,
        }}
      >
        {isStack ? '✦ Stack do Núcleo' : '◆ Missão NID'}
      </div>

      <h2
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 22,
          lineHeight: 1.1,
          color: comet.color,
          marginBottom: 14,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
        }}
      >
        {comet.nome}
      </h2>

      {info ? (
        <>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: '#E3ECF5', marginBottom: 14 }}>
            {info.descricao}
          </p>

          {info.status && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#8A9BB0',
                  fontFamily: 'JetBrains Mono, monospace',
                  marginBottom: 4,
                }}
              >
                Status
              </div>
              <div style={{ fontSize: 13, color: '#F2F7FC', fontWeight: 600 }}>{info.status}</div>
            </div>
          )}

          {info.recursos && info.recursos.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#8A9BB0',
                  fontFamily: 'JetBrains Mono, monospace',
                  marginBottom: 8,
                }}
              >
                Tecnologias
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {info.recursos.map((r) => (
                  <span
                    key={r}
                    style={{
                      padding: '3px 8px',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: 1,
                      background: 'rgba(5,11,22,0.6)',
                      borderLeft: `2px solid ${comet.color}`,
                      color: comet.color,
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: 13, color: '#8A9BB0' }}>Sem detalhes cadastrados.</p>
      )}

      <div
        style={{
          marginTop: 18,
          paddingTop: 12,
          borderTop: '1px solid rgba(138,155,176,0.15)',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: 1.5,
          color: '#8A9BB0',
          textTransform: 'uppercase',
        }}
      >
        {isStack ? 'Stack orbitando o sistema' : 'Cometa de missão · explorado pelas naves do NID'}
      </div>
    </aside>
  );
}

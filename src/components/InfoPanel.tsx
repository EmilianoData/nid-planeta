'use client';

import { useMemo, useState } from 'react';
import { useSolarSystem } from '@/lib/dataLoader';

type Squad = { nome: string; color: string; membros: { nome: string; cargo: string }[] };

const SQUAD_COLOR: Record<string, string> = {
  'IA': '#B14AED',
  'BI & Eng. Dados': '#21D4FD',
  'Software': '#FF6B1A',
  'Automações RPA': '#00E5A0',
};

export default function InfoPanel() {
  const [open, setOpen] = useState(false);
  const sys = useSolarSystem();

  const stats = useMemo(() => {
    if (!sys) return null;
    let total = 0;
    let construido = 0;
    let em_obra = 0;
    let planejado = 0;
    let backlog = 0;
    for (const b of sys.bodies) {
      for (const p of b.projetos) {
        total++;
        if (p.slug === 'construido') construido++;
        else if (p.slug === 'em_obra') em_obra++;
        else if ((p.status ?? '').trim() === 'Backlog') backlog++;
        else planejado++;
      }
    }
    return { total, construido, em_obra, planejado, backlog };
  }, [sys]);

  const squads = useMemo<Squad[]>(() => {
    if (!sys) return [];
    // reconstruct from ships + missing members via sys.ships (only 4). We need all active.
    // Use dataLoader's raw? ships only holds 4 active. We'll fall back to grouping ships.
    // Better: expose via sys — ships is a subset. For org chart we rebuild from sys.ships only.
    const map = new Map<string, Squad>();
    for (const s of sys.ships) {
      const sq = 'Núcleo';
      const color = '#FF6B1A';
      if (!map.has(sq)) map.set(sq, { nome: sq, color, membros: [] });
      map.get(sq)!.membros.push({ nome: s.nome, cargo: s.cargo });
    }
    return [...map.values()];
  }, [sys]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto"
        style={{
          padding: '8px 14px',
          background: open ? 'rgba(227,6,19,0.18)' : 'rgba(5,11,22,0.7)',
          border: `1px solid ${open ? '#E30613' : 'rgba(242,247,252,0.25)'}`,
          color: open ? '#FFB0B5' : '#F2F7FC',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          transition: 'all .2s',
        }}
      >
        {open ? '✕ Fechar' : '✦ NID · Info'}
      </button>

      {open && sys && stats && (
        <aside
          className="fixed top-0 left-0 h-full w-[420px] z-30 pointer-events-auto flex flex-col"
          style={{
            background: 'linear-gradient(180deg, rgba(10,22,40,0.96), rgba(5,11,22,0.96))',
            borderRight: '2px solid #E30613',
            boxShadow: '20px 0 40px rgba(227,6,19,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="px-7 pt-24 pb-5 border-b border-delp-gray/20">
            <div className="text-[10px] font-mono tracking-widest uppercase text-delp-gray">
              Núcleo de Inovação · Delp
            </div>
            <div className="font-display text-2xl mt-1" style={{ color: '#E30613' }}>
              NID
            </div>
            <p className="text-sm leading-relaxed mt-3 text-delp-white/90">
              Facilitar a vida do usuário final através da inovação em dados, automação e
              software — transformando cada setor num planeta mais produtivo.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-7 py-5 space-y-7">
            <section>
              <h3 className="font-display text-xs tracking-widest uppercase text-delp-gray mb-3">
                Carteira
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <KPI label="Projetos" value={stats.total} color="#F2F7FC" />
                <KPI label="Construídos" value={stats.construido ?? 0} color="#00E5A0" />
                <KPI label="Em obra" value={stats.em_obra ?? 0} color="#FFD233" />
                <KPI label="Planejados" value={stats.planejado ?? 0} color="#8A9BB0" />
                <KPI label="Backlog" value={stats.backlog ?? 0} color="#FF6B1A" />
              </div>
            </section>

            <section>
              <h3 className="font-display text-xs tracking-widest uppercase text-delp-gray mb-3">
                Stacks do núcleo
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SQUAD_COLOR).map(([k, c]) => (
                  <span
                    key={k}
                    style={{
                      padding: '4px 10px',
                      borderLeft: `2px solid ${c}`,
                      background: 'rgba(5,11,22,0.55)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: c,
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-display text-xs tracking-widest uppercase text-delp-gray mb-3">
                Tripulação ativa
              </h3>
              <div className="space-y-1.5">
                {sys.ships.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2.5"
                    style={{
                      borderLeft: `2px solid ${m.color}`,
                      background: 'rgba(5,11,22,0.55)',
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${m.color}, rgba(5,11,22,0.8))`,
                        display: 'grid',
                        placeItems: 'center',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#05080F',
                        flexShrink: 0,
                      }}
                    >
                      {m.nome
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-tight">{m.nome}</div>
                      <div className="text-[10px] font-mono text-delp-gray tracking-wide uppercase mt-0.5">
                        {m.cargo || '—'}
                      </div>
                    </div>
                    <span
                      className="text-[9px] font-mono tracking-widest uppercase"
                      style={{ color: m.color }}
                    >
                      ▲ Nave
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-delp-gray mt-3 leading-relaxed">
                Cada nave do mapa representa um membro do NID viajando entre os planetas da Delp.
              </p>
            </section>
          </div>
        </aside>
      )}
    </>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="p-3"
      style={{
        borderLeft: `3px solid ${color}`,
        background: 'rgba(5,11,22,0.55)',
      }}
    >
      <div className="text-[9px] font-mono tracking-widest uppercase text-delp-gray">{label}</div>
      <div className="font-display text-2xl font-bold mt-1" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

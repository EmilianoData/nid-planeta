'use client';

import { useStore } from '@/lib/store';
import { useSolarSystem } from '@/lib/dataLoader';

export default function Hud() {
  const sys = useSolarSystem();
  const planetId = useStore((s) => s.planetId);
  const projetoId = useStore((s) => s.projetoId);
  const focusPlanet = useStore((s) => s.focusPlaneta);
  const focusProj = useStore((s) => s.focusProjeto);
  const back = useStore((s) => s.back);

  if (!sys) return null;

  const planet = sys.bodies.find((b) => b.id === planetId) ?? null;
  const projeto = planet?.projetos.find((p) => p.id === projetoId) ?? null;

  if (!planet && !projeto) return <WorldBar sys={sys} onPick={focusPlanet} />;
  if (!planet) return null;

  return (
    <aside
      className="absolute top-0 right-0 h-full w-[440px] z-20 pointer-events-auto flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(10,22,40,0.95), rgba(5,11,22,0.95))',
        borderLeft: `2px solid ${planet.color}`,
        boxShadow: `-20px 0 40px ${planet.color}30`,
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="px-7 pt-24 pb-4 border-b border-delp-gray/20 relative">
        <button
          onClick={() => focusPlanet(null)}
          className="absolute top-6 right-6 text-delp-gray hover:text-delp-white text-2xl leading-none"
        >
          ✕
        </button>
        <div className="flex items-center gap-2 mb-2 text-[10px] font-mono tracking-widest uppercase">
          <button onClick={back} className="text-delp-gray hover:text-delp-white transition">
            ← Voltar
          </button>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-xs font-mono tracking-widest uppercase">
          <span
            onClick={() => focusProj(null)}
            style={{ color: projeto ? '#8A9BB0' : planet.color, cursor: projeto ? 'pointer' : 'default' }}
          >
            {planet.nome}
          </span>
          {projeto && (
            <>
              <span className="text-delp-gray">›</span>
              <span style={{ color: planet.color }}>{projeto.id}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-5">
        {projeto ? (
          <ProjetoDetail p={projeto} color={planet.color} />
        ) : (
          <PlanetDetail planet={planet} onProj={(id) => focusProj(id)} />
        )}
      </div>
    </aside>
  );
}

function WorldBar({
  sys,
  onPick,
}: {
  sys: { bodies: { id: string; nome: string; color: string; kind: string; projetos: unknown[] }[] };
  onPick: (id: string) => void;
}) {
  const setores = sys.bodies.filter((b) => b.kind === 'setor');
  const total = setores.reduce((a, b) => a + b.projetos.length, 0);
  return (
    <aside className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto px-6 py-3 flex items-center gap-5 overflow-x-auto"
      style={{
        background: 'linear-gradient(0deg, rgba(5,11,22,0.9), rgba(5,11,22,0.3))',
        borderTop: '1px solid rgba(33,212,253,0.15)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="shrink-0">
        <div className="text-[9px] font-mono tracking-widest uppercase text-delp-gray">Sistema Delp</div>
        <div className="font-display text-sm tracking-wider">
          <span className="text-delp-orange font-bold">{sys.bodies.length}</span> corpos ·{' '}
          <span className="text-delp-cyan font-bold">{total}</span> projetos
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sys.bodies.map((b) => (
          <button
            key={b.id}
            onClick={() => onPick(b.id)}
            className="shrink-0 px-3 py-1.5 border-l-2 bg-delp-navy/40 hover:bg-delp-navy/90 transition text-left"
            style={{ borderColor: b.color }}
          >
            <div style={{ color: b.color }} className="text-[10px] font-mono tracking-widest uppercase font-bold">
              {b.nome}
            </div>
            <div className="text-[9px] text-delp-gray">
              {b.kind === 'setor' ? `${b.projetos.length} proj.` : b.kind === 'nid' ? 'Base' : b.kind === 'houston' ? 'Lua' : 'Fronteira'}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function PlanetDetail({
  planet,
  onProj,
}: {
  planet: {
    nome: string;
    sub?: string;
    color: string;
    kind: string;
    projetos: {
      id: string;
      nome: string;
      status: string | null;
      slug: string;
      progresso: number;
      setorColor: string;
    }[];
  };
  onProj: (id: string) => void;
}) {
  const porSlug = planet.projetos.reduce<Record<string, number>>((acc, p) => {
    acc[p.slug] = (acc[p.slug] ?? 0) + 1;
    return acc;
  }, {});

  const isSpecial = planet.kind !== 'setor';
  const emptyMsg =
    planet.kind === 'nid'
      ? 'NID é a base do Núcleo. Acompanhe os foguetes viajando entre os planetas.'
      : planet.kind === 'porto-acu'
      ? 'Planeta a ser explorado. Expansão futura da Delp — ainda sem projetos do NID.'
      : planet.kind === 'houston'
      ? 'A Lua. Missão simbólica de fronteira — o próximo grande salto.'
      : null;

  return (
    <>
      <div
        className="mb-5 p-3"
        style={{ borderLeft: `3px solid ${planet.color}`, background: 'rgba(10,22,40,0.4)' }}
      >
        <div className="text-[10px] font-mono tracking-widest uppercase text-delp-gray">
          {planet.kind === 'setor' ? 'Setor · Planeta' : 'Corpo especial'}
        </div>
        <div className="font-display text-xl leading-tight" style={{ color: planet.color }}>
          {planet.nome}
        </div>
        {planet.sub && <div className="text-xs text-delp-gray mt-1">{planet.sub}</div>}
      </div>

      {isSpecial && emptyMsg ? (
        <div className="p-4 border border-delp-gray/20 bg-delp-navy/40">
          <p className="text-sm leading-relaxed">{emptyMsg}</p>
        </div>
      ) : (
        <>
          <Stat label="Projetos" value={planet.projetos.length.toString()} />
          <Stat label="Construídos" value={(porSlug.construido ?? 0).toString()} />
          <Stat label="Em obra" value={(porSlug.em_obra ?? 0).toString()} />
          <Stat label="Planejados" value={(porSlug.planejado ?? 0).toString()} />

          <h3 className="font-display text-xs tracking-widest uppercase text-delp-gray mt-7 mb-3">
            Projetos
          </h3>
          <p className="text-[11px] text-delp-gray mb-3">
            Cada projeto é um satélite orbitando o planeta. Clique pra detalhar.
          </p>
          <div className="space-y-1.5">
            {planet.projetos.map((p) => (
              <button
                key={p.id}
                onClick={() => onProj(p.id)}
                className="w-full flex items-start gap-3 p-2.5 bg-delp-navy/40 hover:bg-delp-navy/90 transition text-left border-l-2"
                style={{ borderColor: planet.color }}
              >
                <StatusDot slug={p.slug} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight truncate">{p.nome}</div>
                  <div className="text-[10px] font-mono text-delp-gray mt-0.5">
                    {p.id} · {p.status ?? 'Backlog'}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-0.5 bg-delp-gray/20">
                      <div
                        className="h-full"
                        style={{ width: `${p.progresso}%`, background: planet.color }}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-delp-gray w-8 text-right">
                      {p.progresso.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ProjetoDetail({
  p,
  color,
}: {
  p: import('@/lib/projetos').Projeto;
  color: string;
}) {
  return (
    <>
      <div
        className="mb-4 p-3"
        style={{ borderLeft: `3px solid ${color}`, background: 'rgba(10,22,40,0.4)' }}
      >
        <div className="text-[10px] font-mono tracking-widest uppercase text-delp-gray mb-1">
          Projeto {p.id}
        </div>
        <div className="font-display text-lg leading-tight">{p.nome}</div>
        <div className="text-xs text-delp-gray mt-1">{p.setor ?? 'Sem setor'}</div>
      </div>

      <Stat label="Status" value={p.status ?? 'Backlog'} />
      <Stat label="Squad" value={p.squad ?? '—'} />
      <Stat label="Progresso" value={`${p.progresso.toFixed(0)}%`} />
      <Stat label="Horas/ano economizadas" value={p.horas ? `${p.horas} h` : '—'} />

      {p.descricao && (
        <>
          <h3 className="font-display text-xs tracking-widest uppercase text-delp-gray mt-6 mb-2">
            Descrição
          </h3>
          <p className="text-sm leading-relaxed text-delp-white/90">{p.descricao}</p>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-delp-gray/15">
      <span className="text-[10px] font-mono tracking-widest uppercase text-delp-gray">{label}</span>
      <span className="font-display text-base font-semibold text-delp-white">{value}</span>
    </div>
  );
}

function StatusDot({ slug }: { slug: string }) {
  const map: Record<string, string> = {
    construido: '#00E5A0',
    em_obra: '#FFD233',
    planejado: '#8A9BB0',
  };
  return (
    <span
      className="h-2 w-2 mt-1.5 shrink-0 rounded-full"
      style={{ background: map[slug] ?? '#8A9BB0', boxShadow: `0 0 6px ${map[slug] ?? '#8A9BB0'}` }}
    />
  );
}

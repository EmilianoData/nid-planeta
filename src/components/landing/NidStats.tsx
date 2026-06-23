'use client';

import { useEffect, useState } from 'react';
import { aggregate, moneyBR, numberBR, type NidAggregate } from '@/lib/landing/projetosStats';

/**
 * Painel de KPIs do NID — lê /data/projetos.json (build-time seeded) e mostra:
 *   - 4 cards de status (encerrados / em testes / em execução / em backlog)
 *   - destaque do retorno gerado total (R$) + horas economizadas/ano
 */
export default function NidStats() {
  const agg = useAggregate();
  if (!agg) return <div className="nid-stats nid-stats--loading" aria-busy="true" />;

  const { buckets, encerrados, total } = agg;

  return (
    <section className="nid-stats" aria-label="Indicadores da carteira de projetos NID">
      <header className="nid-stats__header">
        <span className="nid-stats__eyebrow">// Carteira NID em tempo real</span>
        <h2>
          O motor de inovação <em>em números</em>
        </h2>
        <p>
          <b>{total}</b> projetos catalogados desde a fundação do núcleo.
        </p>
      </header>

      <div className="nid-stats__grid">
        <StatCard
          accent="--c-green"
          label="Encerrados"
          value={buckets.encerrados}
          sub="entregues e em produção"
        />
        <StatCard
          accent="--c-cyan"
          label="Em testes"
          value={buckets['em-testes']}
          sub="estabilização / go-live"
        />
        <StatCard
          accent="--c-orange"
          label="Em execução"
          value={buckets['em-execucao']}
          sub="sprints ativos / prototipagem"
        />
        <StatCard
          accent="--c-purple"
          label="Em backlog"
          value={buckets['em-backlog']}
          sub="priorizados / esperando triagem"
        />
      </div>

      <div className="nid-stats__return">
        <div className="nid-stats__return-block">
          <span className="k">// Retorno gerado · projetos encerrados</span>
          <span className="v">{moneyBR.format(encerrados.retornoGerado)}</span>
          <span className="s">
            distribuído por <b>{encerrados.count}</b> entregas com ROI medido
          </span>
        </div>
        <div className="nid-stats__return-side">
          <SideKpi label="Horas economizadas/ano" value={numberBR.format(encerrados.horasAnuais)} />
          <SideKpi label="CAPEX investido" value={moneyBR.format(encerrados.capexGasto)} />
          <SideKpi
            label="Retorno previsto"
            value={moneyBR.format(encerrados.retornoPrevisto)}
            soft
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  accent,
  label,
  value,
  sub,
}: {
  accent: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <article className="stat-card" style={{ ['--c' as never]: `var(${accent})` }}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{numberBR.format(value)}</span>
      <span className="stat-card__sub">{sub}</span>
    </article>
  );
}

function SideKpi({ label, value, soft }: { label: string; value: string; soft?: boolean }) {
  return (
    <div className={`side-kpi${soft ? ' side-kpi--soft' : ''}`}>
      <span className="side-kpi__label">{label}</span>
      <span className="side-kpi__value">{value}</span>
    </div>
  );
}

function useAggregate() {
  const [agg, setAgg] = useState<NidAggregate | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/data/projetos.json', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((rows) => {
        if (alive) setAgg(aggregate(rows));
      })
      .catch((e) => {
        console.error('[NidStats] falha ao carregar projetos.json', e);
      });
    return () => {
      alive = false;
    };
  }, []);
  return agg;
}

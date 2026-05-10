'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Portal {
  num: string;
  label: string;
  sub: string;
  color: string;
  href: string;
}

const PORTALS: Portal[] = [
  {
    num: '01',
    label: 'Sistema Solar',
    sub: 'Mapa interativo dos projetos NID',
    color: '#21D4FD',
    href: '/sistema-solar',
  },
  {
    num: '02',
    label: 'Pipeline',
    sub: 'Fluxo de dados Delp · Bronze → Gold',
    color: '#DD8F1A',
    href: '/sistema-solar?view=pipeline',
  },
  {
    num: '03',
    label: 'UniversiNID',
    sub: 'Capacitação · Skills · Trilhas',
    color: '#B14AED',
    href: '/universinid',
  },
];

/**
 * 3 portals + warp transition. Click → fade radial gradient (1.2s) → navigate.
 * The router.push happens after the fade so the warp visually swallows the
 * page; if any href doesn't exist yet (it does today), the user lands fine.
 */
export default function PortalDock() {
  const router = useRouter();
  const [warping, setWarping] = useState<Portal | null>(null);

  const onClick = (p: Portal) => {
    if (warping) return;
    setWarping(p);
    window.setTimeout(() => router.push(p.href), 1100);
  };

  return (
    <>
      <div className="dock" aria-label="Portais NID">
        {PORTALS.map((p) => (
          <button
            key={p.num}
            type="button"
            className="portal"
            style={{ ['--c' as string]: p.color }}
            onClick={() => onClick(p)}
            data-cursor="disable"
          >
            <span className="num">{p.num}</span>
            <span className="lbl">{p.label}</span>
            <span className="sub">{p.sub}</span>
          </button>
        ))}
      </div>

      <div
        className={`warp ${warping ? 'is-on' : ''}`}
        style={{ ['--warp-c' as string]: warping?.color ?? '#dd8f1a' }}
        aria-hidden
      />
    </>
  );
}

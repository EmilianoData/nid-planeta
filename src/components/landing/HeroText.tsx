'use client';

import { useEffect, useState } from 'react';
import { HERO_SWAP_MS } from '@/lib/landing/script';
import { useReducedMotion } from '@/lib/landing/useReducedMotion';

/**
 * Left intro + right info, mirroring Moncy's `.landing-intro / .landing-info`
 * anatomy. The "DESBRAVADOR ↔ INOVADOR" swap is two stacked spans toggled
 * by `data-on`, just like Moncy stacks `.landing-h2-1` / `.landing-h2-2`.
 */
export default function HeroText() {
  const swap = useSwap();

  return (
    <div className="hero-text" aria-hidden={false}>
      <div className="hero-intro">
        <h2>Olá! Eu sou o</h2>
        <h1>
          PETRONIUS
          <span>Núcleo de Inovação</span>
        </h1>
        <p>// IA Companion · NID Delp</p>
      </div>

      <div className="hero-info">
        <h3>Um time</h3>
        <div className="swap" aria-label="desbravador e inovador">
          <b data-on={swap === 0}>DESBRAVADOR</b>
          <b data-on={swap === 1}>INOVADOR</b>
        </div>
        <span className="end">de Engenheiros</span>
      </div>
    </div>
  );
}

function useSwap() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % 2), HERO_SWAP_MS);
    return () => window.clearInterval(id);
  }, [reduced]);
  return reduced ? 0 : i;
}

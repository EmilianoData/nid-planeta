'use client';

import { useEffect, useState } from 'react';
import { buildSolarSystem, type SolarSystem, type MembroRaw } from './solarSystem';
import type { ProjetoRaw } from './projetos';

let cache: SolarSystem | null = null;
let inflight: Promise<SolarSystem> | null = null;

export function useSolarSystem(): SolarSystem | null {
  const [sys, setSys] = useState<SolarSystem | null>(cache);
  useEffect(() => {
    if (cache) return;
    if (!inflight) {
      inflight = Promise.all([
        fetch('/data/projetos.json').then((r) => r.json() as Promise<ProjetoRaw[]>),
        fetch('/data/membros.json').then((r) => r.json() as Promise<MembroRaw[]>),
      ]).then(([proj, mem]) => {
        cache = buildSolarSystem(proj, mem);
        return cache;
      });
    }
    inflight.then(setSys);
  }, []);
  return sys;
}

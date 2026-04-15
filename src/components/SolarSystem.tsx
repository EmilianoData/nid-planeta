'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSolarSystem } from '@/lib/dataLoader';
import { useStore } from '@/lib/store';
import { runtime } from '@/lib/runtime';
import Sun from './Sun';
import OrbitRing from './OrbitRing';
import Planet from './Planet';
import Ship from './Ship';
import Satellites from './Satellites';
import Comet from './Comet';

export default function SolarSystem() {
  const sys = useSolarSystem();
  const planetId = useStore((s) => s.planetId);
  const projetoId = useStore((s) => s.projetoId);

  // world positions of each body + comet (updated every frame)
  const positions = useRef<Record<string, { current: THREE.Vector3 }>>({});

  useMemo(() => {
    if (!sys) return;
    for (const b of sys.bodies) {
      positions.current[b.id] = { current: new THREE.Vector3() };
    }
    for (const c of sys.comets) {
      positions.current[c.id] = { current: new THREE.Vector3() };
    }
  }, [sys]);

  // Ring radii for orbits (dedupe)
  const ringRadii = useMemo(() => {
    if (!sys) return [] as number[];
    return [...new Set(sys.bodies.filter((b) => !b.parentId).map((b) => b.orbit))].sort();
  }, [sys]);

  // Ship targets = all parentless planets + all mission comets
  const shipTargets = useMemo(() => {
    if (!sys) return [] as string[];
    return [
      ...sys.bodies.filter((b) => !b.parentId).map((b) => b.id),
      ...sys.comets.filter((c) => c.kind === 'missao').map((c) => c.id),
    ];
  }, [sys]);

  // Publish focus target each frame (lets Controls lerp toward moving bodies)
  useFrame(() => {
    if (!sys) return;
    if (projetoId) return;
    if (planetId) {
      const ref = positions.current[planetId];
      if (ref) {
        runtime.focusedPos = ref.current;
        const body = sys.bodies.find((b) => b.id === planetId);
        runtime.focusedDistance = body ? body.size * 5 + 0.8 : 2;
      }
    } else {
      runtime.focusedPos = null;
      runtime.focusedDistance = 14;
    }
  });

  useEffect(() => {
    if (!planetId) {
      runtime.focusedPos = null;
      runtime.focusedDistance = 14;
    }
  }, [planetId]);

  if (!sys) return null;

  return (
    <group>
      <Sun size={sys.sun.size} />

      {/* Orbit rings for parentless planets */}
      {ringRadii.map((r) => (
        <OrbitRing
          key={`ring-${r}`}
          radius={r}
          color={r > 8 ? '#B14AED' : '#21D4FD'}
          opacity={r > 8 ? 0.3 : 0.1}
          dashed={r > 8}
        />
      ))}

      {/* Planets (parentless) */}
      {sys.bodies
        .filter((b) => !b.parentId)
        .map((b) => (
          <Planet key={b.id} body={b} worldPosRef={positions.current[b.id]}>
            {sys.bodies
              .filter((m) => m.parentId === b.id)
              .map((m) => (
                <group key={m.id}>
                  <OrbitRing radius={m.orbit} color={m.color} opacity={0.25} dashed />
                  <Planet
                    body={m}
                    worldPosRef={positions.current[m.id]}
                    parentPos={positions.current[b.id]?.current}
                  />
                </group>
              ))}
            {planetId === b.id && b.projetos.length > 0 && (
              <Satellites body={b} planetWorldPos={positions.current[b.id]} />
            )}
          </Planet>
        ))}

      {/* Cometas — stacks do núcleo + missões NID */}
      {sys.comets.map((c) => (
        <Comet key={c.id} comet={c} worldPosRef={positions.current[c.id]} />
      ))}

      {/* Naves exploradoras — pousam aleatoriamente em planetas e missões */}
      {shipTargets.length > 0 &&
        sys.ships.map((s, i) => (
          <Ship
            key={s.id}
            ship={s}
            index={i}
            targetIds={shipTargets}
            positions={positions.current}
            nidId="nid"
          />
        ))}
    </group>
  );
}

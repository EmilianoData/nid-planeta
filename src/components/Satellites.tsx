'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Body } from '@/lib/solarSystem';
import type { Projeto } from '@/lib/projetos';
import { useStore } from '@/lib/store';
import { runtime } from '@/lib/runtime';

// Projects orbit the planet when it's focused.
// Three concentric rings by status so the visual communicates progress.
const RING_OFFSETS: Record<string, number> = {
  construido: 0.0,
  em_obra: 0.14,
  planejado: 0.28,
};
const RING_SPEEDS: Record<string, number> = {
  construido: 0.5,
  em_obra: 0.3,
  planejado: 0.15,
};

type SatLayout = {
  p: Projeto;
  ring: number;
  angle: number;
  baseSize: number;
};

export default function Satellites({
  body,
  planetWorldPos,
}: {
  body: Body;
  planetWorldPos: { current: THREE.Vector3 };
}) {
  const focusProj = useStore((s) => s.focusProjeto);
  const activeProj = useStore((s) => s.projetoId);

  const layout = useMemo<SatLayout[]>(() => {
    const groups: Record<string, Projeto[]> = { construido: [], em_obra: [], planejado: [] };
    body.projetos.forEach((p) => groups[p.slug]?.push(p));
    const result: SatLayout[] = [];
    const baseR = body.size * 2.2;
    for (const slug of Object.keys(groups)) {
      const arr = groups[slug];
      arr.forEach((p, i) => {
        result.push({
          p,
          ring: baseR + RING_OFFSETS[slug],
          angle: (i / Math.max(1, arr.length)) * Math.PI * 2,
          baseSize: slug === 'construido' ? 0.04 : slug === 'em_obra' ? 0.045 : 0.028,
        });
      });
    }
    return result;
  }, [body]);

  const satRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    layout.forEach((s, i) => {
      const ref = satRefs.current[i];
      if (!ref) return;
      const speed = RING_SPEEDS[s.p.slug] ?? 0.2;
      const a = s.angle + t * speed;
      ref.position.set(Math.cos(a) * s.ring, Math.sin(a * 0.4) * 0.04, Math.sin(a) * s.ring);
    });
    // Publish active projeto world pos for camera
    if (activeProj) {
      const idx = layout.findIndex((x) => x.p.id === activeProj);
      if (idx >= 0 && satRefs.current[idx]) {
        const p = new THREE.Vector3();
        satRefs.current[idx]!.getWorldPosition(p);
        runtime.focusedPos = p;
        runtime.focusedDistance = 0.8;
      }
    }
  });

  return (
    <group>
      {layout.map((s, i) => {
        const active = activeProj === s.p.id;
        return (
          <group
            key={s.p.id}
            ref={(el) => {
              satRefs.current[i] = el;
            }}
          >
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                focusProj(active ? null : s.p.id);
              }}
              scale={s.baseSize * (active ? 1.6 : 1)}
            >
              {s.p.slug === 'planejado' ? (
                <octahedronGeometry args={[1, 0]} />
              ) : (
                <boxGeometry args={[1, 1, 1]} />
              )}
              <meshStandardMaterial
                color={s.p.setorColor}
                emissive={s.p.setorColor}
                emissiveIntensity={active ? 1.2 : 0.6}
                wireframe={s.p.slug === 'planejado'}
                transparent
                opacity={s.p.slug === 'planejado' ? 0.75 : 1}
                toneMapped={false}
              />
            </mesh>
            {active && (
              <Html
                center
                distanceFactor={1.5}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                <div
                  style={{
                    transform: 'translate(12px, -6px)',
                    padding: '3px 8px',
                    borderLeft: `2px solid ${s.p.setorColor}`,
                    background: 'rgba(5,11,22,0.9)',
                    fontFamily: 'Barlow, sans-serif',
                    fontSize: 10,
                    color: '#F2F7FC',
                    whiteSpace: 'nowrap',
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    boxShadow: `0 0 10px ${s.p.setorColor}`,
                  }}
                >
                  <span style={{ color: s.p.setorColor, fontWeight: 700 }}>
                    {s.p.id}
                  </span>{' '}
                  {s.p.nome}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

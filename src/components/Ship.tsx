'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Trail } from '@react-three/drei';
import * as THREE from 'three';
import type { Ship as ShipT } from '@/lib/solarSystem';

type PosRef = { current: THREE.Vector3 };

type Props = {
  ship: ShipT;
  index: number;
  targetIds: string[];
  positions: Record<string, PosRef>;
  nidId: string;
};

type Mode = 'travel' | 'land';

const TRAVEL_DUR = 6.5;
const LAND_MIN = 2.8;
const LAND_MAX = 5.5;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function randRange(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export default function Ship({ ship, index, targetIds, positions, nidId }: Props) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  const state = useRef<{
    mode: Mode;
    startT: number;
    endT: number;
    targetId: string;
    fromId: string;
    start: THREE.Vector3;
    end: THREE.Vector3;
    pos: THREE.Vector3;
  }>({
    mode: 'travel',
    startT: 0,
    endT: TRAVEL_DUR + index * 1.5, // stagger so they don't leave together
    targetId: targetIds[(index * 3) % targetIds.length] ?? nidId,
    fromId: nidId,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    pos: new THREE.Vector3(),
  });

  // Pick a new target different from current
  const pickNext = (t: number, currentId: string) => {
    const pool = targetIds.filter((id) => id !== currentId);
    const next = pool[Math.floor(Math.random() * pool.length)] ?? nidId;
    const s = state.current;
    s.fromId = currentId;
    s.targetId = next;
    s.mode = 'travel';
    s.startT = t;
    s.endT = t + TRAVEL_DUR * (0.8 + Math.random() * 0.5);
    const from = positions[currentId]?.current;
    if (from) s.start.copy(from);
    else s.start.copy(s.pos);
  };

  const labelOffset = useMemo(() => ({ x: 22, y: -4 }), []);

  useFrame((frame) => {
    const g = group.current;
    if (!g) return;
    const t = frame.clock.elapsedTime;
    const s = state.current;

    if (s.mode === 'travel') {
      const toRef = positions[s.targetId]?.current;
      if (!toRef) return;
      s.end.copy(toRef);
      const u = Math.min(1, (t - s.startT) / (s.endT - s.startT));
      const eu = easeInOut(u);
      s.pos.lerpVectors(s.start, s.end, eu);
      // subtle arc: lift toward the midpoint
      const lift = Math.sin(u * Math.PI) * 0.6;
      s.pos.y += lift;

      if (u >= 1) {
        s.mode = 'land';
        s.startT = t;
        s.endT = t + randRange(LAND_MIN, LAND_MAX);
        s.fromId = s.targetId;
      }
    } else {
      // landed: stick to target and rotate with it
      const toRef = positions[s.targetId]?.current;
      if (toRef) {
        s.pos.copy(toRef);
        // small hover offset so it's visible
        s.pos.y += 0.12;
      }
      if (t >= s.endT) {
        pickNext(t, s.targetId);
      }
    }

    g.position.copy(s.pos);

    // Face movement direction (look slightly ahead)
    if (body.current) {
      const look = s.mode === 'travel' ? s.end : s.pos.clone().add(new THREE.Vector3(0, 0, 1));
      body.current.lookAt(look);
    }
  });

  const c = ship.color;
  const S = 1.0; // overall scale multiplier (naves maiores)

  return (
    <group ref={group}>
      <Trail width={0.14 * S} length={5} color={c} attenuation={(w) => w * w} decay={1.5}>
        <group ref={body}>
          {/* fuselagem principal */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055 * S, 0.09 * S, 0.34 * S, 10]} />
            <meshStandardMaterial
              color="#E8EEF6"
              emissive={c}
              emissiveIntensity={0.35}
              metalness={0.7}
              roughness={0.25}
              toneMapped={false}
            />
          </mesh>
          {/* nariz */}
          <mesh position={[0, 0, 0.22 * S]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.055 * S, 0.14 * S, 10]} />
            <meshStandardMaterial
              color={c}
              emissive={c}
              emissiveIntensity={0.9}
              toneMapped={false}
            />
          </mesh>
          {/* asas */}
          <mesh position={[0, 0, -0.03 * S]}>
            <boxGeometry args={[0.32 * S, 0.012 * S, 0.1 * S]} />
            <meshStandardMaterial
              color="#2B3D54"
              emissive={c}
              emissiveIntensity={0.3}
              metalness={0.6}
              roughness={0.4}
              toneMapped={false}
            />
          </mesh>
          {/* cabine */}
          <mesh position={[0, 0.045 * S, 0.06 * S]}>
            <sphereGeometry args={[0.05 * S, 12, 10]} />
            <meshStandardMaterial
              color="#21D4FD"
              emissive="#21D4FD"
              emissiveIntensity={0.6}
              toneMapped={false}
            />
          </mesh>
          {/* chama traseira */}
          <mesh position={[0, 0, -0.22 * S]}>
            <sphereGeometry args={[0.055 * S, 10, 10]} />
            <meshBasicMaterial color="#FFD233" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.28 * S]}>
            <sphereGeometry args={[0.03 * S, 8, 8]} />
            <meshBasicMaterial color="#FF6B1A" toneMapped={false} />
          </mesh>
        </group>
      </Trail>
      <Html center distanceFactor={6} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div
          style={{
            transform: `translate(${labelOffset.x}px, ${labelOffset.y}px)`,
            padding: '3px 7px',
            borderLeft: `2px solid ${c}`,
            background: 'rgba(5,11,22,0.78)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: 1.2,
            color: c,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          ▲ {ship.nome.split(' ')[0]}
        </div>
      </Html>
    </group>
  );
}

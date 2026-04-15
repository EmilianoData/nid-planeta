'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { cometPos, type Comet as CometT } from '@/lib/solarSystem';
import { useStore } from '@/lib/store';

type Props = {
  comet: CometT;
  worldPosRef?: { current: THREE.Vector3 };
};

const scratch = { x: 0, y: 0, z: 0 };

export default function Comet({ comet, worldPosRef }: Props) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const focusComet = useStore((s) => s.focusComet);
  const cometId = useStore((s) => s.cometId);
  const active = cometId === comet.id;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    cometPos(comet, t, scratch);
    group.current.position.set(scratch.x, scratch.y, scratch.z);
    if (worldPosRef) worldPosRef.current.set(scratch.x, scratch.y, scratch.z);

    // tail direction: velocity from numeric derivative
    cometPos(comet, t + 0.05, scratch);
    if (body.current) {
      body.current.lookAt(scratch.x, scratch.y, scratch.z);
    }
  });

  const isStack = comet.kind === 'stack';

  return (
    <group ref={group}>
      <Trail
        width={comet.size * (active ? 4.2 : 2.8)}
        length={isStack ? 8 : 6}
        color={comet.color}
        attenuation={(w) => w * w}
        decay={1.2}
      >
        <group ref={body}>
          {/* núcleo brilhante */}
          <mesh>
            <sphereGeometry args={[comet.size * 0.6, 20, 20]} />
            <meshBasicMaterial color={comet.color} toneMapped={false} />
          </mesh>
          {/* halo */}
          <mesh>
            <sphereGeometry args={[comet.size, 20, 20]} />
            <meshBasicMaterial
              color={comet.color}
              transparent
              opacity={active ? 0.4 : 0.18}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          {/* hit-area invisível — aumenta raio de clique (vital no touch de TV) */}
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              focusComet(active ? null : comet.id);
            }}
          >
            <sphereGeometry args={[comet.size * 3, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </Trail>
      <Html center distanceFactor={8} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div
          style={{
            transform: `translate(${comet.size * 60}px, -10px)`,
            padding: '3px 8px',
            borderLeft: `2px solid ${comet.color}`,
            background: 'rgba(5,11,22,0.75)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: isStack ? 10 : 11,
            letterSpacing: 1.5,
            color: comet.color,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            fontWeight: isStack ? 600 : 700,
          }}
        >
          {isStack ? '✦' : '◆'} {comet.nome}
        </div>
      </Html>
    </group>
  );
}

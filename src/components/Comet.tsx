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
const scratch2 = { x: 0, y: 0, z: 0 };
const _sun = new THREE.Vector3(0, 0, 0);
const _pos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _ionDir = new THREE.Vector3();
const _dustDir = new THREE.Vector3();
const _anti = new THREE.Vector3();

export default function Comet({ comet, worldPosRef }: Props) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Group>(null);
  const ionTail = useRef<THREE.Group>(null);
  const dustTail = useRef<THREE.Group>(null);
  const focusComet = useStore((s) => s.focusComet);
  const cometId = useStore((s) => s.cometId);
  const active = cometId === comet.id;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    cometPos(comet, t, scratch);
    _pos.set(scratch.x, scratch.y, scratch.z);
    group.current.position.copy(_pos);
    if (worldPosRef) worldPosRef.current.copy(_pos);

    cometPos(comet, t + 0.05, scratch2);
    _vel.set(scratch2.x - scratch.x, scratch2.y - scratch.y, scratch2.z - scratch.z).normalize();
    _anti.copy(_pos).sub(_sun).normalize();
    _ionDir.copy(_anti);
    _dustDir.copy(_anti).multiplyScalar(0.7).addScaledVector(_vel, -0.3).normalize();

    if (ionTail.current) {
      ionTail.current.lookAt(_ionDir.x, _ionDir.y, _ionDir.z);
    }
    if (dustTail.current) {
      dustTail.current.lookAt(_dustDir.x, _dustDir.y, _dustDir.z);
    }
  });

  const isStack = comet.kind === 'stack';

  return (
    <group ref={group}>
      <group ref={core}>
        <mesh>
          <sphereGeometry args={[comet.size * 0.5, 20, 20]} />
          <meshBasicMaterial color={comet.color} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[comet.size * 1.2, 20, 20]} />
          <meshBasicMaterial
            color={comet.color}
            transparent
            opacity={active ? 0.22 : 0.1}
            toneMapped={false}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
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

      <group ref={ionTail}>
        <Trail
          width={comet.size * (active ? 2.4 : 1.7)}
          length={isStack ? 9 : 7}
          color={new THREE.Color(comet.color).lerp(new THREE.Color('#A8D4FF'), 0.55)}
          attenuation={(w) => w * w}
          decay={1.4}
        >
          <mesh position={[0, 0, 0.001]}>
            <sphereGeometry args={[comet.size * 0.18, 10, 10]} />
            <meshBasicMaterial color="#C8E4FF" transparent opacity={0.7} toneMapped={false} depthWrite={false} />
          </mesh>
        </Trail>
      </group>

      <group ref={dustTail}>
        <Trail
          width={comet.size * (active ? 3.6 : 2.4)}
          length={isStack ? 7 : 5}
          color={comet.color}
          attenuation={(w) => w}
          decay={1.1}
        >
          <mesh position={[0, 0, 0.001]}>
            <sphereGeometry args={[comet.size * 0.22, 10, 10]} />
            <meshBasicMaterial color={comet.color} transparent opacity={0.85} toneMapped={false} depthWrite={false} />
          </mesh>
        </Trail>
      </group>

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

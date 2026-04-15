'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

type Props = {
  color: string;
  size: number;
  label?: string;
};

/**
 * Marcador de "nova exploração" — duas cascas pulsantes + anel cintilante +
 * label flutuante. Usado em Porto do Açu e Houston pra sinalizar que são
 * alvos de fronteira da Delp (ainda sem projetos do NID).
 */
export default function FrontierMarker({ color, size, label = 'NOVA EXPLORAÇÃO' }: Props) {
  const shell1 = useRef<THREE.Mesh>(null);
  const shell2 = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (shell1.current) {
      const p1 = (t * 0.6) % 1;
      shell1.current.scale.setScalar(size * (1.3 + p1 * 1.6));
      (shell1.current.material as THREE.MeshBasicMaterial).opacity = (1 - p1) * 0.35;
    }
    if (shell2.current) {
      const p2 = ((t * 0.6) + 0.5) % 1;
      shell2.current.scale.setScalar(size * (1.3 + p2 * 1.6));
      (shell2.current.material as THREE.MeshBasicMaterial).opacity = (1 - p2) * 0.35;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.6;
      ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.25;
    }
  });

  return (
    <group>
      {/* Pulsos expansivos */}
      <mesh ref={shell1}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={shell2}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Anel cintilante em torno do planeta */}
      <mesh ref={ring} scale={size * 2.4} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.015, 8, 120]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
      </mesh>

      {/* Badge "nova exploração" */}
      <Html
        position={[0, size * 1.6, 0]}
        center
        distanceFactor={6}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          style={{
            padding: '2px 8px',
            background: `linear-gradient(90deg, ${color}, rgba(5,11,22,0.9))`,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 8,
            letterSpacing: 2,
            fontWeight: 700,
            color: '#05080F',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            borderRadius: 2,
            boxShadow: `0 0 12px ${color}`,
          }}
        >
          ◉ {label}
        </div>
      </Html>
    </group>
  );
}

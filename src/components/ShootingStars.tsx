'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';

type Meteor = {
  start: THREE.Vector3;
  dir: THREE.Vector3;
  startT: number;
  duration: number;
  color: string;
};

const COLORS = ['#FFFFFF', '#E3ECF5', '#FFEAEC', '#B8D9FF'];
const DIST = 40; // raio da esfera celeste pra gerar meteoros

function newMeteor(now: number): Meteor {
  // ponto aleatório numa esfera distante
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const start = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ).multiplyScalar(DIST);

  // direção tangente — perpendicular ao raio + ruído pra não ser radial
  const tangent = new THREE.Vector3().randomDirection();
  const radial = start.clone().normalize();
  tangent.sub(radial.multiplyScalar(tangent.dot(radial))).normalize();

  return {
    start,
    dir: tangent,
    startT: now,
    duration: 0.7 + Math.random() * 0.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

/**
 * Raros meteoros cruzando a esfera celeste. Pool de 3 entradas que se recicla;
 * cada meteoro vive ~1s, some, e respawn após um intervalo aleatório.
 */
export default function ShootingStars() {
  const pool = useMemo<Meteor[]>(() => {
    const now = 0;
    return [
      { ...newMeteor(now), startT: 3 + Math.random() * 4 },
      { ...newMeteor(now), startT: 6 + Math.random() * 6 },
      { ...newMeteor(now), startT: 10 + Math.random() * 8 },
    ];
  }, []);

  return (
    <>
      {pool.map((_, i) => (
        <MeteorSlot key={i} pool={pool} idx={i} />
      ))}
    </>
  );
}

function MeteorSlot({ pool, idx }: { pool: Meteor[]; idx: number }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!group.current || !mesh.current) return;
    const m = pool[idx];
    const t = state.clock.elapsedTime;
    const u = (t - m.startT) / m.duration;

    if (u < 0) {
      (mesh.current.material as THREE.MeshBasicMaterial).opacity = 0;
      return;
    }
    if (u > 1.1) {
      // respawn com intervalo aleatório (3–10s)
      pool[idx] = newMeteor(t + 3 + Math.random() * 7);
      return;
    }

    const travel = 16; // distância percorrida
    const pos = m.start.clone().addScaledVector(m.dir, u * travel);
    group.current.position.copy(pos);
    (mesh.current.material as THREE.MeshBasicMaterial).color.set(m.color);
    (mesh.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(u * Math.PI) * 1.0;
  });

  return (
    <group ref={group}>
      <Trail width={0.35} length={3.5} color="#FFFFFF" attenuation={(w) => w} decay={2}>
        <mesh ref={mesh}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </Trail>
    </group>
  );
}

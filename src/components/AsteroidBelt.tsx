'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Cinturão de asteroides entre a última órbita de setor e Porto do Açu.
 * Usa InstancedMesh para 1 só draw call — performance excelente mesmo com 400 rochas.
 * Isolado: não depende de nenhum outro componente, não toca em store.
 */
const COUNT = 320;
const INNER = 6.4;   // depois do último ring de setor (5.8)
const OUTER = 8.4;   // antes de Porto do Açu (9.2)

export default function AsteroidBelt() {
  const mesh = useRef<THREE.InstancedMesh>(null);

  // dados estáveis por índice (deterministic)
  const { matrices, speeds, rotations } = useMemo(() => {
    const ms: THREE.Matrix4[] = [];
    const ss: number[] = [];
    const rs: { axis: THREE.Vector3; rate: number; base: THREE.Euler }[] = [];
    for (let i = 0; i < COUNT; i++) {
      const seed = i * 1031;
      const r = INNER + ((Math.sin(seed * 1.13) + 1) * 0.5) * (OUTER - INNER);
      const phase = (i / COUNT) * Math.PI * 2 + Math.sin(seed * 0.17) * 0.4;
      const y = (Math.sin(seed * 0.29) - 0.5) * 0.35; // leve espessura vertical
      const scale = 0.012 + (Math.sin(seed * 0.71) + 1) * 0.5 * 0.04;
      const m = new THREE.Matrix4();
      m.compose(
        new THREE.Vector3(Math.cos(phase) * r, y, Math.sin(phase) * r),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale * (0.7 + Math.sin(seed * 2.3) * 0.2), scale),
      );
      ms.push(m);
      ss.push(0.012 + Math.sin(seed * 0.5) * 0.004); // velocidade orbital individual
      rs.push({
        axis: new THREE.Vector3(Math.sin(seed * 0.3), Math.cos(seed * 0.7), Math.sin(seed * 1.1)).normalize(),
        rate: 0.3 + Math.sin(seed * 0.9) * 0.6,
        base: new THREE.Euler(seed * 0.2, seed * 0.33, seed * 0.45),
      });
    }
    return { matrices: ms, speeds: ss, rotations: rs };
  }, []);

  // geometria = icosaedro baixa res com leve deslocamento = aspecto de rocha
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const h = Math.sin(v.x * 7 + v.y * 5 + v.z * 3) * 0.5 + 0.5;
      v.multiplyScalar(1 + h * 0.25);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const scl = useMemo(() => new THREE.Vector3(), []);
  const eu = useMemo(() => new THREE.Euler(), []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      // recupera posição base
      matrices[i].decompose(pos, quat, scl);
      // calcula órbita atual
      const r = Math.hypot(pos.x, pos.z);
      const basePhase = Math.atan2(pos.z, pos.x);
      const phase = basePhase + speeds[i] * t;
      pos.set(Math.cos(phase) * r, pos.y, Math.sin(phase) * r);
      // rotação própria
      eu.set(
        rotations[i].base.x + t * rotations[i].rate,
        rotations[i].base.y + t * rotations[i].rate * 0.7,
        rotations[i].base.z + t * rotations[i].rate * 0.5,
      );
      quat.setFromEuler(eu);
      m.compose(pos, quat, scl);
      mesh.current.setMatrixAt(i, m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, COUNT]}>
      <meshStandardMaterial
        color="#6B5B4A"
        roughness={0.95}
        metalness={0.05}
        emissive="#2A1E14"
        emissiveIntensity={0.15}
      />
    </instancedMesh>
  );
}

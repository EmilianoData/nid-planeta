'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

export default function OrbitRing({
  radius,
  color = '#21D4FD',
  opacity = 0.12,
  dashed = false,
}: {
  radius: number;
  color?: string;
  opacity?: number;
  dashed?: boolean;
}) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, [radius]);

  const mat = useMemo(() => {
    const m = dashed
      ? new THREE.LineDashedMaterial({
          color,
          transparent: true,
          opacity,
          dashSize: 0.18,
          gapSize: 0.14,
          toneMapped: false,
        })
      : new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity,
          toneMapped: false,
        });
    return m;
  }, [color, opacity, dashed]);

  const line = useMemo(() => {
    const l = new THREE.Line(geometry, mat);
    if (dashed) l.computeLineDistances();
    return l;
  }, [geometry, mat, dashed]);

  return <primitive object={line} />;
}

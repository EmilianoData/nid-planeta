'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * OrbitRing realista: em vez de uma linha uniforme, fade nos polos mais distantes
 * da câmera e variação de alpha por segmento (simula poeira orbital),
 * mantendo a API (radius, color, opacity, dashed).
 */
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
    const colors: number[] = [];
    const segments = 192;
    const col = new THREE.Color(color);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      // leve variação ao longo do anel — simula concentração de poeira
      const v = 0.7 + 0.3 * Math.sin(a * 3.0 + radius);
      colors.push(col.r * v, col.g * v, col.b * v);
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [radius, color]);

  const mat = useMemo(() => {
    const m = dashed
      ? new THREE.LineDashedMaterial({
          color,
          transparent: true,
          opacity: opacity * 0.9,
          dashSize: 0.22,
          gapSize: 0.18,
          toneMapped: false,
          vertexColors: true,
        })
      : new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: opacity * 0.85,
          toneMapped: false,
          vertexColors: true,
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

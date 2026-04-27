'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Pulsos de luz percorrendo as órbitas — metáfora de "dados fluindo".
 * Um Points com N partículas que circulam na altura da órbita.
 * Isolado, não muda OrbitRing nem API.
 */
type Props = {
  radii: number[];
  color?: string;
};

const PER_RING = 0.1; // quantos pulsos por órbita (ajusta a densidade)

export default function DataPulse({ radii, color = '#21D4FD' }: Props) {
  const pts = useRef<THREE.Points>(null);

  const { geo, total } = useMemo(() => {
    const total = radii.length * PER_RING;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(total), 1));
    g.setAttribute('aRadius', new THREE.BufferAttribute(new Float32Array(total), 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(new Float32Array(total), 1));
    const phase = g.attributes.aPhase as THREE.BufferAttribute;
    const radius = g.attributes.aRadius as THREE.BufferAttribute;
    const speed = g.attributes.aSpeed as THREE.BufferAttribute;
    for (let r = 0; r < radii.length; r++) {
      const baseSpeed = 0.22 / Math.sqrt(radii[r]); // mais lento quanto mais longe
      for (let k = 0; k < PER_RING; k++) {
        const idx = r * PER_RING + k;
        phase.setX(idx, (k / PER_RING) * Math.PI * 2 + r * 0.3);
        radius.setX(idx, radii[r]);
        speed.setX(idx, baseSpeed * (0.9 + (k % 2) * 0.2));
      }
    }
    return { geo: g, total };
  }, [radii]);

  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aRadius;
        attribute float aSpeed;
        uniform float uTime;
        varying float vAlpha;
        void main(){
          float a = aPhase + uTime * aSpeed;
          vec3 pos = vec3(cos(a) * aRadius, 0.0, sin(a) * aRadius);
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
          // tamanho depende da distância — mantém legível perto e longe
          gl_PointSize = 6.0 * (280.0 / -mv.z);
          // leve pulso
          vAlpha = 0.55 + 0.45 * sin(a * 3.0 + uTime * 2.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float halo = smoothstep(0.5, 0.15, d) * 0.6;
          float a = (core + halo) * vAlpha;
          gl_FragColor = vec4(uColor * (1.0 + core * 0.8), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return m;
  }, [color]);

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <points ref={pts} geometry={geo} material={mat} />;
}

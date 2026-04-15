'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform float uTime;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  vec3 drift = d * 2.4 + vec3(uTime * 0.008, 0.0, uTime * 0.006);
  float n = fbm(drift);
  float m = fbm(drift * 1.7 + 3.1);

  // Bandas coloridas: roxo profundo + vermelho Delp esmaecido + cyan distante
  vec3 deepPurple = vec3(0.14, 0.04, 0.24);
  vec3 delpRed    = vec3(0.36, 0.05, 0.10);
  vec3 cyan       = vec3(0.05, 0.16, 0.28);

  vec3 col = mix(deepPurple, delpRed, smoothstep(0.45, 0.88, n));
  col = mix(col, cyan, smoothstep(0.55, 0.9, m) * 0.45);

  // Faixa galáctica ao longo de Y
  float stripe = smoothstep(0.38, 0.0, abs(d.y - 0.05));
  col += stripe * vec3(0.18, 0.06, 0.14) * smoothstep(0.4, 0.9, n);

  // Fade global — mantém o céu escuro, só insinua as nuvens
  float intensity = smoothstep(0.35, 0.95, n) * 0.25 + 0.025;
  gl_FragColor = vec4(col * intensity, 1.0);
}
`;

export default function Nebula() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh scale={90} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

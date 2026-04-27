'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Paleta Delp — vermelho + branco quente.
// Realismo: superfície solar com granulação + limb darkening; coroa em 3 camadas;
// proeminências em anel com distorção; sem "spikes" cartoon.
const DELP_RED      = '#E30613';
const DELP_RED_DEEP = '#B8000C';
const CORONA_WARM   = '#FFB88A';
const LIGHT_WARM    = '#FFEAEC';

// ---------- Shader de fotosfera ----------
const photoVert = /* glsl */ `
varying vec3 vLocalPos;
varying vec3 vNormal;
void main() {
  vLocalPos = position;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

const photoFrag = /* glsl */ `
precision highp float;
varying vec3 vLocalPos;
varying vec3 vNormal;
uniform float uTime;

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.55;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.05; a *= 0.5; }
  return v;
}

void main() {
  vec3 p = normalize(vLocalPos);
  // Granulação turbulenta: 2 escalas animadas
  float g1 = fbm(p * 8.0 + vec3(uTime * 0.05));
  float g2 = fbm(p * 18.0 - vec3(uTime * 0.09));
  float granules = g1 * 0.6 + g2 * 0.4;

  // Manchas escuras raras (sunspots)
  float spot = smoothstep(0.82, 0.92, fbm(p * 3.0 + vec3(uTime * 0.01)));

  // Limb darkening — borda escurece
  float limb = pow(max(0.0, dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 0.45);

  // Cores: núcleo branco-quente → laranja → vermelho profundo
  vec3 hot  = vec3(1.0, 0.97, 0.88);
  vec3 warm = vec3(1.0, 0.72, 0.38);
  vec3 red  = vec3(0.92, 0.20, 0.12);

  vec3 col = mix(warm, hot, smoothstep(0.35, 0.75, granules));
  col = mix(col, red, smoothstep(0.0, 0.35, 1.0 - granules) * 0.5);
  col = mix(col, red * 0.35, spot * 0.75);

  col *= mix(0.55, 1.0, limb);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------- Shader de coroa (billboard esférico) ----------
const coronaFrag = /* glsl */ `
precision highp float;
varying vec3 vLocalPos;
varying vec3 vNormal;
uniform float uTime;
uniform vec3  uColor;
uniform float uIntensity;
uniform float uFalloff;

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.07; a *= 0.5; }
  return v;
}

void main() {
  vec3 p = normalize(vLocalPos);
  // "flares" turbulentos radiais
  float turb = fbm(p * 3.0 + vec3(uTime * 0.08));
  float alpha = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), uFalloff);
  alpha *= mix(0.55, 1.2, turb);
  vec3 col = uColor * uIntensity * mix(0.7, 1.4, turb);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

export default function Sun({ size = 0.9 }: { size?: number }) {
  const photo = useRef<THREE.Mesh>(null);
  const corona1 = useRef<THREE.Mesh>(null);
  const corona2 = useRef<THREE.Mesh>(null);
  const corona3 = useRef<THREE.Mesh>(null);
  const promRing = useRef<THREE.Mesh>(null);

  const photoUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const coronaInner = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#FFD4A8') },
      uIntensity: { value: 1.6 },
      uFalloff: { value: 2.2 },
    }),
    [],
  );
  const coronaMid = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(DELP_RED) },
      uIntensity: { value: 1.0 },
      uFalloff: { value: 2.6 },
    }),
    [],
  );
  const coronaOuter = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(DELP_RED_DEEP) },
      uIntensity: { value: 0.55 },
      uFalloff: { value: 3.2 },
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    photoUniforms.uTime.value = t;
    coronaInner.uTime.value = t;
    coronaMid.uTime.value = t;
    coronaOuter.uTime.value = t;

    if (photo.current) photo.current.rotation.y = t * 0.07;

    // Pulsações independentes dão "respiração" à coroa
    const pulseA = 1 + Math.sin(t * 0.9) * 0.015;
    const pulseB = 1 + Math.sin(t * 1.3 + 0.7) * 0.02;
    const pulseC = 1 + Math.sin(t * 0.6 + 1.3) * 0.025;
    if (corona1.current) corona1.current.scale.setScalar(size * 1.18 * pulseA);
    if (corona2.current) corona2.current.scale.setScalar(size * 1.55 * pulseB);
    if (corona3.current) corona3.current.scale.setScalar(size * 2.4  * pulseC);

    if (promRing.current) {
      promRing.current.rotation.z = t * 0.08;
      promRing.current.rotation.x = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <group>
      {/* Coroa externa — vermelho profundo */}
      <mesh ref={corona3}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          vertexShader={photoVert}
          fragmentShader={coronaFrag}
          uniforms={coronaOuter}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Coroa média — vermelho Delp */}
      <mesh ref={corona2}>
        <sphereGeometry args={[1, 40, 40]} />
        <shaderMaterial
          vertexShader={photoVert}
          fragmentShader={coronaFrag}
          uniforms={coronaMid}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Coroa interna — dourada/quente */}
      <mesh ref={corona1}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial
          vertexShader={photoVert}
          fragmentShader={coronaFrag}
          uniforms={coronaInner}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Fotosfera procedural — granulação + limb darkening */}
      <mesh ref={photo} scale={size}>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial
          vertexShader={photoVert}
          fragmentShader={photoFrag}
          uniforms={photoUniforms}
          toneMapped={false}
        />
      </mesh>

      {/* Anel de proeminências — leve toro em plano inclinado */}
      <mesh ref={promRing} rotation={[Math.PI / 2, 0, 0]} scale={size * 1.12}>
        <torusGeometry args={[1, 0.025, 16, 96]} />
        <meshBasicMaterial
          color={CORONA_WARM}
          transparent
          opacity={0.55}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Luz real que ilumina o sistema */}
      <pointLight color={LIGHT_WARM} intensity={2.2} distance={38} decay={1.1} />
      {/* Segunda luz muito fraca do lado oposto — simula rebatida de poeira interplanetária,
         evita terminadores 100% pretos. */}
      <pointLight color="#203048" intensity={0.25} distance={40} decay={2} position={[-4, 2, -4]} />
    </group>
  );
}

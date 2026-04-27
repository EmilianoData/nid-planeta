'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Erupção de massa coronal — onda expansiva que sai do Sol a cada ~30-60s.
 * Um único sprite aditivo que cresce e desaparece. Zero custo entre erupções.
 */
const flareVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const flareFrag = /* glsl */ `
precision highp float;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocal;
uniform vec3 uColor;
uniform float uIntensity;

float hash(vec3 p){p=fract(p*0.3183+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){
  vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
        mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
        mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}

void main(){
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormal);
  float fres = pow(1.0 - abs(dot(N, V)), 2.5);
  float turb = vnoise(normalize(vLocal) * 4.0);
  float a = fres * mix(0.6, 1.3, turb) * uIntensity;
  vec3 col = uColor * mix(0.7, 1.4, turb) * uIntensity;
  gl_FragColor = vec4(col * a, a);
}
`;

export default function SolarFlare() {
  const shell = useRef<THREE.Mesh>(null);

  const startRef = useRef<number>(2 + Math.random() * 5); // primeira erupção em 8-28s
  const durationRef = useRef<number>(2.2);
  const maxScaleRef = useRef<number>(7);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#FF8840') },
      uIntensity: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    if (!shell.current) return;
    const t = state.clock.elapsedTime;
    const dt = t - startRef.current;
    if (dt < 0) {
      uniforms.uIntensity.value = 0;
      shell.current.scale.setScalar(0.01);
      return;
    }
    if (dt > durationRef.current) {
      // agenda próxima erupção em 30-60s
      startRef.current = t + 30 + Math.random() * 30;
      durationRef.current = 1.6 + Math.random() * 1.4;
      maxScaleRef.current = 5 + Math.random() * 4;
      uniforms.uIntensity.value = 0;
      return;
    }
    const u = dt / durationRef.current; // 0..1
    // expansão rápida, fade in/out
    const scale = 0.4 + u * maxScaleRef.current;
    shell.current.scale.setScalar(scale);
    const envelope = Math.sin(u * Math.PI);
    uniforms.uIntensity.value = envelope * 1.2;
    // cor shift: amarelo → vermelho conforme expande
    const c = 1 - u * 0.6;
    uniforms.uColor.value.setRGB(1.0, 0.55 * c + 0.15, 0.2 * c);
  });

  return (
    <mesh ref={shell}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        vertexShader={flareVert}
        fragmentShader={flareFrag}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

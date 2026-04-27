'use client';

import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import SolarSystem from './SolarSystem';
import Controls from './Controls';
import Nebula from './Nebula';
import ShootingStars from './ShootingStars';

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 4, 14], fov: 55 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        // Linear workflow para bloom e HDR olharem certos
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={['#02040A']} />
      {/* ambiente muito fraco e frio — espaço = escuro */}
      <ambientLight intensity={0.06} color="#1a2238" />
      <Nebula />
      {/* Estrelas em 2 camadas pra paralaxe + mais realismo */}
      <Stars radius={180} depth={80} count={6400} factor={3.8} fade speed={0.3} />
      <Stars radius={90}  depth={30} count={1800} factor={2.2} fade speed={0.6} />
      <ShootingStars />
      <SolarSystem />
      <Controls />

      <EffectComposer multisampling={4}>
        <Bloom intensity={1.0} luminanceThreshold={0.22} luminanceSmoothing={0.85} mipmapBlur />
        <Vignette offset={0.28} darkness={0.9} eskil={false} />
      </EffectComposer>
    </Canvas>
  );
}

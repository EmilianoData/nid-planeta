'use client';

import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import SolarSystem from './SolarSystem';
import Controls from './Controls';
import Nebula from './Nebula';
import ShootingStars from './ShootingStars';

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 4, 14], fov: 55 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#03060D']} />
      <ambientLight intensity={0.15} />
      <Nebula />
      <Stars radius={120} depth={60} count={5200} factor={4.2} fade speed={0.8} />
      <ShootingStars />
      <SolarSystem />
      <Controls />

      <EffectComposer multisampling={2}>
        <Bloom intensity={1.25} luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette offset={0.3} darkness={0.88} eskil={false} />
      </EffectComposer>
    </Canvas>
  );
}

'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Sparkles, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  PETRONIUS_MATERIAL,
  derivePetroniusMaterials,
  PETRONIUS_GLB_OPTIONS,
} from '@/lib/landing/avatarMaterial';
import PetroniusGLB from './PetroniusGLB';

/* Warm every candidate GLB so flipping the dev picker is instant. */
Object.values(PETRONIUS_GLB_OPTIONS).forEach((opt) => {
  useGLTF.preload(opt.url);
});

/**
 * Petronius — parametric 3D mascot built from R3F primitives.
 *
 * No GLB asset. Geometry is composed of spheres / cylinders / capsule for the
 * head, eyes, NID cap, and shoulders. Materials come from
 * `derivePetroniusMaterials(PETRONIUS_MATERIAL)` so the look is controlled by
 * 6 hex/scalar values in `lib/landing/avatarMaterial.ts`.
 *
 * Inspired by Moncy's character (`spine006` head bone rotated by mouse), but
 * simpler: a single `headPivot` Group rotates by lerp toward the cursor, eyes
 * pupils track separately with faster damping, and blink is a scaleY pulse on
 * an eye container every 3-6s.
 *
 * Props
 * -----
 * - `typing`: when true (Act 2), the head tilts down slightly and stops
 *   following the cursor — Petronius is looking at his monitor.
 * - `gaze`:   optional override {x,y} ∈ [-1,1]. If provided, replaces the
 *   internal cursor listener (used by Act 2 monitor-lock from
 *   PetroniusAvatar.tsx).
 */
export default function Avatar3D({
  typing = false,
  gaze,
  glbKey,
}: {
  typing?: boolean;
  gaze?: { x: number; y: number };
  /** When set, loads `PETRONIUS_GLB_OPTIONS[glbKey]`. When null/undefined,
   *  renders the parametric primitives version. */
  glbKey?: string | null;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 4.8], fov: 28 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        /* Explicit transparent clear — `alpha: true` only PERMITS transparency;
         * the renderer's default clearColor is (0,0,0,1) which paints an opaque
         * black rectangle every frame. We force a fully transparent clear so
         * the landing background bleeds through. */
        gl.setClearColor(0x000000, 0);
        gl.setClearAlpha(0);
      }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <PetroniusRig typing={typing} gaze={gaze} glbKey={glbKey} />
    </Canvas>
  );
}

/* ------------------------------------------------------------------ *
 * Scene contents — lights + character.
 * ------------------------------------------------------------------ */

function PetroniusRig({
  typing,
  gaze,
  glbKey,
}: {
  typing: boolean;
  gaze?: { x: number; y: number };
  glbKey?: string | null;
}) {
  const mats = useMemo(() => derivePetroniusMaterials(PETRONIUS_MATERIAL), []);
  const glb = glbKey ? PETRONIUS_GLB_OPTIONS[glbKey] : null;

  /* Belt-and-suspenders: explicitly null the scene background AND every clear
   * path on the renderer. Sometimes drei's <Environment> or HMR can leave a
   * stale background reference even with `background={false}`. */
  const { scene, gl } = useThree();
  useEffect(() => {
    scene.background = null;
    gl.setClearColor(0x000000, 0);
    gl.setClearAlpha(0);
    gl.autoClear = true;
    gl.autoClearColor = true;
    gl.autoClearDepth = true;
  }, [scene, gl]);

  return (
    <>
      {/* IBL — soft studio environment for clearcoat reflections only.
       *  background={false} prevents drei from setting `scene.background` to
       *  the HDR, which would override our transparent gl alpha and paint a
       *  studio rectangle behind the avatar. */}
      <Environment preset="studio" environmentIntensity={0.45} background={false} />

      {/* Key (warm, top-right) */}
      <directionalLight
        position={[2.4, 3.2, 2.6]}
        intensity={1.15}
        color={mats.keyLight}
      />
      {/* Fill (cool, front-left) */}
      <directionalLight
        position={[-2.8, 0.8, 2.4]}
        intensity={0.55}
        color={mats.fillLight}
      />
      {/* Rim — accent orange behind/above to separate Petronius from the bg. */}
      <pointLight
        position={[0, 2.2, -2.6]}
        intensity={6}
        distance={6}
        color={mats.rimLight}
      />
      <pointLight
        position={[-1.4, -1.1, -2.4]}
        intensity={2.5}
        distance={5}
        color={mats.rimLightSoft}
      />
      <ambientLight intensity={0.18} color="#3c3489" />

      {glb ? (
        <Suspense fallback={<Petronius typing={typing} gaze={gaze} mats={mats} />}>
          <PetroniusGLB
            url={glb.url}
            typing={typing}
            gaze={gaze}
            rotationMode={glb.rotationMode}
            fitHeight={glb.fitHeight}
            pulseColor={glb.pulseColor}
            bobAmplitude={glb.bobAmplitude}
            frontYaw={glb.frontYaw}
            dragRotate={glb.dragRotate}
          />
        </Suspense>
      ) : (
        <Petronius typing={typing} gaze={gaze} mats={mats} />
      )}

      {/* Holographic pedestal — two concentric emissive rings + soft disc. */}
      {glb?.pedestal && <HoloPedestal accent={glb.pulseColor ?? 'ff9c40'} />}

      {/* Floating sparkles around the avatar — sci-fi flair. */}
      {glb?.sparkles && (
        <Sparkles
          count={48}
          scale={[2.6, 3.2, 2.6]}
          position={[0, 0.3, 0]}
          size={4}
          speed={0.35}
          opacity={0.85}
          color={'#' + (glb.pulseColor ?? 'ff9c40')}
        />
      )}

      <ContactShadows
        position={[0, -1.4, 0]}
        opacity={0.42}
        scale={5}
        blur={2.6}
        far={2.2}
        color="#000"
      />
      {/* Bloom substituted by CSS `filter: drop-shadow` on `.petronius-canvas`
       *  — see landing.css. WebGL EffectComposer was forcing an opaque clear
       *  that broke the canvas alpha. CSS drop-shadow glows the silhouette
       *  of the avatar (orange visor bleeds outward) while keeping the
       *  background fully transparent. */}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Holographic pedestal — two rotating emissive rings + soft floor disc.
 * Pure procedural, no assets. Sells the "Petronius is summoned" vibe.
 * ------------------------------------------------------------------ */

function HoloPedestal({ accent }: { accent: string }) {
  const ringInner = useRef<THREE.Mesh>(null);
  const ringOuter = useRef<THREE.Mesh>(null);
  const color = useMemo(() => '#' + accent.replace('#', ''), [accent]);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    if (ringInner.current) ringInner.current.rotation.z = t * 0.6;
    if (ringOuter.current) ringOuter.current.rotation.z = -t * 0.35;
  });

  return (
    <group position={[0, -1.36, 0]}>
      {/* Soft glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} />
      </mesh>

      {/* Outer ring — thick, slow */}
      <mesh ref={ringOuter} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.18, 1.22, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Inner ring — thinner, faster */}
      <mesh ref={ringInner} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.92, 0.95, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Tick marks — 12 short segments around the outer ring for a HUD feel */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = 1.32;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 0.025, Math.sin(a) * r]}
            rotation={[-Math.PI / 2, 0, -a]}
          >
            <planeGeometry args={[0.045, 0.12]} />
            <meshBasicMaterial color={color} transparent opacity={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Petronius — geometry + behaviors.
 * ------------------------------------------------------------------ */

type Mats = ReturnType<typeof derivePetroniusMaterials>;

function Petronius({
  typing,
  gaze,
  mats,
}: {
  typing: boolean;
  gaze?: { x: number; y: number };
  mats: Mats;
}) {
  /* Refs we animate per-frame — never via React state. */
  const headPivot = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const pupilL = useRef<THREE.Mesh>(null);
  const pupilR = useRef<THREE.Mesh>(null);
  const blinkLid = useRef<{ k: number }>({ k: 1 });

  const { size } = useThree();

  /* Mouse tracking — written via ref, read in useFrame. */
  const mouse = useRef({ x: 0, y: 0 });
  const idleAt = useRef(performance.now());
  useEffect(() => {
    if (gaze) return; // external gaze overrides cursor.
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      idleAt.current = performance.now();
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [gaze, size]);

  /* Blink scheduler — toggles blinkLid.k between 1 and 0.05 for ~110ms. */
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const wait = 2800 + Math.random() * 3200;
      window.setTimeout(() => {
        if (!alive) return;
        blinkLid.current.k = 0.05;
        window.setTimeout(() => {
          if (!alive) return;
          blinkLid.current.k = 1;
          tick();
        }, 115);
      }, wait);
    };
    tick();
    return () => {
      alive = false;
    };
  }, []);

  /* Per-frame: lerp head + pupils toward target, apply blink scaleY. */
  useFrame((_, dt) => {
    if (!headPivot.current) return;

    // Target gaze — explicit prop (Act 2) wins; otherwise idle-reset cursor.
    const idleMs = performance.now() - idleAt.current;
    const idleReset = idleMs > 2200 ? 0 : 1;
    const tx = (gaze?.x ?? mouse.current.x * idleReset) * (typing ? 0 : 1);
    const ty = (gaze?.y ?? mouse.current.y * idleReset) * (typing ? 0 : 1);

    /* Head rotates a fraction of the gaze — subtle, like Moncy's spine bone. */
    const targetRotY = tx * 0.5 + (typing ? 0 : 0); // ~28°
    const targetRotX = ty * 0.35 + (typing ? 0.32 : 0); // tilt down when typing
    const lerp = 1 - Math.exp(-dt * 5.5);
    headPivot.current.rotation.y +=
      (targetRotY - headPivot.current.rotation.y) * lerp;
    headPivot.current.rotation.x +=
      (targetRotX - headPivot.current.rotation.x) * lerp;

    /* Pupils — faster damping than head; clamped offset. */
    const pupilLerp = 1 - Math.exp(-dt * 9);
    const px = clamp(tx * 0.06, -0.06, 0.06);
    const py = clamp(-ty * 0.04, -0.04, 0.04);
    [pupilL, pupilR].forEach((p) => {
      if (!p.current) return;
      p.current.position.x += (px - p.current.position.x) * pupilLerp;
      p.current.position.y += (py - p.current.position.y) * pupilLerp;
    });

    /* Blink — scaleY of the eye container approaches blinkLid.k. */
    const blinkLerp = 1 - Math.exp(-dt * 28);
    const k = blinkLid.current.k;
    [eyeL, eyeR].forEach((g) => {
      if (!g.current) return;
      g.current.scale.y += (k - g.current.scale.y) * blinkLerp;
    });
  });

  return (
    <group ref={headPivot} position={[0, 0.05, 0]}>
      {/* ============ HEAD ============ */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.92, 64, 64]} />
        <meshPhysicalMaterial
          color={mats.face.color}
          metalness={mats.face.metalness}
          roughness={mats.face.roughness}
          clearcoat={mats.face.clearcoat}
          clearcoatRoughness={mats.face.clearcoatRoughness}
        />
      </mesh>

      {/* ============ EYES ============ */}
      {/* Left eye */}
      <group ref={eyeL} position={[-0.31, 0.45, 0.78]}>
        {/* sclera */}
        <mesh>
          <sphereGeometry args={[0.16, 32, 32]} />
          <meshStandardMaterial
            color={mats.eyeSclera.color}
            metalness={mats.eyeSclera.metalness}
            roughness={mats.eyeSclera.roughness}
          />
        </mesh>
        {/* iris (slightly forward) */}
        <mesh position={[0, 0, 0.11]}>
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial
            color={mats.eyeIris.color}
            metalness={mats.eyeIris.metalness}
            roughness={mats.eyeIris.roughness}
            emissive={mats.eyeIris.emissive}
            emissiveIntensity={mats.eyeIris.emissiveIntensity}
          />
        </mesh>
        {/* pupil — referenced for tracking */}
        <mesh ref={pupilL} position={[0, 0, 0.155]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial
            color={mats.pupil.color}
            metalness={mats.pupil.metalness}
            roughness={mats.pupil.roughness}
          />
        </mesh>
        {/* specular catchlight — tiny white sphere offset top-right */}
        <mesh position={[0.025, 0.025, 0.17]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Right eye — mirror */}
      <group ref={eyeR} position={[0.31, 0.45, 0.78]}>
        <mesh>
          <sphereGeometry args={[0.16, 32, 32]} />
          <meshStandardMaterial
            color={mats.eyeSclera.color}
            metalness={mats.eyeSclera.metalness}
            roughness={mats.eyeSclera.roughness}
          />
        </mesh>
        <mesh position={[0, 0, 0.11]}>
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial
            color={mats.eyeIris.color}
            metalness={mats.eyeIris.metalness}
            roughness={mats.eyeIris.roughness}
            emissive={mats.eyeIris.emissive}
            emissiveIntensity={mats.eyeIris.emissiveIntensity}
          />
        </mesh>
        <mesh ref={pupilR} position={[0, 0, 0.155]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial
            color={mats.pupil.color}
            metalness={mats.pupil.metalness}
            roughness={mats.pupil.roughness}
          />
        </mesh>
        <mesh position={[0.025, 0.025, 0.17]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* ============ MOUTH ============ */}
      {/* Curved line: thin torus arc rotated to a smile/neutral. */}
      <mesh position={[0, 0.12, 0.86]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.12, 0.018, 12, 24, Math.PI]} />
        <meshStandardMaterial
          color={mats.pupil.color}
          metalness={0.1}
          roughness={0.55}
        />
      </mesh>

      {/* ============ CAP ============ */}
      {/* Cap shell — flattened sphere on top of the head */}
      <mesh position={[0, 0.95, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.95, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={mats.cap.color}
          metalness={mats.cap.metalness}
          roughness={mats.cap.roughness}
        />
      </mesh>
      {/* Cap brim — short cylinder in front */}
      <mesh position={[0, 0.86, 0.62]} rotation={[Math.PI / 2.4, 0, 0]}>
        <cylinderGeometry args={[0.78, 0.62, 0.14, 32, 1, true]} />
        <meshStandardMaterial
          color={mats.cap.color}
          metalness={mats.cap.metalness}
          roughness={mats.cap.roughness}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* NID patch on cap — small rounded box centered front */}
      <mesh position={[0, 1.07, 0.66]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.32, 0.14, 0.04]} />
        <meshStandardMaterial
          color={mats.capPatch.color}
          metalness={mats.capPatch.metalness}
          roughness={mats.capPatch.roughness}
          emissive={mats.capPatch.emissive}
          emissiveIntensity={mats.capPatch.emissiveIntensity}
        />
      </mesh>

      {/* ============ NECK + SHOULDERS ============ */}
      <mesh position={[0, -0.46, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.32, 24]} />
        <meshStandardMaterial
          color={mats.body.color}
          metalness={mats.body.metalness}
          roughness={mats.body.roughness}
        />
      </mesh>
      {/* Shoulders — wide flattened capsule */}
      <mesh position={[0, -0.92, 0]} scale={[1.45, 0.45, 1]}>
        <sphereGeometry args={[0.9, 32, 24]} />
        <meshStandardMaterial
          color={mats.body.color}
          metalness={mats.body.metalness}
          roughness={mats.body.roughness}
        />
      </mesh>
      {/* NID chest badge */}
      <mesh position={[0, -0.7, 0.62]}>
        <boxGeometry args={[0.32, 0.14, 0.04]} />
        <meshStandardMaterial
          color={mats.capPatch.color}
          metalness={mats.capPatch.metalness}
          roughness={mats.capPatch.roughness}
          emissive={mats.capPatch.emissive}
          emissiveIntensity={mats.capPatch.emissiveIntensity * 0.7}
        />
      </mesh>
    </group>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

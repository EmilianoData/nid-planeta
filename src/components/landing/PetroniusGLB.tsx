'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Petronius from a GLB asset.
 *
 * Supports three head-rotation strategies (chosen by the caller via
 * `rotationMode`), because the GLBs we're testing come from different
 * pipelines with very different rig assumptions:
 *
 *   • 'bone'        — Mixamo / ReadyPlayerMe / TalkingHead style: there's a
 *                     named head bone in the skin's joint list. Best look.
 *   • 'topCluster'  — Multi-mesh GLB without bones (e.g. Blocks Humanoid).
 *                     We compute each mesh's Y centroid and re-parent the
 *                     top N meshes under a synthetic pivot, then rotate that.
 *   • 'whole'       — Single rigid mesh (e.g. Robocop). We rotate the entire
 *                     loaded scene as a bobblehead. Subtle.
 *
 * Auto-fit: every GLB is re-centered and scaled to match `fitHeight` units
 * tall, with feet at y ≈ -1.4 (matching the ContactShadows in Avatar3D).
 */

export type RotationMode = 'bone' | 'topCluster' | 'whole';

interface Props {
  url: string;
  typing: boolean;
  rotationMode: RotationMode;
  fitHeight?: number;
  gaze?: { x: number; y: number };
  /** Hex color (no '#') of the accent material to pulse with emissive light.
   *  When set, every material whose baseColor approximately matches will
   *  receive an animated emissive driven by sin(t). The "wow" pulse. */
  pulseColor?: string;
  /** Subtle Y-bob (units) of the root so the figure feels alive.
   *  Default 0 — set 0.04 for Robocop to add a breathing float. */
  bobAmplitude?: number;
  /** Initial yaw (radians) applied to the scene root. Use Math.PI to flip
   *  models that come facing away from the camera. */
  frontYaw?: number;
  /** Allow click-drag to free-rotate the figure. */
  dragRotate?: boolean;
}

export default function PetroniusGLB({
  url,
  typing,
  rotationMode,
  fitHeight = 2.6,
  gaze,
  pulseColor,
  bobAmplitude = 0,
  frontYaw = 0,
  dragRotate = false,
}: Props) {
  const { scene } = useGLTF(url);

  /* Clone so multiple instances don't share mutable state. */
  const cloned = useMemo(() => scene.clone(true), [scene]);

  /* Auto-fit + rig detection runs once per loaded GLB. */
  const fit = useMemo(
    () => fitAndDetectFull(cloned, fitHeight, rotationMode, pulseColor, frontYaw),
    [cloned, fitHeight, rotationMode, pulseColor, frontYaw]
  );

  /* Track mouse proximity for hover intensity boost on the emissive pulse. */
  const proximity = useRef(0); // 0 = far, 1 = cursor near center
  useEffect(() => {
    if (!pulseColor) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dx = (e.clientX / w) * 2 - 1;
      const dy = (e.clientY / h) * 2 - 1;
      const d = Math.hypot(dx, dy);
      /* Proximity = 1 at center, 0 at corners (d ≈ 1.4). */
      proximity.current = Math.max(0, 1 - d / 1.1);
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [pulseColor]);

  /* Baseline Y for idle bob — set after auto-fit positions the root. */
  const baselineY = useRef(0);
  useEffect(() => {
    baselineY.current = cloned.position.y;
  }, [cloned]);

  /* Drag-to-rotate state. While `dragging`, mouse delta accumulates into
   * `dragYaw`. After release, `dragYaw` decays back to 0 over ~1.6s and the
   * figure returns to passive cursor tracking. */
  const dragging = useRef(false);
  const dragYaw = useRef(0);
  const lastPointerX = useRef(0);
  const dragReleaseAt = useRef(0);
  const dragHoldRef = useRef(0); // 0..1, decays after release

  /* Cursor tracking — written via ref, read in useFrame. */
  const mouse = useRef({ x: 0, y: 0 });
  const idleAt = useRef(performance.now());
  useEffect(() => {
    if (gaze) return;
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      idleAt.current = performance.now();
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [gaze]);

  /* Blink — only meaningful when we have eye meshes or morphs. */
  const blinkValue = useRef(0);
  useEffect(() => {
    if (!fit.blinkable) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const wait = 2800 + Math.random() * 3200;
      window.setTimeout(() => {
        if (!alive) return;
        blinkValue.current = 1;
        window.setTimeout(() => {
          if (!alive) return;
          blinkValue.current = 0;
          tick();
        }, 115);
      }, wait);
    };
    tick();
    return () => {
      alive = false;
    };
  }, [fit.blinkable]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    /* Target — explicit gaze prop (Act 2 monitor lock) wins. */
    const idleMs = performance.now() - idleAt.current;
    const idleReset = idleMs > 2200 ? 0 : 1;
    const tx = (gaze?.x ?? mouse.current.x * idleReset) * (typing ? 0 : 1);
    const ty = (gaze?.y ?? mouse.current.y * idleReset) * (typing ? 0 : 1);

    /* Different rotation extents per mode — the whole body needs subtler
     * motion than a head bone or it looks like the model is falling over.
     * Bumped 'whole' yaw amplitude so cursor lean is clearly perceptible. */
    const yawAmp = rotationMode === 'whole' ? 0.4 : 0.5;
    const pitchAmp = rotationMode === 'whole' ? 0.18 : 0.35;
    const tilt = typing ? (rotationMode === 'whole' ? 0.12 : 0.32) : 0;

    if (fit.rotationTarget) {
      /* Add a subtle idle yaw drift on top of the mouse target — even when
       * the cursor is at rest the figure breathes side to side. */
      const idleYaw = Math.sin(t * 0.42) * (rotationMode === 'whole' ? 0.05 : 0);
      const passiveY = tx * yawAmp + idleYaw;
      const passiveX = ty * pitchAmp + tilt;

      /* Drag mix — while dragging, dragYaw dominates; after release it
       * decays so we return to passive cursor lean smoothly. */
      const sinceRelease = (performance.now() - dragReleaseAt.current) / 1000;
      const targetHold = dragging.current ? 1 : Math.max(0, 1 - sinceRelease / 1.6);
      dragHoldRef.current += (targetHold - dragHoldRef.current) * Math.min(1, dt * 8);
      if (!dragging.current && dragHoldRef.current < 0.02) dragYaw.current = 0;

      const totalY =
        fit.restRotationY + passiveY * (1 - dragHoldRef.current) +
        dragYaw.current * dragHoldRef.current;
      const totalX = passiveX;

      const k = 1 - Math.exp(-dt * (rotationMode === 'whole' ? 4.0 : 5.5));
      fit.rotationTarget.rotation.y +=
        (totalY - fit.rotationTarget.rotation.y) * k;
      fit.rotationTarget.rotation.x +=
        (totalX - fit.rotationTarget.rotation.x) * k;
    }

    /* Idle Y-bob — breathing float (rigid models only). */
    if (bobAmplitude > 0) {
      cloned.position.y = baselineY.current + Math.sin(t * 1.2) * bobAmplitude;
    }

    /* Emissive pulse on the accent material. Combine a base sine breath with
     * a proximity bump so moving the cursor near the avatar boosts the glow. */
    if (fit.pulseMaterials.length) {
      const breath = 0.55 + Math.sin(t * 2.1) * 0.18; // 0.37 .. 0.73
      const hover = proximity.current * 0.6;           // up to +0.6
      const intensity = Math.min(1.6, breath + hover);
      for (const mat of fit.pulseMaterials) {
        mat.emissiveIntensity = intensity;
      }
    }

    /* Blink — drive morph targets if any, else scaleY on eye meshes. */
    const blinkLerp = 1 - Math.exp(-dt * 28);
    if (fit.blinkMorphs.length) {
      for (const m of fit.blinkMorphs) {
        const cur = m.mesh.morphTargetInfluences![m.index];
        m.mesh.morphTargetInfluences![m.index] =
          cur + (blinkValue.current - cur) * blinkLerp;
      }
    } else if (fit.eyeMeshes.length) {
      const target = 1 - blinkValue.current * 0.92;
      for (const eye of fit.eyeMeshes) {
        eye.scale.y += (target - eye.scale.y) * blinkLerp;
      }
    }
  });

  /* Pointer handlers — only mounted if `dragRotate` is enabled. They're
   * attached to the cloned scene; R3F dispatches via raycasting on the
   * underlying meshes, and `setPointerCapture` keeps the drag alive even
   * if the cursor leaves the mesh. */
  const onPointerDown = dragRotate
    ? (e: any) => {
        e.stopPropagation();
        dragging.current = true;
        lastPointerX.current = e.clientX;
        try {
          (e.target as Element).setPointerCapture?.(e.pointerId);
        } catch {
          /* not all targets implement pointer capture; safe to ignore. */
        }
        document.body.style.cursor = 'grabbing';
      }
    : undefined;
  const onPointerMove = dragRotate
    ? (e: any) => {
        if (!dragging.current) return;
        const dx = e.clientX - lastPointerX.current;
        lastPointerX.current = e.clientX;
        dragYaw.current += dx * 0.012;
      }
    : undefined;
  const endDrag = (e: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    dragReleaseAt.current = performance.now();
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    document.body.style.cursor = '';
  };
  const onPointerOver = dragRotate
    ? () => {
        if (!dragging.current) document.body.style.cursor = 'grab';
      }
    : undefined;
  const onPointerOut = dragRotate
    ? () => {
        if (!dragging.current) document.body.style.cursor = '';
      }
    : undefined;

  return (
    <primitive
      object={cloned}
      dispose={null}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={dragRotate ? endDrag : undefined}
      onPointerLeave={dragRotate ? endDrag : undefined}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Auto-fit + rig detection — runs once per GLB load.
 * ------------------------------------------------------------------ */

const HEAD_NAMES = [
  'Head', 'head', 'HEAD', 'mixamorigHead', 'mixamorig:Head',
  'spine006', 'spine_06', 'Spine6', 'CC_Base_Head',
  'Bip01 Head', 'def_head', 'B-head',
];

const BLINK_MORPH_NAMES = [
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed',
  'Blink_Left', 'Blink_Right', 'blink_L', 'blink_R',
  'Blink', 'blink', 'EyeBlink', 'eye_blink',
];

interface FitResult {
  rotationTarget: THREE.Object3D | null;
  blinkable: boolean;
  blinkMorphs: { mesh: THREE.Mesh; index: number }[];
  eyeMeshes: THREE.Mesh[];
  /** Materials matched against `pulseColor` — emissive driven by useFrame. */
  pulseMaterials: THREE.MeshStandardMaterial[];
  /** Base Y rotation that the lean/drag deltas add to. For 'whole' mode this
   *  is `frontYaw` (so the figure rests facing the camera). For 'bone' /
   *  'topCluster' it's 0 because frontYaw was already applied to root. */
  restRotationY: number;
}

function fitAndDetectFull(
  root: THREE.Object3D,
  fitHeight: number,
  mode: RotationMode,
  pulseColor?: string,
  frontYaw = 0
): FitResult {
  /* --- 1. compute bounding box of the loaded scene --- */
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const currentHeight = Math.max(size.y, 0.0001);
  const scale = fitHeight / currentHeight;

  /* --- 2. re-position so feet land near y = -1.4 (matches ContactShadows) --- */
  root.scale.setScalar(scale);
  /* Recompute after scale to position correctly. */
  const newBox = new THREE.Box3().setFromObject(root);
  const newSize = new THREE.Vector3();
  const newCenter = new THREE.Vector3();
  newBox.getSize(newSize);
  newBox.getCenter(newCenter);

  /* shift so feet sit at -1.4, recenter X/Z */
  root.position.x -= newCenter.x;
  root.position.z -= newCenter.z;
  root.position.y -= newBox.min.y + 1.4;

  /* Apply initial yaw so models that come facing -Z (obj2gltf default) end
   * up facing the camera. For modes where rotation is applied to a child
   * (bone/topCluster), we bake frontYaw into the root once. For 'whole'
   * mode the root IS the rotation target, so we'll pass frontYaw through
   * restRotationY and let useFrame combine it with the lean delta. */
  const wholeMode = mode === 'whole';
  if (frontYaw && !wholeMode) {
    root.rotation.y = frontYaw;
  }

  /* --- 3. find rotation target per mode --- */
  let rotationTarget: THREE.Object3D | null = null;

  if (mode === 'bone') {
    rotationTarget = findHeadBone(root);
    if (!rotationTarget) {
      console.warn(
        '[PetroniusGLB] mode=bone but no head bone matched. Tried:',
        HEAD_NAMES
      );
    }
  } else if (mode === 'topCluster') {
    rotationTarget = buildTopClusterPivot(root);
  } else if (mode === 'whole') {
    rotationTarget = root;
  }

  /* --- 4. blink detection --- */
  const { blinkMorphs, eyeMeshes } = scanBlinkTargets(root);
  const blinkable = blinkMorphs.length > 0 || eyeMeshes.length > 0;

  /* --- 5. accent material detection (pulse target) --- */
  const pulseMaterials = pulseColor ? findAccentMaterials(root, pulseColor) : [];
  /* Pre-arm pulseMaterials so emissive isn't pitch-black at frame 0. */
  pulseMaterials.forEach((m) => {
    m.emissive = new THREE.Color('#' + pulseColor!.replace('#', ''));
    m.emissiveIntensity = 0.55;
    m.toneMapped = true;
    m.needsUpdate = true;
  });

  const restRotationY = wholeMode ? frontYaw : 0;

  console.log('[PetroniusGLB] loaded', {
    mode,
    rotationTarget: rotationTarget?.name ?? '(none)',
    scaledBy: scale.toFixed(2),
    blinkMorphs: blinkMorphs.length,
    eyeMeshes: eyeMeshes.length,
    pulseMaterials: pulseMaterials.length,
    restRotationY,
  });

  return {
    rotationTarget,
    blinkable,
    blinkMorphs,
    eyeMeshes,
    pulseMaterials,
    restRotationY,
  };
}

/**
 * Find every MeshStandardMaterial whose baseColor approximately matches the
 * accent hex. We compare in sRGB space with a generous tolerance so close
 * hues are caught even with tone mapping shifts.
 */
function findAccentMaterials(
  root: THREE.Object3D,
  hex: string
): THREE.MeshStandardMaterial[] {
  const target = new THREE.Color('#' + hex.replace('#', ''));
  const found = new Set<THREE.MeshStandardMaterial>();

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (
        mat instanceof THREE.MeshStandardMaterial &&
        mat.color &&
        colorClose(mat.color, target, 0.12)
      ) {
        found.add(mat);
      }
    }
  });

  return [...found];
}

function colorClose(a: THREE.Color, b: THREE.Color, tol: number): boolean {
  return (
    Math.abs(a.r - b.r) < tol &&
    Math.abs(a.g - b.g) < tol &&
    Math.abs(a.b - b.b) < tol
  );
}

function findHeadBone(root: THREE.Object3D): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!found && HEAD_NAMES.some((n) => o.name === n || o.name.endsWith(n))) {
      found = o;
    }
  });
  return found;
}

/**
 * For a rigless multi-mesh GLB (Blocks Humanoid), find the meshes whose
 * geometric centroid is in the top fraction of the bounding box (default
 * top 25 %) and re-parent them under a synthetic pivot so we can rotate
 * the whole "head cluster" as a unit.
 *
 * Returns the pivot, or null if no meshes qualified (rare).
 */
function buildTopClusterPivot(root: THREE.Object3D): THREE.Object3D | null {
  /* World-space bbox of the entire model. */
  const fullBox = new THREE.Box3().setFromObject(root);
  const fullSize = new THREE.Vector3();
  fullBox.getSize(fullSize);
  const yMin = fullBox.min.y;
  const yMax = fullBox.max.y;
  const headStartY = yMax - fullSize.y * 0.28; // top 28%

  const candidates: { mesh: THREE.Object3D; centroidY: number }[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const meshBox = new THREE.Box3().setFromObject(o);
    const meshCenter = new THREE.Vector3();
    meshBox.getCenter(meshCenter);
    if (meshCenter.y >= headStartY) {
      candidates.push({ mesh: o, centroidY: meshCenter.y });
    }
  });

  if (!candidates.length) {
    console.warn('[PetroniusGLB] topCluster: no meshes in top 28% of model.');
    return null;
  }

  /* Compute the cluster center to position the pivot correctly. */
  const clusterCenter = new THREE.Vector3();
  candidates.forEach(({ mesh }) => {
    const c = new THREE.Vector3();
    new THREE.Box3().setFromObject(mesh).getCenter(c);
    clusterCenter.add(c);
  });
  clusterCenter.divideScalar(candidates.length);

  /* Create the pivot at the cluster center, attached to the scene root, then
   * re-parent each candidate mesh into it (preserving world transform). */
  const pivot = new THREE.Group();
  pivot.name = '__synthHeadPivot';
  /* Convert cluster center from world space to root's local space. */
  const localCenter = clusterCenter.clone();
  root.worldToLocal(localCenter);
  pivot.position.copy(localCenter);
  root.add(pivot);

  candidates.forEach(({ mesh }) => {
    pivot.attach(mesh); // preserves world transform
  });

  console.log(
    `[PetroniusGLB] topCluster: re-parented ${candidates.length} meshes ` +
    `above y=${headStartY.toFixed(2)} under synthetic pivot.`
  );

  return pivot;
}

function scanBlinkTargets(root: THREE.Object3D) {
  const blinkMorphs: { mesh: THREE.Mesh; index: number }[] = [];
  const eyeMeshes: THREE.Mesh[] = [];

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const dict = o.morphTargetDictionary;
    if (dict && o.morphTargetInfluences) {
      for (const name of Object.keys(dict)) {
        if (
          BLINK_MORPH_NAMES.some(
            (b) => name === b || name.toLowerCase().includes(b.toLowerCase())
          )
        ) {
          blinkMorphs.push({ mesh: o, index: dict[name] });
        }
      }
    }
    if (/eye|iris|sclera/i.test(o.name)) {
      eyeMeshes.push(o);
    }
  });

  return { blinkMorphs, eyeMeshes };
}

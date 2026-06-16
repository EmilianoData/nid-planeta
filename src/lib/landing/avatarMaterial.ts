/* ============================================================ *
 * GLB SWITCH — change these when you drop a .glb model.
 * ============================================================ */

/**
 * Available Petronius GLB candidates. Keys become URL query values:
 *   /?avatar=robocop   →  loads /avatars/Robocop.glb
 *   /?avatar=blocks    →  loads /avatars/Blocks Humanoid.glb
 *   /?avatar=parametric →  forces the procedural primitives version
 *
 * Each entry can declare hints that PetroniusGLB.tsx uses to choose the right
 * head-rotation strategy:
 *   - rotationMode: 'bone' (named bone)
 *                 | 'topCluster' (position heuristic across meshes)
 *                 | 'whole' (rotate the entire scene)
 */
export interface AvatarOption {
  url: string;
  label: string;
  rotationMode: 'bone' | 'topCluster' | 'whole';
  /** Approx vertical size of the model in scene units — used by auto-fit. */
  fitHeight?: number;
  /** Hex (no '#') of the accent material to drive emissive pulse on. */
  pulseColor?: string;
  /** Idle Y-bob amplitude in scene units (0 = no float). */
  bobAmplitude?: number;
  /** Initial yaw (radians) to apply to the loaded scene. Use Math.PI to flip
   *  a model that comes facing away from the camera (common from obj2gltf). */
  frontYaw?: number;
  /** Allow click-drag to free-rotate the figure (released → returns to
   *  passive cursor tracking). */
  dragRotate?: boolean;
  /** Show a holographic ring/pedestal underneath the avatar. */
  pedestal?: boolean;
  /** Wrap the avatar in floating sparkle particles (drei <Sparkles>). */
  sparkles?: boolean;
  /** Per-model description shown in the dev picker. */
  hint: string;
}

export const PETRONIUS_GLB_OPTIONS: Record<string, AvatarOption> = {
  robocop: {
    url: '/avatars/robocop.glb',
    label: 'Robocop',
    rotationMode: 'whole',
    fitHeight: 2.6,
    pulseColor: 'ff9c40', // visor accent material → emissive pulse
    bobAmplitude: 0.045,
    frontYaw: Math.PI, // GLB exported facing -Z → flip to face camera
    dragRotate: true,
    pedestal: true,
    sparkles: true,
    hint: 'JARVIS · visor pulse + bob + drag-to-rotate',
  },
  blocks: {
    url: '/avatars/blocks-humanoid.glb',
    label: 'Blocks Humanoid',
    rotationMode: 'topCluster',
    fitHeight: 2.6,
    hint: '55 peças · heurística posicional pra girar a cabeça',
  },
};

/** Fallback when no `?avatar=` query is set. */
export const DEFAULT_AVATAR_KEY = 'parametric';

/**
 * Optional head-bone override. Leave `null` to use the auto-detector in
 * PetroniusGLB.tsx (which scans for common names). Set to the exact bone
 * name from your GLB (e.g. 'mixamorigHead') if auto-detect can't find it.
 */
export const PETRONIUS_HEAD_BONE: string | null = null;

/**
 * Petronius — PBR material palette for the 3D avatar (R3F).
 *
 * The 6 values below define EVERYTHING about how the Petronius 3D head reads:
 * face material (color + how metallic/glossy/clear-coated), accent color used
 * by the NID cap patch and rim light, and the dark void used for the cap body,
 * pupils and shadows. All other material params in `Avatar3D.tsx` derive from
 * these via `derivePetroniusMaterials()`.
 *
 * The choice between "vinyl mascot", "JARVIS android", or "Apple-cartoon human"
 * lives entirely in this file — once it's set, the Canvas wires itself up.
 */

export interface PetroniusMaterial {
  /** Head/face base color (hex string). Drives the diffuse of the skin/shell. */
  faceColor: string;
  /** 0 = dielectric (plastic/skin), 1 = full metal. Vinyl mascot ~0.05, JARVIS ~0.35. */
  faceMetalness: number;
  /** 0 = mirror gloss, 1 = matte. Vinyl ~0.25, porcelain ~0.4, skin ~0.7. */
  faceRoughness: number;
  /** Brand accent — NID cap patch + rim backlight. Default is the NID orange. */
  accent: string;
  /** Soft accent — secondary backlight color (slightly lighter than accent). */
  accentSoft: string;
  /** Deepest dark — cap body, pupils, body fabric. */
  voidColor: string;
}

/**
 * TODO(user): pick the Petronius material — these 6 values define his look.
 *
 * Pre-tuned starting points (paste one into the export below, then tweak):
 *
 *   • "JARVIS android"   (cool blue-grey vinyl, orange rim, iron-man tone)
 *     faceColor: '#C9D6E2', faceMetalness: 0.35, faceRoughness: 0.28,
 *     accent: '#DD8F1A',    accentSoft: '#FFB45A', voidColor: '#0A0612'
 *
 *   • "Vinyl mascot"     (cream porcelain, warm rim, friendly cartoon)
 *     faceColor: '#F4E3C8', faceMetalness: 0.05, faceRoughness: 0.35,
 *     accent: '#DD8F1A',    accentSoft: '#FFB45A', voidColor: '#1A1326'
 *
 *   • "Bronze NID"       (dark bronze head, orange highlights, premium tone)
 *     faceColor: '#8C6A3F', faceMetalness: 0.45, faceRoughness: 0.32,
 *     accent: '#FFB45A',    accentSoft: '#FFD49A', voidColor: '#0A0612'
 *
 *   • "Human cartoon"    (warm skin, accent only on cap — Memoji-like)
 *     faceColor: '#E3B584', faceMetalness: 0.0,  faceRoughness: 0.55,
 *     accent: '#DD8F1A',    accentSoft: '#FFB45A', voidColor: '#0A0612'
 */
export const PETRONIUS_MATERIAL: PetroniusMaterial = {
  faceColor: '#C9D6E2',
  faceMetalness: 0.35,
  faceRoughness: 0.28,
  accent: '#DD8F1A',
  accentSoft: '#FFB45A',
  voidColor: '#0A0612',
};

/**
 * Derive per-mesh material params from the 6-value palette. Used inside
 * `Avatar3D.tsx` so the Canvas code stays declarative.
 *
 * Each entry maps to a single `<meshStandardMaterial>` (or `<meshPhysicalMaterial>`
 * when clearcoat is needed) on a specific body part of Petronius.
 */
export function derivePetroniusMaterials(m: PetroniusMaterial) {
  return {
    face: {
      color: m.faceColor,
      metalness: m.faceMetalness,
      roughness: m.faceRoughness,
      clearcoat: 0.6,
      clearcoatRoughness: 0.18,
    },
    eyeSclera: {
      // Subtle off-white so eyes don't burn — picks up rim accent.
      color: '#F4F0E6',
      metalness: 0.0,
      roughness: 0.22,
    },
    eyeIris: {
      // Iris uses accent color so eyes feel "alive" with brand glow.
      color: m.accent,
      metalness: 0.2,
      roughness: 0.32,
      emissive: m.accent,
      emissiveIntensity: 0.22,
    },
    pupil: {
      color: m.voidColor,
      metalness: 0.0,
      roughness: 0.5,
    },
    cap: {
      // Cap shell — darker than void? deeper black with a hint of accent fuzz.
      color: m.voidColor,
      metalness: 0.08,
      roughness: 0.62,
    },
    capPatch: {
      // NID patch on cap — emissive so it reads on dark backgrounds.
      color: m.accent,
      metalness: 0.15,
      roughness: 0.38,
      emissive: m.accent,
      emissiveIntensity: 0.35,
    },
    body: {
      // Shoulders / shirt — slightly lifted off void.
      color: '#1A1326',
      metalness: 0.12,
      roughness: 0.7,
    },
    rimLight: m.accent,
    rimLightSoft: m.accentSoft,
    fillLight: '#8FA0C8', // cool fill from the left
    keyLight: '#FFF0D8',  // warm key from above-right
  };
}

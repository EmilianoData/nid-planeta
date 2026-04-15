import * as THREE from 'three';

// Frame-rate mutable globals that don't trigger rerenders.
// - focusedPos: world-space position of the focused body, updated each frame by SolarSystem.
//   Controls reads it to lerp camera target.
// - focusedDistance: desired camera distance, based on focused body size.
export const runtime = {
  focusedPos: null as THREE.Vector3 | null,
  focusedDistance: 12,
};

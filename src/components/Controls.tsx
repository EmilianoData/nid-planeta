'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { runtime } from '@/lib/runtime';

const MIN_R = 0.5;
const MAX_R = 22;
const MIN_PHI = 0.15;
const MAX_PHI = Math.PI - 0.15;
const ROT_SPEED = 0.0045;
const IDLE_DELAY = 4.5;         // seconds of inactivity before drift kicks in
const IDLE_YAW_SPEED = 0.035;   // rad/sec slow orbit
const IDLE_PHI_AMP = 0.06;      // vertical wobble amplitude

export default function Controls() {
  const { camera, gl } = useThree();
  const planetId = useStore((s) => s.planetId);
  const projetoId = useStore((s) => s.projetoId);

  const s = useRef({
    theta: 0.8,
    phi: Math.PI / 2 - 0.3,
    radius: 14,
    target: new THREE.Vector3(),
    tTheta: 0.8,
    tPhi: Math.PI / 2 - 0.3,
    tRadius: 14,
    tTarget: new THREE.Vector3(),
    pinchStart: 14,
    lastInteract: 0,
    phiIdleBase: Math.PI / 2 - 0.3,
  });

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      s.current.tRadius = THREE.MathUtils.clamp(
        s.current.tRadius * (1 + e.deltaY * 0.0012),
        MIN_R,
        MAX_R,
      );
      s.current.lastInteract = performance.now() / 1000;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl]);

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, touches, event }) => {
        if (pinching) return;
        if (touches && touches > 1) return;
        event?.preventDefault?.();
        s.current.tTheta -= dx * ROT_SPEED;
        s.current.tPhi = THREE.MathUtils.clamp(
          s.current.tPhi - dy * ROT_SPEED,
          MIN_PHI,
          MAX_PHI,
        );
        s.current.phiIdleBase = s.current.tPhi;
        s.current.lastInteract = performance.now() / 1000;
      },
      onPinchStart: () => {
        s.current.pinchStart = s.current.tRadius;
        s.current.lastInteract = performance.now() / 1000;
      },
      onPinch: ({ offset: [scale] }) => {
        const factor = scale > 0 ? scale : 1;
        s.current.tRadius = THREE.MathUtils.clamp(
          s.current.pinchStart / factor,
          MIN_R,
          MAX_R,
        );
        s.current.lastInteract = performance.now() / 1000;
      },
    },
    {
      target: gl.domElement,
      eventOptions: { passive: false },
      drag: { filterTaps: true, pointer: { touch: true } },
      pinch: { scaleBounds: { min: 0.2, max: 6 } },
    },
  );

  // On focus change: set default spherical frame, then each frame the target
  // position is pulled from runtime.focusedPos (supports moving bodies).
  useEffect(() => {
    if (projetoId) {
      s.current.tRadius = 0.9;
    } else if (planetId) {
      s.current.tRadius = runtime.focusedDistance;
    } else {
      s.current.tRadius = 14;
      s.current.tTheta = 0.8;
      s.current.tPhi = Math.PI / 2 - 0.3;
      s.current.phiIdleBase = s.current.tPhi;
    }
    s.current.lastInteract = performance.now() / 1000;
  }, [planetId, projetoId]);

  useFrame((state, dt) => {
    const a = 1 - Math.exp(-dt * 7);
    const c = s.current;
    const desiredTarget = runtime.focusedPos ?? new THREE.Vector3(0, 0, 0);
    c.tTarget.copy(desiredTarget);

    // Cinematic idle drift (only at world level, after inactivity)
    const now = state.clock.elapsedTime;
    const realNow = performance.now() / 1000;
    const idle = !planetId && !projetoId && realNow - c.lastInteract > IDLE_DELAY;
    if (idle) {
      c.tTheta += IDLE_YAW_SPEED * dt;
      c.tPhi = c.phiIdleBase + Math.sin(now * 0.12) * IDLE_PHI_AMP;
    }

    c.theta += (c.tTheta - c.theta) * a;
    c.phi += (c.tPhi - c.phi) * a;
    c.radius += (c.tRadius - c.radius) * a;
    c.target.lerp(c.tTarget, a);

    const sp = Math.sin(c.phi);
    camera.position.set(
      c.target.x + c.radius * sp * Math.sin(c.theta),
      c.target.y + c.radius * Math.cos(c.phi),
      c.target.z + c.radius * sp * Math.cos(c.theta),
    );
    camera.lookAt(c.target);
  });

  return null;
}

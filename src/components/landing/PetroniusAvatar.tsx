'use client';

import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { useReducedMotion } from '@/lib/landing/useReducedMotion';
import { PETRONIUS } from '@/lib/landing/team';

/**
 * Petronius — the host. Big in Act 1, shrinks via CSS in Act 2.
 *
 * Eye gaze in Act 1: follows the cursor with damping {x:0.10, y:0.16}.
 * Resets to forward after 2.2 s of mouse idle. In Act 2 (typing), gaze
 * is forced to look at the central monitor (small downward tilt).
 */
export default function PetroniusAvatar({ typing }: { typing: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);

  // Cursor-following gaze (Act 1).
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typing || reduced) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      target.current = {
        x: (e.clientX / w) * 2 - 1,
        y: (e.clientY / h) * 2 - 1,
      };
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        target.current = { x: 0, y: 0 };
      }, 2200);
    };

    const cur = { x: 0, y: 0 };
    const damp = { x: 0.1, y: 0.16 };
    const loop = () => {
      cur.x += (target.current.x - cur.x) * damp.x;
      cur.y += (target.current.y - cur.y) * damp.y;
      setGaze({ x: cur.x, y: cur.y });
      raf = requestAnimationFrame(loop);
    };

    document.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [typing, reduced]);

  // In Act 2, lock gaze on the (lower) monitor.
  const effectiveGaze = typing ? { x: 0, y: 0.6 } : gaze;

  return (
    <div
      ref={wrapRef}
      className={`petronius-wrap ${hover ? 'is-hover' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ['--scale-base' as string]: '1' }}
    >
      <Avatar
        color={PETRONIUS.color}
        typing={typing}
        smile={hover}
        gaze={effectiveGaze}
        scale={2.4}
      />
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shared SVG figure used by Petronius (large/center) and the crew (small/lateral).
 * Anatomy:
 *   - cap (black with orange "NID" patch)
 *   - oval head with two eyes that track a {x,y} target ∈ [-1,1]
 *   - shoulders + arms (typing pose toggled with `typing`)
 *   - optional accent rim glow (color-bound)
 *
 * The eyes' pupil offset is computed from `gaze` (refs not state) and applied
 * via `style.cx/cy` in a rAF loop, so we never re-render React for a glance.
 */

export interface AvatarProps {
  /** Glow color (rim, monitor accent). */
  color: string;
  /** Whether the figure is in typing pose (arms forward, head bobbing). */
  typing?: boolean;
  /** Whether smile is on (Petronius hover). */
  smile?: boolean;
  /** Eye-tracking target in clip-space [-1,1]. (0,0) = forward. */
  gaze?: { x: number; y: number };
  /** Random blink + occasional eye drift (defaults true). */
  alive?: boolean;
  /** Render scale — Petronius uses 1.0, crew avatars 0.55. */
  scale?: number;
}

export default function Avatar({
  color,
  typing = false,
  smile = false,
  gaze,
  alive = true,
  scale = 1,
}: AvatarProps) {
  const leftEye = useRef<SVGCircleElement>(null);
  const rightEye = useRef<SVGCircleElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const armLeft = useRef<SVGPathElement>(null);
  const armRight = useRef<SVGPathElement>(null);
  const [blink, setBlink] = useState(false);
  const [drift, setDrift] = useState({ x: 0, y: 0 });

  // Eye tracking — apply gaze (or drift) directly to pupil cx/cy.
  useEffect(() => {
    let raf = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const tick = () => {
      const g = gaze ?? drift;
      target.x = clamp(g.x, -1, 1) * 2.4;
      target.y = clamp(g.y, -1, 1) * 1.6;
      cur.x += (target.x - cur.x) / 8;
      cur.y += (target.y - cur.y) / 9;
      const lx = (43 + cur.x).toFixed(2);
      const ly = (44 + cur.y).toFixed(2);
      const rx = (57 + cur.x).toFixed(2);
      const ry = (44 + cur.y).toFixed(2);
      leftEye.current?.setAttribute('cx', lx);
      leftEye.current?.setAttribute('cy', ly);
      rightEye.current?.setAttribute('cx', rx);
      rightEye.current?.setAttribute('cy', ry);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gaze, drift]);

  // Random blink (~every 3-6s).
  useEffect(() => {
    if (!alive) return;
    let on: number | undefined;
    let off: number | undefined;
    const sched = () => {
      const wait = 2800 + Math.random() * 3200;
      on = window.setTimeout(() => {
        setBlink(true);
        off = window.setTimeout(() => {
          setBlink(false);
          sched();
        }, 130);
      }, wait);
    };
    sched();
    return () => {
      if (on) window.clearTimeout(on);
      if (off) window.clearTimeout(off);
    };
  }, [alive]);

  // Random gaze drift when no external gaze prop (crew members idle).
  useEffect(() => {
    if (!alive || gaze) return;
    let id: number | undefined;
    const sched = () => {
      const wait = 1800 + Math.random() * 1200;
      id = window.setTimeout(() => {
        setDrift({ x: (Math.random() - 0.5) * 1.4, y: (Math.random() - 0.5) * 0.8 });
        sched();
      }, wait);
    };
    sched();
    return () => {
      if (id) window.clearTimeout(id);
    };
  }, [alive, gaze]);

  // Head bob while typing (sin(t) on translateY, applied to <g> via attribute).
  useEffect(() => {
    if (!typing) return;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      const dy = Math.sin(t * 3.4) * 0.6;
      headRef.current?.setAttribute('transform', `translate(0 ${dy.toFixed(2)})`);
      // Subtle arm typing wobble
      const armDy = Math.sin(t * 12) * 0.8;
      armLeft.current?.setAttribute('transform', `translate(0 ${armDy.toFixed(2)})`);
      armRight.current?.setAttribute('transform', `translate(0 ${(-armDy).toFixed(2)})`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [typing]);

  // Eye height shrinks to 0.3 when blinking — implemented via scaleY on <g>.
  return (
    <svg
      viewBox="0 0 100 130"
      width={100 * scale}
      height={130 * scale}
      className="avatar-svg"
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`rim-${color.replace('#', '')}`} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="55%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft rim glow behind the head */}
      <circle cx="50" cy="44" r="42" fill={`url(#rim-${color.replace('#', '')})`} />

      {/* Shoulders + body */}
      <path
        d="M16 118 C 18 88 32 74 50 74 C 68 74 82 88 84 118 L 84 130 L 16 130 Z"
        fill="#1a1326"
        stroke={color}
        strokeOpacity="0.35"
        strokeWidth="0.6"
      />

      {/* NID badge on chest */}
      <rect x="44" y="92" width="12" height="6" fill={color} opacity="0.85" rx="1" />
      <text
        x="50"
        y="96.6"
        fontSize="4"
        fontFamily="Orbitron, sans-serif"
        fontWeight="700"
        textAnchor="middle"
        fill="#0A0612"
        letterSpacing="0.5"
      >
        NID
      </text>

      {/* Left arm */}
      <path
        ref={armLeft}
        d={
          typing
            ? 'M 22 92 Q 16 100 24 110 Q 30 114 36 108'
            : 'M 22 92 Q 14 108 22 122'
        }
        fill="none"
        stroke="#2a2138"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Right arm */}
      <path
        ref={armRight}
        d={
          typing
            ? 'M 78 92 Q 84 100 76 110 Q 70 114 64 108'
            : 'M 78 92 Q 86 108 78 122'
        }
        fill="none"
        stroke="#2a2138"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Head group (bobs while typing) */}
      <g ref={headRef}>
        {/* Neck */}
        <rect x="44" y="68" width="12" height="10" fill="#1a1326" />

        {/* Head oval */}
        <ellipse
          cx="50"
          cy="44"
          rx="22"
          ry="24"
          fill="#f4e3c8"
          stroke={color}
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />

        {/* Cap (black with orange patch) */}
        <path
          d="M 28 32 Q 50 14 72 32 Q 76 36 73 38 L 27 38 Q 24 36 28 32 Z"
          fill="#0d0a18"
        />
        {/* Cap brim */}
        <path
          d="M 27 38 Q 50 41 73 38 L 80 40 Q 50 44 20 40 Z"
          fill="#0a0612"
        />
        {/* NID patch on cap */}
        <rect x="44" y="26" width="12" height="6" fill="#DD8F1A" rx="1" />
        <text
          x="50"
          y="30.6"
          fontSize="4"
          fontFamily="Orbitron, sans-serif"
          fontWeight="700"
          textAnchor="middle"
          fill="#0A0612"
          letterSpacing="0.5"
        >
          NID
        </text>

        {/* Eyes */}
        <g
          style={{
            transform: blink ? 'scaleY(0.1)' : 'scaleY(1)',
            transformOrigin: '50px 44px',
            transition: 'transform 90ms ease',
          }}
        >
          <circle cx="43" cy="44" r="1.7" fill="#0A0612" ref={leftEye} />
          <circle cx="57" cy="44" r="1.7" fill="#0A0612" ref={rightEye} />
        </g>

        {/* Mouth */}
        {smile ? (
          <path
            d="M 44 56 Q 50 60 56 56"
            stroke="#0A0612"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <line
            x1="46"
            y1="56"
            x2="54"
            y2="56"
            stroke="#0A0612"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

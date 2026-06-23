'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Avatar from './Avatar';
import { useReducedMotion } from '@/lib/landing/useReducedMotion';
import { PETRONIUS } from '@/lib/landing/team';
import { PETRONIUS_GLB_OPTIONS } from '@/lib/landing/avatarMaterial';

/**
 * Petronius — the host. Big in Act 1, shrinks via CSS in Act 2.
 *
 * Mounts the lazy-loaded R3F Avatar3D (real 3D head, eye-tracking, blink) on
 * desktop with motion enabled. Falls back to the SVG `Avatar` whenever:
 *   - viewport < 1024px (mobile)
 *   - user prefers reduced motion
 *   - the Canvas is still loading (Suspense fallback)
 *
 * Avatar variant is chosen via `?avatar=<key>` URL query:
 *   - `?avatar=robocop`     loads /avatars/Robocop.glb
 *   - `?avatar=blocks`      loads /avatars/Blocks Humanoid.glb
 *   - `?avatar=parametric`  forces the procedural primitives version
 *   - (no query)            defaults to parametric
 *
 * A small dev picker is rendered next to the avatar so the user can flip
 * between them in place without manually editing URLs.
 */

const Avatar3D = dynamic(() => import('./Avatar3D'), {
  ssr: false,
  loading: () => (
    <Avatar color={PETRONIUS.color} scale={2.4} alive={false} gaze={{ x: 0, y: 0 }} />
  ),
});

export default function PetroniusAvatar({ typing }: { typing: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [desktop, setDesktop] = useState(false);

  /* URL query — drives which avatar variant to mount. */
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const avatarKey = search?.get('avatar') ?? 'parametric';
  const glbKey =
    avatarKey === 'parametric' ? null : avatarKey;

  useEffect(() => {
    const check = () => setDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* SVG fallback path needs its own gaze tracking. */
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    if (desktop && !reduced) return;
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
  }, [typing, reduced, desktop]);

  const effectiveGaze = typing ? { x: 0, y: 0.6 } : gaze;
  const use3D = desktop && !reduced;

  const setAvatar = (key: string) => {
    const sp = new URLSearchParams(search?.toString() ?? '');
    if (key === 'parametric') sp.delete('avatar');
    else sp.set('avatar', key);
    router.replace(`${pathname}${sp.toString() ? '?' + sp.toString() : ''}`, {
      scroll: false,
    });
  };

  return (
    <div
      ref={wrapRef}
      className={`petronius-wrap ${hover ? 'is-hover' : ''} ${use3D ? 'is-3d' : 'is-svg'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ['--scale-base' as string]: '1' }}
    >
      {use3D ? (
        <div className="petronius-canvas">
          <Avatar3D typing={typing} glbKey={glbKey} />
        </div>
      ) : (
        <Avatar
          color={PETRONIUS.color}
          typing={typing}
          smile={hover}
          gaze={effectiveGaze}
          scale={2.4}
        />
      )}

      {/* Dev picker — only on desktop, only when motion enabled. */}
      {use3D && (
        <div className="avatar-picker" data-act-fade>
          <span className="avatar-picker__label">avatar</span>
          <button
            type="button"
            className={`avatar-picker__btn ${avatarKey === 'parametric' ? 'is-on' : ''}`}
            onClick={() => setAvatar('parametric')}
          >
            paramétrico
          </button>
          {Object.entries(PETRONIUS_GLB_OPTIONS).map(([key, opt]) => (
            <button
              key={key}
              type="button"
              className={`avatar-picker__btn ${avatarKey === key ? 'is-on' : ''}`}
              onClick={() => setAvatar(key)}
              title={opt.hint}
            >
              {opt.label.toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

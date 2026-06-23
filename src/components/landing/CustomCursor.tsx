'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/landing/useReducedMotion';

/**
 * Lightweight follow-cursor — no GSAP. Damping done by hand on rAF.
 * Disabled below 720px (CSS handles --size). Reads `data-cursor="disable|icons"`.
 */
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: mouse.x, y: mouse.y };
    let raf = 0;
    const damping = 6;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const loop = () => {
      pos.x += (mouse.x - pos.x) / damping;
      pos.y += (mouse.y - pos.y) / damping;
      el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      raf = requestAnimationFrame(loop);
    };

    document.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);

    // data-cursor="disable" hides the dot (e.g. on links / portals).
    const targets = document.querySelectorAll<HTMLElement>('[data-cursor]');
    const enter = (ev: Event) => {
      const t = ev.currentTarget as HTMLElement;
      if (t.dataset.cursor === 'disable') el.classList.add('is-disabled');
    };
    const leave = () => el.classList.remove('is-disabled');
    targets.forEach((t) => {
      t.addEventListener('mouseover', enter);
      t.addEventListener('mouseout', leave);
    });

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      targets.forEach((t) => {
        t.removeEventListener('mouseover', enter);
        t.removeEventListener('mouseout', leave);
      });
    };
  }, [reduced]);

  if (reduced) return null;
  return <div className="l-cursor" ref={ref} aria-hidden />;
}

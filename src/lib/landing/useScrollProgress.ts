'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll-driven CSS variables for the 3-act landing.
 *
 *   --p   ∈ [0,1]   global progress (track scroll / track height)
 *   --p2  ∈ [0,1]   Act 2 progress  (clamp((p − 0.30) / 0.35))
 *   --p3  ∈ [0,1]   Act 3 progress  (clamp((p − 0.70) / 0.25))
 *
 * Listens on the *track* element (a tall div), not on `window` — we keep
 * `body { overflow:hidden }` global so the kiosk routes stay sealed.
 *
 * Returns a ref to attach to the scrollable track. Reads stay frame-aligned
 * via rAF; CSS variables on `<html>` drive every animation downstream so
 * React never re-renders on scroll.
 */
export function useScrollProgress() {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const html = document.documentElement;
    let raf = 0;
    let pending = false;

    const apply = () => {
      pending = false;
      // The 3-act choreography plays out over a fixed scroll window
      // (`.landing-spacer` ≈ 220vh). Anything beyond that is post-act content,
      // so we cap `--p` at 1 even when the track has grown taller.
      const choreoMax = track.clientHeight * 2.2;
      const p = choreoMax > 0 ? clamp01(track.scrollTop / choreoMax) : 0;
      const p2 = clamp01((p - 0.3) / 0.35);
      const p3 = clamp01((p - 0.7) / 0.25);
      html.style.setProperty('--p', p.toFixed(4));
      html.style.setProperty('--p2', p2.toFixed(4));
      html.style.setProperty('--p3', p3.toFixed(4));
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(apply);
    };

    apply();
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      html.style.removeProperty('--p');
      html.style.removeProperty('--p2');
      html.style.removeProperty('--p3');
    };
  }, []);

  return trackRef;
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

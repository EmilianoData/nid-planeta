'use client';

import { useEffect, useState } from 'react';
import { LINE_HOLD_MS, PETRONIUS_LINES, TYPE_SPEED_MS } from '@/lib/landing/script';
import { useReducedMotion } from '@/lib/landing/useReducedMotion';

/**
 * Typewriter — types the current line char by char, holds, then advances.
 * With reduced-motion, just shows the full text and rotates on a longer beat.
 */
export default function SpeechBubble({ visible }: { visible: boolean }) {
  const reduced = useReducedMotion();
  const [lineIdx, setLineIdx] = useState(0);
  const [shown, setShown] = useState('');

  useEffect(() => {
    if (!visible) return;
    const target = PETRONIUS_LINES[lineIdx];

    if (reduced) {
      setShown(target);
      const id = window.setTimeout(
        () => setLineIdx((i) => (i + 1) % PETRONIUS_LINES.length),
        LINE_HOLD_MS * 2,
      );
      return () => window.clearTimeout(id);
    }

    let i = 0;
    setShown('');
    const tick = window.setInterval(() => {
      i += 1;
      setShown(target.slice(0, i));
      if (i >= target.length) {
        window.clearInterval(tick);
        const hold = window.setTimeout(
          () => setLineIdx((v) => (v + 1) % PETRONIUS_LINES.length),
          LINE_HOLD_MS,
        );
        clearHandlers.push(() => window.clearTimeout(hold));
      }
    }, TYPE_SPEED_MS);

    const clearHandlers: Array<() => void> = [() => window.clearInterval(tick)];
    return () => clearHandlers.forEach((fn) => fn());
  }, [lineIdx, reduced, visible]);

  if (!visible) return null;
  return (
    <div className="bubble" role="status" aria-live="polite" data-cursor="disable">
      {shown}
      <span className="caret" aria-hidden />
    </div>
  );
}

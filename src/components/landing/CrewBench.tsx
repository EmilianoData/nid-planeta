'use client';

import { useEffect, useState } from 'react';
import CrewMonitor from './CrewMonitor';
import { CREW, PETRONIUS } from '@/lib/landing/team';

/**
 * Option (c) bench layout: 4 visible monitors flanking Petronius.
 * Slots = [0, 1, void, 2, 3]. The void is the placeholder where Petronius
 * sits (Petronius is absolutely positioned over it by stage-center).
 *
 * As `--p2` crosses thresholds, `offset` advances and the visible roster
 * rotates through the 5 humans. `key` on each slot retriggers the fade.
 */
const THRESHOLDS = [0.18, 0.42, 0.66, 0.9];

export default function CrewBench() {
  const offset = useRotationOffset();

  const visible = [0, 1, 2, 3].map((i) => CREW[(i + offset) % CREW.length]);

  return (
    <div className="bench" aria-label="Bancada NID">
      <div className="bench-row">
        <BenchSlot member={visible[0]} index={0} />
        <BenchSlot member={visible[1]} index={1} />
        <BenchSlot member={PETRONIUS} index={2} isHost />
        <BenchSlot member={visible[2]} index={3} />
        <BenchSlot member={visible[3]} index={4} />
      </div>
    </div>
  );
}

function BenchSlot({
  member,
  index,
  isHost,
}: {
  member: (typeof CREW)[number];
  index: number;
  isHost?: boolean;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={`bench-slot ${on ? 'is-on' : ''} ${isHost ? 'is-host' : ''}`}
      style={{ transitionDelay: `${index * 180}ms` }}
      key={member.id}
    >
      <CrewMonitor member={member} />
    </div>
  );
}

/** Watches `--p2` and advances offset 0..4. Polls @ 200ms (cheap, threshold-grade). */
function useRotationOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const html = document.documentElement;
    let last = -1;
    const id = window.setInterval(() => {
      const p2 = parseFloat(html.style.getPropertyValue('--p2') || '0');
      let idx = -1;
      for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
        if (p2 >= THRESHOLDS[i]) {
          idx = i;
          break;
        }
      }
      const next = idx + 1;
      if (next !== last) {
        last = next;
        setOffset(next % 5);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, []);
  return offset;
}

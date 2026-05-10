'use client';

import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import type { CrewMember } from '@/lib/landing/team';
import { SNIPPETS } from '@/lib/landing/snippets';
import { useReducedMotion } from '@/lib/landing/useReducedMotion';

/**
 * One slot of the bench: avatar (typing pose) + monitor showing the role's
 * snippet typing out, then loop. Nameplate underneath.
 *
 * The "typed" prefix grows on a ~38ms tick (skip to full when reduced-motion).
 * We re-render on each char — cost is small (one tspan per line × N slots).
 */
export default function CrewMonitor({
  member,
  typedRatio,
}: {
  member: CrewMember;
  /** Optional [0..1] to drive how much of the snippet is shown — wraps around. */
  typedRatio?: number;
}) {
  const reduced = useReducedMotion();
  const snippet = SNIPPETS[member.id];
  const total = snippet.length;
  const [chars, setChars] = useState(reduced ? total : 1);

  // Self-driven typing when typedRatio not provided.
  useEffect(() => {
    if (typedRatio !== undefined) return;
    if (reduced) {
      setChars(total);
      return;
    }
    const id = window.setInterval(() => {
      setChars((c) => (c + 1 > total + 30 ? 1 : c + 1));
    }, 40);
    return () => window.clearInterval(id);
  }, [reduced, total, typedRatio]);

  const shown = typedRatio !== undefined
    ? snippet.slice(0, Math.max(1, Math.floor(typedRatio * total)))
    : snippet.slice(0, Math.min(chars, total));

  const lines = shown.split('\n');

  return (
    <figure className="crew-slot" style={{ ['--c' as string]: member.color }}>
      <Monitor color={member.color} lines={lines} done={chars >= total} />
      <div className="crew-figure">
        <Avatar color={member.color} typing scale={1.05} />
      </div>
      <figcaption className="nameplate">
        <span className="np-name">{member.name}</span>
        <span className="np-role">{member.role}</span>
      </figcaption>

      <style jsx>{`
        .crew-slot {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          margin: 0;
        }
        .crew-figure {
          margin-top: -28px;
          filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6));
        }
        .nameplate {
          margin-top: 8px;
          padding: 6px 12px;
          background: rgba(20, 12, 32, 0.7);
          border-left: 2px solid var(--c);
          text-align: center;
          min-width: 160px;
        }
        .np-name {
          display: block;
          font-family: 'Geist', sans-serif;
          font-weight: 600;
          font-size: 12.5px;
          letter-spacing: 0.06em;
          color: #f3e7d4;
          line-height: 1.1;
        }
        .np-role {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          letter-spacing: 0.06em;
          color: var(--c);
          margin-top: 3px;
          opacity: 0.92;
        }
      `}</style>
    </figure>
  );
}

function Monitor({
  color,
  lines,
  done,
}: {
  color: string;
  lines: string[];
  done: boolean;
}) {
  // Show only the last 9 lines for a "scrolling terminal" feel.
  const visible = lines.slice(-9);
  return (
    <div
      className="monitor"
      style={{
        ['--c' as string]: color,
      }}
    >
      <div className="bar">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
      <div className="screen">
        <div className="scan" aria-hidden />
        <pre className="code">
          {visible.map((l, i) => (
            <span key={i} className="ln">
              {l || ' '}
              {i === visible.length - 1 && !done ? <span className="cur" /> : null}
              {i < visible.length - 1 ? '\n' : ''}
            </span>
          ))}
        </pre>
      </div>

      <style jsx>{`
        .monitor {
          width: 100%;
          aspect-ratio: 4 / 3;
          background: #0a0612;
          border: 1px solid color-mix(in srgb, var(--c) 60%, transparent);
          box-shadow: 0 0 32px color-mix(in srgb, var(--c) 25%, transparent),
            inset 0 0 24px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .bar {
          flex: 0 0 14px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
          display: flex;
          gap: 4px;
          align-items: center;
          padding-left: 6px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--c) 50%, #2a2138);
        }
        .screen {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        .scan {
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            0deg,
            transparent 0,
            transparent 2px,
            rgba(0, 0, 0, 0.22) 2px,
            rgba(0, 0, 0, 0.22) 3px
          );
          pointer-events: none;
          mix-blend-mode: multiply;
        }
        @media (prefers-reduced-motion: reduce) {
          .scan { display: none; }
        }
        .code {
          margin: 0;
          padding: 8px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          line-height: 1.45;
          color: color-mix(in srgb, var(--c) 90%, white 10%);
          white-space: pre;
          overflow: hidden;
        }
        .ln { display: block; }
        .cur {
          display: inline-block;
          width: 5px;
          height: 1em;
          vertical-align: -2px;
          margin-left: 2px;
          background: color-mix(in srgb, var(--c) 80%, white 20%);
          animation: curBlink 1s steps(2) infinite;
        }
        @keyframes curBlink { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .cur { animation: none; }
        }
      `}</style>
    </div>
  );
}

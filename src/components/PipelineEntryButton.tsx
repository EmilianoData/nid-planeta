'use client';

import { useStore } from '@/lib/store';

export default function PipelineEntryButton() {
  const setView = useStore((s) => s.setView);

  return (
    <button
      onClick={() => setView('pipeline')}
      className="pointer-events-auto group relative flex items-center gap-3 px-4 py-2.5 transition-all"
      style={{
        background: 'linear-gradient(180deg, rgba(17,168,135,0.10), rgba(17,168,135,0.04))',
        border: '1px solid rgba(17,168,135,0.30)',
        borderLeft: '3px solid #11A887',
        fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
      }}
      title="Abrir Pipeline de Dados Delp"
    >
      <span
        className="relative flex h-5 w-5 shrink-0 items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #1FCBA8, #0E8775)',
          borderRadius: 2,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 5 H17 L19 7 V10 H10 V13 H17 V18 L15 20 H5 Z"
            fill="#fff"
          />
        </svg>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span
          className="text-[9px] uppercase"
          style={{ letterSpacing: '0.22em', color: '#6B7383' }}
        >
          NID · Delp
        </span>
        <span
          className="text-[12.5px] font-semibold"
          style={{ letterSpacing: '0.04em', color: '#DCE3EE' }}
        >
          Pipeline de Dados
        </span>
      </span>
      <span
        className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: '#22C97A',
          boxShadow: '0 0 8px #22C97A',
          animation: 'pipelineBtnPulse 1.6s ease-in-out infinite',
        }}
      />
      <style jsx>{`
        button:hover {
          background: linear-gradient(180deg, rgba(17, 168, 135, 0.18), rgba(17, 168, 135, 0.06)) !important;
          border-left-color: #f2c94c !important;
        }
        @keyframes pipelineBtnPulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.7);
          }
        }
      `}</style>
    </button>
  );
}

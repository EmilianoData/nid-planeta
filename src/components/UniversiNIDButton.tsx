'use client';

import { useStore } from '@/lib/store';

export default function UniversiNIDButton() {
  const setView = useStore((s) => s.setView);

  return (
    <button
      onClick={() => setView('universinid')}
      className="pointer-events-auto group relative flex items-center gap-3 px-4 py-2.5 transition-all"
      style={{
        background: 'linear-gradient(180deg, rgba(83,74,183,0.10), rgba(83,74,183,0.04))',
        border: '1px solid rgba(83,74,183,0.30)',
        borderLeft: '3px solid #534AB7',
        fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
      }}
      title="Abrir UniversiNID — Portal de Capacitação NID"
    >
      <span
        className="relative flex h-5 w-5 shrink-0 items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #534AB7, #3C3489)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3L20 7V12Q20 18 12 21Q4 18 4 12V7Z" fill="#fff" opacity="0.9" />
          <path d="M9 11L11 13L15 9" stroke="#3C3489" strokeWidth="2.2" fill="none" strokeLinecap="round" />
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
          UniversiNID
        </span>
      </span>
      <span
        className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: '#8B7FE8',
          boxShadow: '0 0 8px #534AB7',
          animation: 'universiPulse 2.4s ease-in-out infinite',
        }}
      />
      <style jsx>{`
        button:hover {
          background: linear-gradient(
            180deg,
            rgba(83, 74, 183, 0.18),
            rgba(83, 74, 183, 0.06)
          ) !important;
          border-left-color: #9b93e8 !important;
        }
        @keyframes universiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.65); }
        }
      `}</style>
    </button>
  );
}

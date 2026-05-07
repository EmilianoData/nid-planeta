'use client';

import { useStore } from '@/lib/store';

export default function UniversiNIDView() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  if (view !== 'universinid') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: '#0D0D14',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 20px',
          borderBottom: '1px solid rgba(83,74,183,0.30)',
          background: 'linear-gradient(180deg, rgba(60,52,137,0.18), rgba(60,52,137,0.06))',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setView('solar')}
          style={{
            fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
            fontSize: 12,
            letterSpacing: '0.12em',
            color: '#9B93E8',
            background: 'rgba(83,74,183,0.12)',
            border: '1px solid rgba(83,74,183,0.30)',
            padding: '5px 14px',
            cursor: 'pointer',
          }}
          title="Voltar ao Sistema Solar Delp"
        >
          ◂◂ Solar
        </button>

        <div
          style={{
            width: 20,
            height: 20,
            background: 'linear-gradient(135deg, #534AB7, #3C3489)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            flexShrink: 0,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
              fontSize: 9,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#6B7383',
            }}
          >
            NID · Delp
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: '#DCE3EE',
            }}
          >
            UniversiNID
          </span>
        </div>

        <span
          style={{
            fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
            fontSize: 10,
            color: '#6B7383',
            marginLeft: 4,
          }}
        >
          Portal de Capacitação NID
        </span>
      </header>

      <iframe
        src="/universinid.html"
        title="UniversiNID — Portal de Capacitação NID DELP"
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
          display: 'block',
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}

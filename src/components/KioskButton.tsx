'use client';

import { useEffect, useState } from 'react';

export default function KioskButton() {
  const [full, setFull] = useState(false);
  const [kiosk, setKiosk] = useState(false);

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('kiosk-mode', kiosk);
    return () => document.body.classList.remove('kiosk-mode');
  }, [kiosk]);

  const toggleFull = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  const style = (active: boolean) => ({
    padding: '8px 12px',
    background: active ? 'rgba(227,6,19,0.18)' : 'rgba(5,11,22,0.7)',
    border: `1px solid ${active ? '#E30613' : 'rgba(242,247,252,0.25)'}`,
    color: active ? '#FFB0B5' : '#F2F7FC',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
    transition: 'all .2s',
  });

  return (
    <>
      <button onClick={toggleFull} className="pointer-events-auto" style={style(full)} title="Tela cheia (F11)">
        ⛶ {full ? 'Sair' : 'Full'}
      </button>
      <button
        onClick={() => setKiosk((v) => !v)}
        className="pointer-events-auto"
        style={style(kiosk)}
        title="Modo apresentação (oculta cursor)"
      >
        ◉ Kiosk
      </button>
    </>
  );
}

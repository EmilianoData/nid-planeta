'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { todasLicoes } from '@/lib/universinid/catalogo';

export function CommandPalette({ open, onClose, isAdmin }:
  { open: boolean; onClose: () => void; isAdmin: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const itens = useMemo(() => {
    const base = todasLicoes().map((l) => ({ label: l.titulo, href: `/universinid/licao/${l.slug}`, hint: 'Lição' }));
    const extra = [
      { label: 'Dashboard', href: '/universinid', hint: 'Página' },
      ...(isAdmin ? [{ label: 'Gestão de usuários', href: '/universinid/admin', hint: 'Admin' }] : []),
    ];
    return [...extra, ...base];
  }, [isAdmin]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return itens.slice(0, 8);
    return itens.filter((i) => i.label.toLowerCase().includes(t)).slice(0, 10);
  }, [q, itens]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else window.dispatchEvent(new CustomEvent('uni-open-palette'));
      }
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    setQ('');
    router.push(href);
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,15,46,.45)', zIndex: 100,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px,92vw)', background: '#fff', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(20,15,46,.4)' }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar lições, páginas…"
          style={{ width: '100%', padding: '16px 18px', border: 'none', borderBottom: '1px solid #ececf6',
            fontSize: '1rem', outline: 'none' }} />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtrados.length === 0 && <div style={{ padding: 18, color: '#9794b5' }}>Nada encontrado.</div>}
          {filtrados.map((i) => (
            <button key={i.href + i.label} onClick={() => go(i.href)}
              style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, padding: '12px 18px',
                border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.9rem', alignItems: 'center' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ flex: 1 }}>{i.label}</span>
              <span style={{ fontSize: '.66rem', color: '#a6a3c4' }}>{i.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

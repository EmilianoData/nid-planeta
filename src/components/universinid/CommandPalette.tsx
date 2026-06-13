'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function CommandPalette({ open, onClose, isAdmin, lessons }:
  { open: boolean; onClose: () => void; isAdmin: boolean; lessons: { label: string; href: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  const itens = useMemo(() => {
    const base = lessons.map((l) => ({ ...l, hint: 'Lição' }));
    const extra = [
      { label: 'Dashboard', href: '/universinid', hint: 'Página' },
      ...(isAdmin ? [{ label: 'Gestão de usuários', href: '/universinid/admin', hint: 'Admin' }] : []),
    ];
    return [...extra, ...base];
  }, [isAdmin, lessons]);

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

  // Ao fechar, devolve o foco ao gatilho de busca (a11y: restaurar foco — WCAG 2.4.3).
  useEffect(() => {
    if (!open) return;
    return () => {
      const trigger = document.querySelector('.uni-k');
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [open]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    setQ('');
    router.push(href);
  }

  // Focus trap: confina Tab/Shift+Tab aos focáveis do dialog (aria-modal=true exige conter o foco).
  function trapTab(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,15,46,.45)', zIndex: 100,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div ref={dialogRef} onClick={(e) => e.stopPropagation()} onKeyDown={trapTab}
        role="dialog" aria-modal="true" aria-label="Buscar lições e páginas"
        style={{ width: 'min(560px,92vw)', background: '#fff', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(20,15,46,.4)' }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar lições e páginas"
          placeholder="Buscar lições, páginas…"
          style={{ width: '100%', padding: '16px 18px', border: 'none', borderBottom: '1px solid #ececf6',
            fontSize: '1rem', outline: 'none' }} />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtrados.length === 0 && <div style={{ padding: 18, color: '#5e5b7a' }}>Nada encontrado.</div>}
          {filtrados.map((i) => (
            <button key={i.href + i.label} onClick={() => go(i.href)}
              style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, padding: '12px 18px',
                border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.9rem', alignItems: 'center' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onFocus={(e) => (e.currentTarget.style.background = '#f5f4ff')}
              onBlur={(e) => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ flex: 1 }}>{i.label}</span>
              <span style={{ fontSize: '.66rem', color: '#5e5b7a' }}>{i.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

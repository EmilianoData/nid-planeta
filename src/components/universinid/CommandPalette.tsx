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
    <div className="uni-cmd-overlay" onClick={onClose}>
      <div ref={dialogRef} onClick={(e) => e.stopPropagation()} onKeyDown={trapTab}
        role="dialog" aria-modal="true" aria-label="Buscar lições e páginas" className="uni-cmd-dialog">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar lições e páginas"
          placeholder="Buscar lições, páginas…"
          className="uni-cmd-input" />
        <div className="uni-cmd-list">
          {filtrados.length === 0 && <div className="uni-cmd-empty">Nada encontrado.</div>}
          {filtrados.map((i) => (
            <button key={i.href + i.label} onClick={() => go(i.href)} className="uni-cmd-item">
              <span className="label">{i.label}</span>
              <span className="hint">{i.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

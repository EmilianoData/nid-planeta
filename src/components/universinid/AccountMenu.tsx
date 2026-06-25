'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Icon } from './ui/Icon';

// Menu da conta (avatar → dropdown à direita): Meu perfil · Admin (só ADMIN) · Sair.
// Hand-rolled (sem dep nova). A11y: aria-haspopup/aria-expanded, role=menu/menuitem,
// foca o 1º item ao abrir, Esc fecha e devolve o foco ao gatilho, clique-fora fecha.
export function AccountMenu({ nome, isAdmin }: { nome: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const iniciais =
    nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); }
    }
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  // Ao abrir, foca o 1º item (a11y de menu).
  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  return (
    <div className="uni-acct" ref={rootRef}>
      <button ref={btnRef} className="uni-av" onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu" aria-expanded={open} aria-label="Menu da conta">
        <span aria-hidden="true">{iniciais}</span>
      </button>
      {open && (
        <div className="uni-acct-menu" role="menu" aria-label="Menu da conta">
          <div className="uni-acct-head"><span className="nome">{nome}</span></div>
          <Link role="menuitem" className="uni-acct-item" href="/universinid/perfil" onClick={() => setOpen(false)}>
            <Icon name="user" size={18} /> Meu perfil
          </Link>
          <Link role="menuitem" className="uni-acct-item" href="/universinid/conquistas" onClick={() => setOpen(false)}>
            <Icon name="trophy" size={18} /> Minhas conquistas
          </Link>
          {isAdmin && (
            <Link role="menuitem" className="uni-acct-item" href="/universinid/admin" onClick={() => setOpen(false)}>
              <Icon name="settings" size={18} /> Admin
            </Link>
          )}
          <button role="menuitem" type="button" className="uni-acct-item"
            onClick={() => signOut({ callbackUrl: '/universinid/login' })}>
            <Icon name="logout" size={18} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

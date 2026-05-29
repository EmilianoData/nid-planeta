'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

export function Topbar({ streak, onOpenPalette }: { streak: number; onOpenPalette: () => void }) {
  return (
    <header className="uni-top">
      <Link href="/universinid" className="uni-wm">Universi<b>NID</b></Link>
      <button className="uni-k" onClick={onOpenPalette} aria-label="Abrir busca">
        <span aria-hidden="true">🔍</span> Buscar lições, skills, agentes… <span className="cmd">⌘K</span>
      </button>
      <span className="uni-streak"><span aria-hidden="true">🔥</span> {streak} dias</span>
      <button className="uni-av" onClick={() => signOut({ callbackUrl: '/universinid/login' })} title="Sair" aria-label="Sair"><span aria-hidden="true">⎋</span></button>
    </header>
  );
}

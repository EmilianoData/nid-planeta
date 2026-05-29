'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

export function Topbar({ streak, onOpenPalette }: { streak: number; onOpenPalette: () => void }) {
  return (
    <header className="uni-top">
      <Link href="/universinid" className="uni-wm">Universi<b>NID</b></Link>
      <button className="uni-k" onClick={onOpenPalette} aria-label="Abrir busca">
        🔍 Buscar lições, skills, agentes… <span className="cmd">⌘K</span>
      </button>
      <span className="uni-streak">🔥 {streak} dias</span>
      <button className="uni-av" onClick={() => signOut({ callbackUrl: '/universinid/login' })} title="Sair" aria-label="Sair">⎋</button>
    </header>
  );
}

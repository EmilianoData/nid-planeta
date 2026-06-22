'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Icon } from './ui/Icon';

export function Topbar({ streak, onOpenPalette }: { streak: number; onOpenPalette: () => void }) {
  return (
    <header className="uni-top">
      <Link href="/universinid" className="uni-wm">Universi<b>NID</b></Link>
      <button className="uni-k" onClick={onOpenPalette} aria-label="Abrir busca">
        <Icon name="search" size={16} /> Buscar lições, skills, agentes… <span className="cmd">⌘K</span>
      </button>
      <span className="uni-streak"><Icon name="flame" size={16} /> {streak} dias</span>
      <button className="uni-av" onClick={() => signOut({ callbackUrl: '/universinid/login' })} title="Sair" aria-label="Sair">
        <span><Icon name="logout" size={18} /></span>
      </button>
    </header>
  );
}

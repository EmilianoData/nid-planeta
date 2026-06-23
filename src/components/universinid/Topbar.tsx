'use client';

import Link from 'next/link';
import { Icon } from './ui/Icon';
import { AccountMenu } from './AccountMenu';

export function Topbar({ streak, onOpenPalette, nome, isAdmin }:
  { streak: number; onOpenPalette: () => void; nome: string; isAdmin: boolean }) {
  return (
    <header className="uni-top">
      <Link href="/universinid" className="uni-wm">Universi<b>NID</b></Link>
      <button className="uni-k" onClick={onOpenPalette} aria-label="Abrir busca">
        <Icon name="search" size={16} /> Buscar lições, skills, agentes… <span className="cmd">⌘K</span>
      </button>
      <span className="uni-streak"><Icon name="flame" size={16} /> {streak} dias</span>
      <AccountMenu nome={nome} isAdmin={isAdmin} />
    </header>
  );
}

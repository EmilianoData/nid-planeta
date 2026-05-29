'use client';

import { useState, type ReactNode } from 'react';
import { Topbar } from '@/components/universinid/Topbar';
import { Sidebar } from '@/components/universinid/Sidebar';
import { CommandPalette } from '@/components/universinid/CommandPalette';

type StatusMap = Record<string, { status: string; pct: number }>;

export function ShellChrome({ progress, streak, isAdmin, children }:
  { progress: StatusMap; streak: number; isAdmin: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Topbar streak={streak} onOpenPalette={() => setOpen(true)} />
      <div className="uni-body">
        <Sidebar progress={progress} />
        {children}
      </div>
      <CommandPalette open={open} onClose={() => setOpen(false)} isAdmin={isAdmin} />
    </>
  );
}

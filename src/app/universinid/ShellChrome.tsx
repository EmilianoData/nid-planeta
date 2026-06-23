'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Topbar } from '@/components/universinid/Topbar';
import { Sidebar } from '@/components/universinid/Sidebar';
import { CommandPalette } from '@/components/universinid/CommandPalette';
import type { PublishedTree } from '@/lib/universinid/content-queries';

type StatusMap = Record<string, { status: string; pct: number }>;

export function ShellChrome({ progress, streak, nome, isAdmin, tree, children }:
  { progress: StatusMap; streak: number; nome: string; isAdmin: boolean; tree: PublishedTree; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const openPalette = () => setOpen(true);
    window.addEventListener('uni-open-palette', openPalette);
    return () => window.removeEventListener('uni-open-palette', openPalette);
  }, []);
  const lessonItems = tree.flatMap((c) =>
    c.modules.flatMap((m) =>
      m.lessons.map((l) => ({ label: l.title, href: `/universinid/licao/${l.slug}` })),
    ),
  );
  return (
    <>
      <Topbar streak={streak} onOpenPalette={() => setOpen(true)} nome={nome} isAdmin={isAdmin} />
      <div className="uni-body">
        <Sidebar progress={progress} tree={tree} />
        {children}
      </div>
      <CommandPalette open={open} onClose={() => setOpen(false)} isAdmin={isAdmin} lessons={lessonItems} />
    </>
  );
}

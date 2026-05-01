'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';

const Scene = dynamic(() => import('./Scene'), { ssr: false });

export default function SceneClient() {
  const view = useStore((s) => s.view);
  if (view === 'pipeline') return null;
  return <Scene />;
}

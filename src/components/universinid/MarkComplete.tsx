'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markLessonProgress } from '@/lib/universinid/actions';

export function MarkComplete({ slug, concluida }: { slug: string; concluida: boolean }) {
  const [done, setDone] = useState(concluida);
  const [pending, start] = useTransition();
  const router = useRouter();

  function marcar() {
    start(async () => {
      await markLessonProgress({ slug, status: 'COMPLETED', pct: 100 });
      setDone(true);
      router.refresh();
    });
  }

  if (done) return <button className="uni-btn ok" disabled>✓ Concluída</button>;
  return (
    <button className="uni-btn" onClick={marcar} disabled={pending}>
      {pending ? 'Salvando…' : 'Marcar como concluída'}
    </button>
  );
}

export function TrackOpen({ slug, jaIniciada }: { slug: string; jaIniciada: boolean }) {
  useEffect(() => {
    if (!jaIniciada) {
      markLessonProgress({ slug, status: 'IN_PROGRESS', pct: 10 }).catch((e) =>
        console.error('track open falhou', e),
      );
    }
  }, [slug, jaIniciada]);
  return null;
}

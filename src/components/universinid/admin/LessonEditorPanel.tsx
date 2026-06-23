'use client';

import dynamic from 'next/dynamic';
import { useLessonsMutations } from '@/hooks/universinid/use-admin-content';
import { Button } from '@/components/universinid/ui/button';
import type { UniBlockDoc } from '@/lib/universinid/content-types';

// ssr:false só é permitido em client component. Mantém o BlockNote fora do SSR (B5).
const LessonEditor = dynamic(
  () => import('./LessonEditor').then((m) => m.LessonEditor),
  { ssr: false, loading: () => <p className="p-6 text-[.9rem] text-[var(--muted)]">Carregando editor…</p> },
);

interface LessonEditorPanelProps {
  lessonId: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  initialContent: UniBlockDoc | null;
}

export function LessonEditorPanel({
  lessonId,
  title,
  status,
  initialContent,
}: LessonEditorPanelProps) {
  const lessons = useLessonsMutations();

  return (
    <div className="uni-lesson">
      <div className="uni-lesson-bar">
        <h1>{title}</h1>
        <span className="met">
          <span className="chip">{status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}</span>
          {/* Live region sempre no DOM (sem render condicional) para anunciar o autosave (WCAG 4.1.3). */}
          <span role="status" aria-live="polite" aria-atomic="true" className={lessons.isSaving ? 'chip' : ''}>
            {lessons.isSaving ? 'Salvando…' : ''}
          </span>
        </span>
        <Button
          variant="success"
          onClick={() => lessons.publish(lessonId)}
          disabled={lessons.isSaving}
        >
          Publicar
        </Button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 24px' }}>
        <LessonEditor
          initial={initialContent ?? undefined}
          onSave={(doc) => lessons.saveContent(lessonId, doc as UniBlockDoc)}
        />
      </div>
    </div>
  );
}

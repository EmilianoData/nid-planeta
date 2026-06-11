import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { resolveLessonBySlug } from '@/lib/universinid/content-queries';
import { getProgressMap } from '@/lib/universinid/actions';
import { isLegacyEmbed, type UniBlockDoc } from '@/lib/universinid/content-types';
import { MarkComplete, TrackOpen } from '@/components/universinid/MarkComplete';
import { RenderBlocks } from '@/components/universinid/RenderBlocks';

const DIFICULDADE_LABEL: Record<string, string> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
};

export default async function LicaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === 'ADMIN';

  // Resolve por slug direto e, se renomeado no futuro, por alias (risco #1).
  const lesson = await resolveLessonBySlug(slug);
  if (!lesson) notFound();
  // Não vazar rascunho por URL: aluno só vê PUBLISHED; admin pré-visualiza o draft.
  if (lesson.status !== 'PUBLISHED' && !isAdmin) notFound();

  const progress = await getProgressMap();
  const st = progress[lesson.slug]?.status ?? 'NOT_STARTED';

  // Admin vê o rascunho (preview); aluno vê o publicado. `?? []` cobre lições sem conteúdo.
  const doc = ((isAdmin ? lesson.contentDraft : lesson.contentPublished) ?? []) as UniBlockDoc;

  return (
    <div className="uni-lesson">
      <div className="uni-lesson-bar">
        <Link href="/universinid" className="uni-wm" style={{ fontSize: '.85rem' }}>← Voltar</Link>
        <h1>{lesson.title}</h1>
        <span className="met">
          <span className="chip">{lesson.tempoMin} min</span>
          <span className="chip">{DIFICULDADE_LABEL[lesson.dificuldade] ?? lesson.dificuldade}</span>
        </span>
        <MarkComplete slug={lesson.slug} concluida={st === 'COMPLETED'} />
      </div>
      <TrackOpen slug={lesson.slug} jaIniciada={st !== 'NOT_STARTED'} />
      {isLegacyEmbed(doc) ? (
        <iframe
          className="uni-frame"
          src={`/universinid.html?embed=1#${(doc[0] as { props: { screenId: string } }).props.screenId}`}
          title={lesson.title}
        />
      ) : (
        <div className="uni-content">
          <RenderBlocks doc={doc} />
        </div>
      )}
    </div>
  );
}

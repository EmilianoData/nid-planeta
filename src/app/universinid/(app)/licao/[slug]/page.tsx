import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLicao } from '@/lib/universinid/catalogo';
import { getProgressMap } from '@/lib/universinid/actions';
import { MarkComplete, TrackOpen } from '@/components/universinid/MarkComplete';

export default async function LicaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ref = getLicao(slug);
  if (!ref) notFound();

  const progress = await getProgressMap();
  const st = progress[slug]?.status ?? 'NOT_STARTED';

  return (
    <div className="uni-lesson">
      <div className="uni-lesson-bar">
        <Link href="/universinid" className="uni-wm" style={{ fontSize: '.85rem' }}>← Voltar</Link>
        <h2>{ref.modulo.emoji} {ref.licao.titulo}</h2>
        <span className="met"><span className="chip">{ref.licao.tempoMin} min</span><span className="chip">{ref.licao.dificuldade}</span></span>
        <MarkComplete slug={slug} concluida={st === 'COMPLETED'} />
      </div>
      <TrackOpen slug={slug} jaIniciada={st !== 'NOT_STARTED'} />
      <iframe
        className="uni-frame"
        src={`/universinid.html?embed=1#${ref.licao.screenId}`}
        title={ref.licao.titulo}
      />
    </div>
  );
}

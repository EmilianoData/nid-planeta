import Link from 'next/link';
import { Icon } from './ui/Icon';
import { estadoTrilha, type TrilhaEstado, type Status } from '@/lib/universinid/dashboard';

interface TrilhaLicao {
  slug: string;
  titulo: string;
  tempoMin: number;
  dificuldade: string;
  status: Status;
}

// Mapa estado -> ícone do nó, chip (rótulo + classe) e descrição textual (a11y).
const DOT_ICON: Record<TrilhaEstado, string> = {
  concluida: 'check',
  atual: 'player-play',
  proxima: 'circle',
};
const CHIP: Record<TrilhaEstado, { label: string; cls: string }> = {
  concluida: { label: 'Concluída', cls: 'done' },
  atual: { label: 'Continuar', cls: 'go' },
  proxima: { label: 'Próxima', cls: 'lock' },
};
/**
 * Trilha do módulo atual (substitui a vitrine; o catálogo completo vive na Sidebar).
 * `<ol>/<li>` = jornada ordenada; `aria-current="step"` no nó atual; estado por nó
 * comunicado por TEXTO no chip (Concluída/Continuar/Próxima), não só por cor/ícone (WCAG 1.4.1).
 */
export function Trilha({ moduloTitulo, licoes }: { moduloTitulo: string; licoes: TrilhaLicao[] }) {
  if (licoes.length === 0) {
    return (
      <section aria-labelledby="uni-trilha-h">
        <div className="uni-trilha-head"><h2 id="uni-trilha-h">Sua trilha</h2></div>
        <div className="uni-empty">
          <div className="ic"><Icon name="rocket" /></div>
          <p>Nenhuma lição publicada ainda. Volte em breve.</p>
        </div>
      </section>
    );
  }

  const { estados } = estadoTrilha(licoes);
  const concluidas = licoes.filter((l) => l.status === 'COMPLETED').length;
  const pct = Math.round((concluidas / licoes.length) * 100);
  const tudoConcluido = concluidas === licoes.length;

  return (
    <section aria-labelledby="uni-trilha-h">
      <div className="uni-trilha-head">
        <h2 id="uni-trilha-h">Sua trilha · {moduloTitulo}</h2>
        <div className="uni-ring" role="img" aria-label={`${pct}% do módulo concluído`}
          style={{ background: `conic-gradient(var(--navy) 0 ${pct}%, var(--line) ${pct}% 100%)` }}>
          <span>{pct}%</span>
        </div>
      </div>

      {tudoConcluido && (
        <div className="uni-empty" style={{ marginBottom: 14 }}>
          <div className="ic"><Icon name="trophy" /></div>
          <p>Módulo concluído! Continue por outra trilha na barra lateral.</p>
        </div>
      )}

      <ol className="uni-path">
        {licoes.map((l) => {
          const estado = estados[l.slug];
          const chip = CHIP[estado];
          const nodeCls = estado === 'concluida' ? 'done' : estado === 'atual' ? 'atual' : '';
          return (
            <li key={l.slug} className={`uni-node ${nodeCls}`}>
              <span className="dot"><Icon name={DOT_ICON[estado]} size={17} /></span>
              <Link className="uni-ncard" href={`/universinid/licao/${l.slug}`}
                aria-current={estado === 'atual' ? 'step' : undefined}>
                <div>
                  <h4>{l.titulo}</h4>
                  <div className="m">{l.tempoMin} min · {l.dificuldade}</div>
                </div>
                <span className={`st2 ${chip.cls}`}>{chip.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

import Link from 'next/link';
import { getConquistas } from '@/lib/universinid/actions';
import { Icon } from '@/components/universinid/ui/Icon';

// pt-BR dd/mm/aaaa. Formatado no servidor (a action é chamada direto pelo Server Component,
// então awardedAt continua sendo Date — não cruza a fronteira do cliente).
const fmtData = (d: Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);

export default async function ConquistasPage() {
  const { catalogo, ganhos } = await getConquistas();
  const ganhoEm = new Map(ganhos.map((g) => [g.badgeId, g.awardedAt]));
  const totalGanhas = ganhos.length;

  return (
    <main className="uni-main">
      <Link className="uni-back" href="/universinid"><Icon name="chevron-left" size={16} /> Voltar ao início</Link>

      <h1 className="uni-hi">Minhas <span>conquistas</span></h1>
      <p className="uni-sub">
        {totalGanhas === 0
          ? 'Conclua módulos e a trilha para desbloquear suas primeiras medalhas.'
          : <>Você já conquistou {totalGanhas} de {catalogo.length} {catalogo.length === 1 ? 'medalha' : 'medalhas'}.</>}
      </p>

      {catalogo.length === 0 ? (
        <div className="uni-empty">
          <div className="ic"><Icon name="trophy" size={22} /></div>
          <p>O catálogo de medalhas ainda não foi publicado.</p>
        </div>
      ) : (
        <div className="uni-medals">
          {catalogo.map((b) => {
            const data = ganhoEm.get(b.id);
            const ganha = data != null;
            return (
              <div key={b.id} className={ganha ? 'uni-medal on' : 'uni-medal'}>
                <div className="ic"><Icon name={ganha ? b.icone : 'lock'} size={24} aria-hidden={false} aria-label={ganha ? 'Conquistada' : 'Bloqueada'} /></div>
                <div className="bd">
                  <div className="nm">{b.nome}</div>
                  {ganha
                    ? <div className="dt">Conquistada em {fmtData(data)}</div>
                    : <div className="ds">{b.descricao ?? 'Continue para desbloquear.'}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

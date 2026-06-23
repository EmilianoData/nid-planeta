import Link from 'next/link';
import { getPerfil } from '@/lib/universinid/actions';
import { Icon } from '@/components/universinid/ui/Icon';

const PAPEL: Record<string, string> = { ADMIN: 'Administrador', STUDENT: 'Aluno' };

export default async function PerfilPage() {
  const p = await getPerfil();
  const iniciais =
    p.nome.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('') || '?';

  return (
    <main className="uni-main">
      <Link className="uni-back" href="/universinid"><Icon name="chevron-left" size={16} /> Voltar ao início</Link>

      <section className="uni-profile">
        <div className="uni-profile-id">
          <div className="ava" aria-hidden="true">{iniciais}</div>
          <div>
            <h1>{p.nome}</h1>
            {p.email && <p className="email">{p.email}</p>}
            <span className="uni-badge on">{PAPEL[p.role] ?? p.role}</span>
          </div>
        </div>

        <h2 className="uni-sec">Seu progresso</h2>
        <div className="uni-stats">
          <div className="uni-stat"><div className="n">{p.pctGeral}<small>%</small></div><div className="t">Progresso geral</div></div>
          <div className="uni-stat"><div className="n">{p.licoesConcluidas}<small>/{p.totalLicoes}</small></div><div className="t">Lições concluídas</div></div>
          <div className="uni-stat acc"><div className="n">{p.modulosAtivos}</div><div className="t">Módulos ativos</div></div>
          <div className="uni-stat"><div className="n">{p.streakDias}<small> dias</small></div><div className="t">Sequência (streak)</div></div>
        </div>
      </section>
    </main>
  );
}

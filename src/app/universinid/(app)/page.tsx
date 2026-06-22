import Link from 'next/link';
import { getDashboardData } from '@/lib/universinid/actions';
import { Trilha } from '@/components/universinid/Trilha';
import { Icon } from '@/components/universinid/ui/Icon';

export default async function DashboardPage() {
  const d = await getDashboardData();
  const faltam = d.totalLicoes - d.licoesConcluidas;

  return (
    <main className="uni-main">
      <h1 className="uni-hi">Olá, <span>{d.nome.split(' ')[0]}</span></h1>
      <p className="uni-sub">
        {d.proxima
          ? <>Você está a {faltam} {faltam === 1 ? 'lição' : 'lições'} de concluir o UniversiNID.</>
          : <>Você concluiu todas as lições. 🎉</>}
      </p>

      {d.proxima && (
        <section className="uni-cont">
          <div className="tg">CONTINUE DE ONDE PAROU</div>
          <div className="ti">{d.proxima.titulo}</div>
          <div className="mod">{d.proxima.moduloTitulo}</div>
          <div className="bar"><i style={{ width: `${d.proxima.pct}%` }} /></div>
          <div className="pct">{d.proxima.pct}% concluído</div>
          <Link className="go" href={`/universinid/licao/${d.proxima.slug}`}>
            Continuar <Icon name="arrow-right" size={16} />
          </Link>
        </section>
      )}

      <div className="uni-stats">
        <div className="uni-stat"><div className="n">{d.pctGeral}<small>%</small></div><div className="t">Progresso geral</div></div>
        <div className="uni-stat"><div className="n">{d.licoesConcluidas}<small>/{d.totalLicoes}</small></div><div className="t">Lições concluídas</div></div>
        <div className="uni-stat acc"><div className="n">{d.modulosAtivos}</div><div className="t">Módulos ativos</div></div>
        <div className="uni-stat"><div className="n">{d.streakDias}<small> dias</small></div><div className="t">Sequência (streak)</div></div>
      </div>

      {/* Trilha do módulo atual. O catálogo completo (Course→Module→Lesson) vive na Sidebar. */}
      <Trilha moduloTitulo={d.trilha.moduloTitulo} licoes={d.trilha.licoes} />
    </main>
  );
}

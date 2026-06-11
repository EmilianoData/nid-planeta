import Link from 'next/link';
import { getDashboardData, getProgressMap } from '@/lib/universinid/actions';
import { getPublishedTree } from '@/lib/universinid/content-queries';

const ICON_BY_STATUS: Record<string, string> = { COMPLETED: '✓', IN_PROGRESS: '▸', NOT_STARTED: '○' };
const DIFICULDADE_LABEL: Record<string, string> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
};

export default async function DashboardPage() {
  const [d, tree, progress] = await Promise.all([
    getDashboardData(),
    getPublishedTree(),
    getProgressMap(),
  ]);
  const faltam = d.totalLicoes - d.licoesConcluidas;

  return (
    <main className="uni-main">
      <h1 className="uni-hi">Olá, <span>{d.nome.split(' ')[0]}</span> <span aria-hidden="true">👋</span></h1>
      <p className="uni-sub">
        {d.proxima
          ? <>Você está a {faltam} lições de concluir o UniversiNID.</>
          : <>Você concluiu todas as lições. 🎉</>}
      </p>

      {d.proxima && (
        <section className="uni-cont">
          <div className="tg">CONTINUE DE ONDE PAROU</div>
          <div className="ti">{d.proxima.titulo}</div>
          <div className="mod">{d.proxima.moduloTitulo}</div>
          <div className="bar"><i style={{ width: `${d.proxima.pct}%` }} /></div>
          <div className="pct">{d.proxima.pct}% concluído</div>
          <Link className="go" href={`/universinid/licao/${d.proxima.slug}`}>Retomar →</Link>
        </section>
      )}

      <div className="uni-stats">
        <div className="uni-stat"><div className="n">{d.pctGeral}<small>%</small></div><div className="t">Progresso geral</div></div>
        <div className="uni-stat"><div className="n">{d.licoesConcluidas}<small>/{d.totalLicoes}</small></div><div className="t">Lições concluídas</div></div>
        <div className="uni-stat acc"><div className="n">{d.modulosAtivos}</div><div className="t">Módulos ativos</div></div>
        <div className="uni-stat"><div className="n">{d.streakDias}<small> dias</small></div><div className="t">Sequência (streak)</div></div>
      </div>

      {/* Vitrine completa Course→Module→Lesson, lida do banco (árvore publicada). */}
      {tree.map((course) => (
        <section key={course.id}>
          <h2 className="uni-sec">
            {course.title}
            {course.subtitle ? <b> · {course.subtitle}</b> : null}
          </h2>
          {course.modules.map((m) => (
            <div key={m.id}>
              <h3 className="uni-lbl">{m.emoji} {m.title}</h3>
              <div className="uni-cards">
                {m.lessons.map((l) => {
                  const st = progress[l.slug]?.status ?? 'NOT_STARTED';
                  return (
                    <Link key={l.slug} href={`/universinid/licao/${l.slug}`}
                      className={`uni-ls ${l.slug === d.proxima?.slug ? 'cur' : ''}`}>
                      <div className="top">
                        <div className="ico">{ICON_BY_STATUS[st]}</div>
                        {st === 'COMPLETED'
                          ? <div className="done">✓</div>
                          : l.slug === d.proxima?.slug
                            ? <span style={{ fontSize: '.62rem', color: '#3C3489', fontWeight: 700 }}>EM CURSO</span>
                            : null}
                      </div>
                      <h4>{l.title}</h4>
                      <div className="met">
                        <span className="chip">{l.tempoMin} min</span>
                        <span className="chip">{DIFICULDADE_LABEL[l.dificuldade] ?? l.dificuldade}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}

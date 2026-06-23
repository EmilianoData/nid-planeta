'use client';

import Image from 'next/image';
import NidStats from './NidStats';

/**
 * Bloco institucional renderizado após o spacer dos 3 atos. Conta a história
 * do NID em 5 cenas: números, modelo bimodal, organograma, governança, pilares.
 */
export default function NidPresentation() {
  return (
    <div className="nid-presentation">
      <NidStats />
      <SectionBimodal />
      <SectionOrganograma />
      <SectionGovernanca />
      <SectionPilares />
      <SectionClosing />
    </div>
  );
}

function SectionBimodal() {
  return (
    <section className="nid-section nid-section--bimodal" aria-labelledby="bimodal-title">
      <div className="nid-section__head">
        <span className="nid-section__eyebrow">// Modelo estratégico</span>
        <h2 id="bimodal-title">
          Estrutura do Núcleo de Inovação e o <em>Modelo de TI Bimodal</em>
        </h2>
        <p>
          Arquitetura fundamentada no modelo Gartner de TI Bimodal — dois motores
          rodando em paralelo, com cadências distintas e foco complementar.
        </p>
      </div>

      <div className="motor-grid">
        <article className="motor-card motor-card--m1">
          <span className="motor-tag">Motor 1</span>
          <h3>Sustentação</h3>
          <p>
            Operação contínua e manutenção dos sistemas atuais. Foco em manter as
            luzes acesas, segurança, eficiência do dia a dia e risco baixo.
          </p>
          <span className="motor-lead">liderado por Wellington</span>
        </article>
        <article className="motor-card motor-card--m2">
          <span className="motor-tag">Motor 2</span>
          <h3>Inovação</h3>
          <p>
            Soluções tecnológicas disruptivas, melhoria contínua e transformação
            digital. Foco em explorar novas tecnologias, agilidade, vantagem
            competitiva e risco calculado.
          </p>
          <span className="motor-lead">liderado por Henrique Emiliano</span>
        </article>
      </div>

      <figure className="nid-figure">
        <Image
          src="/nid/motor-bimodal.jpg"
          alt="Diagrama dos dois motores: operação tradicional + núcleo de inovação"
          width={1600}
          height={872}
          priority={false}
        />
        <figcaption>O NID acelera o futuro sem comprometer a operação atual.</figcaption>
      </figure>
    </section>
  );
}

function SectionOrganograma() {
  return (
    <section className="nid-section nid-section--org" aria-labelledby="org-title">
      <div className="nid-section__head">
        <span className="nid-section__eyebrow">// Organização do Núcleo</span>
        <h2 id="org-title">
          Quem opera <em>o motor 2</em>
        </h2>
        <p>
          Sob direção de <b>Josane</b>, com <b>Luiz Henrique</b> como gerente de
          excelência e <b>Henrique Emiliano</b> como líder técnico. O time
          inicial conecta Business Partners de cada setor ao representante de TI
          tradicional desde o primeiro dia.
        </p>
      </div>

      <figure className="nid-figure nid-figure--org">
        <Image
          src="/nid/organograma.png"
          alt="Organograma do Núcleo de Inovação Delp"
          width={1600}
          height={1872}
        />
      </figure>

      <ul className="bp-list" aria-label="Responsabilidades dos Business Partners">
        <li>
          <span className="bp-list__h">Business Partners</span>
          <span>coletam e traduzem demandas junto aos gerentes</span>
        </li>
        <li>
          <span className="bp-list__h">Ciclo de vida</span>
          <span>acompanham os projetos do briefing à sustentação</span>
        </li>
        <li>
          <span className="bp-list__h">Squad de Inovação</span>
          <span>reuniões quinzenais para sinergia, padronização e priorização</span>
        </li>
      </ul>
    </section>
  );
}

function SectionGovernanca() {
  const steps = [
    {
      n: '01',
      title: 'Recebimento e Triagem',
      body: 'Demandas chegam pelos gerentes aos BPs. Registro em formulário com perguntas-chave. SLA: 3 dias.',
    },
    {
      n: '02',
      title: 'Avaliação Estratégica',
      body: 'O Núcleo classifica entre Motor 1 (sustentação) e Motor 2 (inovação). Baixo custo × alto impacto vence.',
    },
    {
      n: '03',
      title: 'Prototipagem e Aprovação',
      body: 'Estudo de viabilidade, estimativas de custo/prazo/impacto, ROI e payback, cronograma.',
    },
    {
      n: '04',
      title: 'Decisão Executiva',
      body: 'Comitê Executivo (Humberto, Josane, Nicácio) aprova orçamento e libera o desenvolvimento.',
    },
  ];

  return (
    <section className="nid-section nid-section--gov" aria-labelledby="gov-title">
      <div className="nid-section__head">
        <span className="nid-section__eyebrow">// Fluxo de demandas</span>
        <h2 id="gov-title">
          Como uma ideia <em>vira resultado</em>
        </h2>
        <p>
          Dois ciclos encadeados: <b>GIM FAM</b> (planejamento e aprovação) e{' '}
          <b>Entrega</b> (desenvolvimento e implantação). Sprints quinzenais, reports
          semanais, implantação em 60 a 90 dias.
        </p>
      </div>

      <ol className="gov-steps">
        {steps.map((s) => (
          <li key={s.n} className="gov-step">
            <span className="gov-step__num">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>

      <figure className="nid-figure">
        <Image
          src="/nid/processo-nid.png"
          alt="Processo NID: dois ciclos — Planejamento/Aprovação e Entrega"
          width={1600}
          height={1728}
        />
        <figcaption>
          Pedido → Triagem → Comitê → Squads ágeis → Implantação. Solução
          transferida para a sustentação após até 90 dias de estabilização.
        </figcaption>
      </figure>
    </section>
  );
}

function SectionPilares() {
  const pilares = [
    {
      t: 'Consolidação de Demandas',
      d: 'Identifica solicitações semelhantes entre setores e entrega uma solução única para múltiplas áreas — reduz retrabalho e ganha escala.',
    },
    {
      t: 'Reaproveitamento Técnico',
      d: 'Reuso de integrações, estruturas e componentes existentes. Padronização tecnológica para maior velocidade e menor custo.',
    },
    {
      t: 'Data Lake — Fonte Única',
      d: 'Base centralizadora de dados da Delp. Serve como a fonte da verdade e reduz custos com transformação e duplicidade.',
    },
    {
      t: 'Governança Anti-Duplicidade',
      d: 'Avaliação criteriosa de novas ferramentas. Wellington envolvido desde o início — evita sobreposição de sistemas.',
    },
  ];

  return (
    <section className="nid-section nid-section--pilares" aria-labelledby="pilares-title">
      <div className="nid-section__head">
        <span className="nid-section__eyebrow">// Sinergia, reaproveitamento e centralização</span>
        <h2 id="pilares-title">
          O NID é o seu <em>parceiro estratégico</em>
        </h2>
        <p>Conectando as dores dos setores às melhores soluções da casa.</p>
      </div>

      <div className="pilares-grid">
        {pilares.map((p) => (
          <article key={p.t} className="pilar-card">
            <h3>{p.t}</h3>
            <p>{p.d}</p>
          </article>
        ))}
      </div>

      <figure className="nid-figure">
        <Image
          src="/nid/hub-estrategico.png"
          alt="Hub estratégico do NID: dores dos setores entram, soluções saem"
          width={1600}
          height={1574}
        />
      </figure>
    </section>
  );
}

function SectionClosing() {
  return (
    <section className="nid-section nid-section--closing" aria-labelledby="closing-title">
      <div className="nid-section__head">
        <span className="nid-section__eyebrow">// Explore o ecossistema</span>
        <h2 id="closing-title">
          Continue navegando pelo <em>NID · Planeta</em>
        </h2>
        <p>
          Volte ao topo para abrir os portais — Sistema Solar, Pipeline e
          UniversiNID estão à sua disposição.
        </p>
      </div>

      <button
        type="button"
        className="closing-cta"
        onClick={() => {
          const track = document.querySelector('.landing-track');
          track?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        ↑ Voltar aos portais
      </button>
    </section>
  );
}

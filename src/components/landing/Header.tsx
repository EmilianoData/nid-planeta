'use client';

const LINKS = [
  { num: '01', label: 'SISTEMA SOLAR', href: '/sistema-solar' },
  { num: '02', label: 'PIPELINE', href: '/sistema-solar?view=pipeline' },
  { num: '03', label: 'UNIVERSINID', href: '/universinid' },
];

const MAIL = 'henrique.emiliano@delp.com.br';

/** Numbered nav with hover-link animation (ported from Moncy). */
export default function Header() {
  return (
    <header className="l-header" data-cursor="disable">
      <a href="/" className="brand" aria-label="NID · Planeta home">
        NID · <b>Planeta</b>
      </a>

      <ul className="links">
        {LINKS.map((l) => (
          <li key={l.num}>
            <a href={l.href} data-cursor="disable">
              <span className="num">{l.num}</span>
              <HoverLink text={l.label} />
            </a>
          </li>
        ))}
      </ul>

      <a className="mail" href={`mailto:${MAIL}`} data-cursor="disable">
        {MAIL}
      </a>
    </header>
  );
}

function HoverLink({ text }: { text: string }) {
  return (
    <span className="hover-link">
      <span className="hover-in">
        {text}
        <span className="dup">{text}</span>
      </span>
    </span>
  );
}

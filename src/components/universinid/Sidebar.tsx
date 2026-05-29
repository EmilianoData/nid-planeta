'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATALOGO } from '@/lib/universinid/catalogo';

type StatusMap = Record<string, { status: string; pct: number }>;

function anel(pct: number, concluido: boolean): string {
  const cor = concluido ? '#0B861D' : '#3C3489';
  return `conic-gradient(${cor} 0 ${pct}%, #e2e0f0 ${pct}% 100%)`;
}

export function Sidebar({ progress }: { progress: StatusMap }) {
  const pathname = usePathname();
  return (
    <nav className="uni-side">
      {CATALOGO.map((m) => (
        <div key={m.id}>
          <div className="uni-lbl">{m.emoji} {m.titulo.toUpperCase()}</div>
          {m.licoes.map((l) => {
            const st = progress[l.slug]?.status ?? 'NOT_STARTED';
            const p = st === 'COMPLETED' ? 100 : (progress[l.slug]?.pct ?? 0);
            return (
              <Link key={l.slug} href={`/universinid/licao/${l.slug}`}
                className={`uni-nav ${pathname.endsWith(l.slug) ? 'on' : ''}`}>
                <span className="uni-rg" style={{ background: anel(p, st === 'COMPLETED') }} />
                {l.titulo}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

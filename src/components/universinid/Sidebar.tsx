'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PublishedTree } from '@/lib/universinid/content-queries';

type StatusMap = Record<string, { status: string; pct: number }>;

function anel(pct: number, concluido: boolean): string {
  const cor = concluido ? 'var(--green)' : 'var(--navy)';
  return `conic-gradient(${cor} 0 ${pct}%, var(--line) ${pct}% 100%)`;
}

export function Sidebar({ progress, tree }: { progress: StatusMap; tree: PublishedTree }) {
  const pathname = usePathname();
  return (
    <nav className="uni-side">
      {tree.map((course) => (
        <div key={course.id}>
          <div className="uni-course">{course.title}</div>
          {course.modules.map((m) => (
            <div key={m.id}>
              <div className="uni-lbl">{m.emoji} {m.title.toUpperCase()}</div>
              {m.lessons.map((l) => {
                const st = progress[l.slug]?.status ?? 'NOT_STARTED';
                const p = st === 'COMPLETED' ? 100 : (progress[l.slug]?.pct ?? 0);
                const ativo = pathname === `/universinid/licao/${l.slug}`;
                return (
                  <Link key={l.slug} href={`/universinid/licao/${l.slug}`}
                    aria-current={ativo ? 'page' : undefined}
                    className={`uni-nav ${ativo ? 'on' : ''}`}>
                    <span className="uni-rg" role="img"
                      aria-label={st === 'COMPLETED' ? 'Concluída' : `${p}% concluído`}
                      style={{ background: anel(p, st === 'COMPLETED') }} />
                    {l.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Usuários', href: '/universinid/admin' },
  { label: 'Conteúdo', href: '/universinid/admin/conteudo' },
  { label: 'Quizzes', href: '/universinid/admin/quizzes' },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="uni-tabs">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`uni-tab ${active ? 'on' : ''}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

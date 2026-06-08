'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Usuários', href: '/universinid/admin' },
  { label: 'Conteúdo', href: '/universinid/admin/conteudo' },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1.5px solid #ececf6',
        marginBottom: 22,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'inline-block',
              padding: '8px 18px',
              fontSize: '.88rem',
              fontWeight: active ? 700 : 500,
              color: active ? '#3C3489' : '#5e5b7a',
              textDecoration: 'none',
              borderBottom: active ? '2.5px solid #3C3489' : '2.5px solid transparent',
              marginBottom: -1.5,
              transition: 'color .15s, border-color .15s',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

import '../universinid.css';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProgressMap, getDashboardData } from '@/lib/universinid/actions';
import { ShellChrome } from '../ShellChrome';
import { QueryProvider } from '@/components/universinid/QueryProvider';

export default async function UniversinidLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/universinid/login');

  const [progress, dash] = await Promise.all([getProgressMap(), getDashboardData()]);

  return (
    <div className="uni-shell">
      <QueryProvider>
        <ShellChrome progress={progress} streak={dash.streakDias} isAdmin={session.user.role === 'ADMIN'}>
          {children}
        </ShellChrome>
      </QueryProvider>
    </div>
  );
}

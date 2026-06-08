import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ContentTree } from '@/components/universinid/admin/ContentTree';

export default async function ConteudoPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/universinid');
  return <ContentTree />;
}

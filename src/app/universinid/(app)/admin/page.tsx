import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listUsers } from '@/lib/universinid/actions';
import { AdminUsers } from './AdminUsers';

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/universinid');
  const users = await listUsers();
  return <AdminUsers users={users} />;
}

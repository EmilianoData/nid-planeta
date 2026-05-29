import '../../universinid.css';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginForm } from './LoginForm';

// Caminho da imagem do painel esquerdo (mascote/arte) — trocar quando houver asset definitivo.
const BRAND_IMAGE = ''; // ex: '/nid/mascote-login.png'

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth();
  if (session?.user) redirect('/universinid');
  const { callbackUrl } = await searchParams;

  return (
    <main className="uni-login">
      <aside className="brand">
        {BRAND_IMAGE && <img src={BRAND_IMAGE} alt="" />}
        <div className="wm">Universi<span>NID</span></div>
        <div className="tag">Onde o NID DELP aprende a construir com IA.</div>
        <div style={{ position: 'relative', zIndex: 1, fontSize: '.8rem', opacity: .8 }}>NID · DELP</div>
      </aside>
      <LoginForm callbackUrl={callbackUrl ?? '/universinid'} />
    </main>
  );
}

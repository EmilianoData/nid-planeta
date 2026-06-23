import Link from 'next/link';
import { Icon } from '@/components/universinid/ui/Icon';

// not-found ESCOPADO ao segmento (app): herda a casca (.uni-shell + universinid.css)
// e NÃO o 404 global/globals.css. O notFound() da lição cai aqui.
export default function NotFound() {
  return (
    <main className="uni-main">
      <div className="uni-empty" style={{ marginTop: 48 }}>
        <div className="ic"><Icon name="search" /></div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>
          Página não encontrada
        </h1>
        <p>O conteúdo que você procura não existe ou ainda não foi publicado.</p>
        <p style={{ marginTop: 14 }}>
          <Link className="uni-back" href="/universinid">
            <Icon name="chevron-left" size={16} /> Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}

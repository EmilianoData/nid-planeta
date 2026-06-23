'use client';

import { useEffect } from 'react';
import { Button } from '@/components/universinid/ui/button';
import { Icon } from '@/components/universinid/ui/Icon';

// error boundary ESCOPADO ao segmento (app): herda a casca + universinid.css (NÃO o
// global-error/globals.css). Captura falhas de render das páginas do segmento (ex.:
// conexão do banco caindo). Client Component obrigatório (recebe reset).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="uni-main">
      <div className="uni-empty" style={{ marginTop: 48 }}>
        <div className="ic"><Icon name="alert-triangle" /></div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>
          Algo deu errado
        </h1>
        <p>Não foi possível carregar este conteúdo. Tente novamente em instantes.</p>
        <p style={{ marginTop: 14 }}>
          <Button variant="outline" size="sm" onClick={() => reset()}>Tentar novamente</Button>
        </p>
      </div>
    </main>
  );
}

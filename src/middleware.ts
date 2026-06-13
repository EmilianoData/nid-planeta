import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

// CSP completa (rider B4) — última camada da defesa em profundidade do conteúdo
// no-code (write-time → read-time → CSP). Aplicada SOMENTE aqui; o matcher
// `/universinid/:path*` garante que a landing `/` e o `/sistema-solar` ficam fora.
// Conjunto COMPLETO: remover/afrouxar uma diretiva derruba a app.
const CSP = [
  // 'self' é obrigatório p/ o iframe legado /universinid.html durante a migração.
  "frame-src 'self' https://*.youtube.com https://www.youtube.com https://player.vimeo.com https://*.videodelivery.net",
  // Blob (upload) + blob:/data: (preview pré-upload do BlockNote).
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  // Next injeta scripts inline de bootstrap/hydration — 'self' puro quebra a hidratação.
  "script-src 'self' 'unsafe-inline'",
  // @blocknote/mantine injeta estilo inline; fonts.googleapis.com serve o CSS da
  // Barlow (link no root layout) — sem o host, a fonte mandatória cai no fallback.
  // Os .woff2 do gstatic não precisam de font-src (não há default-src restringindo).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
].join('; ');

function withCsp(res: NextResponse): NextResponse {
  res.headers.set('Content-Security-Policy', CSP);
  return res;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Login e endpoints de auth sempre liberados
  if (pathname.startsWith('/universinid/login') || pathname.startsWith('/api/auth')) {
    return withCsp(NextResponse.next());
  }

  // Sem sessão → redireciona para login com callback
  if (!req.auth) {
    const url = new URL('/universinid/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return withCsp(NextResponse.redirect(url));
  }

  // Admin só para ADMIN
  if (pathname.startsWith('/universinid/admin') && req.auth.user?.role !== 'ADMIN') {
    return withCsp(NextResponse.redirect(new URL('/universinid', req.url)));
  }

  return withCsp(NextResponse.next());
});

// matcher: SOMENTE rotas /universinid — landing, /sistema-solar, /pipeline ficam públicas
export const config = {
  matcher: ['/universinid/:path*'],
};

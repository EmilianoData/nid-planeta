import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Login e endpoints de auth sempre liberados
  if (pathname.startsWith('/universinid/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Sem sessão → redireciona para login com callback
  if (!req.auth) {
    const url = new URL('/universinid/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Admin só para ADMIN
  if (pathname.startsWith('/universinid/admin') && req.auth.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/universinid', req.url));
  }

  return NextResponse.next();
});

// matcher: SOMENTE rotas /universinid — landing, /sistema-solar, /pipeline ficam públicas
export const config = {
  matcher: ['/universinid/:path*'],
};

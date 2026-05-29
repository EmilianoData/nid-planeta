import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/universinid/login' },
  providers: [], // preenchido em auth.ts (mantém middleware sem Prisma)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.nome = (user as { nome: string }).nome;
        token.role = (user as { role: 'STUDENT' | 'ADMIN' }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.uid as string,
        nome: token.nome as string,
        role: token.role as 'STUDENT' | 'ADMIN',
      };
      return session;
    },
  },
};

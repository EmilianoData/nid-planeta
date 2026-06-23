import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { authConfig } from '@/lib/auth.config';

const DUMMY_HASH = bcrypt.hashSync('timing-guard-not-a-real-password', 12);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).refine(
    (s) => new TextEncoder().encode(s).length <= 72,
    { message: 'Senha muito longa' },
  ),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'E-mail e senha',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (err) {
          console.error('auth:db-unavailable', { email, err });
          throw err;
        }

        const hashToCompare = user?.isActive ? user.passwordHash : DUMMY_HASH;
        const ok = await verifyPassword(password, hashToCompare);
        if (!user || !user.isActive || !ok) return null;

        return { id: user.id, email: user.email, nome: user.name, role: user.role };
      },
    }),
  ],
});

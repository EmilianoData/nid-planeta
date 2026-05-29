'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth';

export async function authenticate(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: (formData.get('callbackUrl') as string) || '/universinid',
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) return 'Credenciais inválidas.';
    throw error; // redirect lança um erro especial — deixar propagar
  }
}

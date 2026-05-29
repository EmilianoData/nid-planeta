'use client';

import { useActionState } from 'react';
import { authenticate } from './actions';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, formAction, pending] = useActionState(authenticate, undefined);
  return (
    <form action={formAction} className="form">
      <h1>Bem-vindo</h1>
      <p>Acesso restrito à equipe NID · DELP</p>
      {error && <div className="err" role="alert">{error}</div>}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" required autoComplete="email" />
      <label htmlFor="password">Senha</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" />
      <button className="submit" type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

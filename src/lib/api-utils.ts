import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Role = 'STUDENT' | 'ADMIN';

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
export function validationError(error: z.ZodError) {
  const msgs = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return apiError(msgs.join('; '), 422);
}
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | NextResponse> {
  try {
    return schema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) return validationError(err);
    return apiError('Corpo da requisição inválido', 400);
  }
}
export async function withAuth(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user) return { error: apiError('Não autenticado', 401), session: null };
  const usuario = session.user as { id?: string; role?: Role };
  if (allowedRoles && (!usuario.role || !allowedRoles.includes(usuario.role))) {
    return { error: apiError('Sem permissão', 403), session: null };
  }
  // OWASP A07: o JWT (8h) não carrega isActive. Re-checa no banco a cada request
  // autenticada para que desativar a conta revogue o acesso imediatamente, sem
  // esperar o token expirar. null = conta inexistente OU inativa → 401.
  const ativo = usuario.id
    ? await prisma.user.findUnique({ where: { id: usuario.id, isActive: true }, select: { id: true } })
    : null;
  if (!ativo) return { error: apiError('Conta inativa', 401), session: null };
  return { error: null, session: session as { user: { id: string; role: Role } } };
}

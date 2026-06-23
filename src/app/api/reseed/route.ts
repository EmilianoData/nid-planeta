import { NextResponse } from 'next/server';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { withAuth } from '@/lib/api-utils';

const run = promisify(exec);

export async function POST() {
  // O middleware NÃO cobre /api/** — sem esta guarda a rota fica pública (C1, FASE-05).
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  try {
    const { stdout, stderr } = await run('node scripts/seed.mjs', { cwd: process.cwd() });
    return NextResponse.json({ ok: true, stdout, stderr });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

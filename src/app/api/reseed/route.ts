import { NextResponse } from 'next/server';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(exec);

export async function POST() {
  try {
    const { stdout, stderr } = await run('node scripts/seed.mjs', { cwd: process.cwd() });
    return NextResponse.json({ ok: true, stdout, stderr });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

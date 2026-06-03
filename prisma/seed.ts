import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { runSeedContent } from './seed-content';
import { prisma as contentPrisma } from '../src/lib/prisma';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) }); // eslint-disable-line @typescript-eslint/no-explicit-any

async function main() {
  const email = process.env['SEED_ADMIN_EMAIL'];
  const name = process.env['SEED_ADMIN_NAME'];
  const password = process.env['SEED_ADMIN_PASSWORD'];
  if (!email || !name || !password) {
    throw new Error('Defina SEED_ADMIN_EMAIL, SEED_ADMIN_NAME e SEED_ADMIN_PASSWORD no .env');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: 'ADMIN', isActive: true },
    create: { email, name, passwordHash, role: 'ADMIN', isActive: true },
  });
  console.log(`Admin pronto: ${user.email} (${user.role})`);

  await runSeedContent();
  console.log('✓ conteúdo semeado (curso/módulos/39 lições)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); await contentPrisma.$disconnect(); });

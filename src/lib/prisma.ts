import { PrismaClient } from '@/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 8,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => console.error('Unexpected PG pool error:', err));
  const adapter = new PrismaPg(pool as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

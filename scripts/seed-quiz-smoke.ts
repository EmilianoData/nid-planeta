// Seed de uma lição PUBLICADA com um bloco quiz, alvo do smoke da FASE-08. Artefato de teste
// (como smoke-fase2a-*) — limpar depois via DB. Rodar: npx tsx scripts/seed-quiz-smoke.ts
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool as never) });

const SLUG = 'quiz-smoke-fase08';
const quizDoc = [
  { id: 'h', type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Avaliação rápida', styles: {} }], children: [] },
  { id: 'p', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'Responda para concluir a lição.', styles: {} }], children: [] },
  {
    id: 'quiz-smoke', type: 'quiz',
    props: {
      notaCorte: 50,
      questoesJson: JSON.stringify([
        { enunciado: 'Quanto é 2 + 2?', alternativas: ['3', '4', '5'], corretaIdx: 1, explicacao: 'Dois mais dois é quatro.' },
        { enunciado: 'Cor do céu em um dia claro?', alternativas: ['Verde', 'Azul'], corretaIdx: 1 },
      ]),
    },
  },
];

async function main() {
  const mod = await prisma.module.findFirst({
    where: { status: 'PUBLISHED', course: { status: 'PUBLISHED' } },
    orderBy: { position: 'asc' },
  });
  if (!mod) throw new Error('Nenhum módulo publicado para anexar a lição de smoke.');
  const lesson = await prisma.lesson.upsert({
    where: { slug: SLUG },
    update: { status: 'PUBLISHED', contentDraft: quizDoc as never, contentPublished: quizDoc as never },
    create: {
      moduleId: mod.id, slug: SLUG, title: 'Quiz Smoke (FASE-08)', status: 'PUBLISHED', position: 999,
      contentDraft: quizDoc as never, contentPublished: quizDoc as never,
    },
  });
  console.log(`OK lição de smoke: /universinid/licao/${lesson.slug} (módulo: ${mod.title})`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); await pool.end(); });

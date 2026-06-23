// Smoke FOCADO da FASE-08 (Quizzes). Loga como ALUNO, abre a lição semeada (quiz-smoke-fase08),
// prova que o GABARITO não está no HTML, responde corretamente, passa, e a conclusão é refletida.
// Coleta erros de console/página (pega violações de CSP). EXIT 1 se houver erro ou falha de passo.
//
// Pré-requisitos: lição semeada (npx tsx scripts/seed-quiz-smoke.ts) + server rodando.
//   npm install --no-save playwright@1.60.0 && npx playwright install chromium
//   SMOKE_BASE=http://localhost:3000 node scripts/smoke-quiz-fase08.mjs
import 'dotenv/config';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_STUDENT_EMAIL;
const PWD = process.env.SMOKE_STUDENT_PASSWORD;
const SLUG = 'quiz-smoke-fase08';
const OUT = path.resolve('.smoke');
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log('[smoke-quiz]', ...a);
const consoleErrors = [];
const pageErrors = [];
const stepFailures = [];

if (!EMAIL || !PWD) { console.error('SMOKE_STUDENT_EMAIL/PASSWORD ausentes no .env'); process.exit(1); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${page.url()}] ${m.text()}`); });
page.on('pageerror', (e) => pageErrors.push(`[${page.url()}] ${e.message}`));
const shot = (name) => page.screenshot({ path: path.join(OUT, name), fullPage: true });
async function step(name, fn) {
  try { await fn(); log('OK   ', name); }
  catch (e) { log('FAIL ', name, '->', e.message); stepFailures.push(`${name}: ${e.message}`); }
}

await step('1-login-aluno', async () => {
  await page.goto(`${BASE}/universinid/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PWD);
  await Promise.all([
    page.waitForURL('**/universinid', { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
});

await step('2-abre-licao-com-quiz-e-NAO-vaza-gabarito', async () => {
  await page.goto(`${BASE}/universinid/licao/${SLUG}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('section[aria-label="Quiz da lição"]', { timeout: 15000 });
  const html = await page.content();
  // O gabarito NÃO pode estar no payload entregue ao aluno (antes de submeter).
  if (html.includes('corretaIdx')) throw new Error('VAZAMENTO: corretaIdx presente no HTML');
  if (html.includes('Dois mais dois é quatro')) throw new Error('VAZAMENTO: explicação (gabarito) presente antes de submeter');
  // Lição com quiz NÃO mostra o botão manual de concluir.
  if (await page.getByRole('button', { name: /Marcar como concluída/i }).count()) {
    throw new Error('botão manual de concluir não deveria aparecer em lição com quiz');
  }
  await shot('quiz-01-aluno.png');
});

await step('3-responde-correto-e-passa', async () => {
  await page.getByRole('radio', { name: '4', exact: true }).check();   // Q1: 2+2 = 4
  await page.getByRole('radio', { name: 'Azul', exact: true }).check(); // Q2: céu = Azul
  // Promise.all (não criar a promise antes da ação): se o submit não vier, rejeita aqui dentro
  // do try do step() — sem promise pendente que viraria unhandled rejection.
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/universinid/quiz/attempt') && r.request().method() === 'POST' && r.status() === 200,
      { timeout: 20000 },
    ),
    page.getByRole('button', { name: /Enviar respostas/i }).click(),
  ]);
  await page.waitForSelector('text=/Aprovado/i', { timeout: 10000 });
  await shot('quiz-02-aprovado.png');
});

await step('4-feedback-mostra-explicacao-apos-submeter', async () => {
  const txt = await page.locator('section[aria-label="Quiz da lição"]').innerText();
  if (!txt.includes('Dois mais dois é quatro')) throw new Error('explicação deveria aparecer no feedback pós-submissão');
});

await browser.close();

console.log('\n==== CONSOLE ERRORS (' + consoleErrors.length + ') ====');
consoleErrors.forEach((e) => console.log(' -', e));
console.log('==== PAGE ERRORS (' + pageErrors.length + ') ====');
pageErrors.forEach((e) => console.log(' -', e));
console.log('==== STEP FAILURES (' + stepFailures.length + ') ====');
stepFailures.forEach((e) => console.log(' -', e));

if (consoleErrors.length || pageErrors.length || stepFailures.length) {
  process.exitCode = 1;
  console.log('\n[smoke-quiz] RESULTADO: FALHOU (exit 1)');
} else {
  console.log('\n[smoke-quiz] RESULTADO: OK (exit 0)');
}

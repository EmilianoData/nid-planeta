// Smoke FOCADO da FASE-09 (Medalhas / Conquistas) — F9.7, gate de saída.
// Loga como ALUNO no PREVIEW Vercel (atrás de Deployment Protection → cookie de bypass via
// SMOKE_SHARE), fecha um MÓDULO inteiro pela UI e prova end-to-end o caminho de concessão:
//   1. baseline: /conquistas + 5º stat "Conquistas"
//   2. completa as 5 lições do módulo-alvo (sem quiz → botão "Marcar como concluída")
//   3. /conquistas ganha EXATAMENTE +1 medalha (a do módulo) e o 5º stat sobe +1
//   4. idempotência: dispara grantBadges de novo (conclui 1 lição de OUTRO módulo) → segue +1,
//      sem medalha espúria (prova @@unique + skipDuplicates em runtime, não só no unit test)
// Coleta erros de console/página → pega violações de CSP. EXIT 1 em qualquer erro/falha de passo.
//
// Requisitos: Playwright + chromium (já em cache nesta máquina).
//   SMOKE_BASE   — URL do deployment (default = imutável do commit 8bc03a5)
//   SMOKE_SHARE  — URL com ?_vercel_share=… (seta _vercel_jwt; NÃO commitar o token)
//   SMOKE_STUDENT_EMAIL / SMOKE_STUDENT_PASSWORD — do .env
import 'dotenv/config';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE || 'https://nid-planeta-56tpaw2d4-henriqueresende11-9150s-projects.vercel.app';
const SHARE = process.env.SMOKE_SHARE; // share URL que seta o cookie de bypass do SSO
const EMAIL = process.env.SMOKE_STUDENT_EMAIL;
const PWD = process.env.SMOKE_STUDENT_PASSWORD;

// Módulo-alvo: "Intermediário" (5 lições publicadas, NENHUMA com quiz).
const MODULO_ALVO = 'Intermediário';
const LICOES_ALVO = ['ciclo-sdd', 'nid-gate-checkpoint', 'verificacao-por-midia', 'arvore-decisao-agente', 'knowledge-base-uso'];
// Lição de OUTRO módulo (Referência Rápida) p/ re-disparar grantBadges no teste de idempotência.
const LICAO_OUTRO_MODULO = 'faq';

const OUT = path.resolve('.smoke');
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log('[smoke-f09]', ...a);
// Vercel Live Feedback (toolbar): injetado pela PLATAFORMA só no preview; a CSP da app o bloqueia
// DE PROPÓSITO (não é violação da app — some em prod, que builda da main sem toolbar). Não falha o gate.
const TOOLBAR_NOISE = 'vercel.live/_next-live/feedback';
const consoleErrors = [];  // erros DA APP nas páginas /universinid (GATE do F9.7)
const toolbarNoise = [];   // ruído do toolbar do preview (informativo)
const foraDeEscopo = [];   // erros em rotas FORA do UniversiNID (ex.: landing 3D `/` — NidStats); informativo
const pageErrors = [];
const stepFailures = [];
const VERIFY_ONLY = process.env.SMOKE_VERIFY_ONLY === '1'; // read-only: não conclui lição nenhuma

if (!EMAIL || !PWD) { console.error('SMOKE_STUDENT_EMAIL/PASSWORD ausentes no .env'); process.exit(1); }
if (!SHARE) { console.error('SMOKE_SHARE ausente (URL com ?_vercel_share=… p/ bypass do SSO)'); process.exit(1); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const wire = (p) => {
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = p.url();
    const line = `[${url}] ${m.text()}`;
    if (m.text().includes(TOOLBAR_NOISE)) toolbarNoise.push(line);      // toolbar do preview (plataforma)
    else if (url.includes('/universinid')) consoleErrors.push(line);   // GATE: só o UniversiNID conta
    else foraDeEscopo.push(line);                                      // landing `/` etc. — fora do F9.7
  });
  p.on('pageerror', (e) => pageErrors.push(`[${p.url()}] ${e.message}`));
};
wire(page);
const shot = (name) => page.screenshot({ path: path.join(OUT, name), fullPage: true });
async function step(name, fn) {
  try { const r = await fn(); log('OK   ', name); return r; }
  catch (e) { log('FAIL ', name, '->', e.message); stepFailures.push(`${name}: ${e.message}`); }
}

// Conjunto de medalhas GANHAS (nomes) + total do catálogo, lendo /conquistas.
async function lerConquistas() {
  await page.goto(`${BASE}/universinid/conquistas`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.uni-medals, .uni-empty', { timeout: 40000 });
  const total = await page.locator('.uni-medal').count();
  const on = (await page.locator('.uni-medal.on .nm').allInnerTexts()).map((s) => s.trim()).sort();
  return { total, on };
}
// Valor do 5º stat "Conquistas" no dashboard.
async function lerStatConquistas() {
  await page.goto(`${BASE}/universinid`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('a.uni-stat[href*="conquistas"] .n', { timeout: 40000 });
  const t = (await page.locator('a.uni-stat[href*="conquistas"] .n').first().innerText()).trim();
  const n = parseInt(t, 10);
  if (Number.isNaN(n)) throw new Error(`5º stat não numérico: "${t}"`);
  return n;
}
async function concluirLicao(slug) {
  await page.goto(`${BASE}/universinid/licao/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button.uni-btn', { timeout: 40000 });
  const btn = page.getByRole('button', { name: /Marcar como concluída/i });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForSelector('button.uni-btn.ok', { timeout: 30000 }); // server action awaita grantBadges
    return 'concluida-agora';
  }
  if (await page.locator('button.uni-btn.ok').count()) return 'ja-concluida';
  throw new Error(`${slug}: nem botão de concluir nem estado concluído`);
}

let base = null;       // { total, on } baseline
let depois = null;     // { total, on } após fechar o módulo
let novaMedalha = null;

await step('0-bypass-sso', async () => {
  const r = await page.goto(SHARE, { waitUntil: 'domcontentloaded' });
  if (!r || r.status() >= 400) throw new Error(`share URL status ${r?.status()}`);
  const ck = (await ctx.cookies()).map((c) => c.name);
  if (!ck.includes('_vercel_jwt')) throw new Error(`cookie _vercel_jwt não setado (cookies: ${ck.join(',')})`);
});

await step('1-login-aluno', async () => {
  await page.goto(`${BASE}/universinid/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 20000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PWD);
  await Promise.all([
    page.waitForURL('**/universinid', { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForSelector('h1.uni-hi', { timeout: 20000 });
});

if (VERIFY_ONLY) {
  // Re-verificação READ-ONLY (não conclui lição): confirma que a medalha do módulo persistiu
  // e que o console fica limpo de erros DA APP (só o ruído do toolbar do preview).
  await step('V-medalha-persistida-readonly', async () => {
    const c = await lerConquistas();
    log(`verify: ${c.on.length} ganha(s) de ${c.total}`, c.on);
    if (!c.on.includes('Módulo: Intermediário')) {
      throw new Error(`medalha "Módulo: Intermediário" ausente: ${JSON.stringify(c.on)}`);
    }
    await shot('f09-verify-conquistas.png');
    const n = await lerStatConquistas();
    if (n !== c.on.length) throw new Error(`5º stat(${n}) ≠ ganhas(${c.on.length})`);
    log(`verify 5º stat "Conquistas" = ${n}`);
    await shot('f09-verify-dashboard.png');
  });
} else {

await step('2-baseline-conquistas', async () => {
  base = await lerConquistas();
  log(`baseline: ${base.on.length} ganha(s) de ${base.total} no catálogo`, base.on);
  await shot('f09-01-conquistas-baseline.png');
});

await step('3-baseline-stat', async () => {
  const n = await lerStatConquistas();
  log(`baseline 5º stat "Conquistas" = ${n}`);
  if (n !== base.on.length) throw new Error(`stat(${n}) ≠ medalhas ganhas na /conquistas(${base.on.length})`);
  await shot('f09-02-dashboard-baseline.png');
});

await step(`4-fechar-modulo-${MODULO_ALVO}`, async () => {
  for (const slug of LICOES_ALVO) {
    const r = await concluirLicao(slug);
    log(`  ${slug}: ${r}`);
  }
});

await step('5-conquistas-ganhou-exatamente-+1', async () => {
  depois = await lerConquistas();
  const novas = depois.on.filter((m) => !base.on.includes(m));
  log(`após fechar o módulo: ${depois.on.length} ganha(s)`, depois.on, '| novas:', novas);
  if (depois.total !== base.total) throw new Error(`catálogo mudou (${base.total}→${depois.total})`);
  if (novas.length !== 1) throw new Error(`esperava EXATAMENTE 1 medalha nova, veio ${novas.length}: ${JSON.stringify(novas)}`);
  novaMedalha = novas[0];
  await shot('f09-03-conquistas-ganhou.png');
});

await step('6-stat-subiu-+1', async () => {
  const n = await lerStatConquistas();
  log(`5º stat após = ${n} (baseline ${base.on.length})`);
  if (n !== base.on.length + 1) throw new Error(`stat esperado ${base.on.length + 1}, veio ${n}`);
  await shot('f09-04-dashboard-ganhou.png');
});

await step('7-idempotencia-sem-medalha-espuria', async () => {
  const r = await concluirLicao(LICAO_OUTRO_MODULO); // re-dispara grantBadges (módulo-alvo já completo)
  log(`  ${LICAO_OUTRO_MODULO} (outro módulo): ${r}`);
  const reler = await lerConquistas();
  const novasAgora = reler.on.filter((m) => !base.on.includes(m));
  log(`após re-disparo: ${reler.on.length} ganha(s)`, reler.on);
  if (novasAgora.length !== 1 || novasAgora[0] !== novaMedalha) {
    throw new Error(`idempotência quebrou: esperava só "${novaMedalha}", veio ${JSON.stringify(novasAgora)}`);
  }
  await shot('f09-05-conquistas-idempotente.png');
});

} // fim do bloco de mutação (!VERIFY_ONLY)

await browser.close();

if (!VERIFY_ONLY) console.log(`\n==== MEDALHA CONCEDIDA: ${novaMedalha ?? '(nenhuma)'} ====`);
console.log('==== CONSOLE ERRORS DA APP em /universinid (' + consoleErrors.length + ') — GATE F9.7 ====');
consoleErrors.forEach((e) => console.log(' -', e));
console.log('==== RUÍDO DO TOOLBAR DO PREVIEW (' + toolbarNoise.length + ') — bloqueado pela CSP de propósito; NÃO falha o gate; ausente em prod ====');
toolbarNoise.slice(0, 2).forEach((e) => console.log(' -', e));
if (toolbarNoise.length > 2) console.log(`   … +${toolbarNoise.length - 2} idênticos (mesmo feedback.js, outras páginas)`);
console.log('==== FORA DE ESCOPO — erros em rotas não-UniversiNID (' + foraDeEscopo.length + ') — informativo (landing 3D, etc.) ====');
foraDeEscopo.forEach((e) => console.log(' -', e));
console.log('==== PAGE ERRORS (' + pageErrors.length + ') ====');
pageErrors.forEach((e) => console.log(' -', e));
console.log('==== STEP FAILURES (' + stepFailures.length + ') ====');
stepFailures.forEach((e) => console.log(' -', e));

if (consoleErrors.length || pageErrors.length || stepFailures.length) {
  process.exitCode = 1;
  console.log('\n[smoke-f09] RESULTADO: FALHOU (exit 1)');
} else {
  console.log('\n[smoke-f09] RESULTADO: OK (exit 0)');
}

// Smoke driver for UniversiNID. Fase 1 (steps 1-8): login -> dashboard -> lesson ->
// mark complete -> Cmd+K palette -> admin, plus the login error + narrow-viewport states.
// Fase 2a (steps 9-14, FASE-07 7.3): full no-code authoring flow — create
// course/module/lesson via the ContentTree dialogs, author in BlockNote (autosave),
// publish, view it natively as a STUDENT, complete it, then unpublish (cleanup).
// Screenshots each surface to .smoke/ and collects console/page errors.
// Reads the admin/student passwords from .env (never logs them).
// EXIT CODE: 1 if any console error, page error, or step failure occurred (gate).
//
// REQUIRES Playwright (not a project dependency). Install transiently first:
//   npm install --no-save playwright@1.60.0 && npx playwright install chromium
// Then: node scripts/smoke-universinid.mjs   (a server must be running)
//   SMOKE_BASE   — base URL (default http://localhost:3001; use :3000 for this repo)
//   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD       — admin login
//   SMOKE_STUDENT_EMAIL / SMOKE_STUDENT_PASSWORD — STUDENT login (step 12)
import 'dotenv/config';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001';
const EMAIL = process.env.SEED_ADMIN_EMAIL;
const PWD = process.env.SEED_ADMIN_PASSWORD;
const STUDENT_EMAIL = process.env.SMOKE_STUDENT_EMAIL;
const STUDENT_PWD = process.env.SMOKE_STUDENT_PASSWORD;
const OUT = path.resolve('.smoke');
mkdirSync(OUT, { recursive: true });

// Slug único por execução — `slug` é @unique; re-runs não podem colidir (Decisão #4).
const TS = Date.now();
const SLUG = `smoke-fase2a-${TS}`;

const log = (...a) => console.log('[smoke]', ...a);
const consoleErrors = [];
const pageErrors = [];
const stepFailures = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const wire = (p) => {
  p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${p.url()}] ${m.text()}`); });
  p.on('pageerror', (e) => pageErrors.push(`[${p.url()}] ${e.message}`));
};
wire(page);
const shot = (p, name, full = true) => p.screenshot({ path: path.join(OUT, name), fullPage: full });

async function step(name, fn) {
  try { await fn(); log('OK   ', name); }
  catch (e) { log('FAIL ', name, '->', e.message); stepFailures.push(`${name}: ${e.message}`); }
}

await step('1-login-page', async () => {
  await page.goto(`${BASE}/universinid`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#email', { timeout: 15000 });
  await shot(page, '01-login.png');
});

await step('2-authenticate', async () => {
  await page.fill('#email', EMAIL);
  await page.fill('#password', PWD);
  await Promise.all([
    page.waitForURL('**/universinid', { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForSelector('h1.uni-hi', { timeout: 15000 });
  await shot(page, '02-dashboard.png');
  await shot(page, '02b-dashboard-viewport.png', false); // real 1440x900, not fullPage
});

await step('3-open-lesson', async () => {
  await page.goto(`${BASE}/universinid/licao/sdd-spec-driven-development`, { waitUntil: 'networkidle' });
  await page.waitForSelector('iframe.uni-frame', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await shot(page, '03-lesson.png');
});

await step('4-mark-complete', async () => {
  const btn = page.getByRole('button', { name: /Marcar como concluída/i });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForSelector('button.uni-btn.ok', { timeout: 10000 });
  }
  await shot(page, '04-lesson-completed.png');
});

await step('5-command-palette', async () => {
  await page.goto(`${BASE}/universinid`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1.uni-hi', { timeout: 15000 });
  await page.keyboard.press('Control+k');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.fill('[role="dialog"] input', 'dax');
  await page.waitForTimeout(400);
  await shot(page, '05-palette.png');
  await page.keyboard.press('Escape');
});

await step('6-admin', async () => {
  await page.goto(`${BASE}/universinid/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot(page, '06-admin.png');
});

// Fresh, logged-out context for the login error + narrow-viewport states.
await step('7-login-wrong-password', async () => {
  const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await anon.newPage(); wire(p);
  await p.goto(`${BASE}/universinid/login`, { waitUntil: 'networkidle' });
  await p.fill('#email', EMAIL);
  await p.fill('#password', 'senha-errada-123');
  await p.click('button[type="submit"]');
  await p.waitForSelector('.err', { timeout: 10000 });
  await shot(p, '07-login-error.png');
  await anon.close();
});

await step('8-login-narrow', async () => {
  const anon = await browser.newContext({ viewport: { width: 720, height: 900 } });
  const p = await anon.newPage(); wire(p);
  await p.goto(`${BASE}/universinid/login`, { waitUntil: 'networkidle' });
  await p.waitForSelector('#email', { timeout: 10000 });
  await shot(p, '08-login-narrow.png');
  await anon.close();
});

// ── Fase 2a: fluxo completo de autoria no-code (admin já autenticado em `page`) ──

await step('9-criar-curso-modulo-licao', async () => {
  await page.goto(`${BASE}/universinid/admin/conteudo`, { waitUntil: 'networkidle' });
  await page.waitForSelector('button:has-text("+ Novo curso")', { timeout: 60000 });

  // Curso (aparece no fim da árvore → escopo por .last()).
  await page.getByRole('button', { name: '+ Novo curso' }).click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.fill('[role="dialog"] input[placeholder="Ex: Fundamentos de Subsea"]', `Smoke Curso ${TS}`);
  await page.fill('[role="dialog"] input[placeholder="ex: fundamentos-subsea"]', `${SLUG}-curso`);
  await page.getByRole('button', { name: 'Criar curso' }).click();
  await page.waitForSelector(`text=Smoke Curso ${TS}`, { timeout: 15000 });

  // Módulo no curso recém-criado (último "+ Módulo").
  await page.getByRole('button', { name: '+ Módulo' }).last().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.fill('[role="dialog"] input[placeholder="Ex: Módulo 1 – Introdução"]', `Smoke Módulo ${TS}`);
  await page.getByRole('button', { name: 'Criar módulo' }).click();
  await page.waitForSelector(`text=Smoke Módulo ${TS}`, { timeout: 15000 });

  // Lição no módulo recém-criado (último "+ Lição"), com slug determinístico.
  await page.getByRole('button', { name: '+ Lição' }).last().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.fill('[role="dialog"] input[placeholder="Ex: Conceitos básicos"]', `Smoke Lição ${TS}`);
  await page.fill('[role="dialog"] input[placeholder="ex: conceitos-basicos"]', SLUG);
  await page.getByRole('button', { name: 'Criar lição' }).click();
  await page.waitForSelector(`text=Smoke Lição ${TS}`, { timeout: 15000 });
  await shot(page, '09-content-tree.png');
});

await step('10-autorar-no-editor', async () => {
  // Navegação SPA via o link da árvore (fluxo real do autor) → editor monta.
  await page.getByRole('link', { name: 'Editar conteúdo' }).last().click();
  await page.waitForSelector('.ProseMirror', { timeout: 60000 });
  // Autosave debounced (800ms) dispara PATCH 200 na lição.
  const savePromise = page.waitForResponse(
    (r) => /\/api\/universinid\/admin\/lessons\/[^/]+$/.test(r.url())
      && r.request().method() === 'PATCH' && r.status() === 200,
    { timeout: 20000 },
  );
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('Conteúdo autorado pelo smoke da Fase 2a — bloco de texto nativo.');
  await savePromise;
  await shot(page, '10-editor.png');

  // ── inserir um bloco de VÍDEO (embed) via slash-menu (FASE-07.1) ──
  await page.keyboard.press('Enter');
  await page.keyboard.type('/video');
  await page.getByText('Vídeo (embed)', { exact: false }).first().click();
  // O save deve conter a URL NORMALIZADA (watch?v= -> /embed/) — prova a normalização end-to-end.
  const embedSave = page.waitForResponse(
    (r) => /\/api\/universinid\/admin\/lessons\/[^/]+$/.test(r.url())
      && r.request().method() === 'PATCH' && r.status() === 200
      && (r.request().postData() ?? '').includes('youtube.com/embed/smoke12345'),
    { timeout: 20000 },
  );
  await page.getByLabel(/Link do vídeo/i).fill('https://www.youtube.com/watch?v=smoke12345');
  await page.getByRole('button', { name: /Inserir vídeo/i }).click();
  await embedSave;
  await shot(page, '10b-editor-embed.png');
});

await step('11-publicar', async () => {
  const pubPromise = page.waitForResponse(
    (r) => /\/api\/universinid\/admin\/lessons\/[^/]+\/publish$/.test(r.url())
      && r.request().method() === 'POST' && r.status() === 200,
    { timeout: 15000 },
  );
  await page.getByRole('button', { name: 'Publicar' }).click();
  await pubPromise;
  await shot(page, '11-published.png');
});

// Contexto novo do navegador, autenticado como STUDENT.
let studentCtx;
await step('12-ver-como-aluno-nativo', async () => {
  if (!STUDENT_EMAIL || !STUDENT_PWD) throw new Error('SMOKE_STUDENT_EMAIL/PASSWORD ausentes no .env');
  studentCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const sp = await studentCtx.newPage(); wire(sp);
  await sp.goto(`${BASE}/universinid/login`, { waitUntil: 'networkidle' });
  await sp.fill('#email', STUDENT_EMAIL);
  await sp.fill('#password', STUDENT_PWD);
  await Promise.all([
    sp.waitForURL('**/universinid', { timeout: 20000 }),
    sp.click('button[type="submit"]'),
  ]);
  await sp.goto(`${BASE}/universinid/licao/${SLUG}`, { waitUntil: 'networkidle' });
  // Render NATIVO: existe .uni-content e NÃO existe iframe legado.
  await sp.waitForSelector('.uni-content', { timeout: 15000 });
  const legacy = await sp.locator('iframe.uni-frame').count();
  if (legacy !== 0) throw new Error('esperava render nativo, mas há iframe.uni-frame');
  const txt = await sp.locator('.uni-content').innerText();
  if (!txt.includes('autorado pelo smoke')) throw new Error('conteúdo nativo não renderizou');
  // Vídeo embed renderiza como <iframe> normalizado (round-trip editor↔RenderBlocks — critério #1).
  await sp.waitForSelector('.uni-embed iframe', { timeout: 15000 });
  const embedSrc = await sp.locator('.uni-embed iframe').first().getAttribute('src');
  if (!embedSrc || !embedSrc.includes('youtube.com/embed/smoke12345')) {
    throw new Error(`embed não renderizou como iframe normalizado (src=${embedSrc})`);
  }
  await shot(sp, '12-aluno-nativo.png');
  studentCtx.__page = sp;
});

await step('13-aluno-conclui-e-dashboard-reflete', async () => {
  const sp = studentCtx.__page;
  const btn = sp.getByRole('button', { name: /Marcar como concluída/i });
  await btn.first().click();
  await sp.waitForSelector('button.uni-btn.ok', { timeout: 10000 });
  await sp.goto(`${BASE}/universinid`, { waitUntil: 'networkidle' });
  await sp.waitForSelector('h1.uni-hi', { timeout: 15000 });
  await shot(sp, '13-aluno-dashboard.png');
  await studentCtx.close();
});

// Cleanup (Decisão #4): despublicar a lição de teste (some da vitrine/sidebar/busca).
// Slug timestampado evita colisão; o DELETE responderia 409 por A3 (a lição tem progresso).
await step('14-cleanup-despublicar', async () => {
  await page.goto(`${BASE}/universinid/admin/conteudo`, { waitUntil: 'networkidle' });
  await page.waitForSelector(`text=Smoke Lição ${TS}`, { timeout: 15000 });
  const unpub = page.getByRole('button', { name: 'Despublicar' }).last();
  if (await unpub.count()) await unpub.click();
  await page.waitForTimeout(800);
  await shot(page, '14-cleanup.png');
});

await browser.close();

console.log('\n==== CONSOLE ERRORS (' + consoleErrors.length + ') ====');
consoleErrors.forEach((e) => console.log(' -', e));
console.log('\n==== PAGE ERRORS (' + pageErrors.length + ') ====');
pageErrors.forEach((e) => console.log(' -', e));
console.log('\n==== STEP FAILURES (' + stepFailures.length + ') ====');
stepFailures.forEach((e) => console.log(' -', e));
console.log('\nScreenshots in', OUT);

// Gate: smoke falha (exit 1) se houve qualquer erro de console/página ou passo falho.
if (consoleErrors.length || pageErrors.length || stepFailures.length) {
  process.exitCode = 1;
  console.log('\n[smoke] RESULTADO: FALHOU (exit 1)');
} else {
  console.log('\n[smoke] RESULTADO: OK (exit 0)');
}

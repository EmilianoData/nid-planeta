// Smoke driver for UniversiNID Fase 1. Drives login -> dashboard -> lesson ->
// mark complete -> Cmd+K palette -> admin, plus the login error + narrow-viewport
// states. Screenshots each surface to .smoke/ and collects console/page errors.
// Reads the admin password from .env (never logs it).
//
// REQUIRES Playwright (not a project dependency). Install transiently first:
//   npm install --no-save playwright@1.60.0 && npx playwright install chromium
// Then: node scripts/smoke-universinid.mjs   (dev server must be running)
import 'dotenv/config';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001';
const EMAIL = process.env.SEED_ADMIN_EMAIL;
const PWD = process.env.SEED_ADMIN_PASSWORD;
const OUT = path.resolve('.smoke');
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log('[smoke]', ...a);
const consoleErrors = [];
const pageErrors = [];

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
  catch (e) { log('FAIL ', name, '->', e.message); }
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

await browser.close();

console.log('\n==== CONSOLE ERRORS (' + consoleErrors.length + ') ====');
consoleErrors.forEach((e) => console.log(' -', e));
console.log('\n==== PAGE ERRORS (' + pageErrors.length + ') ====');
pageErrors.forEach((e) => console.log(' -', e));
console.log('\nScreenshots in', OUT);

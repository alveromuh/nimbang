/**
 * Manual browser check for the shipped example. Not part of the suite.
 *
 * Builds the share link exactly as `docs/how-to-use.md` tells a reader to, opens
 * it, and confirms the app imports it and shows a result — with the matrix full,
 * both money attributes present as separate columns, and the verdict on screen.
 *
 * Run: node tools/eval/example.mjs   (after `pnpm build`)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { decision } from '../../examples/keputusan-pindah-kota.ts';

const root = new URL('../../dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (request, response) => {
  const path = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  try {
    const body = await readFile(join(root, path));
    response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});

await new Promise((resolve) => server.listen(4175, resolve));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const problems = [];
page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console: ${message.text()}`);
});

const encoded = Buffer.from(JSON.stringify(decision), 'utf8').toString('base64url');
await page.goto(`http://localhost:4175/#d=${encoded}`);

// The app imports a shared decision and lands on it.
await page.getByLabel(/decision title/i).waitFor({ timeout: 10000 });
const title = await page.getByLabel(/decision title/i).inputValue();
if (title !== decision.title) problems.push(`title not imported: ${title}`);

// A full matrix means the verdict is shown without touching anything.
await page.getByRole('heading', { name: /hasil/i }).waitFor({ timeout: 10000 });

const coverage = await page.locator('[aria-live="polite"]').innerText();
if (!/16\/16 sel/.test(coverage)) problems.push(`coverage not full: ${coverage}`);

// Four attributes (money ×2, time, work) across four options.
const heads = (await page.locator('.grid__head').allInnerTexts()).map((head) => head.toLowerCase());
for (const name of ['gaji bersih', 'biaya hidup']) {
  if (!heads.some((head) => head.includes(name))) problems.push(`missing column: ${name}`);
}

const names = (await page.locator('.tornado li').allInnerTexts()).map((text) => text.split('\n')[0].trim());
if (names.length === 0) problems.push('no tornado entries');
if (new Set(names).size !== names.length) problems.push(`tornado labels repeat: ${names.join(' | ')}`);

const verdict = await page.locator('.verdict__value').first().innerText();
if (verdict.trim() === '') problems.push('empty verdict');

await page.screenshot({ path: '/tmp/example-result.png', fullPage: false });

await browser.close();
server.close();

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`example ok — verdict: ${verdict}`);

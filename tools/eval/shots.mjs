/**
 * Screenshot helper for reviewing spacing. Not part of the suite.
 *
 * Fills the workspace far enough that the claims, assessment, and coverage
 * sections are all populated, then captures each one separately so the gaps can
 * be judged at full size instead of in a scaled full-page shot.
 *
 * Run: node tools/eval/shots.mjs   (after `pnpm build`)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

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

await new Promise((resolve) => server.listen(4174, resolve));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

await page.goto('http://localhost:4174/');
await page.getByRole('button', { name: /keputusan baru/i }).click();

await page.getByLabel(/^tujuan 1$/i).fill('Penghasilan naik tanpa jam kerja lebih panjang');
await page.getByLabel(/^opsi 2$/i).fill('Tetap');
await page.getByLabel(/^opsi 3$/i).fill('Pindah');

const values = page.getByLabel(/^nilai$/i);
await values.nth(0).fill('2');
await values.nth(1).fill('5');
await values.nth(2).fill('3');

for (;;) {
  const closed = page.locator('details.item__more:not([open]) summary');
  if ((await closed.count()) === 0) break;
  await closed.first().click();
}
for (const reference of await page.getByPlaceholder(/kasus serupa/i).all()) {
  await reference.fill('proyek serupa');
}

// A second attribute, so the matrix has two columns and its header row is real.
await page.getByRole('button', { name: /tambah atribut/i }).first().click();
await page.getByLabel(/nama atribut penghasilan naik tanpa jam kerja lebih panjang 2/i).fill('Jam kerja');

// Three claims: one complete, one fact missing its source, one preference.
await page.getByRole('button', { name: /tambah klaim/i }).click();
await page.getByLabel(/^klaim 1$/i).fill('Gaji di sana 12 juta bersih');
await page.getByLabel(/sumber 1/i).fill('Tanya HRD dan minta tawaran tertulis');
await page.getByRole('button', { name: /tambah klaim/i }).click();
await page.getByLabel(/^klaim 2$/i).fill('Lembur di sana paling banyak 5 jam');
await page.getByRole('button', { name: /tambah klaim/i }).click();
await page.getByLabel(/^klaim 3$/i).fill('Saya ingin makan malam bersama keluarga');
await page.getByLabel(/^jenis 3$/i).selectOption('preference');
await page.getByLabel(/pemilik 3/i).fill('Saya dan keluarga');

await page.locator('section[aria-labelledby="score-heading"]').screenshot({ path: '/tmp/shot-assessment.png' });
console.log('heads:', JSON.stringify(await page.locator('.grid__head').allInnerTexts()));
console.log('attributes:', JSON.stringify(await page.locator('.attributes').innerText()));
console.log('attr values:', JSON.stringify(await page.locator('.attribute input').evaluateAll((nodes) => nodes.map((n) => n.value))));
console.log('objective:', JSON.stringify(await page.getByLabel(/^tujuan 1$/i).inputValue()));
await page.locator('section[aria-labelledby="tag-heading"]').screenshot({ path: '/tmp/shot-claims.png' });
await page.locator('div[aria-live="polite"]').screenshot({ path: '/tmp/shot-coverage.png' });

await browser.close();
server.close();
console.log('shots written');

/**
 * Manual browser check, not part of the suite.
 *
 * Drives the built app through the path a person takes — name the options,
 * assess every cell, answer the gate — and asserts that the verdict appears,
 * that a second attribute adds a column, and that a half-tagged claim withholds
 * the verdict again. Unit tests cover the same rules; this confirms the matrix
 * actually renders and is reachable with a real browser.
 *
 * Run: node tools/eval/smoke.mjs   (after `pnpm build`)
 *
 * Exits non-zero on any page error, console error, or failed assertion. It is
 * kept out of `pnpm test` because it needs a built bundle and a browser, which
 * the unit suite deliberately does not.
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

await new Promise((resolve) => server.listen(4173, resolve));

const browser = await chromium.launch();
const page = await browser.newPage();
const problems = [];

page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') {
    problems.push(`console: ${message.text()}`);
  }
});

const check = (condition, message) => {
  if (!condition) {
    problems.push(message);
  }
};

await page.goto('http://localhost:4173/');
await page.getByRole('button', { name: /keputusan baru/i }).click();

await page.getByLabel(/^tujuan 1$/i).fill('Penghasilan naik');
await page.getByLabel(/^opsi 2$/i).fill('Tetap');
await page.getByLabel(/^opsi 3$/i).fill('Pindah');

// Nine cells before anything is scored: three options, three attributes? No —
// one attribute per objective, so three cells.
const values = page.getByLabel(/^nilai$/i);
check((await values.count()) === 3, `expected 3 cells, found ${await values.count()}`);

await values.nth(0).fill('2');
await values.nth(1).fill('5');
await values.nth(2).fill('3');

const fillReferences = async () => {
  // Open one at a time: each click changes the set of still-closed disclosures,
  // so a captured list goes stale on the second item.
  for (;;) {
    const closed = page.locator('details.item__more:not([open]) summary');
    if ((await closed.count()) === 0) {
      break;
    }
    await closed.first().click();
  }
  for (const reference of await page.getByPlaceholder(/kasus serupa/i).all()) {
    await reference.fill('proyek serupa');
  }
};

await fillReferences();

await page.getByLabel(/biaya yang sudah keluar/i).fill('0');
await page.getByLabel(/siapa yang mencoba ini lalu gagal/i).fill('Tidak tahu');
await page.getByLabel(/bukti apa yang sedang kamu hindari/i).fill('Tidak ada');
await page.getByLabel(/ini berdasar berapa kasus/i).fill('Tiga');
await page.getByLabel(/ini sebab, atau kebetulan waktunya/i).fill('Belum pasti');
await page.getByLabel(/apa beda kasusmu dengan kasus pembandingnya/i).fill('Beda kondisi');

await page.getByRole('heading', { name: /hasil/i }).waitFor({ timeout: 5000 });
const coverage = await page.locator('[aria-live="polite"]').innerText();
check(/3\/3 sel/.test(coverage), `coverage not full: ${coverage}`);
check(/Semua sel sudah dinilai/.test(coverage), `coverage copy wrong: ${coverage}`);

// A second attribute is a second dimension of the same objective.
await page.getByRole('button', { name: /tambah atribut/i }).first().click();
check((await page.getByLabel(/^nilai$/i).count()) === 6, 'adding an attribute did not add a column');
const afterAdd = await page.locator('[aria-live="polite"]').innerText();
check(/3\/6 sel/.test(afterAdd), `coverage after adding an attribute: ${afterAdd}`);
check((await page.getByRole('heading', { name: /hasil/i }).count()) === 0, 'result shown with empty cells');

await page.getByLabel(/nama atribut penghasilan naik 2/i).fill('Jam kerja');
const head = page.locator('.grid__head', { hasText: 'Jam kerja' });
check((await head.count()) === 1, 'attribute name did not become a column heading');

// The tornado has to distinguish two inputs under the same objective, or the
// reader cannot tell which one to change.
// Filling the new cells restores the verdict.
const all = page.getByLabel(/^nilai$/i);
for (let index = 3; index < 6; index += 1) {
  await all.nth(index).fill('3');
}
await fillReferences();
await page.getByRole('heading', { name: /hasil/i }).waitFor({ timeout: 5000 });

// Only meaningful once the result is on screen: while it is withheld there is no
// tornado and no net table, and a check would pass by finding nothing.
const labels = await page.locator('.tornado li').allInnerTexts();
const names = labels.map((text) => text.split('\n')[0].trim());
check(names.length > 0, 'no tornado entries rendered');
check(new Set(names).size === names.length, `tornado labels repeat: ${names.join(' | ')}`);
check(
  names.some((name) => name.includes('Jam kerja')),
  `tornado never names the new attribute: ${names.join(' | ')}`,
);

// The net column must stay inside the range the weights allow. With weights
// summing to 1 and each normalised term in [0, 1], no option can exceed 1.
const nets = (await page.locator('.table tbody td.num').allInnerTexts())
  .map((text) => Number(text))
  .filter((value) => Number.isFinite(value));
check(nets.length > 0, `no net scores rendered (table rows: ${await page.locator('table tbody tr').count()})`);
check(
  nets.every((value) => value >= -1 && value <= 1),
  `net scores outside [-1, 1]: ${nets.join(', ')}`,
);
console.log('tornado:', names.join(' | '));
console.log('nets:', nets.join(', '));
// The objective is context under an attribute name, so it must not be printed
// twice when the attribute has no name of its own.
const headTexts = await page.locator('.grid__head').allInnerTexts();
console.log('heads:', JSON.stringify(headTexts));

// An untagged fact must stop the verdict.
await page.getByRole('button', { name: /tambah klaim/i }).click();
await page.getByLabel(/^klaim 1$/i).fill('Gaji di sana 12 juta');
check((await page.getByRole('heading', { name: /hasil/i }).count()) === 0, 'untagged claim did not withhold the result');
await page.getByLabel(/sumber 1/i).fill('tanya HRD');
await page.getByRole('heading', { name: /hasil/i }).waitFor({ timeout: 5000 });

await page.screenshot({ path: '/tmp/nimbang-smoke.png', fullPage: true });

await browser.close();
server.close();

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('smoke ok');

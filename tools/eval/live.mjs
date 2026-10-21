import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const file = process.argv[2] ?? 'examples/keputusan-pindah-kota.ts';

// Exactly the command the docs give the reader.
const url = execFileSync('node', ['--experimental-strip-types', file], { encoding: 'utf8' }).trim();
console.log('url length:', url.length);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const problems = [];
page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

await page.goto(url);
await page.getByLabel(/decision title/i).waitFor({ timeout: 15000 });

const title = await page.getByLabel(/decision title/i).inputValue();
const coverage = await page.locator('[aria-live="polite"]').innerText();
const hasVerdict = (await page.getByRole('heading', { name: /hasil/i }).count()) > 0;

console.log('title   :', title);
console.log('coverage:', coverage.split('\n')[0]);
console.log('verdict :', hasVerdict);
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

await browser.close();

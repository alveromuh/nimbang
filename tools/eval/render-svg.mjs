import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 400 } });

for (const file of files) {
  const svg = await readFile(resolve(file), 'utf8');
  await page.setContent(`<body style="margin:0;background:#faf9f5">${svg}</body>`);
  const out = `/tmp/${file.split('/').pop().replace('.svg', '.png')}`;
  await page.locator('svg').screenshot({ path: out });
  console.log(out);
}

await browser.close();

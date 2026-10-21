import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:http';

/**
 * Renders the README the way a reader sees it, resolving relative image paths.
 *
 * A broken image link in a README is invisible in a diff and obvious on the page,
 * so this checks the page rather than the markdown source.
 *
 * Run: node tools/eval/render-readme.mjs
 */
const root = resolve('.');
const markdown = await readFile(resolve(root, 'README.md'), 'utf8');

// Minimal renderer: headings, paragraphs, tables, code fences, images, links.
const lines = markdown.split('\n');
let html = '';
let inCode = false;
let inTable = false;

for (const line of lines) {
  if (line.startsWith('```')) {
    html += inCode ? '</code></pre>' : '<pre><code>';
    inCode = !inCode;
    continue;
  }
  if (inCode) {
    html += `${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}\n`;
    continue;
  }

  const image = /^!\[(.*?)\]\((.*?)\)$/.exec(line);
  if (image) {
    // Root-relative, not an absolute filesystem path: the page is served over
    // HTTP, so the browser resolves this against localhost.
    html += `<figure><img src="/${image[2]}" alt="${image[1]}"><figcaption>${image[1]}</figcaption></figure>`;
    continue;
  }

  if (line.startsWith('|')) {
    if (!inTable) {
      html += '<table>';
      inTable = true;
    }
    if (/^\|[\s-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => `<td>${cell.trim()}</td>`).join('');
    html += `<tr>${cells}</tr>`;
    continue;
  }
  if (inTable) {
    html += '</table>';
    inTable = false;
  }

  const heading = /^(#{1,3})\s+(.*)$/.exec(line);
  if (heading) {
    const level = heading[1].length;
    html += `<h${level}>${heading[2]}</h${level}>`;
    continue;
  }
  if (line.trim() === '') continue;
  if (line.startsWith('- ')) {
    html += `<p class="li">• ${line.slice(2)}</p>`;
    continue;
  }
  if (line.startsWith('> ')) {
    html += `<blockquote>${line.slice(2)}</blockquote>`;
    continue;
  }
  html += `<p>${line}</p>`;
}
if (inTable) html += '</table>';

const page_html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 32px; line-height: 1.55; color: #1a1a17; background: #fff; }
  h1 { font-size: 2em; border-bottom: 1px solid #e2dfd5; padding-bottom: 8px; }
  h2 { font-size: 1.4em; margin-top: 32px; border-bottom: 1px solid #e2dfd5; padding-bottom: 6px; }
  table { border-collapse: collapse; margin: 16px 0; font-size: 14px; width: 100%; }
  td { border: 1px solid #e2dfd5; padding: 6px 10px; vertical-align: top; }
  tr:first-child td { background: #f2f0e9; font-weight: 600; }
  figure { margin: 20px 0; }
  img { max-width: 100%; border: 1px solid #e2dfd5; border-radius: 8px; }
  figcaption { font-size: 12px; color: #75736b; margin-top: 6px; }
  pre { background: #f2f0e9; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  .li { margin: 4px 0 4px 16px; }
  blockquote { border-left: 3px solid #c9c5b8; margin: 12px 0; padding-left: 12px; color: #5f5e56; }
</style></head><body>${html}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });

// Served over HTTP, not setContent: a page created from a string has an
// about:blank origin and cannot load file:// images, so every image would look
// broken for a reason that has nothing to do with the README.
const server = createServer(async (request, response) => {
  const path = decodeURIComponent((request.url ?? '/').split('?')[0]);
  if (path === '/' || path === '/index.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(page_html);
    return;
  }
  try {
    const body = await readFile(resolve(root, `.${path}`));
    const type = path.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});
await new Promise((done) => server.listen(4180, done));
await page.goto('http://localhost:4180/', { waitUntil: 'load' });

const broken = await page.locator('img').evaluateAll((nodes) =>
  nodes.filter((node) => !node.complete || node.naturalWidth === 0).map((node) => node.getAttribute('src')),
);
const count = await page.locator('img').count();
console.log(`images: ${count}, broken: ${broken.length}${broken.length ? ` -> ${broken.join(', ')}` : ''}`);

await page.screenshot({ path: '/tmp/readme.png', fullPage: true });
await browser.close();
server.close();
if (broken.length > 0) process.exit(1);

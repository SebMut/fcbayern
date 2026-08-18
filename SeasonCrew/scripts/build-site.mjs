import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const allowedExtensions = new Set(['.html', '.css', '.js', '.svg', '.png', '.webp', '.ico', '.txt']);
const excludedFiles = new Set([
  'app.js',
  'playwright.config.js',
  'package.json',
  'package-lock.json',
  'README.md',
  '.gitignore'
]);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile()) continue;
  if (excludedFiles.has(entry.name)) continue;
  if (!allowedExtensions.has(extname(entry.name).toLowerCase())) continue;
  await cp(new URL(entry.name, root), new URL(entry.name, dist));
}

// Security headers understood by Cloudflare Pages and Netlify. Other static hosts
// simply serve this harmless file as an unused asset.
await writeFile(new URL('_headers', dist), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`);

const distEntries = (await readdir(dist)).sort();
const required = ['index.html', 'app.bundle.js', 'seasoncrew-core.js', 'styles.css', 'demo.html', 'history.html', 'settings.html', 'settings-page.js', 'settings-page.css'];
for (const file of required) {
  if (!distEntries.includes(file)) throw new Error(`Production build missing ${file}`);
}
for (const forbidden of ['app.js', 'package.json', 'package-lock.json', 'playwright.config.js', 'test-accounts.html']) {
  if (distEntries.includes(forbidden)) throw new Error(`Production build must not contain ${forbidden}`);
}

console.log(`SeasonCrew production site: ${distEntries.length} files in dist/`);

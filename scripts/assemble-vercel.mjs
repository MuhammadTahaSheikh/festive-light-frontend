/**
 * On Vercel (VERCEL=1), restructure dist/ after vite build:
 *   dist/index.html      — marketing home
 *   dist/demo-widget.js  — render widget
 *   dist/app/*           — React SPA (base /app/)
 *
 * Local/EC2 builds skip this so Express can mount client/dist at /app.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(__dirname, '..');
const DIST = path.join(CLIENT, 'dist');
const MARKETING = path.join(CLIENT, 'marketing');

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (process.env.VERCEL !== '1' && !process.argv.includes('--force')) {
  console.log('assemble-vercel: skip (not on Vercel)');
  process.exit(0);
}

if (!fs.existsSync(DIST)) {
  console.error('assemble-vercel: missing dist/ — run vite build first');
  process.exit(1);
}

const marketingIndex = path.join(MARKETING, 'index.html');
const marketingWidget = path.join(MARKETING, 'demo-widget.js');
if (!fs.existsSync(marketingIndex)) {
  console.error('assemble-vercel: missing marketing/index.html');
  process.exit(1);
}

const staging = path.join(CLIENT, '.vite-app-staging');
rmrf(staging);
copyDir(DIST, staging);

rmrf(DIST);
const appOut = path.join(DIST, 'app');
copyDir(staging, appOut);
rmrf(staging);

fs.copyFileSync(marketingIndex, path.join(DIST, 'index.html'));
if (fs.existsSync(marketingWidget)) {
  fs.copyFileSync(marketingWidget, path.join(DIST, 'demo-widget.js'));
}

console.log('assemble-vercel: dist/ ready (marketing at /, React at /app/)');

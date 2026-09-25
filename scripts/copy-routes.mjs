// After `vite build`, copy dist/index.html into a folder per real route so
// GitHub Pages answers /about, /giveaway etc. with HTTP 200 instead of serving
// 404.html first (which visitors never notice but crawlers do). Keep this list
// in sync with src/lib/routes.js.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const routes = ['about', 'mission', 'giveaway', 'giveaway/rules'];
const dist = 'dist';
if (!existsSync(join(dist, 'index.html'))) { console.error('copy-routes: dist/index.html missing'); process.exit(1); }
for (const r of routes) {
  mkdirSync(join(dist, r), { recursive: true });
  copyFileSync(join(dist, 'index.html'), join(dist, r, 'index.html'));
}
console.log(`copy-routes: ${routes.length} route folders written`);

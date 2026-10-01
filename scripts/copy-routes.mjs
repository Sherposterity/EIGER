// After `vite build`, write dist/index.html into a folder per real route so
// GitHub Pages answers /about, /giveaway etc. with HTTP 200 instead of serving
// 404.html first (which visitors never notice but crawlers do). Keep the route
// table in src/lib/routeHeads.js in sync with src/lib/routes.js.
//
// Each folder gets its own title, meta description, canonical URL and share
// tags in the static HTML (2026-09-30), so no route carries the home page's
// canonical. That covers the static routes, /mountains, /disclosure and one
// folder per mountain in src/data/mountains/index.json. The mountain URLs are
// also appended to dist/sitemap.xml here, so public/sitemap.xml never lists
// them by hand.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sitemapWithMountains } from '../src/lib/mountains.js';
import { prerenderPages } from '../src/lib/routeHeads.js';

const dist = 'dist';
if (!existsSync(join(dist, 'index.html'))) { console.error('copy-routes: dist/index.html missing'); process.exit(1); }

const shell = readFileSync(join(dist, 'index.html'), 'utf8');
const { prices } = JSON.parse(readFileSync('src/data/plans.json', 'utf8'));
const { mountains } = JSON.parse(readFileSync('src/data/mountains/index.json', 'utf8'));
const pages = prerenderPages(shell, { prices, mountains });
for (const p of pages) {
  const dir = join(dist, ...p.route.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), p.html);
}

const sitemapFile = join(dist, 'sitemap.xml');
writeFileSync(sitemapFile, sitemapWithMountains(readFileSync(sitemapFile, 'utf8'), mountains.map((m) => m.slug)));

console.log(`copy-routes: ${pages.length} route folders written (${mountains.length} mountains), sitemap updated`);

// After `vite build`, write dist/index.html into a folder per real route so
// GitHub Pages answers /about, /giveaway etc. with HTTP 200 instead of serving
// 404.html first (which visitors never notice but crawlers do). Keep the route
// table in src/lib/routeHeads.js in sync with src/lib/routes.js.
//
// Each folder gets its own title, meta description, canonical URL and share
// tags in the static HTML (2026-09-30), so no route carries the home page's
// canonical. That covers every route in STATIC_HEADS plus /pricing. The
// mountain gear pages were removed 2026-09-30; /mountains has no folder, so it
// goes through 404.html into the app, which redirects it to the home page.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { prerenderPages } from '../src/lib/routeHeads.js';

const dist = 'dist';
if (!existsSync(join(dist, 'index.html'))) { console.error('copy-routes: dist/index.html missing'); process.exit(1); }

const shell = readFileSync(join(dist, 'index.html'), 'utf8');
const { prices } = JSON.parse(readFileSync('src/data/plans.json', 'utf8'));
const pages = prerenderPages(shell, { prices });
for (const p of pages) {
  const dir = join(dist, ...p.route.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), p.html);
}

console.log(`copy-routes: ${pages.length} route folders written`);

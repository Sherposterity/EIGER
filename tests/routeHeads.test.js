import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { prerenderPages, routeHeads } from '../src/lib/routeHeads.js';
import { ROUTE_PATHS } from '../src/lib/routes.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const shell = read('../index.html');
const { prices } = JSON.parse(read('../src/data/plans.json'));
const SITE = 'https://eiger014.com';
const HOME_TITLE = shell.match(/<title>([^<]*)<\/title>/)[1];
// /mission redirects to /about, so its canonical is /about on purpose.
const expectedCanonical = (route) => `${SITE}${route === '/mission' ? '/about' : route}`;
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]*)"/)[1];
// U+2013 en dash, U+2014 em dash, built from code points so this file has none.
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];

const STATIC_ROUTES = ['/about', '/mission', '/pricing', '/verification', '/giveaway', '/giveaway/rules', '/kickstarter', '/request', '/disclosure'];

test('every static prerendered route has a head; every public route path is covered', () => {
  const heads = routeHeads(prices);
  assert.deepEqual(Object.keys(heads).sort(), [...STATIC_ROUTES].sort());
  for (const r of STATIC_ROUTES) if (r !== '/mission') assert.ok(ROUTE_PATHS.includes(r), r);
  for (const h of Object.values(heads)) {
    assert.match(h.title, / \| EIGER$/);
    assert.ok(h.description.length > 40 && h.description.length < 200, h.title);
    for (const d of DASHES) assert.ok(!h.title.includes(d) && !h.description.includes(d), h.title);
  }
  assert.equal(heads['/pricing'].description, "Every mountain's gear list on EIGER is free forever. EIGER Pro is $35.99 a year with a 7-day free trial, or $5.99 a week.");
});

test("every prerendered page carries its own canonical, title and description, never the home page's", () => {
  const pages = prerenderPages(shell, { prices });
  assert.equal(pages.length, STATIC_ROUTES.length);
  for (const p of pages) {
    assert.equal(canonicalOf(p.html), expectedCanonical(p.route), p.route);
    assert.ok(p.html.includes(`<meta property="og:url" content="${expectedCanonical(p.route)}"`), p.route);
    assert.ok(!p.html.includes(`<title>${HOME_TITLE}</title>`), p.route);
  }
});

test('built route folders (when dist exists) carry their own canonical', { skip: !existsSync(new URL('../dist/index.html', import.meta.url)) }, () => {
  for (const r of STATIC_ROUTES) {
    const html = read(`../dist${r}/index.html`);
    assert.equal(canonicalOf(html), expectedCanonical(r), r);
  }
});

test('built output (when dist exists) has no mountain pages and no /mountains sitemap URLs', { skip: !existsSync(new URL('../dist/index.html', import.meta.url)) }, () => {
  assert.ok(!existsSync(new URL('../dist/mountains', import.meta.url)));
  assert.ok(!read('../dist/sitemap.xml').includes('/mountains'));
});

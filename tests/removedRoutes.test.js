// The public mountain gear pages were removed 2026-09-30. Outreach emails
// already link to /mountains, so /mountains and anything under it must land on
// the redirect to the home page, never the NotFound route.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchRoutes } from 'react-router';
import { ROUTE_PATHS, REMOVED_REDIRECTS } from '../src/lib/routes.js';
import { resolveHashUrl } from '../src/lib/hashRedirect.js';
import { routeHeads } from '../src/lib/routeHeads.js';

// The same route table App.jsx renders, with "*" last for NotFound.
const routes = [...ROUTE_PATHS.map((path) => ({ path })), { path: '*' }];
const matched = (url) => matchRoutes(routes, url).at(-1).route.path;

test('/mountains and /mountains/x resolve to the redirect to the home page', () => {
  for (const url of ['/mountains', '/mountains/', '/mountains/x', '/mountains/mont-blanc', '/mountains/a/b']) {
    const path = matched(url);
    assert.ok(path in REMOVED_REDIRECTS, `${url} matched ${path}`);
    assert.equal(REMOVED_REDIRECTS[path], '/', url);
  }
  assert.equal(matched('/nope'), '*');
});

test('App.jsx renders the removed-page redirects with <Navigate replace>', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /REMOVED_REDIRECTS\)\.map\(\(\[from, to\]\) =>/);
  assert.match(app, /<Navigate to=\{to\} replace \/>/);
  assert.ok(!app.includes('pages/mountains'));
});

test('GitHub Pages: /mountains has no prerendered head, so 404.html hands it to the app', () => {
  assert.ok(!Object.keys(routeHeads({ annual: 1, weekly: 1, trialDays: 1 })).some((r) => r.startsWith('/mountains')));
  assert.equal(resolveHashUrl({ pathname: '/', search: '?/mountains', hash: '' }), '/mountains');
  assert.equal(resolveHashUrl({ pathname: '/', search: '?/mountains/mont-blanc', hash: '' }), '/mountains/mont-blanc');
});

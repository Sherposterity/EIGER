// Run with: node --test tests/*.test.js
// Uses only Node's built-in test runner (Node 18+), no extra dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolveHashUrl, applyHashRedirect } from '../src/lib/hashRedirect.js';

const at = (pathname, search = '', hash = '') => resolveHashUrl({ pathname, search, hash });

test('legacy emailed dashboard link keeps ?entry exactly', () => {
  assert.equal(at('/', '', '#/giveaway?entry=abc'), '/giveaway?entry=abc');
});

test('rules link keeps ?ref', () => {
  assert.equal(at('/', '', '#/giveaway/rules?ref=x'), '/giveaway/rules?ref=x');
});

test('query before the hash is merged after the route', () => {
  assert.equal(at('/', '?ref=abc', '#/giveaway'), '/giveaway?ref=abc');
});

test('hash query and outer query both survive, hash first', () => {
  assert.equal(at('/', '?utm_source=tt', '#/giveaway?ref=abc'), '/giveaway?ref=abc&utm_source=tt');
});

test('#/ alone goes to /', () => {
  assert.equal(at('/', '', '#/'), '/');
});

test('hash with only a query', () => {
  assert.equal(at('/', '', '#/?ref=abc'), '/?ref=abc');
  assert.equal(at('/', '', '#/?section=platforms'), '/?section=platforms');
});

test('unsubscribed redirect from the edge function', () => {
  assert.equal(at('/', '', '#/giveaway?unsubscribed=1'), '/giveaway?unsubscribed=1');
});

test('plain in-page anchors are not routes', () => {
  assert.equal(at('/', '', '#platforms'), null);
  assert.equal(at('/', '', '#waitlist'), null);
  assert.equal(at('/about', '?x=1', '#team'), null);
});

test('trailing slash is dropped', () => {
  assert.equal(at('/', '', '#/mission/'), '/mission');
  assert.equal(at('/', '', '#/giveaway/rules/?ref=x'), '/giveaway/rules?ref=x');
});

test('unknown hash path is passed through for the NotFound route', () => {
  assert.equal(at('/', '', '#/unknown/path?x=1'), '/unknown/path?x=1');
});

test('404.html hand-off is decoded', () => {
  assert.equal(at('/', '?/giveaway&entry=abc'), '/giveaway?entry=abc');
  assert.equal(at('/', '?/giveaway/rules'), '/giveaway/rules');
  assert.equal(at('/', '?/giveaway&ref=abc~and~utm=1'), '/giveaway?ref=abc&utm=1');
  assert.equal(at('/', '?/about', '#team'), '/about#team');
  assert.equal(at('/', '?/about/'), '/about');
});

test('query values are preserved byte for byte (no re-encoding)', () => {
  assert.equal(at('/', '', '#/giveaway?entry=a%2Bb_C-9.x'), '/giveaway?entry=a%2Bb_C-9.x');
  assert.equal(at('/', '?/giveaway&entry=a%2Bb_C-9.x'), '/giveaway?entry=a%2Bb_C-9.x');
});

test('malformed input', () => {
  assert.equal(at('/', '', '#//'), '/');
  assert.equal(at('/', '', '#/?'), '/');
  assert.equal(at('/', '', ''), null);
  assert.equal(at('/', '', '#'), null);
  assert.equal(at('', '', ''), null);
  assert.equal(resolveHashUrl(), null);
  assert.equal(resolveHashUrl({}), null);
  assert.equal(at('/', '', '#//giveaway//rules'), '/giveaway/rules');
});

test('ordinary URLs are left alone', () => {
  assert.equal(at('/giveaway', '?ref=abc'), null);
  assert.equal(at('/', '?section=platforms'), null);
});

test('applyHashRedirect replaces the URL only when needed', () => {
  const calls = [];
  const fakeWin = (pathname, search, hash) => ({
    location: { pathname, search, hash },
    history: { state: { k: 1 }, replaceState: (...a) => calls.push(a) },
  });
  assert.equal(applyHashRedirect(fakeWin('/', '', '#/giveaway?ref=z')), '/giveaway?ref=z');
  assert.deepEqual(calls[0], [{ k: 1 }, '', '/giveaway?ref=z']);
  assert.equal(applyHashRedirect(fakeWin('/', '', '#platforms')), null);
  assert.equal(calls.length, 1);
});

// Runs the real public/404.html script against a fake location, then feeds
// the resulting URL back through resolveHashUrl: the round trip must give the
// original path and query.
const run404 = (pathname, search = '', hash = '') => {
  const html = readFileSync(new URL('../public/404.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  let target = null;
  const location = {
    protocol: 'https:', host: 'eiger014.com', pathname, search, hash,
    replace: (u) => { target = u; },
  };
  vm.runInNewContext(script, { window: { location } });
  return target;
};

test('404.html round trip restores the exact path and query', () => {
  const cases = [
    ['/giveaway', '?entry=abc'],
    ['/giveaway', '?ref=test123&utm_source=tiktok'],
    ['/giveaway/rules', '?ref=x'],
    ['/about', ''],
    ['/giveaway', '?unsubscribed=1'],
  ];
  for (const [p, q] of cases) {
    const target = new URL(run404(p, q));
    assert.equal(target.pathname, '/');
    const back = resolveHashUrl({ pathname: target.pathname, search: target.search, hash: target.hash });
    assert.equal(back, p + q, `${p}${q}`);
  }
});

test('404.html leaves file-like paths alone', () => {
  assert.equal(run404('/old-page.html'), null);
  assert.equal(run404('/videos/missing.mp4'), null);
});

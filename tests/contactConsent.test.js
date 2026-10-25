import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRequest, cleanName, missingTokenResult, parseLink, resultFor, RPC, TOKEN_RE } from '../src/lib/contactConsent.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
// U+2013 en dash, U+2014 em dash, built from code points so this file has none.
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const TOKEN = 'a'.repeat(32) + '0123456789abcdef'.repeat(2);
const CFG = { url: 'https://example.supabase.co/', anonKey: 'anon-key' };

test('parseLink: the three links check-in-notify builds', () => {
  assert.deepEqual(parseLink(`?token=${TOKEN}`), { mode: 'consent', prefer: 'confirm', token: TOKEN });
  assert.deepEqual(parseLink(`?token=${TOKEN}&action=decline`), { mode: 'consent', prefer: 'decline', token: TOKEN });
  assert.deepEqual(parseLink(`?action=stop&token=${TOKEN}`), { mode: 'stop', prefer: 'confirm', token: TOKEN });
});

test('parseLink: upper case is folded, junk tokens are dropped before any call', () => {
  assert.equal(parseLink(`?token=${TOKEN.toUpperCase()}`).token, TOKEN);
  for (const bad of ['', '?token=', '?token=abc', `?token=${TOKEN}0`, `?token=${'g'.repeat(64)}`, `?token=${TOKEN.slice(1)}%3Cscript%3E`]) {
    assert.equal(parseLink(bad).token, null, bad);
  }
  assert.ok(TOKEN_RE.test(TOKEN));
});

test('buildRequest: POST to the documented rpc, anon key, token only in the body', () => {
  assert.deepEqual(RPC, { confirm: 'confirm_emergency_contact', decline: 'decline_emergency_contact', stop: 'withdraw_emergency_contact' });
  for (const [action, fn] of Object.entries(RPC)) {
    const { url, init } = buildRequest(action, TOKEN, CFG);
    assert.equal(url, `https://example.supabase.co/rest/v1/rpc/${fn}`);
    assert.ok(!url.includes(TOKEN));
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.apikey, 'anon-key');
    assert.equal(init.headers.Authorization, 'Bearer anon-key');
    assert.deepEqual(JSON.parse(init.body), { p_token: TOKEN });
    assert.equal(init.credentials, 'omit');
    assert.equal(init.referrerPolicy, 'no-referrer');
  }
  assert.throws(() => buildRequest('delete', TOKEN, CFG));
});

test('resultFor: success copy per action, climber name only from the response', () => {
  const c = resultFor('confirm', { ok: true, data: { status: 'confirmed', contact_name: 'Sam', climber_name: 'Alex Honnold' } });
  assert.equal(c.kind, 'done');
  assert.equal(c.title, 'Confirmed.');
  assert.match(c.body, /^You will get an email only if Alex Honnold misses a check-in\./);
  assert.ok(!c.body.includes('Sam'), 'contact name (climber-typed text) is not printed');

  const d = resultFor('decline', { ok: true, data: { status: 'declined', contact_name: 'Sam' } });
  assert.deepEqual([d.kind, d.title, d.body], ['done', 'Declined.', 'You will not hear from Eiger about this again.']);

  const s = resultFor('stop', { ok: true, data: { status: 'withdrawn', contact_name: 'Sam' } });
  assert.equal(s.kind, 'done');
});

test('resultFor: invalid tokens get a calm message; anything unreadable is a retryable error', () => {
  for (const a of ['confirm', 'decline', 'stop']) {
    assert.equal(resultFor(a, { ok: true, data: { status: 'invalid' } }).kind, 'invalid', a);
    assert.equal(resultFor(a, { ok: false, data: null }).kind, 'error', a);
    assert.equal(resultFor(a, { ok: true, data: null }).kind, 'error', a);
    assert.equal(resultFor(a, { ok: true, data: 'confirmed' }).kind, 'error', a);
  }
  // A status for a different action is not a success for this one.
  assert.equal(resultFor('confirm', { ok: true, data: { status: 'withdrawn' } }).kind, 'error');
  assert.equal(resultFor('stop', { ok: true, data: { status: 'confirmed' } }).kind, 'error');
});

test('cleanName: neutral fallback, control characters gone, length capped', () => {
  assert.equal(cleanName(undefined), 'the climber');
  assert.equal(cleanName('   '), 'the climber');
  assert.equal(cleanName('Ana\n\tLopez'), 'Ana Lopez');
  assert.ok(cleanName('x'.repeat(200)).length <= 83);
});

test('copy: no em or en dashes, mountaineering not hiking, in the module and the page', () => {
  const texts = [read('../src/lib/contactConsent.js'), read('../contact-confirm/index.html')];
  for (const a of ['confirm', 'decline', 'stop']) {
    for (const res of [{ ok: true, data: { status: { confirm: 'confirmed', decline: 'declined', stop: 'withdrawn' }[a], climber_name: 'A' } }, { ok: true, data: { status: 'invalid' } }, { ok: false }]) {
      const r = resultFor(a, res);
      texts.push(r.title, r.body);
    }
  }
  texts.push(...Object.values(missingTokenResult('stop')), ...Object.values(missingTokenResult('consent')));
  for (const t of texts) {
    for (const d of DASHES) assert.ok(!t.includes(d), 'dash in copy');
  }
  // Wording: everything a contact can read (the module source names the hike
  // repo in a comment, so it is left out of this one).
  for (const t of texts.slice(1)) assert.ok(!/\bhik(e|ing|er)s?\b/i.test(t), 'hiking wording');
});

test('page: noindex, no referrer, CSP, no analytics, names only through textContent, no console output', () => {
  const html = read('../contact-confirm/index.html');
  const js = read('../src/contact/main.js');
  assert.match(html, /<meta name="robots" content="noindex/);
  assert.match(html, /<meta name="referrer" content="no-referrer"/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /Eiger does not call rescue services/);
  for (const src of [html, js]) {
    assert.ok(!/gtag|googletagmanager|plausible|posthog|umami|sentry|analytics/i.test(src), 'analytics');
  }
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(js), 'HTML sinks');
  assert.ok(!/console\./.test(js) && !/console\./.test(read('../src/lib/contactConsent.js')), 'console');
  assert.match(js, /history\.replaceState/);
});

test('build: the page is a Vite entry so it gets the anon key at build time', () => {
  assert.match(read('../vite.config.js'), /contact-confirm\/index\.html/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The app's minimum-version gate reads this file (hike app/services/updateGate.ts,
// docs/UPDATE_GATE.md). The app fails open on anything it cannot parse, so a
// broken file silently disables the gate: this test keeps it in the shape the
// app expects. Raise the two "min" values to make a store build mandatory.
const raw = readFileSync(new URL('../public/app/min-version.json', import.meta.url), 'utf8');
const doc = JSON.parse(raw);

const VERSION = /^\d{1,6}(\.\d{1,6}){0,3}$/;

test('min-version.json: a minimum per platform, in plain dotted-number form', () => {
  for (const platform of ['ios', 'android']) {
    assert.equal(typeof doc[platform]?.min, 'string', `${platform}.min missing`);
    assert.match(doc[platform].min, VERSION, `${platform}.min is not a version`);
  }
});

test('min-version.json: store links are https on the store hosts the app accepts', () => {
  assert.match(doc.storeUrls.ios, /^https:\/\/apps\.apple\.com\//);
  assert.match(doc.storeUrls.android, /^https:\/\/play\.google\.com\//);
  assert.ok(doc.storeUrls.ios.includes('id6792540152'), 'iOS App Store id');
  assert.ok(doc.storeUrls.android.includes('id=com.eiger014.eiger'), 'Android package');
});

test('min-version.json: message is short, present and free of dashes', () => {
  assert.equal(typeof doc.message, 'string');
  assert.ok(doc.message.trim().length > 0 && doc.message.length <= 240);
  assert.doesNotMatch(doc.message, /[–—]/);
  assert.doesNotMatch(doc.message, /hik(e|ing|er)/i);
});

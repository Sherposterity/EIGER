import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { visibleReviewers } from '../src/lib/reviewers.js';

const raw = readFileSync(new URL('../src/data/reviewers.json', import.meta.url), 'utf8');
const file = JSON.parse(raw);

test('seed has exactly one consenting named reviewer', () => {
  const shown = visibleReviewers(file.reviewers);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].name, 'Timoteo Desantos');
  assert.equal(shown[0].handleUrl, 'https://www.tiktok.com/@tomatosummit4');
});

test('visibleReviewers drops consent false and empty names', () => {
  const list = [
    { name: 'A', consent: true },
    { name: 'B', consent: false },
    { name: '', consent: true },
    { name: '   ', consent: true },
    { name: 'C' },
    { name: 'D', consent: 'yes' },
    null,
  ];
  assert.deepEqual(visibleReviewers(list).map((r) => r.name), ['A']);
  assert.deepEqual(visibleReviewers(undefined), []);
});

test('no string in reviewers.json contains an em or en dash', () => {
  const strings = [];
  const walk = (v) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { strings.push(k); walk(x); });
  };
  walk(file);
  for (const s of strings) assert.ok(!/[–—]/.test(s), `dash in: ${s}`);
});

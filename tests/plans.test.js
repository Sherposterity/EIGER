import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { annualMonthlyEquivalent, formatUsd, savingsPercent, weeklyPerYear } from '../src/lib/plans.js';

const raw = readFileSync(new URL('../src/data/plans.json', import.meta.url), 'utf8');
const plans = JSON.parse(raw);

// Verbatim from hike app/utils/paywallPersonalization.ts PAYWALL_COMPARISON.
const APP_ROWS = [
  ['Gear compatibility score', 'Your objective', 'Every mountain'],
  ['Change of objective', '1 free change', 'Unlimited'],
  ['Group trips', 'Join by code', 'Create and join'],
  ['Saved mountains', 'Objective + 1', 'Unlimited'],
  ['Saved kits, scored per objective', '3 kits', 'Unlimited'],
  ['Plan and compare kits from the marketplace', 'Not included', 'Included'],
  ['Offline maps, 3D terrain, forecasts, GPS', 'Not included', 'Included'],
];

test('plans helpers: monthly equivalent, weekly per year, savings, currency', () => {
  assert.equal(annualMonthlyEquivalent(35.99), '3.00');
  assert.equal(weeklyPerYear(5.99), 311.48);
  assert.equal(savingsPercent(35.99, 5.99), 88);
  assert.equal(formatUsd(35.99), '$35.99');
  assert.equal(formatUsd(5.99), '$5.99');
  assert.equal(formatUsd(0), '$0');
});

test('plans.json: fixed prices, no monthly plan', () => {
  assert.deepEqual(plans.prices, { annual: 35.99, weekly: 5.99, currency: 'USD', trialDays: 7 });
  assert.equal(savingsPercent(plans.prices.annual, plans.prices.weekly), 88);
});

test('plans.json: exactly the seven app paywall rows, in order, verbatim', () => {
  assert.deepEqual(
    plans.appRows.map((r) => [r.label, r.free, r.pro]),
    APP_ROWS,
  );
  assert.equal(plans.footnote, 'Gear readiness, the season switch and the full gear list are free for everyone.');
});

test('plans.json: every app row sits in a known group, every group has rows', () => {
  const ids = plans.groups.map((g) => g.id);
  assert.deepEqual(ids, ['gear', 'trips', 'maps']);
  for (const r of plans.appRows) assert.ok(ids.includes(r.group), r.label);
  for (const id of ids) assert.ok(plans.appRows.some((r) => r.group === id), id);
});

test('plans.json: free for everyone rows are included on both plans; soon rows are soon on both', () => {
  for (const r of plans.freeForEveryone.rows) {
    assert.equal(r.free, 'Included', r.label);
    assert.equal(r.pro, 'Included', r.label);
  }
  assert.equal(plans.soon.rows.length, 2);
  for (const r of plans.soon.rows) {
    assert.equal(r.free, 'soon', r.label);
    assert.equal(r.pro, 'soon', r.label);
  }
});

test('plans.json: no em or en dashes anywhere', () => {
  // U+2013 en dash, U+2014 em dash, built from code points so this file has none.
  const dashes = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
  for (const d of dashes) assert.ok(!raw.includes(d));
});

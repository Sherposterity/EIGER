import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStats } from '../src/lib/kickstarterStats.js';

const fallback = { goal: 2000, pledged: 0 };

test('no remote row: manual values, not live', () => {
  assert.deepEqual(mergeStats(fallback, null), { goal: 2000, pledged: 0, backers: null, live: false, fetchedAt: null });
});

test('remote row before any fetch (nulls): manual values, not live', () => {
  const r = mergeStats(fallback, { goal_usd: 2000, pledged_usd: null, backers_count: null, fetched_at: null });
  assert.equal(r.pledged, 0); assert.equal(r.live, false);
});

test('fetched row wins and is live', () => {
  const r = mergeStats(fallback, { goal_usd: '2000.00', pledged_usd: '345.50', backers_count: 12, fetched_at: '2026-10-02T10:00:00Z' });
  assert.equal(r.pledged, 345.5); assert.equal(r.backers, 12); assert.equal(r.live, true); assert.equal(r.goal, 2000);
});

test('bad goal falls back, negative pledged clamps', () => {
  const r = mergeStats(fallback, { goal_usd: 0, pledged_usd: -5, fetched_at: 'x' });
  assert.equal(r.goal, 2000); assert.equal(r.pledged, 0);
});

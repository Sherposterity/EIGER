import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignPhase, LAUNCH_AT, mergeStats, pledgeLine } from '../src/lib/kickstarterStats.js';

const fallback = { goal: 2000, pledged: 0 };

test('no remote row: manual values, not live', () => {
  assert.deepEqual(mergeStats(fallback, null), { goal: 2000, pledged: 0, backers: null, live: false, fetchedAt: null, state: null });
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

test('state passes through from the feed', () => {
  assert.equal(mergeStats(fallback, { state: 'live', fetched_at: 'x' }).state, 'live');
  assert.equal(mergeStats(fallback, { state: 7 }).state, null);
});

test('launch time is 9 AM Central on October 1 2026', () => {
  assert.equal(new Date(LAUNCH_AT).toISOString(), '2026-10-01T14:00:00.000Z');
});

test('campaign phase: time decides until the feed has a state', () => {
  assert.equal(campaignPhase({ now: LAUNCH_AT - 1 }), 'prelaunch');
  assert.equal(campaignPhase({ now: LAUNCH_AT }), 'live');
});

test('campaign phase: Kickstarter state wins', () => {
  assert.equal(campaignPhase({ state: 'live', now: LAUNCH_AT - 1 }), 'live');
  assert.equal(campaignPhase({ state: 'successful' }), 'funded');
  for (const s of ['failed', 'canceled', 'suspended']) assert.equal(campaignPhase({ state: s }), 'ended');
});

test('pledgeLine: nothing before the first pledge, then pledged of goal', () => {
  assert.equal(pledgeLine(0, 5000), null);
  assert.equal(pledgeLine(null, 5000), null);
  assert.equal(pledgeLine(1240.4, 5000), '$1,240 pledged of $5,000');
  assert.equal(pledgeLine(75, 0), '$75 pledged');
});

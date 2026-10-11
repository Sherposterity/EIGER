import test from 'node:test';
import assert from 'node:assert/strict';
import { centralDate, inConfettiWindow, isLaunchDay } from '../src/lib/launchDay.js';
import { REMOVED_REDIRECTS, ROUTE_PATHS } from '../src/lib/routes.js';
import { KICKSTARTER_ON_SITE } from '../src/lib/kickstarterStats.js';
import { routeHeads } from '../src/lib/routeHeads.js';

// Calendar days in Central time (CDT is UTC-5 in October).
const at = (iso) => Date.parse(iso);

test('centralDate follows Central time, not UTC', () => {
  assert.equal(centralDate(at('2026-10-12T04:59:00Z')), '2026-10-11');
  assert.equal(centralDate(at('2026-10-12T05:00:00Z')), '2026-10-12');
});

test('the banner says "today" only on Oct 12 Central, or with ?launch-preview', () => {
  assert.equal(isLaunchDay({ now: at('2026-10-11T22:00:00Z') }), false);
  assert.equal(isLaunchDay({ now: at('2026-10-12T05:00:00Z') }), true);
  assert.equal(isLaunchDay({ now: at('2026-10-13T04:59:00Z') }), true);
  assert.equal(isLaunchDay({ now: at('2026-10-13T05:00:00Z') }), false);
  assert.equal(isLaunchDay({ now: at('2026-11-01T12:00:00Z'), search: '?launch-preview' }), true);
});

test('confetti only fires Oct 12 to Oct 18 Central, or with ?launch-preview', () => {
  assert.equal(inConfettiWindow({ now: at('2026-10-12T04:59:00Z') }), false);
  assert.equal(inConfettiWindow({ now: at('2026-10-12T05:00:00Z') }), true);
  assert.equal(inConfettiWindow({ now: at('2026-10-19T04:59:00Z') }), true);
  assert.equal(inConfettiWindow({ now: at('2026-10-19T05:00:00Z') }), false);
  assert.equal(inConfettiWindow({ now: at('2026-12-01T00:00:00Z'), search: '?x=1&launch-preview' }), true);
});

test('with the Kickstarter switch off, /kickstarter redirects home and is not prerendered', { skip: KICKSTARTER_ON_SITE }, () => {
  assert.ok(!ROUTE_PATHS.includes('/kickstarter'));
  assert.equal(REMOVED_REDIRECTS['/kickstarter'], '/');
  assert.ok(!('/kickstarter' in routeHeads({ annual: 1, weekly: 1, trialDays: 1 })));
});

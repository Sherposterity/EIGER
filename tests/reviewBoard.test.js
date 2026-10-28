import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canClaim, priorReviewers, reviewedByMe, reviewerCount, reviewerCountLabel, tierLabel } from '../src/lib/reviewBoard.js';

// Board rules, Muad 2026-10-28 (hike migration 180): unlimited reviewers,
// reviewed mountains stay claimable by others, never twice by the same person.

const row = (o = {}) => ({ trail_id: 't1', name: 'Mont Blanc', state: 'open', is_mine: false, reviewer_count: 0, prior_reviewers: [], ...o });

test('open and reviewed-by-others mountains are claimable when you hold no claim', () => {
  assert.equal(canClaim(row(), false), true);
  assert.equal(canClaim(row({ state: 'verified', reviewer_count: 2 }), false), true);
  assert.equal(canClaim(row(), true), false);
  assert.equal(canClaim(row({ state: 'verified', reviewer_count: 1 }), true), false);
});

test('your own verified review, a live claim or a submission cannot be claimed', () => {
  assert.equal(canClaim(row({ state: 'verified', is_mine: true, reviewer_count: 1 }), false), false);
  assert.equal(canClaim(row({ state: 'in_progress' }), false), false);
  assert.equal(canClaim(row({ state: 'submitted' }), false), false);
  assert.equal(canClaim(null, false), false);
});

test('"You reviewed this" only for your own verified review', () => {
  assert.equal(reviewedByMe(row({ state: 'verified', is_mine: true })), true);
  assert.equal(reviewedByMe(row({ state: 'verified', is_mine: false })), false);
  assert.equal(reviewedByMe(row({ state: 'in_progress', is_mine: true })), false);
});

test('the count states the number only, like the app badge', () => {
  assert.equal(reviewerCountLabel(reviewerCount(row())), 'Unverified');
  assert.equal(reviewerCountLabel(reviewerCount(row({ reviewer_count: 1 }))), 'Reviewed by 1 climber');
  assert.equal(reviewerCountLabel(reviewerCount(row({ reviewer_count: 3 }))), 'Reviewed by 3 climbers');
  assert.equal(reviewerCount(row({ reviewer_count: null })), 0);
  assert.equal(reviewerCount({}), 0);
});

test('prior reviewers: name, tier label, date, email only when present', () => {
  const list = priorReviewers(
    row({
      prior_reviewers: [
        { display_name: 'Anna B.', tier: 'certified_guide', verified_at: '2026-10-12T09:00:00Z', email: 'anna@example.com' },
        { display_name: 'Ben', tier: 'club_leader', verified_at: '2026-10-20T09:00:00Z', email: null },
        { display_name: '', tier: 'mystery', verified_at: null },
        null,
      ],
    }),
  );
  assert.deepEqual(list, [
    { name: 'Anna B.', tier: 'Certified guide', verifiedAt: '2026-10-12T09:00:00Z', email: 'anna@example.com' },
    { name: 'Ben', tier: 'Club leader', verifiedAt: '2026-10-20T09:00:00Z', email: null },
    { name: 'An Eiger reviewer', tier: 'Climber', verifiedAt: null, email: null },
  ]);
  assert.deepEqual(priorReviewers(row({ prior_reviewers: '[{"display_name":"C","tier":"other"}]' })).map((p) => p.name), ['C']);
  assert.deepEqual(priorReviewers(row({ prior_reviewers: 'not json' })), []);
  assert.deepEqual(priorReviewers({}), []);
  assert.equal(tierLabel('aspirant_guide'), 'Aspirant guide');
  assert.equal(tierLabel('experienced_amateur'), 'Experienced amateur');
});

test('portal copy for this change has no em or en dashes and no assurance words', () => {
  for (const f of ['../src/lib/reviewBoard.js', '../src/pages/review/ReviewerConsent.jsx', '../src/pages/review/reviewStyles.js']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/[–—]/.test(src), `dash in ${f}`);
    assert.ok(!/trustworthy|\bsafe\b|\bready\b/i.test(src), `assurance word in ${f}`);
  }
});

test('board states read "Reviewed", never "Verified", to match the app badge', () => {
  const styles = readFileSync(new URL('../src/pages/review/reviewStyles.js', import.meta.url), 'utf8');
  assert.match(styles, /verified: 'Reviewed'/);
  for (const f of ['../src/pages/review/ReviewBoard.jsx', '../src/pages/review/ReviewMountain.jsx', '../src/pages/review/ReviewAdmin.jsx']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/['"`>]\s*(Verified|[^'"`<]*\bwas verified)\b/.test(src), `"Verified" label in ${f}`);
    assert.ok(!/[\u2013\u2014]/.test(src), `dash in ${f}`);
  }
});

test('the application form sends both opt-ins, unticked by default', () => {
  const src = readFileSync(new URL('../src/pages/review/ReviewApply.jsx', import.meta.url), 'utf8');
  assert.match(src, /show_credentials: false,\s*\n\s*share_contact: false,/);
  assert.match(src, /show_credentials: f\.show_credentials === true,/);
  assert.match(src, /share_contact: f\.share_contact === true,/);
});

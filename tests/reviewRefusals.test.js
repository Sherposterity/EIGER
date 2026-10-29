import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REFUSAL_COPY, cleanDetail, createGapsApi, detailError, isTriaged, reviewerMessage, suggestionError, triagedWithName,
} from '../src/lib/reviewGaps.js';

// Every sentence the live migration 181 RPCs raise to a reviewer or admin
// (save_slot_spec, save_gear_suggestion, remove_gear_suggestion,
// set_gear_suggestion_status), copied from hike
// scripts/migrations/181_review_gear_gaps.sql, plus the shared guards from 122.
const SERVER_181 = [
  'bad role',
  'keep the detail to 80 characters',
  'the detail cannot contain control characters',
  'the detail contains hidden formatting characters; please retype it',
  'name the gear in at least 2 characters',
  'keep the gear name to 80 characters',
  'the gear name cannot contain control characters',
  'the gear name contains hidden formatting characters; please retype it',
  'keep the note to 500 characters',
  'the note contains hidden formatting characters; please retype it',
  'bad level',
  'this suggestion was already reviewed',
  'up to 10 gear suggestions per review; use the mountain note for more',
  'you have 30 open gear suggestions; we will catch up on them first',
  'no such suggestion on this review',
  'bad status',
  'mapped needs a slot',
  'no such suggestion',
  'the resolution contains hidden formatting characters; please retype it',
  'not a reviewer',
  'not your review',
  'admin only',
];

test('every 181 refusal has reviewer copy', () => {
  for (const m of SERVER_181) {
    const copy = reviewerMessage(m);
    assert.notEqual(copy, m, m);
    assert.ok(REFUSAL_COPY[m], m);
  }
});

test('patterned refusals map by shape and never echo the value', () => {
  assert.match(reviewerMessage('unknown slot <b>x</b>'), /not in the Eiger list/);
  assert.doesNotMatch(reviewerMessage('unknown slot <b>x</b>'), /<b>/);
  assert.match(reviewerMessage('review is submitted; re-claim the mountain to keep editing'), /Claim the mountain again/);
  assert.match(reviewerMessage('review is expired; re-claim the mountain to keep editing'), /Claim the mountain again/);
  assert.equal(reviewerMessage('something new'), 'something new');
  assert.equal(reviewerMessage(''), 'Something went wrong. Please try again.');
});

test('reviewer copy follows the copy rules', () => {
  for (const copy of Object.values(REFUSAL_COPY)) {
    assert.doesNotMatch(copy, /[–—]/, copy);
    assert.doesNotMatch(copy, /hik/i, copy);
    assert.match(copy, /[.]$/, copy);
  }
});

test('the RPC layer throws reviewer copy and keeps the server sentence', async () => {
  const client = { rpc: async () => ({ data: null, error: { message: 'this suggestion was already reviewed', code: 'P0001' }, status: 400 }) };
  const api = createGapsApi(client);
  await assert.rejects(api.removeGearSuggestion('r', 's'), (e) => {
    assert.equal(e.message, REFUSAL_COPY['this suggestion was already reviewed']);
    assert.equal(e.serverMessage, 'this suggestion was already reviewed');
    assert.equal(e.missing, false);
    return true;
  });
});

test('client checks mirror the server before the round trip', () => {
  assert.equal(cleanDetail('  HMS\tauto-lock \n x2 '), 'HMS auto-lock x2');
  assert.equal(detailError('HMS auto-lock x2'), null);
  assert.equal(detailError('a'.repeat(81)), REFUSAL_COPY['keep the detail to 80 characters']);
  assert.equal(detailError('HMS‮x2'), REFUSAL_COPY['the detail contains hidden formatting characters; please retype it']);
  assert.equal(detailError('HMS\u0007x2'), REFUSAL_COPY['the detail cannot contain control characters']);
  assert.equal(suggestionError({ name: 'Ice​screws' }), REFUSAL_COPY['the gear name contains hidden formatting characters; please retype it']);
  assert.equal(suggestionError({ name: 'Ice\u0000screws' }), REFUSAL_COPY['the gear name cannot contain control characters']);
  assert.equal(suggestionError({ name: 'Ice screws', note: 'two\nlines' }), null);
  assert.equal(suggestionError({ name: 'Ice screws', note: 'x⁦y' }), REFUSAL_COPY['the note contains hidden formatting characters; please retype it']);
});

test('triaged suggestions are read-only', () => {
  const list = [
    { id: '1', name: 'Ice screws', status: 'declined' },
    { id: '2', name: 'Snow stakes', status: 'open' },
  ];
  assert.equal(isTriaged(list[0]), true);
  assert.equal(isTriaged(list[1]), false);
  assert.equal(triagedWithName(list, '  ice   SCREWS ')?.id, '1');
  assert.equal(triagedWithName(list, 'snow stakes'), null);
});

// /cybersecurity I1: reviewer-entered text renders only as React text.
test('review pages never render HTML or markdown', () => {
  for (const f of ['src/pages/review/ReviewMountain.jsx', 'src/pages/review/ReviewAdmin.jsx', 'src/lib/reviewGaps.js']) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.doesNotMatch(src, /dangerouslySetInnerHTML|innerHTML|react-markdown|marked\(|href=\{/, f);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INBOX_ERROR_COPY, REPLY_FROM, REPLY_SUBJECT, STATUS_FILTERS, STATUS_LABEL, TYPE_FILTERS, createInboxApi, deviceText, gmailReplyUrl,
  inboxMessage, quoteNote, replyableEmail, rowMatches,
} from '../src/lib/feedbackInbox.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

// /cybersecurity I1: climber notes render only as React text.
test('the feedback inbox never renders HTML or markdown, and builds no href', () => {
  for (const f of ['src/pages/review/ReviewFeedback.jsx', 'src/lib/feedbackInbox.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|document\.write|react-markdown|marked\(|href=/, f);
  }
  // The one way out is the encoded Gmail URL, opened without an opener.
  const page = read('src/pages/review/ReviewFeedback.jsx');
  assert.match(page, /window\.open\(url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(page, /const url = gmailReplyUrl\(/);
});

const HOSTILE = 'x&to=evil@bad.com&su=hi#frag?cc=a@b.co\n<img src=x onerror=alert(1)>\njavascript:alert(1) %0d%0a 100% sure';
const row = { origin: 'feedback', id: '1', email: 'climber+tag@example.com', body: HOSTILE, status: 'open', type: 'bug' };

test('every Gmail parameter is encoded and only the body carries the note', () => {
  const url = gmailReplyUrl(row, 'Oct 29');
  const u = new URL(url);
  assert.equal(u.origin, 'https://mail.google.com');
  assert.equal(u.pathname, '/mail/');
  assert.deepEqual([...u.searchParams.keys()], ['authuser', 'view', 'fs', 'to', 'su', 'body']);
  assert.equal(u.searchParams.get('authuser'), REPLY_FROM);
  assert.equal(u.searchParams.get('to'), 'climber+tag@example.com');
  assert.equal(u.searchParams.get('su'), REPLY_SUBJECT);
  assert.equal(u.hash, '');
  const body = u.searchParams.get('body');
  assert.ok(body.includes(quoteNote(HOSTILE)));
  assert.match(body, /On Oct 29 you wrote:/);
  // Nothing from the note escaped into the query string unencoded.
  assert.doesNotMatch(url.split('?')[1], /[<>\s#]|&to=evil|&cc=/);
  for (const [k, v] of [['to', row.email], ['su', REPLY_SUBJECT], ['authuser', REPLY_FROM]]) {
    assert.ok(url.includes(`${k}=${encodeURIComponent(v)}`), k);
  }
});

test('no reply link for a missing or unsafe recipient', () => {
  for (const email of [null, '', 'no-at-sign', 'a@b.co,c@d.co', 'a@b.co\nbcc:c@d.co', 'a b@c.co', 'a@b.co;c@d.co', '<a@b.co>']) {
    assert.equal(replyableEmail(email), false, String(email));
    assert.equal(gmailReplyUrl({ ...row, email }), null, String(email));
  }
});

test('quoted note keeps every line', () => {
  assert.equal(quoteNote('one\r\ntwo\rthree'), '> one\n> two\n> three');
});

test('filters by status and type, gear reports count as open while new', () => {
  const gear = { origin: 'gear_list_reports', id: '2', type: 'missing_item', status: 'new' };
  const done = { origin: 'feedback', id: '3', type: 'idea', status: 'fixed' };
  assert.equal(rowMatches(row, 'open', 'bug'), true);
  assert.equal(rowMatches(row, 'open', 'idea'), false);
  assert.equal(rowMatches(gear, 'open', 'gear_report'), true);
  assert.equal(rowMatches(gear, 'open', 'bug'), false);
  assert.equal(rowMatches(done, 'open', 'all'), false);
  assert.equal(rowMatches(done, 'fixed', 'idea'), true);
  assert.equal(rowMatches(done, 'all', 'all'), true);
});

test('device text', () => {
  assert.equal(deviceText({ platform: 'ios', os_version: '18.1', device_model: 'iPhone15,2' }), 'iOS 18.1, iPhone15,2');
  assert.equal(deviceText({ platform: 'android' }), 'Android');
  assert.equal(deviceText({}), '');
});

test('server refusals map to founder copy, unknown ones never echo', () => {
  assert.equal(inboxMessage('not_authorized'), INBOX_ERROR_COPY.not_authorized);
  assert.equal(inboxMessage('<b>weird</b>'), 'Something went wrong. Please try again.');
});

test('the RPC layer calls only the admin functions and rejects bad statuses', async () => {
  const calls = [];
  const client = { rpc: async (name, args) => (calls.push([name, args]), { data: [], error: null }) };
  const api = createInboxApi(client);
  await api.list();
  await api.list('2026-10-29T00:00:00Z');
  await api.setStatus('1', 'answered');
  await assert.rejects(api.setStatus('1', 'deleted'));
  assert.deepEqual(calls.map((c) => c[0]), ['feedback_admin_list', 'feedback_admin_list', 'feedback_set_status']);
  assert.equal(calls[1][1].p_before, '2026-10-29T00:00:00Z');
  const denied = createInboxApi({ rpc: async () => ({ data: null, error: { message: 'not_authorized', code: '42501' } }) });
  await assert.rejects(denied.list(), (e) => e.message === INBOX_ERROR_COPY.not_authorized && e.serverMessage === 'not_authorized');
});

test('inbox copy follows the copy rules', () => {
  const copy = [
    REPLY_SUBJECT, ...Object.values(INBOX_ERROR_COPY), ...Object.values(STATUS_LABEL), ...TYPE_FILTERS.map((t) => t[1]),
    ...STATUS_FILTERS.map((t) => t[1]), read('src/pages/review/ReviewFeedback.jsx'), read('src/lib/feedbackInbox.js'),
  ];
  for (const c of copy) {
    assert.doesNotMatch(c, /[–—]/);
    assert.doesNotMatch(c, /hiking|hiker/i);
  }
});

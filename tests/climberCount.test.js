import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchClimberCount, parseClimberCount } from '../src/lib/climberCount.js';

test('parseClimberCount keeps positive integers only', () => {
  assert.equal(parseClimberCount(398), 398);
  assert.equal(parseClimberCount('398'), 398);
  for (const bad of [null, undefined, 0, -3, 1.5, 'abc', {}, []]) assert.equal(parseClimberCount(bad), null);
});

test('fetchClimberCount calls the RPC with the anon key and returns null on failure', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (u, init) => { calls.push([u, init]); return { ok: true, json: async () => 401 }; };
    assert.equal(await fetchClimberCount({ url: 'https://x.supabase.co/', key: 'anon' }), 401);
    assert.equal(calls[0][0], 'https://x.supabase.co/rest/v1/rpc/public_climber_count');
    assert.equal(calls[0][1].method, 'POST');
    assert.equal(calls[0][1].headers.apikey, 'anon');
    globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
    assert.equal(await fetchClimberCount({ url: 'https://x.supabase.co', key: 'anon' }), null);
    assert.equal(await fetchClimberCount({ url: '', key: 'anon' }), null);
  } finally {
    globalThis.fetch = realFetch;
  }
});

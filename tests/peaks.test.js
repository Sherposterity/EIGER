import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { chunkKeysFor, normalize, queryKey, rowToPeak, searchPeaks } from '../src/lib/peaksSearch.js';

const dir = new URL('../src/data/peaks/', import.meta.url);
const countries = JSON.parse(readFileSync(new URL('countries.json', dir), 'utf8'));
const chunks = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => /^[a-z0]\.json$/.test(f))
    .map((f) => [f[0], JSON.parse(readFileSync(new URL(f, dir), 'utf8')).map((row) => rowToPeak(row, countries))]),
);
const all = Object.values(chunks).flat();
const unique = new Map(all.map((p) => [p.id, p]));

test('peaks dataset: chunks per letter, compact rows, sane values, worldwide size', () => {
  assert.ok(Object.keys(chunks).length >= 26, 'a chunk per letter');
  assert.ok(unique.size > 30000, `expected a worldwide list, got ${unique.size}`);
  for (const p of all) {
    assert.match(p.id, /^Q\d+$/);
    assert.ok(p.name.length > 0 && p.name.length <= 120, p.name);
    assert.ok(p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180, p.name);
    assert.ok(p.elevation >= 1000 && p.elevation <= 8849, `${p.name} ${p.elevation}`);
    assert.ok(typeof p.country === 'string');
  }
});

test('every peak sits in exactly the chunks its meaningful words point to', () => {
  for (const [key, peaks] of Object.entries(chunks)) {
    for (const p of peaks.slice(0, 300)) assert.ok(chunkKeysFor(p.name).has(key), `${p.name} in chunk ${key}`);
  }
  assert.deepEqual([...chunkKeysFor('Mount Rainier')], ['r']);
  assert.deepEqual([...chunkKeysFor('Mont Blanc')].sort(), ['b']);
  assert.deepEqual([...chunkKeysFor('Aiguille du Midi')].sort(), ['a', 'm']);
  assert.deepEqual([...chunkKeysFor('Mount')], ['m'], 'all-stopword names fall back to the first word');
});

test('queryKey picks the chunk for the first meaningful word', () => {
  assert.equal(queryKey('mount rainier'), 'r');
  assert.equal(queryKey('Rainier'), 'r');
  assert.equal(queryKey('mont bl'), 'b');
  assert.equal(queryKey('m'), null, 'too short');
  assert.equal(queryKey('2000 m peak'), '0', 'names that start with a digit share the 0 chunk');
  assert.equal(queryKey('peak'), 'p', 'an all-stopword query falls back to its first word');
});

test('normalize strips diacritics and case', () => {
  assert.equal(normalize('Mönch'), 'monch');
  assert.equal(normalize('  Aiguille du Midi '), 'aiguille du midi');
});

test('search ranks a starts-with match first and the higher peak on ties', () => {
  const r = searchPeaks(chunks.m, 'matter');
  assert.ok(r.length > 0);
  assert.equal(r[0].name, 'Matterhorn');
  const everest = searchPeaks(chunks.e, 'mount everest');
  assert.equal(everest[0].name, 'Mount Everest');
  assert.equal(searchPeaks(chunks.x ?? [], 'x').length, 0, 'one character is too short');
  assert.ok(searchPeaks(chunks.m, 'monch').some((p) => p.name === 'Mönch'), 'diacritic-insensitive');
  assert.equal(searchPeaks(chunks.b, 'blanc')[0].name, 'Mont Blanc', 'the meaningful part of the name counts as a starts-with match');
  assert.equal(searchPeaks(chunks.b, 'mont blanc')[0].name, 'Mont Blanc', 'the full name wins outright');
});

test('launch mountains resolve by name through their chunk', () => {
  for (const name of ['Eiger', 'Mont Blanc', 'Mount Rainier', 'Mount Whitney', 'Grand Teton', 'Aconcagua', 'Kilimanjaro', 'Mount Shasta', 'Etna']) {
    const key = queryKey(name);
    const r = searchPeaks(chunks[key] ?? [], name);
    assert.ok(r.some((p) => normalize(p.name).includes(normalize(name).replace(/^mount /, ''))), `${name} not found in chunk ${key}`);
  }
});

// The request backend never sends peak metadata: the server resolves it from
// its own catalogue (migration 117), so a forged name cannot reach the
// leaderboard. Checked at the source level because the module imports the
// Supabase client, which Node cannot load here.
test('the browser sends only the peak id when requesting a mountain', () => {
  const src = readFileSync(new URL('../src/lib/mountainRequests.js', import.meta.url), 'utf8');
  assert.match(src, /const toPayload = \(peak\) => \(\{ id: peak\.id \}\);/);
  const fn = readFileSync(new URL('../../hike/supabase/functions/mountain-request/index.ts', import.meta.url), 'utf8');
  assert.match(fn, /rpc\("mountain_request_add", \{ p_peak_id: peakId, p_ip_hash: ipHash \}\)/);
  assert.doesNotMatch(fn, /p_name|p_country|p_lat/);
});

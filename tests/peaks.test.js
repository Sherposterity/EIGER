import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { activeIndexFor, chunkKeysFor, normalize, queryKey, resolveQuery, rowToPeak, searchPeaks, stepActiveId } from '../src/lib/peaksSearch.js';

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

test('normalize strips diacritics and case and transliterates ø æ ß', () => {
  assert.equal(normalize('Mönch'), 'monch');
  assert.equal(normalize('  Aiguille du Midi '), 'aiguille du midi');
  assert.equal(normalize('Galdhøpiggen'), 'galdhopiggen');
  assert.equal(normalize('Große Zinne'), 'grosse zinne');
});

test('common spellings and aliases find their peak', () => {
  for (const [q, name] of [
    ['galdhopiggen', 'Galdhøpiggen'],
    ['fujisan', 'Mount Fuji'],
    ['sagarmatha', 'Mount Everest'],
    ['grosse zinne', 'Große Zinne'],
    ['pico de orizaba', 'Citlaltepetl'],
  ]) {
    const key = queryKey(q);
    const r = searchPeaks(chunks[key] ?? [], q);
    assert.ok(r.some((p) => p.name === name), `${q} -> ${name} (chunk ${key}: ${r.map((p) => p.name).join(', ')})`);
  }
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
  // The function's copy in this repo (mirrored from hike/supabase/functions).
  const fn = readFileSync(new URL('../supabase/functions/mountain-request/index.ts', import.meta.url), 'utf8');
  assert.match(fn, /rpc\("mountain_request_add", \{ p_peak_id: peakId, p_ip_hash: ipHash \}\)/);
  assert.doesNotMatch(fn, /p_name|p_country|p_lat/);
});

// Codex follow-up 2026-09-26, P3: alias lookup must not consult Object.prototype.
test('prototype names search like any other text instead of throwing', () => {
  for (const q of ['constructor', '__proto__', 'hasOwnProperty', 'toString']) {
    assert.equal(resolveQuery(q), normalize(q));
    assert.doesNotThrow(() => queryKey(q));
    assert.doesNotThrow(() => searchPeaks(chunks.c, q));
  }
  assert.equal(resolveQuery('Mount Cook'), 'aoraki');
});

// Codex follow-up 2026-09-26, P2: the catalogue chunk arrives after the immediate
// app results and is prepended. The highlighted option must follow its id, not
// its index, or Enter picks a different mountain.
test('a late catalogue chunk does not move the keyboard highlight onto another mountain', () => {
  const appRow = { id: 'app:72810564-01db-49c2-ad5f-424259a0101e', name: 'Mount Adams', lat: 46.2024, lon: -121.4909, elevation: 3743, country: 'United States' };
  const immediate = [appRow];
  // ArrowDown on the immediate list highlights the app row.
  let activeId = stepActiveId(immediate, null, 1);
  assert.equal(activeId, appRow.id);
  assert.equal(activeIndexFor(immediate, activeId), 0);
  // The chunk resolves: catalogue matches are prepended.
  const catalogue = searchPeaks(chunks[queryKey('mount adams')], 'mount adams');
  assert.ok(catalogue.length >= 2, 'catalogue has Mount Adams candidates');
  const merged = [...catalogue, ...immediate.filter((r) => !catalogue.some((c) => c.id === r.id))];
  const i = activeIndexFor(merged, activeId);
  assert.ok(i > 0, `app row moved from index 0 to ${i}`);
  assert.equal(merged[i].id, appRow.id, 'Enter still chooses the highlighted mountain');
  // A highlighted row that disappears clears the highlight; stepping resumes from the top.
  assert.equal(activeIndexFor(catalogue, appRow.id), -1);
  assert.equal(stepActiveId(catalogue, appRow.id, 1), catalogue[0].id);
  assert.equal(stepActiveId([], appRow.id, 1), null);
  assert.equal(stepActiveId(merged, merged[0].id, -1), merged[merged.length - 1].id);
});

// Codex follow-up 2026-09-26, P3: migration 118's refusal is a 400, not a 503.
test('the request function answers 400 for a peak that is already in the app', () => {
  const fn = readFileSync(new URL('../supabase/functions/mountain-request/index.ts', import.meta.url), 'utf8');
  assert.match(fn, /\/peak in app\/\.test\(message\)\) return json\(\{ error: "This mountain is already in Eiger\." \}, 400\)/);
});

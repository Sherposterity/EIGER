// Run with: node --test tests/tryit.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeScore, tileWeights, insulationGsm, TILES } from '../src/lib/tryit.js';

const snapshot = JSON.parse(
  readFileSync(new URL('../src/data/gear-snapshot.json', import.meta.url), 'utf8'),
);
const bySlug = (slug) => snapshot.mountains.find((m) => m.slug === slug);
const rainier = bySlug('mount-rainier');
const requiredTiles = (m, season) =>
  Object.entries(tileWeights(m, season)).filter(([, w]) => w > 0).map(([t]) => t);

test('every tile name exists as a gear item in the snapshot', () => {
  const items = new Set(snapshot.mountains.flatMap((m) => m.gear.map((g) => g.item)));
  for (const t of TILES) assert.ok(items.has(t), t);
});

test('Rainier summer with all required tiles scores 100%', () => {
  const kitItems = requiredTiles(rainier, 'summer');
  assert.equal(kitItems.length, 10);
  const s = computeScore({ mountain: rainier, season: 'summer', kitItems });
  assert.equal(s.percent, 100);
  assert.equal(s.total, 30);
});

test('empty kit scores 0', () => {
  for (const m of snapshot.mountains) {
    for (const season of ['summer', 'winter']) {
      assert.equal(computeScore({ mountain: m, season, kitItems: [] }).percent, 0);
    }
  }
});

test('an item the mountain does not require adds 0', () => {
  // Ben Nevis has no Rope row in its gear list.
  const ben = bySlug('ben-nevis');
  assert.equal(tileWeights(ben, 'summer').Rope, 0);
  const without = computeScore({ mountain: ben, season: 'summer', kitItems: ['Headlamp'] });
  const withRope = computeScore({ mountain: ben, season: 'summer', kitItems: ['Headlamp', 'Rope'] });
  assert.equal(withRope.kitWeight, without.kitWeight);
  assert.equal(withRope.percent, without.percent);
});

test('winter promotes a winter_essentials item to essential (3)', () => {
  // Longs Peak: Ice Axe is absent from its summer list; winter_essentials has "Ice axe".
  const longs = bySlug('longs-peak');
  assert.equal(tileWeights(longs, 'summer')['Ice Axe'], 0);
  assert.equal(tileWeights(longs, 'winter')['Ice Axe'], 3);
  // Mount Elbert: Hardshell Jacket is recommended in summer; "Winter shell" promotes it.
  const elbert = bySlug('mount-elbert');
  assert.equal(tileWeights(elbert, 'summer')['Hardshell Jacket'], 2);
  assert.equal(tileWeights(elbert, 'winter')['Hardshell Jacket'], 3);
});

test('percentage never exceeds 100', () => {
  for (const m of snapshot.mountains) {
    for (const season of ['summer', 'winter']) {
      const s = computeScore({ mountain: m, season, kitItems: [...TILES, ...TILES, 'Not a tile'] });
      assert.ok(s.percent <= 100);
      assert.equal(s.percent, 100);
    }
  }
});

test('beacon is required exactly when the snapshot lists it', () => {
  // Checked against the data: every mountain in the snapshot has
  // avalanche_terrain true and an Avalanche Beacon row, so none drops it.
  for (const m of snapshot.mountains) {
    const listed = m.gear.some((g) => g.item === 'Avalanche Beacon');
    assert.equal(tileWeights(m, 'summer')['Avalanche Beacon'] > 0, listed, m.slug);
  }
  // A mountain with no avalanche terrain and no beacon row does not require it.
  const flat = { ...rainier, avalanche_terrain: false, gear: rainier.gear.filter((g) => !g.item.startsWith('Avalanche')) };
  assert.equal(tileWeights(flat, 'summer')['Avalanche Beacon'], 0);
  assert.equal(tileWeights(flat, 'winter')['Avalanche Beacon'], 0);
});

test('insulation switches with season', () => {
  assert.equal(insulationGsm(rainier, 'summer'), rainier.summer_insulation_gsm);
  assert.equal(insulationGsm(rainier, 'winter'), rainier.winter_insulation_gsm);
});

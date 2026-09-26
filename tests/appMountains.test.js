import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAppIndex, kmBetween } from '../src/lib/appMountainsIndex.js';

const data = JSON.parse(readFileSync(new URL('../src/data/app-mountains.json', import.meta.url), 'utf8'));
const index = createAppIndex(data.mountains);
const byName = (n) => data.mountains.find((m) => m.name === n);

test('app mountains: 97 rows with coordinates, ids unique, most mapped to a dataset peak', () => {
  assert.equal(data.mountains.length, 97);
  assert.equal(new Set(data.mountains.map((m) => m.id)).size, 97);
  for (const m of data.mountains) {
    assert.ok(m.lat >= -90 && m.lat <= 90 && m.lon >= -180 && m.lon <= 180, m.name);
    assert.ok(m.peakId === null || /^Q\d+$/.test(m.peakId), m.name);
  }
  const mapped = data.mountains.filter((m) => m.peakId).length;
  assert.ok(mapped >= 85, `mapped ${mapped}`);
  assert.equal(new Set(data.mountains.map((m) => m.peakId).filter(Boolean)).size, mapped, 'no two app mountains share a peak id');
});

test('identity is by id: Mont Blanc matches, its neighbours do not', () => {
  const montBlanc = byName('Mont Blanc');
  assert.ok(montBlanc?.peakId === 'Q583');
  assert.equal(index.appMountainFor({ id: 'Q583', lat: 45.8328, lon: 6.865 })?.name, 'Mont Blanc');
  // Distinct summits within 2 km of Mont Blanc / Piz Bernina (Codex probe).
  for (const [id, lat, lon] of [
    ['Q30441', 45.8272, 6.8757], // Grand Pilier d'Angle
    ['Q30472', 45.8203, 6.8827], // Aiguille Blanche de Peuterey
    ['Q668570', 46.3739, 9.9124], // Crast' Agüzza
  ]) {
    assert.equal(index.appMountainFor({ id, lat, lon }), null, `${id} is not an app mountain`);
  }
});

test('reviewed aliases resolve and a tapped dot selects its own mountain', () => {
  assert.equal(byName('Pico de Orizaba')?.peakId, 'Q238147');
  assert.equal(byName('Tre Cime di Lavaredo (Cima Grande)')?.peakId, 'Q2893380');
  const sel = index.selectionFromApp(byName('Mount Adams'));
  assert.equal(index.appMountainFor(sel)?.name, 'Mount Adams');
  assert.ok(sel.id.startsWith('app:') || /^Q/.test(sel.id));
});

test('a shared word within 3 km is not an identity: Dents du Midi is not Cime de l\'Est', () => {
  const dents = byName('Dents du Midi (Haute Cime)');
  assert.ok(dents, 'app mountain present');
  assert.notEqual(dents.peakId, 'Q22504027', 'Cime de l\'Est is a different summit');
  assert.equal(index.appMountainFor({ id: 'Q22504027', lat: 46.173, lon: 6.948 }), null);
});

test('app mountains are searchable by name, including the unmapped ones, without duplicates', () => {
  const normalize = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const adams = index.searchAppMountains('mount adams', normalize);
  assert.equal(adams[0]?.name, 'Mount Adams');
  assert.equal(index.appMountainFor(adams[0])?.name, 'Mount Adams');
  assert.ok(adams[0].id.startsWith('app:'), 'no catalogue id, so the synthetic id is never a valid request');
  const montBlanc = byName('Mont Blanc');
  assert.deepEqual(index.searchAppMountains('mont blanc', normalize, new Set([montBlanc.peakId])), [], 'present through its peak: not repeated');
});

test('nearbyAppMountain is a hint for neighbours and null for the mountain itself', () => {
  const near = index.nearbyAppMountain({ id: 'Q30441', lat: 45.8272, lon: 6.8757 });
  assert.equal(near?.name, 'Mont Blanc');
  assert.equal(index.nearbyAppMountain({ id: 'Q583', lat: 45.8328, lon: 6.865 }), null);
  assert.ok(kmBetween({ lat: 45.8328, lon: 6.865 }, { lat: 45.8272, lon: 6.8757 }) < 2);
});

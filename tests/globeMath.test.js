import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLOBE_RADIUS, MARKER_ELEVATION, markerVector, pickMarker, project, toVector } from '../src/lib/globeMath.js';

// cobe's own marker shell: unit vector scaled by 0.8 + markerElevation
// (default 0.05 in node_modules/cobe/dist/index.esm.js). The globe component
// must pass the same markerElevation it picks for hit testing.
test('marker vectors sit on cobe marker shell (0.8 + markerElevation)', () => {
  const cobe = readFileSync(new URL('../node_modules/cobe/dist/index.esm.js', import.meta.url), 'utf8');
  assert.match(cobe, /markerElevation\?\?\.05/, 'cobe default markerElevation is 0.05');
  assert.match(cobe, /\.8\+/, 'cobe scales markers by 0.8 + elevation');
  assert.equal(MARKER_ELEVATION, 0.05);
  const v = markerVector(0, 135);
  const len = Math.hypot(...v);
  assert.ok(Math.abs(len - (GLOBE_RADIUS + MARKER_ELEVATION)) < 1e-9);
  assert.equal(Math.hypot(...toVector(46, 8)).toFixed(9), '1.000000000');
});

test('project matches cobe O() for the front-centre point and hides the far side', () => {
  // With phi = theta = 0 the point at lat 0, lon 90 faces the camera.
  const front = project(markerVector(0, 90), 0, 0);
  assert.ok(Math.abs(front[0] - 0.5) < 1e-9 && Math.abs(front[1] - 0.5) < 1e-9, `front centre ${front}`);
  assert.equal(front[2], false);
  const back = project(markerVector(0, -90), 0, 0);
  assert.equal(back[2], true, 'the antipode is hidden');
  // Off-centre: lat 0, lon 135 lands LEFT of centre by 0.85 * sin(45deg) / 2 of
  // the canvas (103.7 px on a 520 px canvas, the value Codex's probe measured).
  const off = project(markerVector(0, 135), 0, 0);
  const expected = 0.5 - ((GLOBE_RADIUS + MARKER_ELEVATION) * Math.SQRT1_2) / 2;
  assert.ok(Math.abs(off[0] * 520 - 103.73) < 0.05, `520 px canvas x ${off[0] * 520}`);
  assert.ok(Math.abs(off[0] - expected) < 1e-9, `off-centre x ${off[0]} vs ${expected}`);
});

test('pickMarker finds the dot under the tap at phone and desktop sizes, never a hidden one', () => {
  const markers = [
    { id: 'front', lat: 0, lon: 90 },
    { id: 'off', lat: 0, lon: 135 },
    { id: 'back', lat: 0, lon: -90 },
    { id: 'edge', lat: 0, lon: 178 },
  ];
  for (const size of [320, 520, 1440]) {
    assert.equal(pickMarker(markers, size / 2, size / 2, size, 0, 0)?.id, 'front');
    const [fx, fy] = project(markerVector(0, 135), 0, 0);
    assert.equal(pickMarker(markers, fx * size + 5, fy * size - 5, size, 0, 0)?.id, 'off', `off-centre at ${size}`);
    assert.equal(pickMarker(markers, fx * size + 40, fy * size, size, 0, 0), null, 'outside the radius');
  }
  // A tap where the hidden antipode would project must not select it.
  const [bx, by] = project(markerVector(0, -90), 0, 0);
  assert.notEqual(pickMarker(markers, bx * 520, by * 520, 520, 0, 0)?.id, 'back');
  // Turning the globe by pi brings the back marker to the front.
  assert.equal(pickMarker(markers, 260, 260, 520, Math.PI, 0)?.id, 'back');
});

test('invalid coordinates are skipped', () => {
  assert.equal(pickMarker([{ lat: NaN, lon: 0 }, { lat: 95, lon: 0 }], 260, 260, 520, 0, 0), null);
});

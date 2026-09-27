import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLOBE_RADIUS, MARKER_ELEVATION, anglesFor, markerVector, pickMarker, project, toVector } from '../src/lib/globeMath.js';

const cobe = readFileSync(new URL('../node_modules/cobe/dist/index.esm.js', import.meta.url), 'utf8');

// cobe's own marker shell: unit vector scaled by 0.8 + markerElevation
// (default 0.05 in node_modules/cobe/dist/index.esm.js). The globe component
// must pass the same markerElevation it picks for hit testing.
test('marker vectors sit on cobe marker shell (0.8 + markerElevation)', () => {
  assert.match(cobe, /markerElevation\?\?\.05/, 'cobe default markerElevation is 0.05');
  assert.match(cobe, /\.8\+/, 'cobe scales markers by 0.8 + elevation');
  assert.equal(MARKER_ELEVATION, 0.05);
  const v = markerVector(0, 135);
  const len = Math.hypot(...v);
  assert.ok(Math.abs(len - (GLOBE_RADIUS + MARKER_ELEVATION)) < 1e-9);
  assert.equal(Math.hypot(...toVector(46, 8)).toFixed(9), '1.000000000');
});

// cobe's marker shader hides a dot only when it faces away AND sits inside
// the disc; O()'s third value is the opposite of that (it is called visible
// in W()). The 2026-09-26 pick maths read it as hidden, so taps only ever
// matched dots on the far side.
test('visibility follows the marker shader rule, not its negation', () => {
  assert.match(cobe, /if\(l\.z<0\.&&length\(l\.xy\)<\.8\)\{gl_Position=vec4\(2,2,0,1\);return;\}/, 'cobe hides z < 0 inside the disc');
  assert.match(cobe, /return\{x:a\[0\],y:a\[1\],visible:a\[2\]\}/, "cobe's O() third value is visible");
  // With phi = theta = 0 the point at lat 0, lon -90 faces the camera
  // (U() maps it to [0, 0, 1], the camera axis).
  const front = project(markerVector(0, -90), 0, 0);
  assert.ok(Math.abs(front[0] - 0.5) < 1e-9 && Math.abs(front[1] - 0.5) < 1e-9, `front centre ${front}`);
  assert.equal(front[2], false, 'the point facing the camera is visible');
  const back = project(markerVector(0, 90), 0, 0);
  assert.ok(Math.abs(back[0] - 0.5) < 1e-9, 'the antipode projects to the same spot');
  assert.equal(back[2], true, 'the antipode is hidden');
  // A marker just past the rim (z slightly negative, outside the 0.8 disc) is
  // still drawn because it is elevated above the surface.
  const rim = project(markerVector(0, -90 + 88), 0, 0);
  assert.equal(rim[2], false, 'an elevated marker past the rim stays visible');
});

test('anglesFor turns the chosen peak to face the camera', () => {
  for (const [lat, lon] of [[45.9766, 7.6585], [-32.65, -70.01], [27.9881, 86.925], [63.07, -151.0]]) {
    const [phi, theta] = anglesFor(lat, lon);
    const [x, y, hidden] = project(markerVector(lat, lon), phi, theta);
    assert.equal(hidden, false, `${lat},${lon} visible`);
    assert.ok(Math.abs(x - 0.5) < 1e-9 && Math.abs(y - 0.5) < 1e-9, `${lat},${lon} at centre: ${x},${y}`);
  }
});

test('project matches cobe O() off centre', () => {
  // lat 0, lon -135 lands LEFT of centre by 0.85 * sin(45deg) / 2 of the
  // canvas (103.7 px on a 520 px canvas).
  const off = project(markerVector(0, -135), 0, 0);
  const expected = 0.5 - ((GLOBE_RADIUS + MARKER_ELEVATION) * Math.SQRT1_2) / 2;
  assert.ok(Math.abs(off[0] * 520 - 103.73) < 0.05, `520 px canvas x ${off[0] * 520}`);
  assert.ok(Math.abs(off[0] - expected) < 1e-9, `off-centre x ${off[0]} vs ${expected}`);
  assert.equal(off[2], false);
  // Tilt: a northern point rises (smaller y) when theta lifts the pole.
  const north = project(markerVector(40, -90), 0, 0);
  assert.ok(north[1] < 0.5, 'north of the equator draws above centre');
});

test('pickMarker finds the dot under the tap at phone and desktop sizes, never a hidden one', () => {
  const markers = [
    { id: 'front', lat: 0, lon: -90 },
    { id: 'off', lat: 0, lon: -135 },
    { id: 'back', lat: 0, lon: 90 },
    { id: 'edge', lat: 0, lon: 178 },
  ];
  for (const size of [320, 520, 1440]) {
    assert.equal(pickMarker(markers, size / 2, size / 2, size, 0, 0)?.id, 'front');
    const [fx, fy] = project(markerVector(0, -135), 0, 0);
    assert.equal(pickMarker(markers, fx * size + 5, fy * size - 5, size, 0, 0)?.id, 'off', `off-centre at ${size}`);
    assert.equal(pickMarker(markers, fx * size + 40, fy * size, size, 0, 0), null, 'outside the radius');
    // A finger's wider radius (28 px) still reaches, a cursor's (16) does not.
    assert.equal(pickMarker(markers, fx * size + 22, fy * size, size, 0, 0, 28)?.id, 'off', `touch radius at ${size}`);
    assert.equal(pickMarker(markers, fx * size + 22, fy * size, size, 0, 0), null, `mouse radius at ${size}`);
  }
  // A tap where the hidden antipode projects selects the front dot, not it.
  const [bx, by] = project(markerVector(0, 90), 0, 0);
  assert.equal(pickMarker(markers, bx * 520, by * 520, 520, 0, 0)?.id, 'front');
  assert.equal(pickMarker([markers[2]], bx * 520, by * 520, 520, 0, 0), null, 'a hidden dot alone is never picked');
  // Turning the globe by pi brings the back marker to the front.
  assert.equal(pickMarker(markers, 260, 260, 520, Math.PI, 0)?.id, 'back');
  // The real home view (theta 0.28) at phi from anglesFor: the focused peak is
  // under the centre of the canvas.
  const [phi, theta] = anglesFor(45.9766, 7.6585);
  assert.equal(pickMarker([{ id: 'matterhorn', lat: 45.9766, lon: 7.6585 }, ...markers], 179, 179, 358, phi, theta)?.id, 'matterhorn');
});

test('invalid coordinates are skipped', () => {
  assert.equal(pickMarker([{ lat: NaN, lon: 0 }, { lat: 95, lon: 0 }], 260, 260, 520, 0, 0), null);
});

// Run with: node --test tests/ascent.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  profilePoints, pathLengths, pointAtProgress, nearestWaypoint, wrapLabel, layoutLabels,
} from '../src/lib/ascent.js';

const data = JSON.parse(readFileSync(new URL('../src/data/ascent-rainier-dc.json', import.meta.url), 'utf8'));
const W = 20;
const H = 700;
const pts = profilePoints(data.waypoints, W, H);

test('one point per waypoint, no NaN', () => {
  assert.equal(pts.length, data.waypoints.length);
  for (const p of pts) {
    assert.ok(Number.isFinite(p.x), `x of ${p.name}`);
    assert.ok(Number.isFinite(p.y), `y of ${p.name}`);
  }
});

test('first point at bottom-left, last at top-right', () => {
  assert.deepEqual([pts[0].x, pts[0].y], [0, H]);
  assert.deepEqual([pts.at(-1).x, pts.at(-1).y], [W, 0]);
});

test('elevation mapping is monotonic: higher metres, smaller y', () => {
  for (let i = 1; i < pts.length; i++) {
    assert.ok(data.waypoints[i].m > data.waypoints[i - 1].m);
    assert.ok(pts[i].y < pts[i - 1].y, `${pts[i].name} above ${pts[i - 1].name}`);
    assert.ok(pts[i].x >= pts[i - 1].x);
  }
});

test('handles 2 points', () => {
  const two = profilePoints([{ m: 100, mi: 0 }, { m: 200, mi: 3 }], 10, 50);
  assert.deepEqual(two.map((p) => [p.x, p.y]), [[0, 50], [10, 0]]);
});

test('flat or single-distance input does not produce NaN', () => {
  const flat = profilePoints([{ m: 100, mi: 1 }, { m: 100, mi: 1 }], 10, 50);
  for (const p of flat) assert.deepEqual([p.x, p.y], [5, 25]);
  assert.deepEqual(profilePoints([], 10, 10), []);
});

test('pointAtProgress walks the path from start to end', () => {
  const L = pathLengths(pts);
  assert.deepEqual(pointAtProgress(pts, 0, L), { x: pts[0].x, y: pts[0].y });
  const end = pointAtProgress(pts, 1, L);
  assert.ok(Math.abs(end.x - W) < 1e-9 && Math.abs(end.y) < 1e-9);
  const mid = pointAtProgress(pts, 0.5, L);
  assert.ok(mid.y < H && mid.y > 0);
  assert.deepEqual(pointAtProgress(pts, -3, L), pointAtProgress(pts, 0, L));
  assert.ok(Number.isFinite(pointAtProgress(pts, NaN, L).x));
});

test('nearestWaypoint picks the ends at 0 and 1', () => {
  assert.equal(nearestWaypoint(pts, 0), 0);
  assert.equal(nearestWaypoint(pts, 1), pts.length - 1);
});

test('wrapLabel keeps lines within the limit where words allow', () => {
  assert.deepEqual(wrapLabel('Top of Disappointment Cleaver', 14), ['Top of', 'Disappointment', 'Cleaver']);
  assert.deepEqual(wrapLabel('Camp Muir', 14), ['Camp Muir']);
});

test('layoutLabels removes overlaps and stays in bounds', () => {
  const items = [{ y: 100, h: 20 }, { y: 105, h: 20 }, { y: 400, h: 20 }];
  const tops = layoutLabels(items, { gap: 4, minY: 0, maxY: 500 });
  const spans = tops.map((t, i) => [t, t + items[i].h]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i++) assert.ok(spans[i][0] >= spans[i - 1][1] + 4 - 1e-9);
  for (const [a, b] of spans) assert.ok(a >= 0 && b <= 500);
});

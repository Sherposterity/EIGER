// Run with: node --test tests/tryit-geometry.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diagramGeometry,
  kitRadius,
  ringRadius,
  widgetSlot,
  chipSlot,
  RING_STROKE,
} from '../src/components/home/tryit/geometry.js';

const N = 10;
// [viewport, container width, desktop]: phones have a 16 px gutter each side.
const CASES = [
  [320, 288, false],
  [360, 328, false],
  [390, 358, false],
  [430, 398, false],
  [767, 735, false],
  [768, 720, true],
  [1024, 960, true],
  [1440, 1088, true],
];

for (const [viewport, width, desktop] of CASES) {
  const geo = diagramGeometry({ width, viewport, desktop });

  test(`${viewport}px: gear circles clear the ring at max kit growth`, () => {
    const ringOuter = ringRadius(kitRadius(geo, N)) + RING_STROKE / 2;
    for (let i = 0; i < N; i++) {
      const { x, y } = widgetSlot(geo, i, N);
      const nearest = Math.hypot(x, y) - geo.widget / 2 - geo.drift;
      assert.ok(nearest > ringOuter, `slot ${i}: ${nearest.toFixed(1)} vs ${ringOuter.toFixed(1)}`);
    }
  });

  test(`${viewport}px: gear circles do not overlap each other or the edge`, () => {
    const slots = Array.from({ length: N }, (_, i) => widgetSlot(geo, i, N));
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const d = Math.hypot(slots[i].x - slots[j].x, slots[i].y - slots[j].y);
      assert.ok(d >= geo.widget + 2 * geo.drift, `${i}-${j}: ${d.toFixed(1)}`);
      assert.ok(Math.abs(slots[i].x) + geo.widget / 2 + geo.drift <= width / 2, `slot ${i} x`);
      assert.ok(Math.abs(slots[i].y) + geo.widget / 2 + geo.drift <= geo.height / 2, `slot ${i} y`);
    }
  });

  test(`${viewport}px: kit grows with every item and chips fit inside`, () => {
    for (let n = 1; n <= N; n++) {
      const r = kitRadius(geo, n);
      assert.ok(r > kitRadius(geo, n - 1), `grows at ${n}`);
      const chips = Array.from({ length: n }, (_, i) => chipSlot(geo, r, i, n));
      for (const c of chips) assert.ok(Math.hypot(c.x, c.y) + geo.chip / 2 <= r, 'inside');
      if (n > 1) {
        const d = Math.hypot(chips[0].x - chips[1].x, chips[0].y - chips[1].y);
        assert.ok(d >= geo.chip, `chips ${n}: ${d.toFixed(1)}`);
      }
    }
  });
}

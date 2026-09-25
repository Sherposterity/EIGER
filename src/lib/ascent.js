// Pure geometry for the ascent line (src/components/AscentLine.jsx).
// No React, no DOM: unit tested in tests/ascent.test.js.

/**
 * Map route waypoints onto a width x height box in SVG coordinates.
 * x = distance (mi) normalised to [0, width], y = elevation (m) normalised to
 * [height, 0], so the first waypoint is bottom-left and the summit top-right.
 * A zero range (single distance or flat elevation) maps to the box centre on
 * that axis instead of dividing by zero.
 *
 * @param {{name?: string, m: number, mi: number, ft?: number}[]} waypoints
 * @param {number} width
 * @param {number} height
 * @returns {{x: number, y: number, name?: string, m: number, mi: number}[]}
 */
export function profilePoints(waypoints, width, height) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) return [];
  const w = Number.isFinite(width) ? width : 0;
  const h = Number.isFinite(height) ? height : 0;
  const mis = waypoints.map((p) => Number(p.mi) || 0);
  const ms = waypoints.map((p) => Number(p.m) || 0);
  const miMin = Math.min(...mis);
  const miSpan = Math.max(...mis) - miMin;
  const mMin = Math.min(...ms);
  const mSpan = Math.max(...ms) - mMin;
  return waypoints.map((p, i) => ({
    ...p,
    x: miSpan > 0 ? ((mis[i] - miMin) / miSpan) * w : w / 2,
    y: mSpan > 0 ? h - ((ms[i] - mMin) / mSpan) * h : h / 2,
  }));
}

/** Total polyline length plus the cumulative length at each vertex. */
export function pathLengths(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  return { cum, total: cum[cum.length - 1] || 0 };
}

/**
 * Point at fraction t (0..1, clamped) of the polyline's length, so the marker
 * and a pathLength="1" dash of the traversed stroke stay in step.
 */
export function pointAtProgress(points, t, lengths = pathLengths(points)) {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1 || lengths.total === 0) return { x: points[0].x, y: points[0].y };
  const p = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  const target = p * lengths.total;
  const { cum } = lengths;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i++;
  const seg = cum[i] - cum[i - 1];
  const f = seg > 0 ? (target - cum[i - 1]) / seg : 0;
  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * f,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * f,
  };
}

/** Index of the waypoint whose arc position is closest to fraction t. */
export function nearestWaypoint(points, t, lengths = pathLengths(points)) {
  if (points.length === 0) return -1;
  const target = Math.min(1, Math.max(0, t)) * lengths.total;
  let best = 0;
  for (let i = 1; i < lengths.cum.length; i++) {
    if (Math.abs(lengths.cum[i] - target) < Math.abs(lengths.cum[best] - target)) best = i;
  }
  return best;
}

/** Greedy word wrap to at most `maxChars` per line (a long word keeps its own line). */
export function wrapLabel(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + ' ' + word).length <= maxChars) lines[lines.length - 1] = last + ' ' + word;
    else lines.push(word);
  }
  return lines;
}

/**
 * Vertical label placement: each label wants its centre at its point's y,
 * but labels may not overlap (gap px between them) and must stay inside
 * [minY, maxY]. Returns the top y of each label, same order as input.
 */
export function layoutLabels(items, { gap = 4, minY = 0, maxY = Infinity } = {}) {
  const order = items.map((it, i) => ({ i, want: it.y - it.h / 2, h: it.h })).sort((a, b) => a.want - b.want);
  const tops = order.map((o) => Math.max(minY, o.want));
  for (let k = 1; k < order.length; k++) {
    tops[k] = Math.max(tops[k], tops[k - 1] + order[k - 1].h + gap);
  }
  // Pull back up from the bottom if the stack overflowed
  for (let k = order.length - 1; k >= 0; k--) {
    const limit = k === order.length - 1 ? maxY - order[k].h : tops[k + 1] - gap - order[k].h;
    tops[k] = Math.max(minY, Math.min(tops[k], limit));
  }
  const out = new Array(items.length);
  order.forEach((o, k) => { out[o.i] = tops[k]; });
  return out;
}

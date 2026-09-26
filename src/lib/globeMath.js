// Pure maths behind the globe's tap-to-select, kept out of the component so
// Node tests can check it against cobe's own functions.
//
// cobe 2 (node_modules/cobe/dist/index.esm.js): U([lat, lon]) turns a place
// into a unit vector; markers are drawn at that vector scaled by
// 0.8 + markerElevation (the globe itself has radius 0.8 in view units);
// O(v) projects a vector with the current phi (turn) and theta (tilt) and
// says whether it is hidden (facing away, or outside the 0.8 disc). With a
// square canvas, scale 1 and no offset, O reduces to
//   x = (cx + 1) / 2,  y = (1 - sy) / 2   (fractions of the canvas)
// which is what project() returns. MARKER_ELEVATION must match the option
// passed to createGlobe, or hits land a few pixels off the drawn dot.

export const GLOBE_RADIUS = 0.8;
export const MARKER_ELEVATION = 0.05;
export const PICK_RADIUS_PX = 16;

export const anglesFor = (lat, lon) => [Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];

export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export const validPoint = (m) =>
  Number.isFinite(m.lat) && Number.isFinite(m.lon) && m.lat >= -90 && m.lat <= 90 && m.lon >= -180 && m.lon <= 180;

// cobe's U(): unit vector for a place.
export const toVector = (lat, lon) => {
  const r = (lat * Math.PI) / 180;
  const a = (lon * Math.PI) / 180 - Math.PI;
  const o = Math.cos(r);
  return [-o * Math.cos(a), Math.sin(r), o * Math.sin(a)];
};

// Where cobe draws a marker: the unit vector scaled to the marker shell.
export const markerVector = (lat, lon) => toVector(lat, lon).map((x) => x * (GLOBE_RADIUS + MARKER_ELEVATION));

// cobe's O() for a square canvas, scale 1, no offset: [x, y, hidden] with x
// and y as canvas fractions (0..1 from the top left).
export const project = (v, phi, theta) => {
  const r = Math.cos(theta);
  const a = Math.cos(phi);
  const o = Math.sin(theta);
  const i = Math.sin(phi);
  const cx = a * v[0] + i * v[2];
  const sy = i * o * v[0] + r * v[1] - a * o * v[2];
  const hidden = -i * r * v[0] + o * v[1] + a * r * v[2] >= 0 || cx * cx + sy * sy >= GLOBE_RADIUS * GLOBE_RADIUS;
  return [(cx + 1) / 2, (1 - sy) / 2, hidden];
};

// The nearest visible marker within PICK_RADIUS_PX of a canvas point, or
// null. `sizePx` is the canvas's CSS size (square); px/py are CSS pixels from
// its top left. Markers are cached on the objects (_mv) between calls.
export const pickMarker = (markers, px, py, sizePx, phi, theta, radiusPx = PICK_RADIUS_PX) => {
  let best = null;
  let bestD = radiusPx * radiusPx;
  for (const m of markers) {
    if (!validPoint(m)) continue;
    const v = m._mv ?? (m._mv = markerVector(m.lat, m.lon));
    const [fx, fy, hidden] = project(v, phi, theta);
    if (hidden) continue;
    const dx = fx * sizePx - px;
    const dy = fy * sizePx - py;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
};

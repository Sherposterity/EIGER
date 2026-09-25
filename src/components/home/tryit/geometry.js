// Pure geometry for the radial "Try it yourself!" diagram. No React, no DOM:
// tests/tryit-geometry.test.js runs it under node --test.
//
// Everything is in px, relative to the diagram centre (which is also the kit
// centre). Angles run clockwise from 12 o'clock.

export const DESKTOP = {
  widget: 88, // gear circle diameter
  ring: 260, // radius of the ring the gear circles sit on
  kitStart: 72, // kit radius with nothing in it
  kitStep: 14, // nominal growth per item (capped, see kitRadius)
  chip: 40, // diameter of an item once it is inside the kit
  drift: 4, // max drift of a gear circle from its slot, each axis
  ellipse: 1, // vertical ring radius = ring * ellipse
};

export const PHONE = {
  widget: 64,
  ringVw: 0.38, // ring radius as a share of the viewport width
  kitStart: 56,
  kitStep: 14,
  chip: 24,
  drift: 3,
  ellipse: 1.35, // phones have height to spare, so the ring is a tall ellipse
};

export const RING_GAP = 8; // kit edge to the compatibility ring's centre line
export const RING_STROKE = 4;
export const DROP_SLOP = 24; // a drop counts within kit radius + this
const EDGE = 4; // breathing room at the container edge and around the ring
const SIDE = Math.sin((72 * Math.PI) / 180); // widest slots sit at 72 and 108 degrees

export function slotAngle(index, count) {
  return (index / count) * Math.PI * 2;
}

// Geometry for a container `width` px wide on a `viewport` px wide screen.
export function diagramGeometry({ width, viewport, desktop }) {
  const g = desktop ? DESKTOP : PHONE;
  const half = width / 2;
  // Side slots (x = SIDE * rx) plus half a widget plus drift must fit the width.
  const fit = (half - g.widget / 2 - g.drift - EDGE) / SIDE;
  const nominal = desktop ? g.ring : g.ringVw * viewport;
  const rx = Math.max(0, Math.min(nominal, fit));
  const ry = rx * g.ellipse;
  // The nearest a gear circle's centre gets to the kit centre is rx (ry >= rx).
  // The ring's outer edge must stay clear of that circle, drift included.
  const kitMax = Math.max(0, rx - g.widget / 2 - g.drift - RING_GAP - RING_STROKE / 2 - EDGE);
  const kitMin = Math.min(g.kitStart, kitMax * 0.7);
  const height = Math.ceil(2 * (ry + g.widget / 2 + g.drift + EDGE * 3));
  return {
    rx,
    ry,
    widget: g.widget,
    chip: g.chip,
    drift: g.drift,
    kitMin,
    kitMax,
    kitStep: g.kitStep,
    height,
  };
}

// Kit radius with `count` items: grows by kitStep per item, but the growth is
// scaled down when kitMax would otherwise be passed, so every item still grows
// the kit a little and the tenth lands exactly on kitMax at most.
export function kitRadius(geo, count) {
  const step = Math.min(geo.kitStep, (geo.kitMax - geo.kitMin) / 10);
  return Math.min(geo.kitMax, geo.kitMin + Math.max(0, step) * count);
}

export function ringRadius(kitR) {
  return kitR + RING_GAP;
}

// Slot of gear circle `index` (of `count`) on the outer ring.
export function widgetSlot(geo, index, count) {
  const a = slotAngle(index, count);
  return { x: geo.rx * Math.sin(a), y: -geo.ry * Math.cos(a) };
}

// Slot of the `index`-th of `count` items inside a kit of radius kitR.
export function chipSlot(geo, kitR, index, count) {
  if (count <= 1) return { x: 0, y: 0 };
  const r = Math.max(0, kitR - geo.chip / 2 - 8);
  const a = slotAngle(index, count);
  return { x: r * Math.sin(a), y: -r * Math.cos(a) };
}

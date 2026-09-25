import {
  Cable,
  Flashlight,
  Footprints,
  Grip,
  HardHat,
  Layers,
  Link,
  Pickaxe,
  RadioTower,
  Shirt,
} from 'lucide-react';

// Glyph per demo tile (decorative only, always aria-hidden).
export const GLYPH = {
  'Mountaineering Boots': Footprints,
  Crampons: Grip,
  'Ice Axe': Pickaxe,
  'Climbing Helmet': HardHat,
  'Climbing Harness': Link,
  Rope: Cable,
  'Hardshell Jacket': Shirt,
  'Down Jacket': Layers,
  Headlamp: Flashlight,
  'Avalanche Beacon': RadioTower,
};

// Visual label inside a gear circle. A soft hyphen lets the one long word
// break inside a 64 px circle; screen readers get the plain tile name.
export const DISPLAY = {
  'Mountaineering Boots': 'Mountain­eering Boots',
};

export const LEVEL_LABEL = { 3: 'Essential', 2: 'Recommended', 1: 'Optional' };

export function weightLabel(weight) {
  return weight > 0 ? `${LEVEL_LABEL[weight]} +${weight}` : 'Not required for this mountain';
}

// Drift parameters per slot: different periods and phases so the circles
// never move in step. Deterministic, so server and client agree.
export function driftFor(index, amplitude) {
  return {
    '--dx': `${amplitude}px`,
    '--dy': `${Math.max(2, amplitude - 1)}px`,
    '--tx': `${5.2 + ((index * 7) % 10) * 0.37}s`,
    '--ty': `${6.1 + ((index * 3) % 10) * 0.41}s`,
    '--px': `${-((index * 1.3) % 5)}s`,
    '--py': `${-((index * 2.1) % 6)}s`,
  };
}

// Continuous drift, two nested axes with different periods (a slow Lissajous
// wobble, never a pulse). Paused while dragging, off under reduced motion.
export const DRIFT_CSS = `
@keyframes tryit-dx { from { transform: translateX(calc(-1 * var(--dx))); } to { transform: translateX(var(--dx)); } }
@keyframes tryit-dy { from { transform: translateY(calc(-1 * var(--dy))); } to { transform: translateY(var(--dy)); } }
.tryit-dx { animation: tryit-dx var(--tx) ease-in-out var(--px) infinite alternate; }
.tryit-dy { animation: tryit-dy var(--ty) ease-in-out var(--py) infinite alternate; }
.tryit-paused .tryit-dx, .tryit-paused .tryit-dy { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .tryit-dx, .tryit-dy { animation: none; } }
`;

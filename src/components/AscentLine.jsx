import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import rainierDC from '../data/ascent-rainier-dc.json';
import {
  layoutLabels,
  nearestWaypoint,
  pathLengths,
  pointAtProgress,
  profilePoints,
  wrapLabel,
} from '../lib/ascent.js';

/*
 * AscentLine: the site's signature motif. A thin elevation profile of a real
 * route (Rainier, Disappointment Cleaver by default) fixed in the left page
 * margin; page scroll walks a marker from the trailhead (top of page) to the
 * summit (end of page). Decorative only: aria-hidden, pointer-events none,
 * position fixed, so it never captures scroll or shifts layout.
 *
 * Props
 *   data     Route JSON shaped like src/data/ascent-rainier-dc.json
 *            ({ waypoints: [{ name, m, mi, ... }] }, ordered trailhead to
 *            summit). Defaults to the Rainier DC file.
 *   variant  'margin' (default): the strip at >= 1440px, nothing below.
 *            'bar': the strip at >= 1440px, and below that a 2px progress
 *            line on the top edge with the waypoints as ticks.
 *            'none': renders nothing.
 *
 * Mount it once per page, anywhere in the tree (it is position: fixed).
 * The strip is STRIP_W px wide at the left edge, z-40 (under the z-50 nav),
 * so page content at >= 1440px needs at least that much left margin.
 */

const STRIP_W = 150; // px; room for the widened profile plus 10px mono labels
const LINE_X0 = 10; // profile's horizontal band inside the strip (distance, compressed)
const LINE_W = 40;
const LABEL_X = 34;
const LABEL_CHARS = 14; // 10px JetBrains Mono advances 6px a character
const LINE_H = 13; // label line height in px
const PAD_TOP = 104; // clears the fixed nav
const PAD_BOTTOM = 64; // room for the caption
const NO_WAYPOINTS = [];
const CAPTION = 'Illustrative: Rainier, DC route';

function subscribeResize(cb) {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
}
const getViewportH = () => window.innerHeight;

function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const fmtM = (m) => `${Math.round(m).toLocaleString('en-US')} m`;

export default function AscentLine({ data = rainierDC, variant = 'margin' }) {
  const isWide = useMediaQuery('(min-width: 1440px)');
  const reduced = useReducedMotion();
  const viewportH = useSyncExternalStore(subscribeResize, getViewportH, () => 900);

  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4, restDelta: 0.0005 });
  // Reduced motion: no spring, the marker sits exactly at the scroll position
  const progress = reduced ? scrollYProgress : smooth;

  const waypoints = data?.waypoints ?? NO_WAYPOINTS;
  const plotH = Math.max(120, viewportH - PAD_TOP - PAD_BOTTOM);

  const geo = useMemo(() => {
    const pts = profilePoints(waypoints, LINE_W, plotH).map((p) => ({
      ...p,
      x: p.x + LINE_X0,
      y: p.y + PAD_TOP,
    }));
    const lengths = pathLengths(pts);
    const labels = pts.map((p) => {
      const lines = [...wrapLabel(p.name ?? '', LABEL_CHARS), fmtM(p.m)];
      return { lines, h: lines.length * LINE_H, y: p.y };
    });
    const tops = layoutLabels(labels, { gap: 6, minY: PAD_TOP - 24, maxY: viewportH - PAD_BOTTOM + 8 });
    return { pts, lengths, labels: labels.map((l, i) => ({ ...l, top: tops[i] })) };
  }, [waypoints, plotH, viewportH]);

  const markerX = useTransform(progress, (v) => pointAtProgress(geo.pts, v, geo.lengths).x - 3);
  const markerY = useTransform(progress, (v) => pointAtProgress(geo.pts, v, geo.lengths).y - 3);
  const dashOffset = useTransform(progress, (v) => 1 - Math.min(1, Math.max(0, v)));

  const [active, setActive] = useState(0);
  useMotionValueEvent(progress, 'change', (v) => {
    const i = nearestWaypoint(geo.pts, v, geo.lengths);
    if (i !== active) setActive(i);
  });

  if (variant === 'none' || geo.pts.length < 2) return null;

  if (!isWide) {
    if (variant !== 'bar') return null;
    const maxMi = Math.max(...waypoints.map((w) => Number(w.mi) || 0)) || 1;
    return (
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[51] h-[2px] bg-line">
        <motion.div
          className="absolute inset-0 origin-left bg-fg"
          style={{ scaleX: progress }}
        />
        {waypoints.map((w) => (
          <span
            key={w.name}
            className="absolute top-0 h-[2px] w-px bg-bg"
            style={{ left: `${((Number(w.mi) || 0) / maxMi) * 100}%` }}
          />
        ))}
      </div>
    );
  }

  const polyPoints = geo.pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-40 h-dvh select-none"
      style={{ width: STRIP_W }}
    >
      <svg className="absolute inset-0 overflow-visible" width={STRIP_W} height={viewportH}>
        <polyline
          points={polyPoints}
          fill="none"
          stroke="var(--color-fg-subtle)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <motion.polyline
          points={polyPoints}
          fill="none"
          stroke="var(--color-fg)"
          strokeWidth="1"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          style={{ strokeDashoffset: dashOffset }}
        />
        {geo.pts.map((p, i) => (
          <line
            key={p.name ?? i}
            x1={p.x - 2}
            x2={p.x + 2}
            y1={p.y}
            y2={p.y}
            stroke={i === active ? 'var(--color-fg)' : 'var(--color-fg-subtle)'}
            strokeWidth="1"
          />
        ))}
      </svg>

      <motion.span
        className="absolute top-0 left-0 size-1.5 bg-fg"
        style={{ x: markerX, y: markerY }}
      />

      {geo.labels.map((l, i) => (
        <span
          key={geo.pts[i].name ?? i}
          className={`absolute font-mono text-[10px] whitespace-nowrap transition-colors duration-300 ${
            i === active ? 'text-fg' : 'text-fg-subtle'
          }`}
          style={{ left: LABEL_X, top: l.top, lineHeight: `${LINE_H}px` }}
        >
          {l.lines.map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </span>
      ))}

      <span
        className="absolute bottom-4 font-mono text-[10px] text-fg-subtle"
        style={{ left: LINE_X0, width: STRIP_W - LINE_X0 - 4, lineHeight: `${LINE_H}px` }}
      >
        {CAPTION}
      </span>
    </div>
  );
}

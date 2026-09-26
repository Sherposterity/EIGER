import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';

// Monochrome WebGL globe (cobe 2, about 5 KB, no three.js). Dots are the
// site's markers: the most requested peaks plus the one the visitor is
// looking at. It turns slowly on its own, stops while dragged, and eases to
// a peak when `focus` changes. The glow colour is the page background, so
// there is no halo (design record: no glows, no gradients).
//
// cobe 2 facts that shape this file (checked in node_modules, 2026-09-26):
// createGlobe(canvas, opts) returns { update, destroy }; update() draws one
// frame synchronously, there is no render callback and no internal loop, so
// we own a single requestAnimationFrame loop. The constructor multiplies
// width/height by devicePixelRatio itself, so it gets CSS pixels. When no
// WebGL context exists it returns no-op methods without throwing, so support
// is probed on a scratch canvas first, the render canvas is checked again
// after creation, and context loss switches to the text fallback.
//
// The loop runs only while something moves (idle rotation, easing to a peak,
// drag momentum) and the globe is on screen in a visible tab. Reduced motion
// (live, via matchMedia): no idle rotation, no momentum, the camera jumps.
// Time based, so a 120 Hz screen does not spin twice as fast.
//
// cobe angles: phi turns the globe around its axis, theta tilts it. A place
// maps to [phi, theta] with the formula from the cobe examples, so the chosen
// peak faces the camera. Markers take [latitude, longitude].
const anglesFor = (lat, lon) => [Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const IDLE_SPEED = 0.22; // radians per second, about 30 s per turn
const HOME_THETA = 0.28;

const webglAvailable = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

const validPoint = (m) => Number.isFinite(m.lat) && Number.isFinite(m.lon) && m.lat >= -90 && m.lat <= 90 && m.lon >= -180 && m.lon <= 180;
const toMarkers = (markers) =>
  markers.filter(validPoint).map((m) => ({ location: [m.lat, m.lon], size: m.size ?? 0.04, ...(m.color ? { color: m.color } : {}) }));

// cobe's own lat/lon to unit vector and marker projection (mirrors U() and
// O() in cobe/dist/index.esm.js), so a tap can find the dot under it: the
// canvas is square with scale 1 and no offset, which reduces the projection
// to x = (cx + 1) / 2, y = (1 - sy) / 2 in canvas fractions; a point is
// hidden when it faces away or lies outside the sphere disc.
const toVector = (lat, lon) => {
  const r = (lat * Math.PI) / 180;
  const a = (lon * Math.PI) / 180 - Math.PI;
  const o = Math.cos(r);
  return [-o * Math.cos(a), Math.sin(r), o * Math.sin(a)];
};
const project = (v, phi, theta) => {
  const r = Math.cos(theta);
  const a = Math.cos(phi);
  const o = Math.sin(theta);
  const i = Math.sin(phi);
  const cx = a * v[0] + i * v[2];
  const sy = i * o * v[0] + r * v[1] - a * o * v[2];
  const hidden = -i * r * v[0] + o * v[1] + a * r * v[2] >= 0 || cx * cx + sy * sy >= 0.64;
  return [(cx + 1) / 2, (1 - sy) / 2, hidden];
};
const PICK_RADIUS_PX = 16;

const Fallback = ({ className }) => (
  <div className={`relative aspect-square w-full ${className}`}>
    <div className="flex h-full w-full items-center justify-center rounded-full border border-line bg-surface-1 p-8 text-center">
      <p className="font-mono text-small text-fg-subtle">Your browser cannot draw the globe. The search and the list still work.</p>
    </div>
  </div>
);

// pickable: markers a tap can select (the app's mountains); onPick(marker)
// fires with the nearest visible one within a few pixels.
export default function Globe({ markers = [], pickable = [], onPick = null, focus = null, className = '' }) {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  // Props reach the loop through refs, written in an effect (never during
  // render). markers carries a version so the loop re-uploads marker data
  // only when the set changes, not on every camera frame.
  const markersRef = useRef({ list: [], version: 0 });
  const pickRef = useRef({ list: [], onPick: null });
  const focusRef = useRef({ value: null, version: 0 });
  const kickRef = useRef(null);
  const [supported] = useState(webglAvailable);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const holder = holderRef.current;
    const canvas = canvasRef.current;
    if (!supported || lost || !holder || !canvas) return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduce = motionQuery.matches;
    const s = {
      phi: 0,
      theta: HOME_THETA,
      targetPhi: null,
      targetTheta: HOME_THETA,
      velocity: 0,
      seenFocus: -1,
      seenMarkers: -1,
      dragging: false,
      pointerX: 0,
      onScreen: true,
      idle: true,
    };
    let globe = null;
    let size = 0;
    let raf = 0;
    let last = 0;
    let disposed = false;

    const build = () => {
      const w = Math.round(holder.clientWidth);
      if (!w || w === size) return;
      size = w;
      if (globe) globe.destroy();
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(2, window.devicePixelRatio || 1),
        width: w,
        height: w,
        phi: s.phi,
        theta: s.theta,
        dark: 1,
        diffuse: 1.1,
        mapSamples: 18000,
        mapBrightness: 5,
        baseColor: [0.3, 0.3, 0.3],
        markerColor: [1, 1, 1],
        glowColor: [0.04, 0.04, 0.04],
        scale: 1,
        markers: toMarkers(markersRef.current.list),
      });
      s.seenMarkers = markersRef.current.version;
      // cobe returns no-op methods when the render canvas has no context.
      if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) {
        setLost(true);
        return;
      }
      canvas.style.opacity = '1';
    };

    const moving = () => s.targetPhi !== null || s.velocity !== 0 || s.dragging || (s.idle && !reduce);

    const frame = (now) => {
      raf = 0;
      if (!globe || disposed) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;

      if (s.seenFocus !== focusRef.current.version) {
        s.seenFocus = focusRef.current.version;
        const f = focusRef.current.value;
        if (f) {
          [s.targetPhi, s.targetTheta] = anglesFor(f.lat, f.lon);
        } else {
          // Reset view: ease the tilt home from wherever we are, then idle.
          s.targetPhi = s.phi;
          s.targetTheta = HOME_THETA;
        }
        s.idle = !f;
        s.velocity = 0;
      }

      if (s.dragging) {
        // handled in pointermove; nothing extra per frame
      } else if (s.targetPhi !== null) {
        const dp = wrap(s.targetPhi - s.phi);
        const dtheta = s.targetTheta - s.theta;
        if (reduce || (Math.abs(dp) < 0.0015 && Math.abs(dtheta) < 0.0015)) {
          s.phi = s.targetPhi;
          s.theta = s.targetTheta;
          s.targetPhi = null;
        } else {
          const k = 1 - Math.exp(-dt * 6);
          s.phi += dp * k;
          s.theta += dtheta * k;
        }
      } else if (s.velocity !== 0 && !reduce) {
        s.phi += s.velocity * dt;
        s.velocity *= Math.exp(-dt * 4);
        if (Math.abs(s.velocity) < 0.01) s.velocity = 0;
      } else if (s.idle && !reduce) {
        s.phi += IDLE_SPEED * dt;
      }
      if (reduce) s.velocity = 0;

      const state = { phi: s.phi, theta: s.theta };
      if (s.seenMarkers !== markersRef.current.version) {
        s.seenMarkers = markersRef.current.version;
        state.markers = toMarkers(markersRef.current.list);
      }
      globe.update(state);
      if (moving() && s.onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf || !globe || disposed || !s.onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    const onMotionChange = (e) => {
      reduce = e.matches;
      if (reduce) s.velocity = 0;
      kick();
    };
    motionQuery.addEventListener?.('change', onMotionChange);

    // Drag to turn: horizontal only, vertical scrolling stays with the page
    // (touch-action pan-y on the canvas). Pointer capture keeps the drag alive
    // when the pointer leaves the canvas.
    // Nearest pickable dot under a canvas point, or null.
    const dotAt = (clientX, clientY) => {
      const { list } = pickRef.current;
      if (!list.length || !size) return null;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      let best = null;
      let bestD = PICK_RADIUS_PX * PICK_RADIUS_PX;
      for (const m of list) {
        if (!validPoint(m)) continue;
        const v = m._v ?? (m._v = toVector(m.lat, m.lon));
        const [fx, fy, hidden] = project(v, s.phi, s.theta);
        if (hidden) continue;
        const dx = fx * rect.width - px;
        const dy = fy * rect.height - py;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = m;
        }
      }
      return best;
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      s.dragging = true;
      s.moved = 0;
      s.downX = e.clientX;
      s.downY = e.clientY;
      s.pointerX = e.clientX;
      s.velocity = 0;
      s.targetPhi = null;
      s.idle = false;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture?.(e.pointerId);
      kick();
    };
    const onPointerMove = (e) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.pointerX;
      s.pointerX = e.clientX;
      s.moved = Math.max(s.moved, Math.abs(e.clientX - s.downX), Math.abs(e.clientY - s.downY));
      const delta = dx * 0.006;
      s.phi += delta;
      s.velocity = reduce ? 0 : delta * 40;
      kick();
    };
    const onPointerUp = (e) => {
      if (!s.dragging) return;
      s.dragging = false;
      canvas.style.cursor = 'grab';
      canvas.releasePointerCapture?.(e.pointerId);
      // A tap (no real movement) on a dot selects it; a drag never does.
      if (s.moved < 6 && pickRef.current.onPick) {
        const hit = dotAt(e.clientX, e.clientY);
        if (hit) pickRef.current.onPick(hit);
      }
      kick();
    };
    const onHover = (e) => {
      if (s.dragging || !pickRef.current.onPick) return;
      canvas.style.cursor = dotAt(e.clientX, e.clientY) ? 'pointer' : 'grab';
    };
    canvas.addEventListener('pointermove', onHover);
    const onContextLost = (e) => {
      e.preventDefault();
      setLost(true);
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('webglcontextlost', onContextLost);

    const onVisibility = () => kick();
    document.addEventListener('visibilitychange', onVisibility);

    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            s.onScreen = entries.some((en) => en.isIntersecting);
            kick();
          });
    io?.observe(holder);

    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            build();
            kick();
          });
    ro?.observe(holder);

    build();
    kick();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      kickRef.current = null;
      motionQuery.removeEventListener?.('change', onMotionChange);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointermove', onHover);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      ro?.disconnect();
      if (globe) globe.destroy();
      globe = null;
    };
  }, [supported, lost]);

  // Deliver props to the loop and wake it: a new focus or marker set needs a
  // frame even when the loop is parked (reduced motion, idle after a drag).
  // Starting the loop is not a state update, so render stays pure.
  useEffect(() => {
    pickRef.current = { list: pickable, onPick };
  }, [pickable, onPick]);

  useEffect(() => {
    if (markersRef.current.list !== markers) {
      markersRef.current = { list: markers, version: markersRef.current.version + 1 };
    }
    if (focusRef.current.value !== focus) {
      focusRef.current = { value: focus, version: focusRef.current.version + 1 };
    }
    kickRef.current?.();
  }, [focus, markers]);

  if (!supported || lost) return <Fallback className={className} />;

  return (
    <div ref={holderRef} className={`relative aspect-square w-full ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="h-full w-full cursor-grab opacity-0 transition-opacity duration-slow [contain:layout_paint_size]"
        style={{ touchAction: 'pan-y' }}
      />
    </div>
  );
}

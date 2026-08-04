import { useEffect } from 'react';

// Mouse parallax that never re-renders React. The old pattern stored the mouse
// position in state, so every pointer event re-rendered the whole background
// tree (60-120x/sec) and fought the CSS transition-transform on each layer.
// This drives all layers from one requestAnimationFrame loop that eases toward
// the pointer and writes transforms straight to the DOM nodes.
//
// `layers` is [{ ref, fx, fy }] — fx/fy are px of travel per full-viewport
// mouse offset (same numbers the inline styles used before). Pass a stable
// array (useMemo(() => [...], [])) so the effect binds once.
//
// No-ops on touch devices (no mouse to follow) and for reduced-motion users.
export default function useMouseParallax(layers) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return undefined;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let raf = 0;

    const step = () => {
      raf = 0;
      pos.x += (target.x - pos.x) * 0.1;
      pos.y += (target.y - pos.y) * 0.1;
      layers.forEach(({ ref, fx = 0, fy = 0 }) => {
        const el = ref.current;
        if (el) el.style.transform = `translate3d(${pos.x * fx}px, ${pos.y * fy}px, 0)`;
      });
      if (Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.0005) {
        raf = requestAnimationFrame(step);
      }
    };

    const onMove = (e) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(step);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [layers]);
}

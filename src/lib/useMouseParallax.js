import { useEffect } from 'react';

// Background parallax that never re-renders React. One requestAnimationFrame
// loop eases toward the pointer and the scroll position and writes a single
// combined transform straight to each DOM node, so mouse and scroll motion
// compose instead of fighting over element.style.transform.
//
// `layers` is [{ ref, fx, fy, sy, sway, swayPeriod }]:
//   fx / fy     px of travel per full-viewport mouse offset (mouse parallax)
//   sy          px of vertical travel per px scrolled (linear scroll parallax)
//   sway        horizontal sway amplitude in px. The layer glides left/right
//               along a sine wave of scrollY, so it oscillates instead of
//               running off-screen. Negative flips the phase, which lets
//               layers cross past each other for depth.
//   swayPeriod  px of scroll for one full left-right-left cycle (default 1600)
// Omit any of them for layers that should ignore that motion.
// Pass a stable array (useMemo(() => [...], [])) so the effect binds once.
//
// Mouse tracking only binds on fine-pointer devices; scroll tracking works
// everywhere. Both are skipped for reduced-motion users.
export default function useMouseParallax(layers) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;
    const fine = window.matchMedia('(pointer: fine)').matches;

    const target = { x: 0, y: 0, s: 0 };
    const pos = { x: 0, y: 0, s: 0 };
    let raf = 0;

    const settled = () =>
      Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) < 0.0005 &&
      Math.abs(target.s - pos.s) < 0.25;

    const step = () => {
      raf = 0;
      pos.x += (target.x - pos.x) * 0.1;
      pos.y += (target.y - pos.y) * 0.1;
      pos.s += (target.s - pos.s) * 0.14;
      layers.forEach(({ ref, fx = 0, fy = 0, sy = 0, sway = 0, swayPeriod = 1600 }) => {
        const el = ref.current;
        if (el) {
          const swayX = sway ? Math.sin((pos.s / swayPeriod) * Math.PI * 2) * sway : 0;
          el.style.transform = `translate3d(${pos.x * fx + swayX}px, ${pos.y * fy + pos.s * sy}px, 0)`;
        }
      });
      if (!settled()) raf = requestAnimationFrame(step);
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };

    const onMove = (e) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
      kick();
    };

    const onScroll = () => {
      target.s = window.scrollY;
      kick();
    };

    if (fine) window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    // Pick up the initial scroll position (e.g. a reload mid-page) without a jump.
    pos.s = target.s = window.scrollY;
    kick();

    return () => {
      if (fine) window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [layers]);
}

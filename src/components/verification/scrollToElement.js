// Frame-driven page scroll to an element. `scrollIntoView({ behavior: 'smooth' })`
// stopped short on desktop on the Verification page: the step tracker re-renders
// the pipeline panel while the page glides, and the native smooth scroll is
// dropped or lands on a stale target. Driving the scroll ourselves and
// re-measuring the target every frame survives both. Reduced motion jumps.

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function scrollToElement(el, { offset = 0, duration = 700 } = {}) {
  if (!el) return;
  const targetTop = () => window.scrollY + el.getBoundingClientRect().top - offset;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || duration <= 0) {
    window.scrollTo(0, Math.max(0, targetTop()));
    return;
  }
  const startY = window.scrollY;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const end = Math.max(0, targetTop());
    window.scrollTo(0, startY + (end - startY) * easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

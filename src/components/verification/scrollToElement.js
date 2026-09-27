// Frame-driven page scroll to an element, used by the Verification page's
// apply cue and the ?section=apply arrival.
//
// Why not scrollIntoView / scrollTo({ behavior: 'smooth' }): src/index.css sets
// `html { scroll-behavior: smooth }`, so every scroll write on the page,
// including the numeric scrollTo(0, y) overload, starts a native glide that
// follows the root CSS. A frame loop built on those writes keeps restarting
// the native animation and never settles (Codex review 2026-09-27). Each frame
// here writes with behavior 'instant', re-measures the target (the step tracker
// re-renders the pipeline panel mid-scroll), honours the element's
// scroll-margin-top, clamps to the page, and cancels on user input, route exit
// (the returned function) or a detached target. A new request supersedes the
// previous one. Reduced motion jumps.

let cancelActive = null;

const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const INPUT_EVENTS = ['wheel', 'touchstart', 'pointerdown'];
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape', 'Tab'];

export function scrollToElement(el, { offset, duration = 700, onComplete } = {}) {
  cancelActive?.();
  if (!el?.isConnected) return () => {};

  let frame = 0;
  let stopped = false;

  const cancel = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    INPUT_EVENTS.forEach((name) => window.removeEventListener(name, cancel));
    window.removeEventListener('keydown', onKey);
    if (cancelActive === cancel) cancelActive = null;
  };
  const onKey = (e) => {
    if (SCROLL_KEYS.includes(e.key)) cancel();
  };
  cancelActive = cancel;

  const targetTop = () => {
    const margin = offset ?? (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.min(max, Math.max(0, window.scrollY + el.getBoundingClientRect().top - margin));
  };
  const jump = (top) => window.scrollTo({ top, left: window.scrollX, behavior: 'instant' });
  const finish = () => {
    cancel();
    onComplete?.();
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || duration <= 0) {
    jump(targetTop());
    finish();
    return cancel;
  }

  const startY = window.scrollY;
  const start = performance.now();
  const step = (now) => {
    if (stopped) return;
    if (!el.isConnected) {
      cancel();
      return;
    }
    const t = Math.max(0, Math.min(1, (now - start) / duration));
    jump(startY + (targetTop() - startY) * ease(t));
    if (t < 1) frame = requestAnimationFrame(step);
    else finish();
  };
  INPUT_EVENTS.forEach((name) => window.addEventListener(name, cancel, { passive: true }));
  window.addEventListener('keydown', onKey);
  frame = requestAnimationFrame(step);
  return cancel;
}

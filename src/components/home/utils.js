// Plain helpers shared by the home page sections (kept out of the .jsx files
// so fast refresh sees components only).

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1];

// Keyboard focus ring used by every link and button on the page.
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll to an in-page section. Returns false when the section is not on this
// page, so the caller can navigate to /?section=id instead.
export function scrollToSection(id) {
  const node = document.getElementById(id);
  if (!node) return false;
  node.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  return true;
}

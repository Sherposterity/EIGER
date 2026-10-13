import { inConfettiWindow, isPreview } from '../../lib/launchDay';

// One small confetti burst from both ends of the launch banner once per visit
// during the iOS launch window (src/lib/launchDay.js). A visit is a browser tab
// session (sessionStorage): a reload does not fire it again, a new tab or a
// later visit does (Muad 2026-10-13; it was once per browser before). The
// library loads only when it is about to fire, so it stays out of the main
// bundle. Skipped with reduced motion. White and greys with a few green flecks,
// the site's own palette.

const SEEN_KEY = 'eiger_launch_confetti_seen_session';

const seen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // storage blocked: never risk firing on every page view
  }
};

const markSeen = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* blocked: seen() already reports true */
  }
};

export const shouldFireLaunchConfetti = ({ now = Date.now(), search = '', reduceMotion = false } = {}) => {
  if (reduceMotion || !inConfettiWindow({ now, search })) return false;
  return isPreview(search) || !seen();
};

export async function fireLaunchConfetti(leftEl, stripEl) {
  markSeen();
  const { default: confetti } = await import('canvas-confetti');
  const w = window.innerWidth;
  const h = window.innerHeight;
  const l = leftEl?.getBoundingClientRect();
  const strip = stripEl?.getBoundingClientRect();
  const y = l ? (l.top + l.height / 2) / h : 0.15;
  // Two mirrored streams: from the rocket on the left, and from the strip's
  // right edge (Muad 2026-10-11), each angled down and in toward the page.
  const left = { x: l ? (l.left + l.width / 2) / w : 0.05, y };
  const right = { x: strip ? (strip.right - 24) / w : 0.95, y };
  const base = { spread: 70, startVelocity: 34, gravity: 0.9, decay: 0.92, ticks: 150, scalar: 0.7, drift: 0, disableForReducedMotion: true, zIndex: 60 };
  for (const [origin, angle, drift] of [[left, 300, 0.4], [right, 240, -0.4]]) {
    confetti({ ...base, origin, angle, drift, particleCount: 75, colors: ['#FAFAFA', '#D4D4D4', '#8A8A8A'] });
    confetti({ ...base, origin, angle, drift, particleCount: 16, colors: ['#00BC7D'] }); // --color-live (emerald 500)
  }
}

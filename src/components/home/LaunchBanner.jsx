import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Rocket, X } from 'lucide-react';
import { LAUNCH_AT } from '../../lib/giveawayWindow';
import { EASE_OUT_EXPO, focusRing } from './utils';

// Launch strip on the home page, just under the fixed nav and over the top of
// the hero. Muad pressed launch on the Kickstarter on 2026-09-30 (a day
// early), so the strip now announces the live campaign for launch week and
// leaves at BANNER_UNTIL. Dismissal lasts for the browser session. No dashes.

const DISMISS_KEY = 'eiger_launch_banner_dismissed';
const LAUNCH_MS = Date.parse(LAUNCH_AT);
// One week of launch strip after the planned launch instant (2026-10-08 16:00 UTC).
const BANNER_UNTIL = LAUNCH_MS + 7 * 86400000;

const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

// The hero reads --launch-banner-h to push its content below the strip.
const setBannerHeight = (px) => document.documentElement.style.setProperty('--launch-banner-h', `${px}px`);

const linkClass = `rounded-sm text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`;

const LaunchBanner = () => {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(readDismissed);
  const ref = useRef(null);
  const visible = !dismissed && now < BANNER_UNTIL;

  // Re-check once a minute so the strip leaves on time.
  useEffect(() => {
    if (!visible) return undefined;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [visible]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!visible || !node) {
      setBannerHeight(0);
      return undefined;
    }
    const observer = new ResizeObserver(() => setBannerHeight(node.offsetHeight));
    observer.observe(node);
    setBannerHeight(node.offsetHeight);
    return () => {
      observer.disconnect();
      setBannerHeight(0);
    };
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode: dismissed for this page view only */
    }
    setDismissed(true);
  };

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: EASE_OUT_EXPO },
      };

  return (
    <motion.aside
      ref={ref}
      aria-label="Launch announcement"
      // Sits right under the fixed header: 77 px tall on phones (44 px menu button), 73 px from lg (both include its 1 px border).
      // z-45: above the z-40 AscentLine strip, below the z-50 header.
      className="absolute inset-x-0 top-[77px] z-[45] border-y border-line bg-surface-2 lg:top-[73px]"
      {...motionProps}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 sm:items-center sm:px-6 lg:px-8">
        <Rocket aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-muted sm:mt-0" strokeWidth={1.75} />
        <p className="min-w-0 flex-1 font-mono text-xs leading-relaxed text-fg-muted sm:text-small">
          <span className="text-fg">The app is out on Android and our Kickstarter is live.</span>{' '}
          {/* No left margin on phones: the links wrap to their own line there. */}
          {/* Kickstarter + mountain requests (founder 2026-09-26): no giveaway
              link here, it read as though it opened with the campaign. */}
          <span className="inline-flex flex-wrap gap-x-3 gap-y-1 sm:ml-2">
            <Link to="/kickstarter" className={`${linkClass} whitespace-nowrap`}>
              Kickstarter
            </Link>
            <Link to="/request" className={`${linkClass} whitespace-nowrap`}>
              Request a mountain
            </Link>
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className={`-my-1 -mr-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:text-fg ${focusRing}`}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </motion.aside>
  );
};

export default LaunchBanner;

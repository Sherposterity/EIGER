import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Rocket, X } from 'lucide-react';
import storeLinks from '../../data/store-links.json';
import { campaignPhase, fetchKickstarterStats, LAUNCH_AT, pledgeLine } from '../../lib/kickstarterStats';
import { EASE_OUT_EXPO, focusRing } from './utils';

// Store strip on the home page, just under the fixed nav and over the top of
// the hero (Rishav 2026-10-09: bring the banner back, it carried Request a
// mountain). EIGER is on both stores; while the Kickstarter campaign is live
// (the kickstarter_stats feed, same as the Kickstarter page) it says so with
// the running total and links straight to it; once the campaign is funded or
// over, the strip keeps the store line and Request a mountain only. No end
// date (the launch-week cutoff of 2026-09-30 is gone). Dismissal lasts for the
// browser session, keyed per state, so a dismissed strip returns only when its
// message changes. No dashes.

const KICKSTARTER_URL = storeLinks.kickstarter;

const dismissKey = (phase) => `eiger_store_banner_dismissed_${phase}`;
const readDismissed = (phase) => {
  try {
    return sessionStorage.getItem(dismissKey(phase)) === '1';
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
  const [feed, setFeed] = useState(null);
  const [feedDone, setFeedDone] = useState(false);
  const phase = campaignPhase({ state: feed?.state ?? null, now });
  const [dismissed, setDismissed] = useState({});
  const ref = useRef(null);
  // Wait for the feed before showing anything, so the Kickstarter line never
  // flashes in and out (if the feed fails, the launch date decides).
  const showable = feedDone || now >= LAUNCH_AT;
  const visible = showable && !(dismissed[phase] ?? readDismissed(phase));

  // The campaign's state and totals, from the same cache as the Kickstarter page.
  useEffect(() => {
    const ctrl = new AbortController();
    fetchKickstarterStats({ url: import.meta.env.VITE_SUPABASE_URL, key: import.meta.env.VITE_SUPABASE_ANON_KEY, signal: ctrl.signal })
      .then((row) => row && setFeed(row))
      .catch(() => {})
      .finally(() => !ctrl.signal.aborted && setFeedDone(true));
    return () => ctrl.abort();
  }, []);

  // Re-check once a minute until the launch instant has passed.
  useEffect(() => {
    if (now >= LAUNCH_AT) return undefined;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [now]);

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
      sessionStorage.setItem(dismissKey(phase), '1');
    } catch {
      /* private mode: dismissed for this page view only */
    }
    setDismissed((d) => ({ ...d, [phase]: true }));
  };

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: EASE_OUT_EXPO },
      };

  const live = phase === 'live';
  const total = live ? pledgeLine(Number(feed?.pledged_usd), Number(feed?.goal_usd) || storeLinks.kickstarter_goal_usd) : null;

  return (
    <motion.aside
      ref={ref}
      aria-label="EIGER announcement"
      // Sits right under the fixed header: 77 px tall on phones (44 px menu button), 73 px from lg (both include its 1 px border).
      // z-45: above the z-40 AscentLine strip, below the z-50 header.
      className="absolute inset-x-0 top-[77px] z-[45] border-y border-line bg-surface-2 lg:top-[73px]"
      {...motionProps}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 sm:items-center sm:px-6 lg:px-8">
        <Rocket aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-muted sm:mt-0" strokeWidth={1.75} />
        <p className="min-w-0 flex-1 font-mono text-xs leading-relaxed text-fg-muted sm:text-small">
          <span className="text-fg">
            {live ? 'EIGER is now on iPhone and Android, and our Kickstarter is live.' : 'EIGER is now on iPhone and Android.'}
          </span>{' '}
          {total ? <span className="whitespace-nowrap tabular-nums">{total}</span> : null}{' '}
          {/* No left margin on phones: the links wrap to their own line there. */}
          {/* Kickstarter + mountain requests (founder 2026-09-26): no giveaway
              link here, it read as though it opened with the campaign. */}
          <span className="inline-flex flex-wrap gap-x-3 gap-y-1 sm:ml-2">
            {live && KICKSTARTER_URL ? (
              <a href={KICKSTARTER_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1 whitespace-nowrap`}>
                Back us on Kickstarter
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            ) : null}
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

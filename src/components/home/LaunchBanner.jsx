import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Calendar, Rocket, X } from 'lucide-react';
import storeLinks from '../../data/store-links.json';
import { LAUNCH_AT as GIVEAWAY_LAUNCH_AT } from '../../lib/giveawayWindow';
import { campaignPhase, fetchKickstarterStats, LAUNCH_AT, pledgeLine } from '../../lib/kickstarterStats';
import { EASE_OUT_EXPO, focusRing } from './utils';

// Launch strip on the home page, just under the fixed nav and over the top of
// the hero. It follows the Kickstarter campaign's own state (the kickstarter_stats
// feed, same as the Kickstarter page): before launch it counts down, while the
// campaign is live it says so and links straight to it (with the running total
// once pledges arrive), and once the campaign is funded or over it renders
// nothing. It also leaves at the end of launch week (BANNER_UNTIL, Rishav's
// seat, 2026-09-30) whatever the feed says. Dismissal lasts for the browser
// session and is per stage, so people who closed the countdown still see the
// launch once. No dashes; keep the Request a mountain link.

const DAY_MS = 86400000;
// One week of launch strip after the planned launch instant (2026-10-08 16:00 UTC).
const BANNER_UNTIL = Date.parse(GIVEAWAY_LAUNCH_AT) + 7 * DAY_MS;
const KICKSTARTER_URL = storeLinks.kickstarter;

const dismissKey = (phase) => `eiger_launch_banner_dismissed_${phase}`;
const readDismissed = (phase) => {
  try {
    return sessionStorage.getItem(dismissKey(phase)) === '1';
  } catch {
    return false;
  }
};

// Whole calendar days between today and launch day, in the visitor's own time zone.
const countdownLabel = (now) => {
  const startOfDay = (ms) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const days = Math.round((startOfDay(LAUNCH_AT) - startOfDay(now)) / DAY_MS);
  if (days <= 0) return 'today';
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
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
  // Wait for the feed before showing anything, so a live campaign never flashes the old countdown
  // (if the feed fails, the launch date decides).
  const showable = now < BANNER_UNTIL && (feedDone || now >= LAUNCH_AT) && (phase === 'prelaunch' || phase === 'live');
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

  // Re-check once a minute so the strip switches at the launch instant and leaves on time.
  useEffect(() => {
    if (!showable) return undefined;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [showable]);

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
  const Icon = live ? Rocket : Calendar;

  return (
    <motion.aside
      ref={ref}
      aria-label={live ? 'Kickstarter announcement' : 'Launch announcement'}
      // Sits right under the fixed header: 77 px tall on phones (44 px menu button), 73 px from lg (both include its 1 px border).
      // z-45: above the z-40 AscentLine strip, below the z-50 header.
      className="absolute inset-x-0 top-[77px] z-[45] border-y border-line bg-surface-2 lg:top-[73px]"
      {...motionProps}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 sm:items-center sm:px-6 lg:px-8">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-muted sm:mt-0" strokeWidth={1.75} />
        <p className="min-w-0 flex-1 font-mono text-xs leading-relaxed text-fg-muted sm:text-small">
          {live ? (
            <>
              <span className="text-fg">The app is out on Android, and our Kickstarter is live.</span>{' '}
              {total ? <span className="whitespace-nowrap tabular-nums">{total}</span> : null}{' '}
            </>
          ) : (
            <>
              <span className="text-fg">The app is out on Android. October 1: our Kickstarter goes live.</span>{' '}
              <span className="whitespace-nowrap tabular-nums">{countdownLabel(now)}</span>{' '}
            </>
          )}
          {/* No left margin on phones: the links wrap to their own line there. */}
          {/* Kickstarter + mountain requests (founder 2026-09-26): no giveaway
              link here, it read as though it opened with the campaign. */}
          <span className="inline-flex flex-wrap gap-x-3 gap-y-1 sm:ml-2">
            {live && KICKSTARTER_URL ? (
              <a href={KICKSTARTER_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1 whitespace-nowrap`}>
                Back us on Kickstarter
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            ) : (
              <Link to="/kickstarter" className={`${linkClass} whitespace-nowrap`}>
                Kickstarter
              </Link>
            )}
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

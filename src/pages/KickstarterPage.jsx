import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import GetTheApp from '../components/home/GetTheApp';
import EmailCapture from '../components/home/EmailCapture';
// Read from the data file, not lib/giveaway.js, so this page does not pull in
// the Supabase client. giveaway.js reads the same file.
import storeLinks from '../data/store-links.json';
import { fetchKickstarterStats, mergeStats } from '../lib/kickstarterStats';
import { scrollToSection } from '../components/home/utils';

// Kickstarter (/kickstarter). Copy and tiers are the founder's (docs/COPY.md). The
// campaign goes live with the app and the giveaway on October 1; until
// store-links.json has a "kickstarter" URL the button stays disabled.

const KICKSTARTER_URL = storeLinks.kickstarter;
const HERO_STILL = '/images/about-alpine.jpg';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const eyebrow = 'font-mono text-eyebrow font-semibold uppercase text-fg-subtle';

const primaryBtn = `inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-fg px-7 text-body font-semibold text-bg transition-opacity duration-300 ${focusRing}`;

const FALLBACK = { goal: storeLinks.kickstarter_goal_usd, pledged: storeLinks.kickstarter_pledged_usd };
const usd = (n) => `$${n.toLocaleString('en-US')}`;

// Reward tiers (founder copy, 2026-09-25). "starting at" prices in USD.
// Items always run in the same order: EIGER Pro, stickers, then apparel.
const REWARDS = [
  { name: 'Base Camp Pack', price: 5, items: ['One month of EIGER Pro'] },
  { name: 'Waypoint Pack', price: 15, items: ['One month of EIGER Pro', '4 x EIGER stickers'] },
  { name: 'Ascent Pack', price: 50, items: ['One month of EIGER Pro', '4 x EIGER stickers', 'EIGER t-shirt'] },
  { name: 'Ridgeline Pack', price: 80, items: ['One month of EIGER Pro', '4 x EIGER stickers', 'EIGER sweatshirt'] },
  { name: 'Summit Pack', price: 180, items: ['One month of EIGER Pro', '4 x EIGER stickers', 'EIGER sweatset'] },
];

export default function KickstarterPage() {
  const [stats, setStats] = useState(() => mergeStats(FALLBACK, null));
  const GOAL = stats.goal;
  const PLEDGED = stats.pledged;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Live totals from the cache table; any failure keeps the manual values.
  useEffect(() => {
    const ctrl = new AbortController();
    fetchKickstarterStats({
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_ANON_KEY,
      signal: ctrl.signal,
    })
      .then((row) => {
        if (row) setStats(mergeStats(FALLBACK, row));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />

      <main>
        {/* Statement hero over the alpine still, black scrim for legibility (as on About).
            Fills the screen like Home's hero, content anchored to the bottom. */}
        <section className="relative isolate flex min-h-svh items-end overflow-hidden">
          <img
            src={HERO_STILL}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-black/55" aria-hidden="true" />
          <div
            className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-bg to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 pt-24 pb-8 sm:px-6 md:pb-16 lg:px-8">
            <p className={eyebrow}>Launches October 1</p>
            <h1 className="mt-3 max-w-4xl text-balance text-display-lg sm:mt-4">Kickstarter</h1>
            <div className="mt-5 max-w-2xl space-y-3 text-body text-fg-muted sm:mt-6 sm:space-y-4 sm:text-body-lg">
              <p>
                <strong className="font-semibold text-fg">
                  With app development, marketing, scaling and implementing rigorous safety measures comes a hefty price that three university students don't really have the resources to pay for.
                </strong>{' '}
                All current expenses have come out of pocket for us because we really believe in this app (and more importantly, the mission behind it) but unfortunately, it's unsustainable for us.
              </p>
              <p>
                This is why we're asking for your help. Whether it's one dollar or ten, please give us a hand to make the EIGER experience safer and more enjoyable. This will also help expedite app development and research such that we can put out published versions at a reasonable pace.
              </p>
            </div>

            {/* Goal bar: plain white fill, no colour; pledged is updated by hand until a feed exists. */}
            <div className="mt-5 max-w-2xl sm:mt-6" role="group" aria-labelledby="kickstarter-goal-label">
              <div className="flex items-baseline justify-between font-mono text-small text-fg-subtle">
                <span id="kickstarter-goal-label">Goal {usd(GOAL)}</span>
                <span>
                  {PLEDGED > 0
                    ? `${usd(PLEDGED)} pledged${stats.backers ? ` by ${stats.backers.toLocaleString('en-US')} backers` : ''}`
                    : 'Opens October 1'}
                </span>
              </div>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={GOAL}
                aria-valuenow={Math.min(PLEDGED, GOAL)}
                aria-label="Kickstarter progress"
              >
                <div className="h-full rounded-pill bg-fg" style={{ width: `${Math.min(100, (PLEDGED / GOAL) * 100)}%` }} />
              </div>
            </div>

            {/* Button and scroll cue share a row on phones so the cue shows on the first screen. */}
            <div className="mt-6 flex items-end justify-between gap-4 sm:mt-8">
              <div className="flex flex-col items-start gap-3">
                {KICKSTARTER_URL ? (
                  <a
                    href={KICKSTARTER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${primaryBtn} hover:opacity-85`}
                  >
                    Back us on Kickstarter
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </a>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-disabled="true"
                      aria-describedby="kickstarter-link-note"
                      className={`${primaryBtn} cursor-not-allowed opacity-60`}
                    >
                      Back us on Kickstarter
                    </button>
                    <p id="kickstarter-link-note" className="font-mono text-small text-fg-subtle">
                      Link coming October 1
                    </p>
                  </>
                )}
              </div>

              {/* Scroll cue to the rewards, same as Home's: bobs gently, still under reduced motion. */}
              <a
                href="#rewards"
                onClick={(event) => {
                  if (scrollToSection('rewards')) event.preventDefault();
                }}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-sm text-fg-subtle transition-colors hover:text-fg md:absolute md:right-8 md:bottom-16 md:gap-2 ${focusRing}`}
              >
                <span className="font-mono text-eyebrow uppercase">Explore</span>
                <ArrowDown aria-hidden="true" className="size-4 motion-safe:animate-cue" />
              </a>
            </div>
          </div>
        </section>

        {/* What backing gets you */}
        <section id="rewards" className="scroll-mt-16 border-t border-line py-section-sm" aria-labelledby="kickstarter-rewards">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="kickstarter-rewards" className="text-display-md">
              What backing gets you
            </h2>
            {/* Every card has the same anatomy (tier number, name, price, divider,
                checked list) and the same height per row. On two-column widths the
                fifth card spans the row so it never sits alone at half width. */}
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {REWARDS.map((r, i) => (
                <article
                  key={r.name}
                  className={`flex h-full flex-col rounded-lg border bg-surface-1 p-6 lg:p-5 ${
                    i === REWARDS.length - 1 ? 'border-line-strong sm:col-span-2 lg:col-span-1' : 'border-line'
                  }`}
                >
                  <p className="font-mono text-eyebrow uppercase text-fg-subtle">Tier {String(i + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-heading lg:min-h-[2lh]">{r.name}</h3>
                  <p className="mt-4 font-mono text-eyebrow uppercase text-fg-subtle">Starting at</p>
                  <p className="mt-1 font-display text-4xl leading-none font-bold text-fg">{usd(r.price)}</p>
                  <div className="my-5 h-px bg-line" aria-hidden="true" />
                  <ul className="space-y-3 text-small text-fg-muted">
                    {r.items.map((it) => (
                      <li key={it} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-fg" strokeWidth={2} aria-hidden="true" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <Link
              to="/giveaway"
              className={`group mt-12 inline-flex items-center gap-2 rounded-sm text-body font-medium text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`}
            >
              The launch giveaway opens the same day
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </section>

        <GetTheApp />
        <EmailCapture />
      </main>

      <Footer />
    </div>
  );
}

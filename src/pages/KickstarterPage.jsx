import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import GetTheApp from '../components/home/GetTheApp';
import EmailCapture from '../components/home/EmailCapture';
// Read from the data file, not lib/giveaway.js, so this page does not pull in
// the Supabase client. giveaway.js reads the same file.
import storeLinks from '../data/store-links.json';

// Kickstarter (/kickstarter). Structure only: the copy is pending from the
// founder, so every "[copy pending]" slot is a placeholder to replace. The
// campaign goes live with the app and the giveaway on October 1; until
// store-links.json has a "kickstarter" URL the button stays disabled.

const KICKSTARTER_URL = storeLinks.kickstarter;
const HERO_STILL = '/images/about-alpine.jpg';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const eyebrow = 'font-mono text-eyebrow font-semibold uppercase text-fg-subtle';

const primaryBtn = `inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-fg px-7 text-body font-semibold text-bg transition-opacity duration-300 ${focusRing}`;

// Three reward slots; headings and text arrive with the founder's copy.
const REWARDS = [1, 2, 3];

export default function KickstarterPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />

      <main>
        {/* Statement hero over the alpine still, black scrim for legibility (as on About) */}
        <section className="relative isolate flex min-h-[min(80svh,52rem)] items-end overflow-hidden">
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
          <div className="mx-auto w-full max-w-7xl px-4 pb-section-sm pt-40 sm:px-6 lg:px-8">
            <p className={eyebrow}>Launches October 1</p>
            <h1 className="mt-4 max-w-4xl text-balance text-display-lg">Kickstarter</h1>
            <p className="mt-8 max-w-2xl text-body-lg text-fg-muted">[copy pending]</p>

            <div className="mt-10 flex flex-col items-start gap-3">
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
          </div>
        </section>

        {/* What backing gets you */}
        <section className="border-t border-line py-section-sm" aria-labelledby="kickstarter-rewards">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="kickstarter-rewards" className="text-display-md">
              What backing gets you
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {REWARDS.map((n) => (
                <article key={n} className="flex flex-col rounded-lg border border-line bg-surface-1 p-6">
                  <span className="font-mono text-small text-fg-subtle" aria-hidden="true">
                    {String(n).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 text-heading">[copy pending]</h3>
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

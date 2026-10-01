import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import usePageHead from '../components/usePageHead';
import { focusRing } from '../components/home/utils';
import { STATIC_HEADS } from '../lib/routeHeads';
import plans from '../data/plans.json';
import storeLinks from '../data/store-links.json';

// /compare/alltrails: a fair, factual comparison for people searching for
// AllTrails and mountaineering (Rishav 2026-10-01). Rules: no AllTrails logo,
// no claims we cannot source, describe what each app is built for rather than
// knocking theirs. AllTrails facts come from AllTrails' own help center and
// press page (links in SOURCES); recheck them before every copy change.
// Copy logged in docs/COPY.md, "AllTrails comparison (2026-10-01)".

const inlineLink = `rounded-sm text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`;

const { annual, weekly, trialDays } = plans.prices;

const ROWS = [
  {
    label: 'Built for',
    alltrails: 'Finding and following trails, with reviews and photos from a very large community.',
    eiger: 'Getting ready for one mountain: the right gear, the right conditions and the right day.',
  },
  {
    label: 'Maps and routes',
    alltrails: 'A huge trail library. Offline maps, wrong-turn alerts and 3D previews come with AllTrails Plus.',
    eiger: '90+ peaks with route info, difficulty and elevation profiles, and new peaks added all the time. Offline maps and 3D terrain come with EIGER Pro.',
  },
  {
    label: 'Gear',
    alltrails: 'Not its focus.',
    eiger: "Log the gear you own and see how it scores against that mountain's demands for the season: insulation, membranes, boot and crampon pairing.",
  },
  {
    label: 'Weather and conditions',
    alltrails: 'AllTrails Peak adds Trail Conditions, a forecast that looks at factors such as temperature, precipitation and snow depth.',
    eiger: 'Weather at summit level (temperature, wind, gusts, UV) plus the avalanche outlook, rolled into one word for each day: Window open, Caution or Hold.',
  },
  {
    label: 'Going as a group',
    alltrails: 'Live location sharing with AllTrails Plus.',
    eiger: "Group trips with EIGER Pro: build the team, split the shared gear and see the whole rope team's readiness.",
  },
  {
    label: 'Price',
    alltrails: 'Free to start, with paid Plus and Peak memberships.',
    eiger: `Free to start. EIGER Pro is $${annual} a year with a ${trialDays}-day free trial, or $${weekly} a week.`,
  },
];

const SOURCES = [
  {
    label: 'AllTrails help center: the benefits of AllTrails premium membership',
    href: 'https://support.alltrails.com/hc/en-us/articles/37200882853140-The-benefits-of-AllTrails-premium-membership',
  },
  {
    label: 'AllTrails press: AllTrails expands membership offering with AllTrails Peak',
    href: 'https://www.alltrails.com/press/alltrails-expands-membership-offering-with-alltrails-peak',
  },
];

export default function CompareAllTrailsPage() {
  usePageHead(STATIC_HEADS['/compare/alltrails']);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 pt-32 pb-section-sm sm:px-6 sm:pt-40 lg:px-8">
        <p className="font-mono text-eyebrow font-semibold uppercase text-fg-subtle">Compare</p>
        <h1 className="mt-3 text-balance font-display text-display-md">AllTrails and EIGER for mountaineering</h1>
        <div className="mt-8 space-y-5 text-body text-fg-muted sm:text-body-lg">
          <p>
            AllTrails is great at finding a trail. EIGER is built for the moment after that, when the trail ends on a
            summit and the question becomes: is my gear right, and is this the day?
          </p>
          <p>Plenty of climbers use both. Here is what each one is built for.</p>
        </div>

        {/* Fixed layout fits 360 px; the wrapper scrolls on its own if a row ever outgrows it. */}
        <div className="mt-10 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[320px] table-fixed border-collapse text-left text-small sm:text-body">
            <caption className="sr-only">AllTrails and EIGER, what each app is built for</caption>
            <colgroup>
              <col className="w-[24%] sm:w-1/5" />
              <col className="w-[38%] sm:w-2/5" />
              <col className="w-[38%] sm:w-2/5" />
            </colgroup>
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="px-3 py-3 font-mono text-eyebrow font-semibold uppercase text-fg-subtle sm:px-5">
                  <span className="sr-only">Topic</span>
                </th>
                <th scope="col" className="px-3 py-3 font-mono text-eyebrow font-semibold uppercase text-fg-subtle sm:px-5">
                  AllTrails
                </th>
                <th scope="col" className="px-3 py-3 font-mono text-eyebrow font-semibold uppercase text-fg sm:px-5">
                  EIGER
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-line align-top">
                  <th scope="row" className="px-3 py-4 font-normal break-words text-fg-muted sm:px-5">
                    {row.label}
                  </th>
                  <td className="px-3 py-4 break-words text-fg-muted sm:px-5">{row.alltrails}</td>
                  <td className="px-3 py-4 break-words sm:px-5">{row.eiger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 space-y-5 text-body text-fg-muted sm:text-body-lg">
          <h2 className="font-display text-heading text-fg">When to reach for EIGER</h2>
          <p>
            You have picked a peak, not just a walk. You want to know before you leave home whether your boots take
            crampons, whether your layers are warm enough for the summit, and which morning the wind drops. That is
            the job EIGER does.
          </p>
          <p>
            <a href={storeLinks.android} className={inlineLink} target="_blank" rel="noopener noreferrer">
              Get EIGER on Google Play
            </a>
            {storeLinks.ios ? (
              <>
                {' or '}
                <a href={storeLinks.ios} className={inlineLink} target="_blank" rel="noopener noreferrer">
                  on the App Store
                </a>
              </>
            ) : storeLinks.ios_beta ? (
              <>
                {', or join the '}
                <a href={storeLinks.ios_beta} className={inlineLink} target="_blank" rel="noopener noreferrer">
                  iPhone beta on TestFlight
                </a>
              </>
            ) : null}
            . See{' '}
            <Link to="/pricing" className={inlineLink}>
              what is free and what is Pro
            </Link>
            .
          </p>
        </div>

        <div className="mt-12 space-y-3 text-small text-fg-subtle">
          <p>
            AllTrails details are taken from AllTrails&apos; own published information and were checked on October 1,
            2026. Features and plans can change; see AllTrails for the latest.
          </p>
          <ul className="space-y-1">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} className={inlineLink} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p>
            AllTrails is a trademark of its owner. EIGER is not affiliated with, sponsored by or endorsed by AllTrails.
          </p>
          <p>Eiger LLC. Last updated October 1, 2026.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

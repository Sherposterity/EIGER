import { use, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ExternalLink, Info, ShieldCheck } from 'lucide-react';
import SiteNav from '../../components/SiteNav';
import Footer from '../../components/Footer';
import GetTheApp from '../../components/home/GetTheApp';
import { FadeIn } from '../../components/home/motion';
import { focusRing } from '../../components/home/utils';
import usePageHead from '../../components/usePageHead';
import storeLinks from '../../data/store-links.json';
import {
  DISCLOSURE_LINE,
  LEVEL_LABELS,
  byLevel,
  formatMeters,
  gearForSeason,
  gearItemList,
  hasWinterRows,
  introText,
  mountainDescription,
  mountainPath,
  mountainTitle,
  reviewStatus,
} from '../../lib/mountains';
import { loadMountain } from './data';
import { chip, eyebrow, inlineLink, toggleBtn } from './styles';

// /mountains/:slug: one mountain's public gear list. Everything shown comes
// from src/data/mountains/<slug>.json (scripts/export-mountain-gear.py).
// Honesty rule and strings: docs/COPY.md, "Mountain gear pages (2026-09-30)".

const LEVEL_STYLE = {
  essential: 'bg-fg text-bg',
  recommended: 'border border-line-strong text-fg',
  optional: 'border border-line text-fg-subtle',
};

function Products({ picks }) {
  if (!picks?.length) return null;
  return (
    <ul className="mt-3 space-y-2 border-l border-line pl-4">
      {picks.map((p) => (
        <li key={p.url} className="text-small">
          <a
            href={p.url}
            target="_blank"
            rel="sponsored noopener"
            className={`inline-flex items-start gap-1.5 rounded-sm text-fg-muted transition-colors hover:text-fg ${focusRing}`}
          >
            <span>
              <span className="text-fg">{p.brand}</span> {p.name}
            </span>
            <ExternalLink className="mt-1 size-3 shrink-0" aria-hidden="true" />
            <span className="sr-only">(opens the retailer in a new tab)</span>
          </a>
          {p.fits_count > 1 ? (
            <span className="block text-small text-fg-subtle">
              Also on {p.fits_count - 1} other {p.fits_count - 1 === 1 ? 'mountain' : 'mountains'}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function GearRow({ row, picks }) {
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body font-semibold text-fg">{row.name}</span>
        {/* min_items is not shown: the app's count rules are still under review (2026-09-30). */}
        <span
          className={`rounded-pill px-2.5 py-0.5 font-mono text-eyebrow font-semibold uppercase ${LEVEL_STYLE[row.level] || ''}`}
        >
          {LEVEL_LABELS[row.level] || row.level}
        </span>
        {row.season === 'winter' || row.season === 'summer' ? (
          <span className="rounded-pill bg-surface-3 px-2.5 py-0.5 font-mono text-eyebrow font-semibold uppercase text-fg">
            {row.season === 'winter' ? 'Winter' : 'Summer'}
          </span>
        ) : null}
      </div>
      <Products picks={picks} />
    </li>
  );
}

function NotFoundMountain({ slug }) {
  usePageHead({ title: 'Mountain not found | EIGER', description: 'This mountain is not in EIGER yet.' });
  return (
    <div className="min-h-screen bg-bg text-fg">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pt-40 pb-section-sm sm:px-6">
        <h1 className="font-display text-display-md">That mountain is not in EIGER yet.</h1>
        <p className="mt-5 text-body-lg text-fg-muted">
          We have no gear list for &quot;{slug}&quot;.{' '}
          <Link to="/mountains" className={inlineLink}>
            See every mountain
          </Link>{' '}
          or{' '}
          <Link to="/request" className={inlineLink}>
            request one
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}

function MountainGear({ m }) {
  const [season, setSeason] = useState('summer');
  const winterRows = hasWinterRows(m);
  const status = reviewStatus(m.review?.status, { winterRows });
  const groups = gearForSeason(m.gear, season);

  usePageHead({
    title: mountainTitle(m.name),
    description: mountainDescription(m),
    path: mountainPath(m.slug),
    jsonLd: gearItemList(m, 'summer'),
  });

  const facts = [
    formatMeters(m.altitude_m),
    m.country,
    m.difficulty,
    m.glaciated ? 'Glaciated' : 'No glacier',
    m.technical ? 'Technical' : 'Non-technical',
    m.avalanche_terrain ? 'Avalanche terrain' : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />

      <main>
        <section aria-labelledby="mountain-heading" className="pt-28 pb-section-sm sm:pt-36">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 font-mono text-small text-fg-subtle">
                <li>
                  <Link to="/mountains" className={`rounded-sm hover:text-fg ${focusRing}`}>
                    Mountains
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5" />
                </li>
                <li aria-current="page" className="text-fg-muted">
                  {m.name}
                </li>
              </ol>
            </nav>

            <FadeIn>
              <h1 id="mountain-heading" className="mt-6 max-w-4xl text-balance font-display text-display-lg">
                {m.name} gear list
              </h1>
              <p className="mt-5 max-w-3xl text-body text-fg-muted sm:mt-6 sm:text-body-lg">{introText(m)}</p>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Mountain facts">
                {facts.map((f) => (
                  <li key={f} className={chip}>
                    {f}
                  </li>
                ))}
              </ul>
            </FadeIn>

            <div className="mt-8 flex max-w-3xl items-start gap-3 rounded-lg border border-line bg-surface-1 p-4 sm:p-5">
              {status.reviewed ? (
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-live" aria-hidden="true" />
              ) : (
                <Info className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden="true" />
              )}
              <div className="text-small text-fg-muted">
                <p className="text-fg">
                  {status.label}
                  {status.reviewed && m.review?.reviewed_on ? ` on ${m.review.reviewed_on}.` : ''}
                </p>
                {status.winterNote ? <p className="mt-1">{status.winterNote}</p> : null}
                <p className="mt-1">
                  <Link to="/verification" className={inlineLink}>
                    How we pick gear
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="gear-heading" className="border-t border-line py-section-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={eyebrow}>The list</p>
                <h2 id="gear-heading" className="mt-3 font-display text-display-md">
                  What to bring
                </h2>
              </div>
              <div role="group" aria-label="Season" className="inline-flex self-start rounded-pill border border-line-strong bg-surface-1 p-1">
                {['summer', 'winter'].map((s) => (
                  <button key={s} type="button" aria-pressed={season === s} onClick={() => setSeason(s)} className={toggleBtn(season === s)}>
                    {s === 'summer' ? 'Summer' : 'Winter'}
                  </button>
                ))}
              </div>
            </div>
            <p aria-live="polite" className="mt-4 max-w-3xl text-small text-fg-muted">
              {season === 'summer'
                ? 'Summer view: the year-round list.'
                : winterRows
                  ? `Winter view: the full list plus ${m.counts.winter} winter ${m.counts.winter === 1 ? 'item' : 'items'}, marked Winter.${
                      status.winterNote ? ` ${status.winterNote}` : ''
                    }`
                  : 'Winter view: this list has no winter-only items yet, so it matches summer.'}
            </p>

            <div className="mt-8 grid items-start gap-4 lg:grid-cols-2">
              {groups.map((g) => (
                <article key={g.group} className="rounded-lg border border-line bg-surface-1 p-5 sm:p-6">
                  <h3 className="text-heading">{g.group}</h3>
                  {byLevel(g.items).map((lvl) => (
                    <div key={lvl.level} className="mt-4">
                      <h4 className={eyebrow}>{LEVEL_LABELS[lvl.level]}</h4>
                      <ul className="divide-y divide-line">
                        {lvl.items.map((row) => (
                          <GearRow key={`${row.item_type}|${row.season}`} row={row} picks={m.products?.[row.item_type]} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </article>
              ))}
            </div>

            <p className="mt-6 text-small text-fg-subtle">
              {DISCLOSURE_LINE}{' '}
              <Link to="/disclosure" className={inlineLink}>
                Disclosure
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="score-heading" className="border-t border-line py-section-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-lg border border-fg/40 bg-surface-2 p-6 sm:p-10">
              <h2 id="score-heading" className="max-w-3xl text-balance font-display text-display-md">
                Score your own kit against {m.name}
              </h2>
              <p className="mt-4 max-w-2xl text-body text-fg-muted sm:text-body-lg">
                Add what you own in the EIGER app and see what is covered and what is missing for this mountain, item by
                item.
              </p>
              {storeLinks.ios_beta ? (
                <p className="mt-6 text-body">
                  <a href={storeLinks.ios_beta} target="_blank" rel="noopener noreferrer" className={inlineLink}>
                    iPhone: join the TestFlight beta
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <GetTheApp />
      </main>

      <Footer />
    </div>
  );
}

export default function MountainPage() {
  const { slug } = useParams();
  const m = use(loadMountain(slug));
  if (!m) return <NotFoundMountain slug={slug} />;
  return <MountainGear key={m.slug} m={m} />;
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import SiteNav from '../../components/SiteNav';
import Footer from '../../components/Footer';
import GetTheApp from '../../components/home/GetTheApp';
import { FadeIn } from '../../components/home/motion';
import { focusRing } from '../../components/home/utils';
import usePageHead from '../../components/usePageHead';
import { STATIC_HEADS } from '../../lib/routeHeads';
import {
  countriesOf,
  filterMountains,
  formatMeters,
  mountainPath,
} from '../../lib/mountains';
import { MOUNTAINS } from './data';
import { chip, eyebrow, fieldClass, inlineLink } from './styles';

// /mountains: every mountain in the app, searchable, each card linking to its
// gear list. Static: data from src/data/mountains/index.json (copy in
// docs/COPY.md, "Mountain gear pages").

const COUNTRIES = countriesOf(MOUNTAINS);
const FLAG_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

function Select({ id, label, value, onChange, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={eyebrow}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {children}
      </select>
    </div>
  );
}

function MountainCard({ m }) {
  const c = m.counts;
  return (
    <li>
      <Link
        to={mountainPath(m.slug)}
        className={`group flex h-full flex-col rounded-lg border border-line bg-surface-1 p-5 transition-colors duration-300 hover:border-line-strong hover:bg-surface-2 ${focusRing}`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-heading">{m.name}</h2>
          <ArrowRight
            className="mt-1.5 size-4 shrink-0 text-fg-subtle transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-fg"
            aria-hidden="true"
          />
        </div>
        <p className="mt-1 text-small text-fg-muted">
          {[m.country, formatMeters(m.altitude_m), m.difficulty].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={chip}>{m.glaciated ? 'Glaciated' : 'No glacier'}</span>
          <span className={chip}>{m.technical ? 'Technical' : 'Non-technical'}</span>
        </div>
        <p className="mt-auto pt-5 font-mono text-small text-fg-subtle">
          {c.essential} essential · {c.recommended} recommended · {c.optional} optional
          {c.winter ? ` · ${c.winter} winter` : ''}
        </p>
      </Link>
    </li>
  );
}

export default function MountainsIndexPage() {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [glaciated, setGlaciated] = useState('any');
  const [technical, setTechnical] = useState('any');

  usePageHead(STATIC_HEADS['/mountains']);

  const results = useMemo(
    () => filterMountains(MOUNTAINS, { query, country, glaciated, technical }),
    [query, country, glaciated, technical],
  );
  const filtered = query || country || glaciated !== 'any' || technical !== 'any';
  const reset = () => {
    setQuery('');
    setCountry('');
    setGlaciated('any');
    setTechnical('any');
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />

      <main>
        <section aria-labelledby="mountains-heading" className="pt-32 pb-section-sm sm:pt-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <p className={eyebrow}>Mountains</p>
              <h1 id="mountains-heading" className="mt-3 max-w-4xl text-balance font-display text-display-lg sm:mt-4">
                Gear lists for every mountain in EIGER.
              </h1>
              <p className="mt-5 max-w-2xl text-body text-fg-muted sm:mt-6 sm:text-body-lg">
                {MOUNTAINS.length} mountains, each with what is essential, recommended and optional, in summer and
                winter, plus product picks for every item. Free, here and in the app.{' '}
                <Link to="/verification" className={inlineLink}>
                  How we pick gear
                </Link>
                .
              </p>
            </FadeIn>

            <form
              role="search"
              onSubmit={(e) => e.preventDefault()}
              className="mt-10 grid gap-4 rounded-lg border border-line bg-surface-1 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[2fr_1fr_1fr_1fr]"
            >
              <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                <label htmlFor="mountain-search" className={eyebrow}>
                  Search a mountain
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
                    aria-hidden="true"
                  />
                  <input
                    id="mountain-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Mont Blanc, Rainier, Whitney"
                    autoComplete="off"
                    className={`${fieldClass} pl-9`}
                  />
                </div>
              </div>
              <Select id="mountain-country" label="Country" value={country} onChange={setCountry}>
                <option value="">All countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Select id="mountain-glaciated" label="Glaciated" value={glaciated} onChange={setGlaciated}>
                {FLAG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Select id="mountain-technical" label="Technical" value={technical} onChange={setTechnical}>
                {FLAG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="font-mono text-small text-fg-subtle">
                {results.length === MOUNTAINS.length
                  ? `${MOUNTAINS.length} mountains`
                  : `${results.length} of ${MOUNTAINS.length} mountains`}
              </p>
              {filtered ? (
                <button type="button" onClick={reset} className={`text-small ${inlineLink}`}>
                  Clear filters
                </button>
              ) : null}
            </div>

            {results.length ? (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((m) => (
                  <MountainCard key={m.slug} m={m} />
                ))}
              </ul>
            ) : (
              <p className="mt-8 text-body text-fg-muted">
                No mountain matches. Not in the app yet?{' '}
                <Link to="/request" className={inlineLink}>
                  Request a mountain
                </Link>
                .
              </p>
            )}
          </div>
        </section>

        <GetTheApp />
      </main>

      <Footer />
    </div>
  );
}

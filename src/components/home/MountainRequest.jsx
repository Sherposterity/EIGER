import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FadeIn } from './motion';
import { focusRing } from './utils';
import { formatElevation, loadChunk, queryKey, searchPeaks } from '../../lib/peaks';
import { backend, requestedIds } from '../../lib/mountainRequests';
import appMountains from '../../data/app-mountains.json';

// "Which mountain next?" Visitors search any named peak on Earth, see it on
// a monochrome globe, and ask for it to be added to the app. The most
// requested peaks go to the front of the verification queue. Lives on the
// home page and, standalone, at /request.
//
// Bundle: the globe (WebGL) loads when the section scrolls in; the peaks
// dataset is split per letter and a chunk loads on the first letter typed, so
// the landing bundle is unchanged.
// Copy here is user-facing: no dashes.

const Globe = lazy(() => import('../Globe'));

// Mountains already in the app (src/data/app-mountains.json, exported from
// the trails table by eiger-ops/scripts/export_app_mountains.py). They show
// as small emerald dots (the site's "live" colour) and a tap on one, or a
// search hit that matches one, says so instead of taking a request.
const APP_MOUNTAINS = appMountains.mountains;
const APP_BY_PEAK = new Map(APP_MOUNTAINS.filter((m) => m.peakId).map((m) => [m.peakId, m]));
const LIVE_RGB = [0.06, 0.73, 0.5];
const APP_MARKERS = APP_MOUNTAINS.map((m) => ({ ...m, size: 0.028, color: LIVE_RGB }));
const kmBetween = (a, b) => {
  const p = Math.PI / 180;
  const x = 0.5 - Math.cos((b.lat - a.lat) * p) / 2 + (Math.cos(a.lat * p) * Math.cos(b.lat * p) * (1 - Math.cos((b.lon - a.lon) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(x));
};
// The app mountain a dataset peak corresponds to: by matched id, else the
// nearest app mountain within 2 km (same summit, different label).
const appMountainFor = (peak) => {
  if (!peak) return null;
  if (peak.appId) return APP_MOUNTAINS.find((m) => m.id === peak.appId) ?? null;
  const byId = APP_BY_PEAK.get(peak.id);
  if (byId) return byId;
  let best = null;
  let bestKm = 2;
  for (const m of APP_MOUNTAINS) {
    const d = kmBetween(peak, m);
    if (d < bestKm) {
      bestKm = d;
      best = m;
    }
  }
  return best;
};

const EYEBROW = 'font-mono text-eyebrow font-semibold uppercase text-fg-subtle';
const surface = 'rounded-lg border border-line bg-surface-1';
const buttonPrimary = `inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-fg px-6 text-body font-medium text-bg transition-colors hover:bg-fg/90 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
const buttonQuiet = `inline-flex h-9 items-center justify-center gap-2 rounded-pill border border-line-strong px-4 text-small font-medium text-fg transition-colors hover:border-fg/40 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

const markerSize = (rank) => Math.max(0.03, 0.09 - rank * 0.006);

const InAppChip = () => (
  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-line-strong px-2 py-0.5 font-mono text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-fg-muted">
    <span aria-hidden="true" className="size-1.5 rounded-full bg-live" />
    In the app
  </span>
);

const PeakLine = ({ peak }) => (
  <span className="flex min-w-0 flex-1 items-baseline gap-2">
    <span className="truncate font-medium text-fg">{peak.name}</span>
    <span className="truncate font-mono text-small text-fg-subtle">
      {[peak.country, formatElevation(peak.elevation)].filter(Boolean).join(' · ')}
    </span>
    {appMountainFor(peak) ? <InAppChip /> : null}
  </span>
);

export default function MountainRequest({ standalone = false }) {
  const rootRef = useRef(null);
  const listId = useId();
  const [visible, setVisible] = useState(false);
  const [chunks, setChunks] = useState({});
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState(null);
  const [top, setTop] = useState([]);
  // Leaderboard state on its own: an outage must not read as "no requests".
  const [topState, setTopState] = useState('loading');
  const [requested, setRequested] = useState(() => requestedIds());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Mount the globe and fetch the leaderboard once the section scrolls in.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    backend
      .top(12)
      .then((rows) => {
        if (cancelled) return;
        setTop(rows);
        setTopState('ready');
      })
      .catch(() => {
        if (!cancelled) setTopState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const ensureChunk = (key) => {
    if (!key || chunks[key]) return;
    loadChunk(key)
      .then((rows) => setChunks((c) => (c[key] ? c : { ...c, [key]: rows })))
      .catch(() => setError('The mountain list did not load. Refresh and try again.'));
  };

  const key = queryKey(query);
  const chunk = key ? chunks[key] : null;
  const results = chunk ? searchPeaks(chunk, query) : [];

  const choose = (peak) => {
    setSelected(peak);
    setQuery('');
    setActive(-1);
    setNotice('');
    setError('');
  };
  // A tap on a green dot: show that mountain as the selection.
  const pickApp = (m) => choose({ id: m.peakId ?? `app:${m.id}`, appId: m.id, name: m.name, country: '', elevation: m.elevation, lat: m.lat, lon: m.lon });
  const clear = () => {
    setSelected(null);
    setNotice('');
    setError('');
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setActive(-1);
    }
  };

  const submit = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    let saved = false;
    try {
      const { requests, counted } = await backend.request(selected, honeypot);
      saved = true;
      setRequested(requestedIds());
      setNotice(
        counted
          ? `${selected.name} is on the list. ${requests === 1 ? 'You are the first to ask.' : `${requests.toLocaleString('en-US')} connections want it.`}`
          : `${selected.name} is already on your list. ${requests.toLocaleString('en-US')} connections want it.`,
      );
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
    if (!saved) return;
    // The vote is in even if the list refresh fails: say so instead of a generic error.
    try {
      setTop(await backend.top(12));
      setTopState('ready');
    } catch {
      setTopState('error');
      setNotice((n) => `${n} The list will catch up shortly.`);
    }
  };

  const inApp = appMountainFor(selected);
  const markers = [
    ...APP_MARKERS,
    ...top.map((p, i) => ({ lat: p.lat, lon: p.lon, size: markerSize(i) })),
    ...(selected ? [{ lat: selected.lat, lon: selected.lon, size: 0.12, ...(inApp ? { color: LIVE_RGB } : {}) }] : []),
  ];
  const disabled = backend.mode === 'disabled';
  const alreadyAsked = selected ? requested.has(selected.id) : false;

  return (
    <section
      id="request"
      ref={rootRef}
      aria-labelledby="request-heading"
      className={`scroll-mt-16 border-t border-line bg-bg ${standalone ? 'pt-36 pb-section lg:pt-44' : 'py-section'}`}
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16 lg:px-8">
        <FadeIn className="order-2 lg:order-1">
          <div className="mx-auto w-full max-w-[520px]">
            {visible ? (
              <Suspense fallback={<div className="aspect-square w-full rounded-full border border-line" />}>
                <Globe markers={markers} pickable={APP_MARKERS} onPick={pickApp} focus={selected} />
              </Suspense>
            ) : (
              <div className="aspect-square w-full rounded-full border border-line" />
            )}
            <div className="mt-4 flex items-center justify-center gap-4">
              <p className="font-mono text-small text-fg-subtle">
                {selected ? (
                  `${selected.name}, ${selected.country || 'on the globe'}`
                ) : (
                  <>
                    <span aria-hidden="true" className="mr-1.5 inline-block size-1.5 rounded-full bg-live align-middle" />
                    {APP_MOUNTAINS.length} in the app, tap one. White dots are the most requested. Drag to turn.
                  </>
                )}
              </p>
              {selected ? (
                <button type="button" onClick={clear} className={buttonQuiet}>
                  Reset view
                </button>
              ) : null}
            </div>
          </div>
        </FadeIn>

        <div className="order-1 lg:order-2">
          <FadeIn>
            <p className={EYEBROW}>Mountain requests</p>
            {standalone ? (
              <h1 id="request-heading" className="mt-5 font-display text-display-md text-balance text-fg">
                Which mountain next?
              </h1>
            ) : (
              <h2 id="request-heading" className="mt-5 font-display text-display-lg text-balance text-fg">
                Which mountain next?
              </h2>
            )}
          </FadeIn>
          <FadeIn delay={0.06}>
            <p className="mt-5 max-w-xl text-body-lg text-fg-muted">
              Pick from 46,000 named peaks above 1,000 m, anywhere on Earth. The most requested mountains go to the front of our verification queue, and you will see them land in the app.
            </p>
          </FadeIn>

          <FadeIn delay={0.12} className="mt-8">
            <label htmlFor={`${listId}-search`} className="text-small font-medium text-fg">
              Search a mountain
            </label>
            <div className="relative mt-2">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                id={`${listId}-search`}
                type="search"
                autoComplete="off"
                placeholder="Matterhorn, Denali, Aconcagua"
                value={query}
                onChange={(e) => {
                  ensureChunk(queryKey(e.target.value));
                  setQuery(e.target.value);
                  setActive(-1);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls={`${listId}-results`}
                aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
                className="h-12 rounded-md border-line-strong bg-surface-1 pl-10 text-base"
              />
              {results.length > 0 ? (
                <ul
                  id={`${listId}-results`}
                  role="listbox"
                  className={`absolute z-20 mt-2 w-full overflow-hidden ${surface} bg-surface-2 shadow-none`}
                >
                  {results.map((peak, i) => (
                    <li
                      key={peak.id}
                      id={`${listId}-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(peak)}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-body ${i === active ? 'bg-surface-3' : 'hover:bg-surface-3'}`}
                    >
                      <PeakLine peak={peak} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {key && chunk && results.length === 0 ? (
                <p className="mt-2 text-small text-fg-subtle">No peak by that name in our list. Try the local spelling.</p>
              ) : key && !chunk ? (
                <p className="mt-2 font-mono text-small text-fg-subtle">Loading peaks</p>
              ) : null}
            </div>
            {/* Honeypot: hidden from people, filled by bots. */}
            <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

            <div className={`mt-4 ${surface} p-5`} aria-live="polite">
              {selected ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-display text-heading text-fg">{selected.name}</p>
                    <p className="mt-1 font-mono text-small text-fg-subtle">
                      {[selected.country, formatElevation(selected.elevation)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {inApp ? (
                    <span className="inline-flex items-center gap-2 rounded-pill border border-line-strong px-4 py-2 text-small font-medium text-fg">
                      <span aria-hidden="true" className="size-2 rounded-full bg-live" />
                      {inApp.verified ? 'In the app, expert verified' : 'In the app, being verified'}
                    </span>
                  ) : (
                    <button type="button" onClick={submit} disabled={busy || disabled || alreadyAsked} className={buttonPrimary}>
                      {alreadyAsked ? (
                        <>
                          <Check aria-hidden="true" className="size-4" /> Requested
                        </>
                      ) : busy ? (
                        'Sending'
                      ) : (
                        'Request this mountain'
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-body text-fg-muted">Search for a peak, or tap one on the list below, then ask for it.</p>
              )}
              {inApp ? (
                <p className="mt-3 text-small text-fg-muted">
                  {inApp.name} is already in Eiger with gear, route and weather windows{inApp.verified ? ', signed off by our mountaineer' : ', and our mountaineer is verifying it'}. No request needed.
                </p>
              ) : null}
              {disabled && !inApp ? <p className="mt-3 text-small text-fg-subtle">Mountain requests are not open on this site yet.</p> : null}
              {notice ? <p className="mt-3 text-small text-fg-muted">{notice}</p> : null}
              {error ? <p className="mt-3 text-small text-fg">{error}</p> : null}
            </div>
          </FadeIn>

          <FadeIn delay={0.18} className="mt-8">
            <p className={EYEBROW}>Most requested</p>
            {topState === 'loading' ? (
              <p className="mt-3 font-mono text-small text-fg-subtle">Loading the list</p>
            ) : topState === 'error' ? (
              <p className="mt-3 text-body text-fg-muted">The list is unavailable right now. Requests still count.</p>
            ) : top.length ? (
              <ol className="mt-3 divide-y divide-line border-y border-line">
                {top.slice(0, standalone ? 12 : 6).map((peak, i) => (
                  <li key={peak.id}>
                    <button
                      type="button"
                      onClick={() => choose(peak)}
                      className={`flex w-full items-center gap-4 py-3 text-left rounded-sm ${focusRing}`}
                    >
                      <span className="w-6 font-mono text-small tabular-nums text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                      <PeakLine peak={peak} />
                      <span className="font-mono text-small tabular-nums text-fg-muted">{peak.requests.toLocaleString('en-US')}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-body text-fg-muted">No requests yet. Yours would be the first.</p>
            )}
            {standalone ? null : (
              <Link to="/request" className={`group mt-6 inline-flex items-center gap-2 rounded-sm text-body font-medium text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`}>
                See the full list
                <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            )}
          </FadeIn>
          {standalone ? (
            <p className="mt-8 text-small text-fg-subtle">One request per mountain per connection. We keep a count per peak and a hashed connection address to stop repeats, nothing else.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

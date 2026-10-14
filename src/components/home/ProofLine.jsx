import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import stats from '@/data/site-stats.json';
import { fetchClimberCount, nextClimberDelay } from '../../lib/climberCount';
import { EASE_OUT_EXPO } from './utils';

// Three catalogue figures baked in at build time from src/data/site-stats.json,
// dated, plus a live climber count (Muad 2026-10-13, src/lib/climberCount.js)
// that starts from the baked `climbers` value and refreshes every 3 seconds
// while the line is on screen and the tab is visible. They count up once the first time the line scrolls
// into view; a new climber count then counts on from the number shown. Under
// reduced motion (or before the line is seen) the values show as is.
const FIGURES = [
  { key: 'climbers', label: 'Climbers' },
  { key: 'mountains', label: 'Mountains' },
  { key: 'products', label: 'Products' },
  { key: 'mapped_gear_slots', label: 'Mapped gear slots' },
];

const format = (n) => Math.round(n).toLocaleString('en-US');

// Until the line is near the viewport it holds its final value (content is
// visible by default); once it is close ("armed") it drops to zero off screen,
// then counts up when it is actually in view. Later changes count on from the
// value on screen, not from zero.
function CountUp({ value, armed, start }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce || !start) return undefined;
    const controls = animate(from.current, value, {
      duration: 1.2,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [reduce, start, value]);

  return (
    // The final value sets the width, so the line never shifts while counting.
    <span className="relative inline-block">
      <span className="invisible">{format(value)}</span>
      <span className="absolute inset-0 text-left">{format(reduce || !armed ? value : shown)}</span>
    </span>
  );
}

// The live count: refetched every 3 s while the line is on screen and the tab
// is visible (one request at a time, the next one scheduled after the answer),
// every 30 s after a failure. Leaving the screen or hiding the tab stops it;
// coming back fetches at once. A failed fetch keeps the last good number.
// `at` is when the number was last confirmed, shown as "as of" under the line
// instead of a "Live" tag (Muad 2026-10-14: no status dots or live badges).
function useClimberCount(initial, onScreen) {
  const [state, setState] = useState({ count: initial, at: null });

  useEffect(() => {
    if (!onScreen) return undefined;
    const ctrl = new AbortController();
    let timer;
    let busy = false;
    const tick = () => {
      clearTimeout(timer);
      if (busy || document.hidden) return;
      busy = true;
      fetchClimberCount({ url: import.meta.env.VITE_SUPABASE_URL, key: import.meta.env.VITE_SUPABASE_ANON_KEY, signal: ctrl.signal })
        .catch(() => null)
        .then((n) => {
          busy = false;
          if (ctrl.signal.aborted) return;
          if (n) setState({ count: n, at: new Date() });
          timer = setTimeout(tick, nextClimberDelay(Boolean(n)));
        });
    };
    tick();
    document.addEventListener('visibilitychange', tick);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [onScreen]);

  return state;
}

const clock = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const ProofLine = () => {
  const ref = useRef(null);
  const armed = useInView(ref, { once: true, margin: '0px 0px 400px 0px' });
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const onScreen = useInView(ref, { margin: '200px 0px 200px 0px' });
  const { count: climbers, at } = useClimberCount(stats.climbers, onScreen);
  const values = { ...stats, climbers };

  return (
    <div ref={ref} className="mt-10 md:mt-12">
      <dl className="grid grid-cols-1 gap-6 border-y border-line py-6 min-[480px]:grid-cols-2 min-[480px]:gap-4 md:grid-cols-4 md:py-8">
        {FIGURES.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <dt className="order-2 text-small text-fg-muted">{label}</dt>
            <dd className="order-1 font-mono text-display-md font-medium tabular-nums text-fg">
              <span className="sr-only">{format(values[key])}</span>
              <span aria-hidden="true">
                <CountUp value={values[key]} armed={armed} start={inView} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 font-mono text-eyebrow text-fg-subtle">
        {at ? (
          <>
            Climbers as of <time dateTime={at.toISOString()}>{clock(at)}</time>,{' '}
          </>
        ) : null}
        {at ? 'catalogue' : 'Catalogue'} as of <time dateTime={stats.as_of}>{stats.as_of}</time>
      </p>
    </div>
  );
};

export default ProofLine;

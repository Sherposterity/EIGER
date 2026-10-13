import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import stats from '@/data/site-stats.json';
import { CLIMBER_POLL_MS, fetchClimberCount } from '../../lib/climberCount';
import { EASE_OUT_EXPO } from './utils';

// Three catalogue figures baked in at build time from src/data/site-stats.json,
// dated, plus a live climber count (Muad 2026-10-13, src/lib/climberCount.js)
// that starts from the baked `climbers` value and refreshes every 30 seconds
// while the tab is visible. They count up once the first time the line scrolls
// into view; a new climber count then counts on from the number shown. Under
// reduced motion (or before the line is seen) the values show as is.
const FIGURES = [
  { key: 'climbers', label: 'Climbers', live: true },
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

// The live count: refetched every 30 s, paused while the tab is hidden and
// fetched again when it comes back. A failed fetch keeps the last good number.
function useClimberCount(initial) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = () => {
      if (document.hidden) return;
      fetchClimberCount({ url: import.meta.env.VITE_SUPABASE_URL, key: import.meta.env.VITE_SUPABASE_ANON_KEY, signal: ctrl.signal })
        .then((n) => n && setCount(n))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, CLIMBER_POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      ctrl.abort();
      clearInterval(id);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  return count;
}

const ProofLine = () => {
  const ref = useRef(null);
  const armed = useInView(ref, { once: true, margin: '0px 0px 400px 0px' });
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const climbers = useClimberCount(stats.climbers);
  const values = { ...stats, climbers };

  return (
    <div ref={ref} className="mt-10 md:mt-12">
      <dl className="grid grid-cols-1 gap-6 border-y border-line py-6 min-[480px]:grid-cols-2 min-[480px]:gap-4 md:grid-cols-4 md:py-8">
        {FIGURES.map(({ key, label, live }) => (
          <div key={key} className="flex flex-col gap-1">
            <dt className="order-2 text-small text-fg-muted">
              {label}
              {live ? <span className="ml-2 font-mono text-eyebrow uppercase text-live">Live</span> : null}
            </dt>
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
        Climbers live, catalogue as of <time dateTime={stats.as_of}>{stats.as_of}</time>
      </p>
    </div>
  );
};

export default ProofLine;

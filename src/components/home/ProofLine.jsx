import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import stats from '@/data/site-stats.json';
import { EASE_OUT_EXPO } from './utils';

// Three catalogue figures baked in at build time from src/data/site-stats.json,
// dated. They count up once the first time the line scrolls into view; under
// reduced motion (or before the line is seen) the final values show as is.
const FIGURES = [
  { key: 'mountains', label: 'Mountains' },
  { key: 'products', label: 'Products' },
  { key: 'mapped_gear_slots', label: 'Mapped gear slots' },
];

const format = (n) => Math.round(n).toLocaleString('en-US');

// Until the line is near the viewport it holds its final value (content is
// visible by default); once it is close ("armed") it drops to zero off screen,
// then counts up when it is actually in view.
function CountUp({ value, armed, start }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduce || !start) return undefined;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: EASE_OUT_EXPO,
      onUpdate: setShown,
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

const ProofLine = () => {
  const ref = useRef(null);
  const armed = useInView(ref, { once: true, margin: '0px 0px 400px 0px' });
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div ref={ref} className="mt-10 md:mt-12">
      <dl className="grid grid-cols-1 gap-6 border-y border-line py-6 min-[480px]:grid-cols-3 min-[480px]:gap-4 md:py-8">
        {FIGURES.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <dt className="order-2 text-small text-fg-muted">{label}</dt>
            <dd className="order-1 font-mono text-display-md font-medium tabular-nums text-fg">
              <span className="sr-only">{format(stats[key])}</span>
              <span aria-hidden="true">
                <CountUp value={stats[key]} armed={armed} start={inView} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 font-mono text-eyebrow text-fg-subtle">
        as of <time dateTime={stats.as_of}>{stats.as_of}</time>
      </p>
    </div>
  );
};

export default ProofLine;

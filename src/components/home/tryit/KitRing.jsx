import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { RING_STROKE, ringRadius } from './geometry';

// Red (0%, unprepared) through amber to green (100%, prepared): OKLCH with
// fixed lightness and chroma, hue 25 -> 145. The one colour on the site
// (founder ruling); it only ever paints this ring's stroke.
function ringColour(percent) {
  const p = Math.min(100, Math.max(0, percent));
  return `oklch(0.74 0.16 ${(25 + p * 1.2).toFixed(1)})`;
}

// The kit: a circle in the diagram centre that grows with every item, and
// the compatibility ring wrapped around it, filling clockwise from 12 o'clock.
export default function KitRing({
  kitR,
  percent,
  width,
  height,
  reduce,
  sizeTransition,
  labelId,
  emptyLabel,
}) {
  const pv = useMotionValue(percent);
  useEffect(() => {
    const controls = animate(
      pv,
      percent,
      reduce ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    );
    return () => controls.stop();
  }, [pv, percent, reduce]);
  const offset = useTransform(pv, (p) => 100 - p);
  const stroke = useTransform(pv, ringColour);
  const visible = useTransform(pv, (p) => (p > 0.5 ? 1 : 0));

  const cx = width / 2;
  const cy = height / 2;
  const r = ringRadius(kitR);

  return (
    <>
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        className="pointer-events-none absolute inset-0"
      >
        <motion.circle
          cx={cx}
          cy={cy}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={RING_STROKE}
          initial={false}
          animate={{ r }}
          transition={sizeTransition}
        />
        <motion.circle
          cx={cx}
          cy={cy}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ strokeDashoffset: offset, stroke, opacity: visible }}
          initial={false}
          animate={{ r }}
          transition={sizeTransition}
        />
      </svg>
      <motion.div
        role="region"
        aria-labelledby={labelId}
        className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full border border-dashed border-line-strong bg-surface-1"
        style={{ x: '-50%', y: '-50%' }}
        initial={false}
        animate={{ width: kitR * 2, height: kitR * 2 }}
        transition={sizeTransition}
      >
        <h3 id={labelId} className="sr-only">
          Your kit
        </h3>
        {emptyLabel && (
          <p className="max-w-[80%] text-center text-[11px] leading-snug text-fg-subtle md:text-small">
            <span className="block font-semibold text-fg-muted">Your kit</span>
            {emptyLabel}
          </p>
        )}
      </motion.div>
    </>
  );
}

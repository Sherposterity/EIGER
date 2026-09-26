import { useRef, useSyncExternalStore } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

// Copy: docs/COPY.md, "Why not just use AllTrails?" (conversational voice).
// Do not edit the words here without editing the copy deck first.
const HEADING = 'Why not just use AllTrails?';
const ROWS = [
  {
    label: 'Terrain classification',
    trail: "Tells you it's hard. Not why.",
    eiger: "Tells you whether there's glacier, technical ground or avalanche slopes, per mountain.",
  },
  {
    label: 'Gear compatibility',
    trail: 'Gear discounts, not gear advice.',
    eiger: 'Checks that your boots take your crampons, and how warm your layers need to be, per mountain and season.',
  },
  {
    label: 'Summit forecast',
    trail: 'Will it rain on the hike?',
    eiger: 'Will the snow firm up tonight and soften by ten up top? Forecast at the summit point, with a start-time warning.',
  },
];
const FOOTNOTE = "Claims checked against AllTrails' published help pages, September 2026.";

const GRID = 'grid grid-cols-2 gap-x-6 gap-y-3 sm:gap-x-10 lg:grid-cols-[11rem_1fr_1fr]';
const EYEBROW = 'font-mono text-eyebrow font-semibold uppercase';

function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function RowContent({ row }) {
  return (
    <div className={GRID}>
      <p className={`${EYEBROW} col-span-2 text-fg-subtle lg:col-span-1 lg:pt-1`}>{row.label}</p>
      <p className="text-body text-fg-muted">{row.trail}</p>
      <p className="text-body text-fg">{row.eiger}</p>
    </div>
  );
}

// One sticky card. `nextRef` is a zero-height marker sitting where the next
// card starts in normal flow; as that marker travels from the bottom of the
// viewport up to the pin line (25vh), this card eases back to scale 0.98 and
// opacity 0.7 while the next card slides over it.
function StackCard({ row, index, nextRef }) {
  const { scrollYProgress } = useScroll({
    target: nextRef ?? undefined,
    offset: [[0, 1], [0, 0.25]],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, nextRef ? 0.98 : 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, nextRef ? 0.7 : 1]);
  return (
    <motion.div
      className="sticky origin-top rounded-lg border border-line bg-surface-1 px-6 py-8 sm:px-8"
      style={{ top: `calc(25vh + ${index * 12}px)`, scale }}
    >
      {/* Fade the content, not the card: the card background stays opaque so
          the card beneath never shows through. */}
      <motion.div style={{ opacity }}>
        <RowContent row={row} />
      </motion.div>
    </motion.div>
  );
}

function StackedRows() {
  const m1 = useRef(null);
  const m2 = useRef(null);
  const markers = [m1, m2, null];
  return (
    <div className="flex flex-col gap-6 pb-[20vh]">
      {ROWS.map((row, i) => (
        <div key={row.label} className="contents">
          {i > 0 && <div ref={markers[i - 1]} aria-hidden="true" className="-mb-6 h-0" />}
          <StackCard row={row} index={i} nextRef={markers[i]} />
        </div>
      ))}
    </div>
  );
}

function PlainRows() {
  return (
    <div className="border-t border-line">
      {ROWS.map((row) => (
        <div key={row.label} className="border-b border-line py-8">
          <RowContent row={row} />
        </div>
      ))}
    </div>
  );
}

export default function WhyEiger() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reduced = useReducedMotion();
  const stack = isDesktop && !reduced;

  return (
    <section id="why-eiger" aria-labelledby="why-eiger-heading" className="py-section">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 id="why-eiger-heading" className="text-display-md text-fg">{HEADING}</h2>

        <div className={`${GRID} mt-12 pb-4 ${stack ? 'px-6 sm:px-8' : ''}`}>
          <span className="hidden lg:block" />
          <p className={`${EYEBROW} text-fg-subtle`}>Trail apps</p>
          <p className={`${EYEBROW} text-fg`}>EIGER</p>
        </div>

        {stack ? <StackedRows /> : <PlainRows />}

        <p className="mt-8 font-mono text-[11px] leading-relaxed text-fg-subtle">{FOOTNOTE}</p>
      </div>
    </section>
  );
}

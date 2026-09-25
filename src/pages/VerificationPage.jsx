import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { GitMerge, Layers, RefreshCw, Search, Smartphone, UserCheck } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';

// Verification process (/verification). The founder writes the copy later;
// until then every step carries a "[copy pending]" tag and nothing else.
// The pipeline is drawn as an ascent: a switchback line through six nodes,
// drawn on as the reader scrolls. Each node turns white once the line reaches
// it. Reduced motion: line fully drawn, every node white.

const STEPS = [
  { title: 'The guidelines', icon: Search },
  { title: 'The agents scrape', icon: Layers },
  { title: 'De-duplication and checks', icon: GitMerge },
  { title: "The mountaineer's review", icon: UserCheck },
  { title: 'Into the app', icon: Smartphone },
  { title: 'It keeps going', icon: RefreshCw },
];

const PENDING = '[copy pending]';

const pendingTag = 'inline-block rounded-sm border border-line-strong px-2 py-1 font-mono text-eyebrow text-fg-subtle';

// Builds the switchback path through the node centres: each leg swings out to
// one side and back, alternating, like a trail zigzagging up a slope.
function switchbackPath(points, swing) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dir = i % 2 === 1 ? 1 : -1;
    const dy = b.y - a.y;
    d += ` C ${a.x + swing * dir} ${a.y + dy * 0.3}, ${b.x + swing * dir} ${b.y - dy * 0.3}, ${b.x} ${b.y}`;
  }
  return d;
}

function Pipeline() {
  const listRef = useRef(null);
  const nodeRefs = useRef([]);
  const reduce = useReducedMotion();
  const [geometry, setGeometry] = useState({ width: 0, height: 0, points: [] });
  const [reached, setReached] = useState(0);

  // Measure the node centres relative to the list, and again whenever the
  // layout changes size (fonts loading, viewport resize).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const measure = () => {
      const box = list.getBoundingClientRect();
      const points = nodeRefs.current.map((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
      });
      setGeometry({ width: box.width, height: box.height, points });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 60%', 'end 60%'] });

  // A node lights once the drawn line passes its height on the page.
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const { points } = geometry;
    if (points.length === 0) return;
    // The path runs from the first node to the last, so progress maps onto that span.
    const top = points[0].y;
    const drawnTo = top + p * (points[points.length - 1].y - top);
    const count = points.filter((pt) => pt.y <= drawnTo + 1).length;
    setReached((prev) => (prev === count ? prev : count));
  });

  const { width, height, points } = geometry;
  // Each leg swings out by most of the rail column, so on phones the route
  // stays on the left edge and on desktop it has room to zigzag.
  const d = switchbackPath(points, (points[0]?.x ?? 0) * 0.8);
  const lit = (i) => reduce || i < reached;

  return (
    <ol ref={listRef} className="relative">
      {height > 0 ? (
        <svg
          className="pointer-events-none absolute inset-0 overflow-visible"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          {/* The route, faint, then the drawn part on top of it */}
          <path d={d} fill="none" stroke="var(--color-line-strong)" strokeWidth="1.5" />
          <motion.path
            d={d}
            fill="none"
            stroke="var(--color-fg)"
            strokeWidth="1.5"
            style={{ pathLength: reduce ? 1 : scrollYProgress }}
          />
        </svg>
      ) : null}

      {STEPS.map((step, i) => (
        <li
          key={step.title}
          className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 pb-16 last:pb-0 sm:grid-cols-[6rem_1fr] sm:gap-x-8 sm:pb-24"
        >
          <div className="flex justify-center pt-3">
            <span
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className={`relative z-10 block size-3 border transition-colors duration-500 ease-out-expo ${
                lit(i) ? 'border-fg bg-fg' : 'border-line-strong bg-surface-3'
              }`}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-md border transition-colors duration-500 ease-out-expo ${
                  lit(i) ? 'border-fg text-fg' : 'border-line-strong text-fg-subtle'
                }`}
              >
                <step.icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="font-mono text-small text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h2 className="mt-5 text-heading sm:text-display-md">{step.title}</h2>
            <p className="mt-4">
              <span className={pendingTag}>{PENDING}</span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function VerificationPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />
      <main>
        <section className="px-4 pb-section-sm pt-40 sm:px-gutter">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-display-lg">Verification process</h1>
            <p className="mt-6">
              <span className={pendingTag}>{PENDING}</span>
            </p>
          </div>
        </section>
        <section className="px-4 pb-section sm:px-gutter" aria-label="Verification process">
          <div className="mx-auto max-w-5xl">
            <Pipeline />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

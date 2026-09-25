import { useRef, useState } from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { Iphone } from '@/components/ui/iphone';
import missionControl from '@/assets/E_MissionControl.webp';
import summitIntel from '@/assets/E_SummitIntel.webp';
import gearVault from '@/assets/E_GearVault.webp';
import ProofLine from './ProofLine';
import { FadeIn } from './motion';
import { EASE_OUT_EXPO } from './utils';

// "A look inside our app". Desktop: the phone stays pinned on the left while
// the three steps scroll past on the right; the screen inside the phone is
// scrubbed by scroll progress (crossfade with a slight vertical drift).
// Phones, and everyone under reduced motion, get plain rows: each step with
// its own screen, nothing pinned or scrubbed.
const STEPS = [
  {
    title: 'Your control panel',
    text: 'Access to all app features at a touch.',
    image: missionControl,
    alt: 'EIGER app, Mission Control screen',
  },
  {
    title: 'Summit Search',
    text: 'In depth info for your summit of interest and its corresponding gear.',
    image: summitIntel,
    alt: 'EIGER app, summit details for Mount Whitney with its recommended gear',
  },
  {
    title: 'Compatibility Bar',
    text: 'Know how prepared you are, before any and every hike.',
    image: gearVault,
    alt: 'EIGER app, My Gear Profile screen',
  },
];

const stepNumber = (i) => String(i + 1).padStart(2, '0');

// Progress windows (0..1 across the steps track) where each screen is fully
// shown; the gaps between them are the crossfades.
const SCREEN_RANGES = [
  { input: [0, 0.3, 0.37], opacity: [1, 1, 0], y: [0, 0, -24] },
  { input: [0.3, 0.37, 0.63, 0.7], opacity: [0, 1, 1, 0], y: [24, 0, 0, -24] },
  { input: [0.63, 0.7, 1], opacity: [0, 1, 1], y: [24, 0, 0] },
];

function ScrubbedScreen({ progress, index, step }) {
  const range = SCREEN_RANGES[index];
  const opacity = useTransform(progress, range.input, range.opacity);
  const y = useTransform(progress, range.input, range.y);
  return (
    <motion.img
      src={step.image}
      alt={step.alt}
      loading="lazy"
      decoding="async"
      style={{ opacity, y }}
      className="absolute inset-0 block size-full object-cover object-top"
    />
  );
}

function StepText({ index, step, headingLevel = 'h3', className = '' }) {
  const Heading = headingLevel;
  return (
    <div className={className}>
      <p className="font-mono text-small text-fg-subtle">{stepNumber(index)}</p>
      <Heading className="mt-3 font-display text-display-md text-fg">{step.title}</Heading>
      <p className="mt-4 max-w-md text-body-lg text-fg-muted">{step.text}</p>
    </div>
  );
}

// Desktop, motion allowed.
function ScrubbedWalkthrough() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start center', 'end center'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = v < 1 / 3 ? 0 : v < 2 / 3 ? 1 : 2;
    setActive((prev) => (prev === next ? prev : next));
  });

  return (
    <div ref={trackRef} className="relative mt-4 hidden grid-cols-2 gap-16 lg:grid">
      <div className="relative">
        <div className="sticky top-0 flex h-svh items-center justify-center">
          <div className="w-[min(320px,calc((100svh-9rem)*0.49))]">
            <Iphone>
              {STEPS.map((step, i) => (
                <ScrubbedScreen key={step.title} progress={scrollYProgress} index={i} step={step} />
              ))}
            </Iphone>
          </div>
        </div>
      </div>

      <ol className="relative">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex min-h-svh items-center">
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            >
              <motion.div
                animate={{ opacity: active === i ? 1 : 0.5, scale: active === i ? 1 : 0.98 }}
                transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                style={{ transformOrigin: 'left center' }}
                aria-current={active === i ? 'step' : undefined}
              >
                <StepText index={i} step={step} />
              </motion.div>
            </motion.div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Phones (and all widths under reduced motion): one row per step.
function StaticRows({ className = '' }) {
  return (
    <ol className={`mt-section-sm flex flex-col gap-20 lg:gap-28 ${className}`}>
      {STEPS.map((step, i) => (
        <li
          key={step.title}
          className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
        >
          <FadeIn className="mx-auto w-full max-w-[240px] lg:max-w-[300px]">
            <Iphone src={step.image} alt={step.alt} />
          </FadeIn>
          <FadeIn delay={0.06}>
            <StepText index={i} step={step} />
          </FadeIn>
        </li>
      ))}
    </ol>
  );
}

const Walkthrough = () => {
  const reduce = useReducedMotion();

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-16 bg-bg pt-section pb-section-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <h2 id="how-it-works-heading" className="font-display text-display-lg text-balance text-fg">
            A look inside our app
          </h2>
        </FadeIn>
        <ProofLine />

        {reduce ? (
          <StaticRows />
        ) : (
          <>
            <StaticRows className="lg:hidden" />
            <ScrubbedWalkthrough />
          </>
        )}
      </div>
    </section>
  );
};

export default Walkthrough;

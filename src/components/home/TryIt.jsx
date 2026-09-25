import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LayoutGroup, MotionConfig, useReducedMotion } from 'motion/react';
import snapshot from '@/data/gear-snapshot.json';
import { TILES, computeScore, insulationGsm } from '@/lib/tryit';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GearTile from './tryit/GearTile';
import CompatBar from './tryit/CompatBar';
import SeasonToggle from './tryit/SeasonToggle';
import { FOCUS_RING } from './tryit/styles';

const MOUNTAINS = snapshot.mountains;
const DEFAULT_SLUG = MOUNTAINS.some((m) => m.slug === 'mount-rainier')
  ? 'mount-rainier'
  : MOUNTAINS[0].slug;

// Motion budget: stagger 20 ms, 60 ms per item, ten items = 240 ms total.
const STAGGER = 0.02;
const ITEM_DURATION = 0.06;

function useFinePointer() {
  const [fine, setFine] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(pointer: fine)').matches
      : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(pointer: fine)');
    const onChange = () => setFine(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return fine;
}

export default function TryIt() {
  const [slug, setSlug] = useState(DEFAULT_SLUG);
  const [season, setSeason] = useState('summer');
  const [kit, setKit] = useState([]);
  const [firstPaint, setFirstPaint] = useState(true);

  const sectionRef = useRef(null);
  const zoneRef = useRef(null);
  const tileEls = useRef(new Map());
  const refocus = useRef(null);

  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const ids = useId();

  const mountain = MOUNTAINS.find((m) => m.slug === slug) ?? MOUNTAINS[0];
  const score = useMemo(
    () => computeScore({ mountain, season, kitItems: kit }),
    [mountain, season, kit],
  );
  const gsm = insulationGsm(mountain, season);

  const itemTransition = reduce
    ? { duration: 0 }
    : { duration: ITEM_DURATION, ease: [0.22, 1, 0.36, 1] };
  const barTransition = reduce ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] };
  const layoutTransition = reduce
    ? { duration: 0 }
    : { layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } };

  // Tiles fade in once, staggered; after that only layout moves animate.
  useEffect(() => {
    const t = setTimeout(() => setFirstPaint(false), 400);
    return () => clearTimeout(t);
  }, []);

  // A toggled tile remounts in its new list; keep keyboard focus on it.
  useEffect(() => {
    const name = refocus.current;
    if (!name) return;
    refocus.current = null;
    tileEls.current.get(name)?.focus({ preventScroll: true });
  }, [kit]);

  const registerRef = useCallback((name, el) => {
    if (el) tileEls.current.set(name, el);
  }, []);

  const toggle = useCallback((name) => {
    if (tileEls.current.get(name) === document.activeElement) refocus.current = name;
    setKit((k) => (k.includes(name) ? k.filter((t) => t !== name) : [...k, name]));
  }, []);

  const onDrop = useCallback((name, { x, y }) => {
    const r = zoneRef.current?.getBoundingClientRect();
    if (!r) return;
    const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    setKit((k) => {
      if (inside && !k.includes(name)) return [...k, name];
      if (!inside && k.includes(name)) return k.filter((t) => t !== name);
      return k;
    });
  }, []);

  const pool = TILES.filter((t) => !kit.includes(t));
  const inKit = TILES.filter((t) => kit.includes(t));
  const weightKey = `${slug}-${season}`;

  const liveText = `${score.percent}% compatible. ${score.requiredInKit} of ${score.requiredCount} required items.`;

  const tileProps = (name, index) => ({
    name,
    weight: score.weights[name],
    canDrag: fine,
    constraintsRef: sectionRef,
    onToggle: toggle,
    onDrop,
    registerRef,
    transition: { ...itemTransition, ...layoutTransition },
    weightKey,
    weightDelay: reduce ? null : index * STAGGER,
  });

  return (
    <section
      id="try-it"
      ref={sectionRef}
      aria-labelledby={`${ids}-heading`}
      className="bg-bg py-section-sm"
    >
      <MotionConfig reducedMotion="user">
        <div className="mx-auto max-w-6xl px-4 md:px-gutter">
          <div className="max-w-2xl">
            <h2 id={`${ids}-heading`} className="font-display text-display-md text-fg">
              Try it yourself!
            </h2>
            <p className="mt-4 text-body-lg text-fg-muted">
              Our app predetermines what gear is needed for what mountain with expert-verified
              logic.
            </p>
          </div>

          <LayoutGroup id="tryit">
            <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
              {/* Left: controls and the tiles not yet in the kit */}
              <div>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`${ids}-mountain`} className="text-small text-fg-muted">
                      Mountain
                    </Label>
                    <Select value={slug} onValueChange={setSlug}>
                      <SelectTrigger
                        id={`${ids}-mountain`}
                        className={cn('h-9 min-w-48 bg-surface-1', FOCUS_RING)}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOUNTAINS.map((m) => (
                          <SelectItem key={m.slug} value={m.slug}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span id={`${ids}-season`} className="text-small font-medium leading-none text-fg-muted">
                      Season
                    </span>
                    <SeasonToggle value={season} onChange={setSeason} labelId={`${ids}-season`} />
                  </div>
                </div>

                <p className="mt-6 text-small text-fg-subtle">
                  {fine ? 'Drag or tap a tile to add it to your kit.' : 'Tap a tile to add it to your kit.'}
                </p>

                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {pool.map((name) => (
                    <li key={name}>
                      <GearTile
                        {...tileProps(name, TILES.indexOf(name))}
                        inKit={false}
                        appearDelay={firstPaint && !reduce ? TILES.indexOf(name) * STAGGER : null}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: the kit zone and the score */}
              <div className="flex flex-col gap-6">
                <div
                  ref={zoneRef}
                  role="region"
                  aria-labelledby={`${ids}-kit`}
                  className="min-h-48 rounded-lg border border-dashed border-line-strong bg-surface-1 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 id={`${ids}-kit`} className="font-sans text-small font-semibold text-fg">
                      Your kit
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setKit([])}
                      disabled={kit.length === 0}
                      className={cn('text-fg-muted', FOCUS_RING)}
                    >
                      Reset
                    </Button>
                  </div>
                  {inKit.length === 0 ? (
                    <p className="mt-6 text-small text-fg-subtle">
                      {fine ? 'Drop tiles here.' : 'Tapped tiles appear here.'}
                    </p>
                  ) : (
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      {inKit.map((name, i) => (
                        <li key={name}>
                          <GearTile {...tileProps(name, i)} inKit appearDelay={null} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <CompatBar
                  percent={score.percent}
                  requiredInKit={score.requiredInKit}
                  requiredCount={score.requiredCount}
                  transition={barTransition}
                />

                <p className="font-mono text-small text-fg-muted">
                  Insulation: {gsm} g/m2
                </p>

                <div aria-live="polite" aria-atomic="true" className="sr-only">
                  {liveText}
                </div>

                <div className="flex flex-col gap-2 border-t border-line pt-6">
                  <p className="text-small text-fg-subtle">
                    Note: Not to be used for an actual objective. Use App compatibility logic for a
                    more accurate result.
                  </p>
                  <p className="text-small text-fg-muted">
                    Your real kit, scored against every mountain, is in the app.
                  </p>
                </div>
              </div>
            </div>
          </LayoutGroup>
        </div>
      </MotionConfig>
    </section>
  );
}

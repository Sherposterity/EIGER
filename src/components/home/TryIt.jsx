import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
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
import GearOrb from './tryit/GearOrb';
import GearList from './tryit/GearList';
import KitRing from './tryit/KitRing';
import SeasonToggle from './tryit/SeasonToggle';
import { FOCUS_RING } from './tryit/styles';
import { DRIFT_CSS } from './tryit/glyphs';
import {
  DROP_SLOP,
  chipSlot,
  diagramGeometry,
  kitRadius,
  widgetSlot,
} from './tryit/geometry';

const MOUNTAINS = snapshot.mountains;
const DEFAULT_SLUG = MOUNTAINS.some((m) => m.slug === 'mount-rainier')
  ? 'mount-rainier'
  : MOUNTAINS[0].slug;

// First paint: the ten circles fade in 30 ms apart (300 ms total).
const STAGGER = 0.03;
const SPRING = { type: 'spring', stiffness: 260, damping: 28, mass: 0.9 };
const INSTANT = { duration: 0 };

function useMedia(query) {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
}

// Width of the diagram box and of the viewport, kept current on resize.
function useBoxWidth(ref) {
  const [size, setSize] = useState(() => {
    const vw = typeof window !== 'undefined' ? document.documentElement.clientWidth : 1440;
    return { width: Math.min(vw - 32, 1088), viewport: vw };
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const viewport = document.documentElement.clientWidth;
      setSize((s) => (s.width === width && s.viewport === viewport ? s : { width, viewport }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function TryIt() {
  const [slug, setSlug] = useState(DEFAULT_SLUG);
  const [season, setSeason] = useState('summer');
  const [kit, setKit] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [firstPaint, setFirstPaint] = useState(true);

  const sectionRef = useRef(null);
  const diagramRef = useRef(null);

  const reduce = useReducedMotion();
  const fine = useMedia('(pointer: fine)');
  const desktop = useMedia('(min-width: 768px)');
  const { width, viewport } = useBoxWidth(diagramRef);
  const ids = useId();

  const geo = useMemo(
    () => diagramGeometry({ width, viewport, desktop }),
    [width, viewport, desktop],
  );
  const kitR = kitRadius(geo, kit.length);
  const canDrag = fine && desktop;

  const mountain = MOUNTAINS.find((m) => m.slug === slug) ?? MOUNTAINS[0];
  const score = useMemo(
    () => computeScore({ mountain, season, kitItems: kit }),
    [mountain, season, kit],
  );
  const gsm = insulationGsm(mountain, season);

  const transition = reduce ? INSTANT : SPRING;

  useEffect(() => {
    const t = setTimeout(() => setFirstPaint(false), 600);
    return () => clearTimeout(t);
  }, []);

  const toggle = useCallback((name) => {
    setKit((k) => (k.includes(name) ? k.filter((t) => t !== name) : [...k, name]));
  }, []);

  // A drop counts as "in the kit" when the pointer is within the kit's
  // current radius + DROP_SLOP of its centre (the diagram centre).
  const onDrop = useCallback(
    (name, { x, y }) => {
      const r = diagramRef.current?.getBoundingClientRect();
      if (!r) return;
      const inside =
        Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) <= kitR + DROP_SLOP;
      setKit((k) => {
        if (inside && !k.includes(name)) return [...k, name];
        if (!inside && k.includes(name)) return k.filter((t) => t !== name);
        return k;
      });
    },
    [kitR],
  );

  const weightKey = `${slug}-${season}`;
  const liveText = `${score.percent}% compatible. ${score.requiredInKit} of ${score.requiredCount} required items.`;

  return (
    <section
      id="try-it"
      ref={sectionRef}
      aria-labelledby={`${ids}-heading`}
      className="bg-bg py-section-sm"
    >
      <style>{DRIFT_CSS}</style>
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

          {/* Controls, centred above the diagram */}
          <div className="mt-10 flex flex-wrap items-end justify-center gap-4 lg:mt-14">
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
              <Label id={`${ids}-season`} className="text-small text-fg-muted">
                Season
              </Label>
              <SeasonToggle value={season} onChange={setSeason} labelId={`${ids}-season`} />
            </div>
          </div>

          <p className="mt-6 text-center text-small text-fg-subtle">
            {canDrag
              ? 'Drag or tap an item to add it to your kit.'
              : 'Tap an item to add it to your kit.'}
          </p>

          {/* The radial diagram. Its height is reserved up front, so the kit
              growing never shifts the page. */}
          <div
            ref={diagramRef}
            className={cn('relative mt-4 w-full', dragging && 'tryit-paused')}
            style={{ height: geo.height }}
          >
            <KitRing
              kitR={kitR}
              percent={score.percent}
              width={width}
              height={geo.height}
              reduce={reduce}
              sizeTransition={transition}
              labelId={`${ids}-kit`}
              emptyLabel={
                kit.length === 0
                  ? canDrag
                    ? 'Drop items here.'
                    : 'Tapped items appear here.'
                  : null
              }
            />
            {TILES.map((name, i) => {
              const k = kit.indexOf(name);
              const inKit = k !== -1;
              return (
                <GearOrb
                  key={name}
                  name={name}
                  index={i}
                  inKit={inKit}
                  slot={
                    inKit ? chipSlot(geo, kitR, k, kit.length) : widgetSlot(geo, i, TILES.length)
                  }
                  size={geo.widget}
                  chipSize={geo.chip}
                  desktop={desktop}
                  drift={geo.drift}
                  weight={score.weights[name]}
                  canDrag={canDrag}
                  dragging={dragging === name}
                  onToggle={toggle}
                  onDrop={onDrop}
                  onDragState={setDragging}
                  moveTransition={transition}
                  sizeTransition={transition}
                  appearDelay={firstPaint && !reduce ? i * STAGGER : null}
                />
              );
            })}
          </div>

          {/* The reading, directly below the kit */}
          <div className="mt-2 flex flex-col items-center text-center">
            <p
              role="progressbar"
              aria-label="Compatibility"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={score.percent}
              className="font-mono text-display-md tabular-nums text-fg"
            >
              {score.percent}%
            </p>
            <p className="mt-1 font-mono text-small text-fg-muted">
              {score.requiredInKit} of {score.requiredCount} required items
            </p>
            <p className="mt-1 font-mono text-small text-fg-muted">Insulation: {gsm} g/m2</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setKit([])}
              disabled={kit.length === 0}
              className={cn('mt-3 text-fg-muted', FOCUS_RING)}
            >
              Reset
            </Button>
          </div>

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {liveText}
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <GearList
              tiles={TILES}
              kit={kit}
              weights={score.weights}
              onToggle={toggle}
              labelId={`${ids}-list`}
              weightKey={weightKey}
              reduce={reduce}
            />

            <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-center">
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
      </MotionConfig>
    </section>
  );
}

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
import { GitMerge, Layers, Play, RefreshCw, Search, Smartphone, UserCheck } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import snapshot from '@/data/gear-snapshot.json';
import taxonomyFile from '@/data/gear-taxonomy.json';
import reviewFile from '@/data/review-examples.json';
import phraseFile from '@/data/verification-phrases.json';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DRIFT_CSS } from '@/components/home/tryit/glyphs';
import PipelinePanel from '@/components/verification/PipelinePanel';
import { RUN_SCHEDULE, STAGES, announce, phrasesFor } from '@/components/verification/pipeline';

// Verification process (/verification). Step copy is the founder's (docs/COPY.md).
// The diagram shows
// the pipeline for one snapshot mountain and follows whichever step block
// is nearest the middle of the reading area; "Run" plays all six stages in
// about twenty seconds, scrolling the step text along with it.

const MOUNTAINS = snapshot.mountains;
const DEFAULT_SLUG = MOUNTAINS.some((m) => m.slug === 'mount-rainier') ? 'mount-rainier' : MOUNTAINS[0].slug;
const TAXONOMY = taxonomyFile.clusters;
const DEFAULT_INDEX = MOUNTAINS.findIndex((m) => m.slug === DEFAULT_SLUG);
const REVIEWS = Object.fromEntries(reviewFile.mountains.map((r) => [r.mountain, r]));

const STEP_ICON = [Search, Layers, GitMerge, UserCheck, Smartphone, RefreshCw];
const STEP_COPY = [
  'At the start of every scraping task, the model is given handwritten expert documentation on general rules it should follow when choosing which gear to map to what conditions (e.g. at 6,000+ meter altitudes, crampons are required).',
  'The fine tuned model then searches for retail gear that fits those conditions.',
  'Automatic flags are thrown for missing spec sheets, duplications and a host of other errors that are handed to a human reviewer.',
  'At this point, Timoteo and our team tediously go through each gear item slot to mountain mapping and decide whether a slot in our taxonomy is missing, or if a recommendation is unnecessary.',
  'Approved gear is promoted into our marketplace and catalogue.',
  'The expert documentation is updated for errors and exceptional cases while users concurrently give reviews on the mountain lists. The system gets safer.',
];
const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

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

function Controls({ ids, slug, onSlug, onRun, className }) {
  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-mountain`} className="text-small text-fg-muted">
          Mountain
        </Label>
        <Select value={slug} onValueChange={onSlug}>
          <SelectTrigger id={`${ids}-mountain`} className={cn('h-9 min-w-48 bg-surface-1', FOCUS_RING)}>
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
      <Button type="button" variant="outline" onClick={onRun} className={cn('h-9 px-3', FOCUS_RING)}>
        <Play aria-hidden="true" strokeWidth={1.75} />
        Run
      </Button>
    </div>
  );
}

export default function VerificationPage() {
  const ids = useId();
  const reduce = useReducedMotion();
  const desktop = useMedia('(min-width: 1024px)');

  const [slug, setSlug] = useState(DEFAULT_SLUG);
  const [scrollStage, setScrollStage] = useState(1);
  const [run, setRun] = useState({ active: false, stage: 1, id: 0 });
  const [spoken, setSpoken] = useState(false);

  const stepRefs = useRef([]);
  const panelRef = useRef(null);
  const timers = useRef([]);
  const lastScrollStage = useRef(1);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const mountainIndex = Math.max(0, MOUNTAINS.findIndex((m) => m.slug === slug));
  const mountain = MOUNTAINS[mountainIndex];
  const review = REVIEWS[slug];
  // The default mountain opens on the first phrases in the file.
  const phrases = useMemo(
    () => phrasesFor(phraseFile.phrases, mountainIndex - DEFAULT_INDEX + MOUNTAINS.length),
    [mountainIndex],
  );

  const stage = run.active ? run.stage : scrollStage;
  const stageKey = `${stage}|${slug}|${run.id}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const stopRun = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRun((r) => (r.active ? { ...r, active: false } : r));
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The active step is the block that contains (or is nearest) the middle of
  // the reading area: the viewport centre on desktop, the part below the
  // sticky diagram on phones.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const vh = window.innerHeight;
      const panelBottom = !desktop && panelRef.current ? panelRef.current.getBoundingClientRect().bottom : 0;
      const ref = desktop ? vh / 2 : (Math.max(0, panelBottom) + vh) / 2;
      let best = 1;
      let bestD = Infinity;
      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = ref < r.top ? r.top - ref : ref > r.bottom ? ref - r.bottom : 0;
        if (d < bestD) {
          bestD = d;
          best = i + 1;
        }
      });
      if (best !== lastScrollStage.current) {
        lastScrollStage.current = best;
        setScrollStage(best);
        setSpoken(true);
        // A run scrolls the page itself; only the reader scrolling somewhere
        // else should interrupt it.
        if (!runRef.current.active || best !== runRef.current.stage) stopRun();
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [desktop, stopRun]);

  // While a run plays, scroll the step text alongside the diagram so both
  // advance together (founder request). Reduced motion jumps instead of gliding.
  useEffect(() => {
    if (!run.active) return;
    const el = stepRefs.current[run.stage - 1];
    if (!el) return;
    const vh = window.innerHeight;
    const panelBottom = !desktop && panelRef.current ? panelRef.current.getBoundingClientRect().bottom : 0;
    const ref = desktop ? vh / 2 : (Math.max(0, panelBottom) + vh) / 2;
    const r = el.getBoundingClientRect();
    const top = window.scrollY + r.top + r.height / 2 - ref;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }, [run.active, run.stage, desktop]);

  const startRun = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setSpoken(true);
    setRun((r) => ({ active: true, stage: 1, id: r.id + 1 }));
    timers.current = RUN_SCHEDULE.slice(1).map(({ stage: s, at }) =>
      setTimeout(() => setRun((r) => (r.active ? { ...r, stage: s } : r)), at),
    );
  }, []);

  const liveText = spoken
    ? announce(stage, {
        name: mountain.name,
        total: mountain.gear.length,
        changes: (review?.changes ?? []).filter((c) => c.kind !== 'note').length,
      })
    : '';

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <style>{DRIFT_CSS}</style>
      <SiteNav />
      <MotionConfig reducedMotion="user">
        <main>
          <section className="pb-10 pt-32 lg:pb-section-sm lg:pt-40">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h1 className="text-display-lg">Verification process</h1>
            </div>
          </section>

          <section className="pb-section" aria-label="Verification process">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {!desktop && (
                <Controls ids={ids} slug={slug} onSlug={setSlug} onRun={startRun} className="mb-4" />
              )}

              <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
                <div
                  ref={panelRef}
                  className={cn(
                    'z-20 flex flex-col bg-bg',
                    desktop
                      ? 'sticky top-24 h-[clamp(580px,74vh,720px)] self-start rounded-lg border border-line p-5'
                      : 'sticky top-[76px] -mx-4 h-[384px] border-b border-line px-4 pb-3 pt-3 sm:-mx-6 sm:px-6',
                  )}
                >
                  {desktop && (
                    <Controls ids={ids} slug={slug} onSlug={setSlug} onRun={startRun} className="mb-4 shrink-0" />
                  )}
                  <p className="sr-only">
                    Verification pipeline diagram for {mountain.name}, stage {stage} of 6: {STAGES[stage - 1].title}.
                  </p>
                  <PipelinePanel
                    stage={stage}
                    stageKey={stageKey}
                    reduce={Boolean(reduce)}
                    mountain={mountain}
                    taxonomy={TAXONOMY}
                    review={review}
                    phrases={phrases}
                    className="min-h-0 flex-1"
                  />
                </div>

                <ol className="relative mt-4 lg:mt-0">
                  {STAGES.map((s, i) => {
                    const Icon = STEP_ICON[i];
                    const active = stage === s.id;
                    return (
                      <li
                        key={s.id}
                        ref={(el) => {
                          stepRefs.current[i] = el;
                        }}
                        aria-current={active ? 'step' : undefined}
                        className="flex min-h-[62vh] flex-col justify-center py-10 lg:min-h-[72vh]"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-md border transition-colors duration-500',
                              active ? 'border-fg text-fg' : 'border-line-strong text-fg-subtle',
                            )}
                          >
                            <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                          </span>
                          <span className="font-mono text-small text-fg-subtle">{String(s.id).padStart(2, '0')}</span>
                        </div>
                        <h2
                          className={cn(
                            'mt-5 text-heading transition-colors duration-500 sm:text-display-md',
                            active ? 'text-fg' : 'text-fg-muted',
                          )}
                        >
                          {s.title}
                        </h2>
                        <p className="mt-4 max-w-prose text-body-lg text-fg-muted">{STEP_COPY[s.id - 1]}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {liveText}
            </div>
          </section>
        </main>
      </MotionConfig>
      <Footer />
    </div>
  );
}

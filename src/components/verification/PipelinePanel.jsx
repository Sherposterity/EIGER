import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import PipelineDiagram from './PipelineDiagram';
import useStageTimeline from './useStageTimeline';
import { dedupTags, diagramLayout, groupCounts, levelCounts, requiredItems, stageMarks } from './pipeline';

const HONESTY = 'Demonstration. A real run takes hours.';
const tagClass = 'inline-flex items-center rounded-sm border px-1.5 py-1 font-mono text-[10.5px] leading-none';

function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function TerrainTags({ mountain }) {
  const flags = [
    mountain.technical && 'technical',
    mountain.glaciated && 'glaciated',
    mountain.avalanche_terrain && 'avalanche terrain',
  ].filter(Boolean);
  return (
    <ul className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Terrain flags">
      {flags.map((f) => (
        <li key={f} className={cn(tagClass, 'border-fg-subtle text-fg')}>
          {f}
        </li>
      ))}
      <li className={cn(tagClass, 'border-line-strong text-fg-muted')}>
        {mountain.altitude_m.toLocaleString('en-US')} m
      </li>
    </ul>
  );
}

// One line under the diagram: what this stage is doing, then the honesty line.
function Caption({ stage, step, phrases, reduce, mountain, verified }) {
  let body;
  if (stage === 1) body = <TerrainTags mountain={mountain} />;
  else if (stage === 2) {
    body = reduce ? (
      <ul className="flex flex-col items-center gap-1 font-mono text-[11.5px] leading-tight text-fg">
        {phrases.map((p) => (
          <li key={p}>{p}...</li>
        ))}
      </ul>
    ) : (
      <div className="relative h-4 w-full overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.p
            key={phrases[Math.min(step, phrases.length - 1)]}
            className="absolute inset-x-0 text-center font-mono text-[12px] leading-4 text-fg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {phrases[Math.min(step, phrases.length - 1)]}...
          </motion.p>
        </AnimatePresence>
      </div>
    );
  } else {
    const text = {
      3: 'Duplicates merged, gaps flagged. List unverified.',
      4: verified ? 'Signed off.' : 'With the mountaineer.',
      5: 'Verified list, live in the app.',
      6: 'Reports go back to the mountaineer.',
    }[stage];
    body = <p className="text-center font-mono text-[11.5px] leading-4 text-fg-muted">{text}</p>;
  }
  return (
    <div className="flex flex-col items-center gap-2 px-2">
      <div className="flex min-h-5 w-full items-center justify-center">{body}</div>
      <p className="font-mono text-[10.5px] leading-none text-fg-subtle">{HONESTY}</p>
    </div>
  );
}

// The diagram plus its caption. `stageKey` changes whenever a stage is
// (re)entered, which restarts that stage's small timed beats.
export default function PipelinePanel({
  stage,
  stageKey,
  reduce,
  mountain,
  taxonomy,
  review,
  phrases,
  className,
}) {
  const canvasRef = useRef(null);
  const { width, height } = useSize(canvasRef);
  const changes = review?.changes ?? [];

  const marks = useMemo(() => stageMarks(stage, changes.length), [stage, changes.length]);
  const step = useStageTimeline(stageKey, marks, reduce);

  const geo = useMemo(
    () => (width > 0 && height > 0 ? diagramLayout({ width, height, stage, taxonomy }) : null),
    [width, height, stage, taxonomy],
  );
  const need = useMemo(() => requiredItems(mountain), [mountain]);
  const tags = useMemo(() => dedupTags(taxonomy, mountain), [taxonomy, mountain]);
  const counts = useMemo(() => groupCounts(mountain), [mountain]);
  const levels = useMemo(() => levelCounts(mountain), [mountain]);

  const reviewsShown = stage === 4 ? Math.min(step, changes.length) : stage > 4 ? changes.length : 0;
  const verified = stage >= 5 || (stage === 4 && step > changes.length);
  const tagsOn = stage === 3 && (reduce || step === 0);

  return (
    <div className={cn('flex flex-col', className)}>
      <div ref={canvasRef} className="relative min-h-0 flex-1" aria-hidden="true">
        {geo && (
          <PipelineDiagram
            geo={geo}
            stage={stage}
            reduce={reduce}
            mountain={mountain}
            need={need}
            tags={tags}
            tagsOn={tagsOn}
            counts={counts}
            levels={levels}
            changes={changes}
            reviewsShown={reviewsShown}
            verified={verified}
          />
        )}
      </div>
      <div className="shrink-0 pt-3">
        <Caption
          stage={stage}
          step={step}
          phrases={phrases}
          reduce={reduce}
          mountain={mountain}
          verified={verified}
        />
      </div>
    </div>
  );
}

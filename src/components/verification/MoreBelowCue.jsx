import { useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { focusRing } from '@/components/home/utils';

// Floating "there is more below" cue for the Verification page. The pipeline
// walkthrough is tall and the sticky panel makes it feel like the whole page,
// so someone who lands here directly never learns that they can apply to
// verify. The pill sits at the bottom of the viewport with a pulsing dot and
// a bobbing arrow, scrolls to the target on tap, and goes away for good once
// the target section has been seen. Copy is user-facing: no dashes.

export default function MoreBelowCue({ targetId, label }) {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { threshold: 0.2 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);

  if (seen) return null;

  const go = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSeen(true);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 sm:bottom-8">
      <button
        type="button"
        onClick={go}
        className={`pointer-events-auto inline-flex h-11 items-center gap-3 rounded-pill border border-line-strong bg-surface-2/90 pl-4 pr-5 font-mono text-small text-fg shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:border-fg/40 ${focusRing}`}
      >
        <span aria-hidden="true" className="relative flex size-3 items-center justify-center">
          <span className="absolute inline-flex size-full rounded-full bg-live opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-live" />
        </span>
        {label}
        <ArrowDown aria-hidden="true" className="size-4 motion-safe:animate-cue" strokeWidth={1.75} />
      </button>
    </div>
  );
}

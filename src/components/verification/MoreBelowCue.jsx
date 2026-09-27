import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { focusRing } from '@/components/home/utils';
import { scrollToElement } from './scrollToElement';

// Floating "there is more below" cue for the Verification page. The pipeline
// walkthrough is tall and the sticky panel makes it feel like the whole page,
// so someone who lands here directly never learns that they can apply to
// verify. The pill sits at the bottom of the viewport with a pulsing dot and
// a bobbing arrow, scrolls to the target on tap, and goes away once the target
// section has actually been seen (IntersectionObserver). An interrupted scroll
// leaves the pill in place. `onActivate` lets the page stop its own scrolling
// pipeline run so there is one scroll owner. Copy is user-facing: no dashes.

const hasObserver = () => typeof IntersectionObserver !== 'undefined';

export default function MoreBelowCue({ targetId, label, onActivate }) {
  const [seen, setSeen] = useState(false);
  const cancelRef = useRef(() => {});

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || !hasObserver()) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { threshold: 0.2 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);

  // Route exit mid-glide must not keep writing the old page's scroll.
  useEffect(() => () => cancelRef.current(), []);

  if (seen) return null;

  const go = (event) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    onActivate?.();
    // detail === 0 means keyboard activation: hand focus to the section's
    // heading afterwards so the removed button does not strand focus.
    const fromKeyboard = event?.detail === 0;
    cancelRef.current();
    cancelRef.current = scrollToElement(target, {
      onComplete: () => {
        if (!hasObserver()) setSeen(true);
        if (fromKeyboard) {
          const heading = target.querySelector('h2, h1, [data-focus-target]');
          heading?.focus?.({ preventScroll: true });
        }
      },
    });
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

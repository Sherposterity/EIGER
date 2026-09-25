import { motion } from 'motion/react';

// Horizontal track with a white fill. Monochrome only: the fill length and the
// number carry the state, never a colour.
export default function CompatBar({ percent, requiredInKit, requiredCount, transition }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-small text-fg-muted">Compatibility</span>
        <span className="font-mono text-heading tabular-nums text-fg" aria-hidden="true">
          {percent}%
        </span>
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-pill bg-surface-3"
        role="progressbar"
        aria-label="Compatibility"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <motion.div
          className="h-full w-full origin-left rounded-pill bg-fg"
          initial={false}
          animate={{ scaleX: percent / 100 }}
          transition={transition}
        />
      </div>
      <p className="mt-2 font-mono text-eyebrow tracking-normal text-fg-subtle">
        {requiredInKit} of {requiredCount} required items
      </p>
    </div>
  );
}

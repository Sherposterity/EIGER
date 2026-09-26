import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from './styles';
import { weightLabel } from './glyphs';

// The ten items as plain toggle buttons in a fixed reading order, so keyboard
// and screen-reader users get a sensible sequence whatever the diagram shows.
// It also carries the full weight label for every item in the kit.
export default function GearList({ tiles, kit, weights, onToggle, labelId, weightKey, reduce }) {
  return (
    <div className="w-full">
      <h3 id={labelId} className="text-center font-mono text-eyebrow uppercase text-fg-subtle">
        Gear list
      </h3>
      <ul
        aria-labelledby={labelId}
        className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 min-[400px]:grid-cols-2"
      >
        {tiles.map((name) => {
          const inKit = kit.includes(name);
          return (
            <li key={name}>
              <button
                type="button"
                aria-pressed={inKit}
                onClick={() => onToggle(name)}
                className={cn(
                  'flex w-full items-baseline justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-small transition-colors',
                  inKit ? 'text-fg' : 'text-fg-muted hover:text-fg',
                  FOCUS_RING,
                )}
              >
                <span className="min-w-0">
                  <span aria-hidden="true" className="mr-2 inline-block w-3 font-mono text-fg-subtle">
                    {inKit ? '−' : '+'}
                  </span>
                  {name}
                </span>
                {inKit && (
                  <motion.span
                    key={weightKey}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-right font-mono text-eyebrow tracking-normal text-fg-subtle"
                  >
                    {weightLabel(weights[name])}
                  </motion.span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

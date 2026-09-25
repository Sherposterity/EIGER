import { useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from './styles';

const LEVEL_LABEL = { 3: 'Essential', 2: 'Recommended', 1: 'Optional' };

// One gear tile. A real <button aria-pressed>, so Enter/Space and tap toggle
// it; on fine pointers it can also be dragged into (or out of) the kit zone.
export default function GearTile({
  name,
  inKit,
  weight,
  canDrag,
  constraintsRef,
  onToggle,
  onDrop,
  registerRef,
  transition,
  appearDelay,
  weightKey,
  weightDelay,
}) {
  const dragged = useRef(false);

  return (
    <motion.button
      ref={(el) => registerRef(name, el)}
      type="button"
      layoutId={`tryit-tile-${name}`}
      layout
      aria-pressed={inKit}
      drag={canDrag}
      dragConstraints={constraintsRef}
      dragSnapToOrigin
      dragElastic={0.08}
      dragMomentum={false}
      whileDrag={{ scale: 1.03, zIndex: 30 }}
      onPointerDown={() => {
        dragged.current = false;
      }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={(event, info) => {
        const x = typeof event.clientX === 'number' ? event.clientX : info.point.x - window.scrollX;
        const y = typeof event.clientY === 'number' ? event.clientY : info.point.y - window.scrollY;
        onDrop(name, { x, y });
      }}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onToggle(name);
      }}
      initial={appearDelay == null ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition, delay: appearDelay ?? 0 }}
      className={cn(
        'relative flex w-full min-h-14 items-start justify-between gap-3 rounded-md border px-3 py-3 text-left text-small select-none touch-manipulation',
        canDrag && 'cursor-grab active:cursor-grabbing',
        inKit ? 'border-line-strong bg-surface-2' : 'border-line bg-surface-1 hover:bg-surface-2',
        FOCUS_RING,
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-medium text-fg">{name}</span>
        {inKit && (
          <motion.span
            key={weightKey}
            initial={weightDelay == null ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...transition, delay: weightDelay ?? 0 }}
            className="font-mono text-eyebrow tracking-normal text-fg-muted"
          >
            {weight > 0 ? `${LEVEL_LABEL[weight]} +${weight}` : 'Not required for this mountain'}
          </motion.span>
        )}
      </span>
      {inKit ? (
        <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
      ) : (
        <Plus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
      )}
    </motion.button>
  );
}

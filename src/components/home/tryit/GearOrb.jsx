import { useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from './styles';
import { DISPLAY, GLYPH, driftFor, weightLabel } from './glyphs';

// One gear item. It is the same <button aria-pressed> whether it sits on the
// outer ring (a gear circle) or inside the kit (a chip), so keyboard focus
// survives the move. Tap / Enter / Space toggle it; on a fine pointer at
// desktop width it can also be dragged onto (or out of) the kit.
export default function GearOrb({
  name,
  index,
  inKit,
  slot,
  size,
  chipSize,
  desktop,
  drift,
  weight,
  canDrag,
  dragging,
  onToggle,
  onDrop,
  onDragState,
  moveTransition,
  sizeTransition,
  appearDelay,
}) {
  const dragged = useRef(false);
  const Glyph = GLYPH[name];
  const d = inKit ? chipSize : size;

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ zIndex: dragging ? 40 : inKit ? 20 : 10 }}
      initial={appearDelay == null ? false : { opacity: 0, x: slot.x, y: slot.y }}
      animate={{ opacity: 1, x: slot.x, y: slot.y }}
      transition={{ ...moveTransition, opacity: { duration: 0.3, delay: appearDelay ?? 0 } }}
    >
      <div className={inKit ? undefined : 'tryit-dx'} style={driftFor(index, drift)}>
        <div className={inKit ? undefined : 'tryit-dy'}>
          <div className="absolute -translate-x-1/2 -translate-y-1/2">
            <motion.button
              type="button"
              aria-pressed={inKit}
              aria-label={inKit ? `${name}, in kit, ${weightLabel(weight)}` : name}
              title={inKit ? `${name}: ${weightLabel(weight)}` : undefined}
              drag={canDrag}
              dragSnapToOrigin
              dragElastic={0.08}
              dragMomentum={false}
              whileDrag={{ scale: 1.06 }}
              onPointerDown={() => {
                dragged.current = false;
              }}
              onDragStart={() => {
                dragged.current = true;
                onDragState(name);
              }}
              onDragEnd={(event, info) => {
                const x =
                  typeof event.clientX === 'number' ? event.clientX : info.point.x - window.scrollX;
                const y =
                  typeof event.clientY === 'number' ? event.clientY : info.point.y - window.scrollY;
                onDragState(null);
                onDrop(name, { x, y });
              }}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                onToggle(name);
              }}
              initial={false}
              animate={{ width: d, height: d }}
              transition={sizeTransition}
              className={cn(
                'relative flex flex-col items-center justify-center overflow-hidden rounded-full border text-center select-none touch-manipulation',
                canDrag && 'cursor-grab active:cursor-grabbing',
                inKit
                  ? 'border-line-strong bg-surface-3 text-fg'
                  : 'border-line-strong bg-surface-1 text-fg hover:border-fg-subtle hover:bg-surface-2',
                FOCUS_RING,
              )}
            >
              {inKit ? (
                <>
                  <Glyph aria-hidden="true" className={desktop ? 'size-3.5' : 'size-3'} strokeWidth={1.75} />
                  {desktop && (
                    <span aria-hidden="true" className="mt-0.5 font-mono text-[9px] leading-none text-fg-muted">
                      {weight > 0 ? `+${weight}` : '0'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {desktop && (
                    <Glyph aria-hidden="true" className="mb-1 size-4 shrink-0 text-fg-muted" strokeWidth={1.75} />
                  )}
                  <span
                    aria-hidden="true"
                    lang="en"
                    className={cn(
                      'block font-medium leading-[1.15] hyphens-manual [overflow-wrap:normal]',
                      desktop ? 'px-2 text-[10.5px]' : 'px-1.5 text-[9.5px]',
                    )}
                  >
                    {DISPLAY[name] ?? name}
                  </span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

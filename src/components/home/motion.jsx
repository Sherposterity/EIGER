import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { EASE_OUT_EXPO } from './utils';

// Shared motion pieces for the home page. Every one renders its content
// visible and still under prefers-reduced-motion; the animation only ever adds
// a fade or a small offset on top of content that is already laid out.

// Section reveal: fade + 16px rise, 500 ms, once, when a fifth of the block is
// in view. `delay` gives headings their 60 ms line stagger.
export function FadeIn({ as = 'div', delay = 0, className, children, ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] ?? motion.div;
  if (reduce) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Magnetic wrapper for primary buttons: within 24 px of the button the button
// drifts a few pixels toward the pointer on a soft spring, then settles back.
// Only on fine pointers (mouse, trackpad) and never under reduced motion. The
// listener sits on the wrapper itself (button plus its 24 px margin), not on
// the window, so nothing runs while the pointer is elsewhere on the page.
const MAGNET_RADIUS = 24;
const MAX_SHIFT = 6;

export function Magnetic({ children, className = '' }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  const onMove = (event) => {
    if (reduce || event.pointerType !== 'mouse') return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const clamp = (v, half) =>
      Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, (v / (half + MAGNET_RADIUS)) * MAX_SHIFT));
    x.set(clamp(dx, rect.width / 2));
    y.set(clamp(dy, rect.height / 2));
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <span
      className={`inline-flex sm:pointer-fine:-m-6 sm:pointer-fine:p-6 ${className}`}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <motion.span ref={ref} className="inline-flex w-full" style={reduce ? undefined : { x: sx, y: sy }}>
        {children}
      </motion.span>
    </span>
  );
}

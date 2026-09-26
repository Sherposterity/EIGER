import { useEffect, useState } from 'react';

// Counts how many of `marks` (ms after `key` last changed) have passed.
// A new key restarts the count at 0 during render, so no stale beat from the
// previous stage ever paints. Reduced motion: every mark counts as passed.
export default function useStageTimeline(key, marks, reduce) {
  const [state, setState] = useState({ key, step: 0 });
  let step = state.step;
  if (state.key !== key) {
    step = 0;
    setState({ key, step: 0 });
  }

  const count = marks.length;
  const marksKey = marks.join(',');
  useEffect(() => {
    if (reduce || !marksKey) return undefined;
    const timers = marksKey.split(',').map((ms, i) =>
      setTimeout(() => {
        setState((s) => (s.key === key ? { key, step: Math.max(s.step, i + 1) } : s));
      }, Number(ms)),
    );
    return () => timers.forEach(clearTimeout);
  }, [key, marksKey, reduce]);

  return reduce ? count : step;
}

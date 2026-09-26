import { cn } from '@/lib/utils';
import { FOCUS_RING } from './styles';

const SEASONS = [
  { value: 'summer', label: 'Summer' },
  { value: 'winter', label: 'Winter' },
];

// Two-option toggle. Each option is a button with aria-pressed inside a
// labelled group, so it works with Tab + Enter/Space and with a tap.
export default function SeasonToggle({ value, onChange, labelId }) {
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="inline-flex h-9 rounded-md border border-input p-0.5"
    >
      {SEASONS.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s.value)}
            className={cn(
              'rounded-[6px] px-3 text-sm font-medium transition-colors',
              active ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg',
              FOCUS_RING,
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

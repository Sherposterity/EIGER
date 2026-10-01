// Class strings shared by the mountain gear pages (kept out of the .jsx files
// so fast refresh sees components only). Same tokens as PricingPage.
import { focusRing } from '../../components/home/utils';

export const eyebrow = 'font-mono text-eyebrow font-semibold uppercase text-fg-subtle';
export const inlineLink = `rounded-sm text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`;
export const chip = 'inline-flex items-center rounded-pill border border-line-strong px-3 py-1 font-mono text-eyebrow font-semibold uppercase text-fg-muted';
export const fieldClass = `h-11 w-full rounded-md border border-line-strong bg-surface-1 px-3 text-body text-fg placeholder:text-fg-subtle ${focusRing}`;
export const toggleBtn = (active) =>
  `inline-flex h-11 items-center gap-2 rounded-pill px-5 text-small font-semibold transition-colors duration-300 ${
    active ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg'
  } ${focusRing}`;

// Shared class strings for the reviewer portal. Monochrome like the rest of
// the site: state is carried by white versus grey, borders and type weight,
// never by colour, except emerald for "done" (live/success, per the design doc).
import { focusRing } from '@/components/home/utils';

export { focusRing };
export const EYEBROW = 'font-mono text-eyebrow font-semibold uppercase text-fg-subtle';
export const surface = 'rounded-lg border border-line bg-surface-1';
export const btnPrimary = `inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-fg px-6 text-body font-semibold text-bg transition-colors hover:bg-fg/85 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const btnQuiet = `inline-flex h-9 items-center justify-center gap-1.5 rounded-pill border border-line-strong px-4 text-small font-medium text-fg transition-colors hover:border-fg/40 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const btnGhost = `inline-flex items-center gap-1.5 rounded-sm text-small text-fg-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg disabled:opacity-50 ${focusRing}`;
export const field =
  'w-full rounded-md border border-line-strong bg-surface-2 px-3.5 py-2.5 text-body text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-fg/50';
export const fieldSm =
  'w-full rounded-md border border-line-strong bg-surface-2 px-3 py-2 text-small text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-fg/50';

// The database state 'verified' means at least one applied review; the
// portal says "Reviewed" so it matches the app's count badge (Muad
// 2026-10-28: "Reviewed by N climbers", 0 is "Unverified").
export const STATE_LABEL = { open: 'Open', in_progress: 'Claimed', submitted: 'Submitted', verified: 'Reviewed' };

// Allowed fact fields, in strip order, with how to show them.
export const FACTS = [
  { field: 'altitude_m', label: 'Height', unit: 'm' },
  { field: 'approach_start_m', label: 'Approach start', unit: 'm' },
  { field: 'elevation_gain_m', label: 'Gain', unit: 'm' },
  { field: 'elevation_loss_m', label: 'Loss', unit: 'm' },
  { field: 'distance_km', label: 'Distance', unit: 'km' },
  { field: 'duration_days', label: 'Days', unit: '' },
  { field: 'difficulty', label: 'Difficulty', unit: '' },
  { field: 'technical', label: 'Technical', bool: true },
  { field: 'glaciated', label: 'Glaciated', bool: true },
  { field: 'avalanche_terrain', label: 'Avalanche terrain', bool: true },
  { field: 'typical_temperature_min_c', label: 'Low temp', unit: '°C' },
  { field: 'typical_temperature_max_c', label: 'High temp', unit: '°C' },
  { field: 'boots_crampon_rating', label: 'Crampon rating', unit: '' },
  { field: 'climate_zone', label: 'Climate zone', unit: '' },
  { field: 'description', label: 'Description', long: true },
];

export const factValue = (fact, trail) => {
  const v = trail?.[fact.field];
  if (v === null || v === undefined || v === '') return null;
  if (fact.bool) return v ? 'Yes' : 'No';
  if (typeof v === 'number') return `${v.toLocaleString('en-US')}${fact.unit ? ` ${fact.unit}` : ''}`.replace(' °C', '°C');
  return String(v);
};

export const TIERS = [
  ['certified_guide', 'Certified guide'],
  ['aspirant_guide', 'Aspirant guide'],
  ['experienced_amateur', 'Experienced amateur'],
  ['club_leader', 'Club leader'],
  ['other', 'Other'],
];

// The reviewer's two opt-ins (hike migration 180), shared by the board's
// consent panel and the application form. Both default to off.
export const CONSENT_OPTIONS = [
  {
    key: 'show_credentials',
    label: 'Show my name and credentials to climbers in the app',
    hint: 'Your first name, last initial, ranges and certifications appear on the mountains you review. Off: climbers see only your background and the review date.',
  },
  {
    key: 'share_contact',
    label: 'Share my email with other Eiger reviewers',
    hint: 'Reviewers who claim a mountain you reviewed can see your email and ask you about it. Climbers never see it.',
  },
];

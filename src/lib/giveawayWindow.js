// Giveaway window, shared by the home page pill and the giveaway page.
// Kept apart from lib/giveaway.js so the landing bundle does not pull in the
// Supabase client just to know whether the giveaway is open.
// Founder ruling 2026-09-26: the app and the Kickstarter launch October 1; the
// giveaway is the thank you that FOLLOWS the campaign and opens November 15
// (no entries are taken before then) and closes December 31 (46 days, ruled
// 2026-09-26, so the draw does not land on Christmas). Times are UTC so the
// countdown is the same everywhere.
export const LAUNCH_AT = '2026-10-01T16:00:00Z';
export const GIVEAWAY_OPENS_AT = '2026-11-15T16:00:00Z';
export const GIVEAWAY_CLOSES_AT = '2026-12-31T16:00:00Z';

export const phaseFor = (now = Date.now()) => {
  if (now < Date.parse(GIVEAWAY_OPENS_AT)) return 'upcoming';
  if (now >= Date.parse(GIVEAWAY_CLOSES_AT)) return 'closed';
  return 'open';
};

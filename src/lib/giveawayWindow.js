// Giveaway window, shared by the home page pill and the giveaway page.
// Kept apart from lib/giveaway.js so the landing bundle does not pull in the
// Supabase client just to know whether the giveaway is open.
// Founder ruling 2026-09-22: opens October 1, runs 40 days, closes before
// November 15. Times are UTC so the countdown is the same everywhere.
export const GIVEAWAY_OPENS_AT = '2026-10-01T16:00:00Z';
export const GIVEAWAY_CLOSES_AT = '2026-11-10T16:00:00Z';

export const phaseFor = (now = Date.now()) => {
  if (now < Date.parse(GIVEAWAY_OPENS_AT)) return 'upcoming';
  if (now >= Date.parse(GIVEAWAY_CLOSES_AT)) return 'closed';
  return 'open';
};

// The iOS marketing launch (Muad 2026-10-11): the app went live on the App
// Store on 2026-10-09, but EIGER "launches" on iPhone on Sunday 2026-10-12.
// Dates are calendar days in Central time (the founders' clock), so the
// banner and the confetti switch at midnight Central for every visitor.
//
// - Launch day: the home banner says "out on iPhone today".
// - Launch week (launch day through the following Saturday): the banner leads
//   with "Launch week is here!" and each visit (browser tab session) gets one
//   small confetti burst (Muad 2026-10-13). After the window neither shows, so a
//   sponsor opening the site weeks later does not get random confetti.
// - `?launch-preview` in the URL forces both, for checking the look before the
//   day (local preview, or the live site the night before).

export const IOS_LAUNCH_DAY = '2026-10-12';
export const CONFETTI_LAST_DAY = '2026-10-18';
export const PREVIEW_PARAM = 'launch-preview';

const centralDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });

/** The calendar day in Central time, as YYYY-MM-DD. */
export const centralDate = (now = Date.now()) => centralDay.format(new Date(now));

export const isPreview = (search = '') => new URLSearchParams(search).has(PREVIEW_PARAM);

export const isLaunchDay = ({ now = Date.now(), search = '' } = {}) => isPreview(search) || centralDate(now) === IOS_LAUNCH_DAY;

export const inConfettiWindow = ({ now = Date.now(), search = '' } = {}) => {
  if (isPreview(search)) return true;
  const day = centralDate(now);
  return day >= IOS_LAUNCH_DAY && day <= CONFETTI_LAST_DAY;
};

/** Launch week: the banner's "Launch week is here!" runs on the confetti window. */
export const isLaunchWeek = inConfettiWindow;

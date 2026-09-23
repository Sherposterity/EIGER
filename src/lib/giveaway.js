// Eiger launch giveaway: configuration, ticket rules and the entry backend.
//
// Backend is selected by VITE_GIVEAWAY_BACKEND (Codex 2026-09-22: never ship
// the demo by accident):
//   "supabase" calls the `giveaway` edge function (supabase/functions/giveaway)
//              with the anon key; the function holds the service role and does
//              the verifiable checks (app account exists, referral credited).
//   "local"    keeps everything in localStorage so the page can be reviewed
//              end to end with no server; nothing leaves the browser. Also the
//              default in a local `npm run dev` when the variable is unset.
//   unset in a production build -> DISABLED: the page fails closed, shows that
//              entries are not open on this site yet, and takes nothing.
//
// Copy in this file is user-facing: no dashes.

import { supabase } from './supabase';

export const GIVEAWAY = {
  // Founder ruling 2026-09-22: opens October 1, runs 40 days, closes before
  // November 15. Times are UTC so the countdown is the same everywhere.
  opensAt: '2026-10-01T16:00:00Z',
  closesAt: '2026-11-10T16:00:00Z',
  prize: {
    title: 'A piece of mountaineering gear of your choice',
    valueUsd: 500,
    line: 'Ice axe, boots, a shell, a harness. You pick it, up to USD 500 retail, and we buy it from a retailer in your country and ship it to your door.',
  },
  maxTickets: 20,
  links: {
    tiktok: 'https://www.tiktok.com/@eiger_tech',
    instagram: 'https://www.instagram.com/eiger014',
    appStore: 'https://testflight.apple.com/join/j6h2Wxqq',
    playStore: 'https://play.google.com/apps/testing/com.eiger014.eiger',
    // Set when the Kickstarter page exists; until then the task shows as coming soon.
    kickstarter: null,
  },
  sponsor: { name: 'Eiger LLC', place: 'Texas, USA', email: 'business@eiger014.com' },
  excludedRegions: 'Italy, Spain, Belgium, Sweden, Brazil, Australia, Quebec, mainland China, Russia, and any country subject to United States sanctions',
};

// The ticket table. `verifiable` tasks are confirmed on our side; the rest
// are taken on the entrant's word, as every follow-to-enter giveaway does.
export const TASKS = [
  { id: 'entry', label: 'Enter with your email', tickets: 1, verifiable: true, auto: true, detail: 'Your free entry. This is all it takes to be in the draw.' },
  { id: 'app', label: 'Create your Eiger account', tickets: 4, verifiable: true, detail: 'Download Eiger and sign up with the same email you entered with. We confirm the account on our side.' },
  { id: 'referral', label: 'Bring a friend', tickets: 2, perUnit: true, maxUnits: 3, verifiable: true, detail: 'Share your link. Each friend who enters through it, creates an Eiger account with their email, and taps "I signed up" earns you 2 tickets, up to 3 friends.' },
  { id: 'tiktok', label: 'Follow Eiger on TikTok', tickets: 3, verifiable: false, detail: '@eiger_tech' },
  { id: 'instagram', label: 'Follow Eiger on Instagram', tickets: 3, verifiable: false, detail: '@eiger014' },
  { id: 'kickstarter', label: 'Visit the Kickstarter', tickets: 3, verifiable: false, detail: 'Have a look. Backing is never required.' },
];

export const ticketsFor = (progress) =>
  Math.min(
    GIVEAWAY.maxTickets,
    TASKS.reduce((sum, task) => {
      const units = progress?.[task.id] ?? 0;
      if (!units) return sum;
      return sum + task.tickets * (task.perUnit ? Math.min(units, task.maxUnits) : 1);
    }, 0)
  );

export const phaseFor = (now = Date.now()) => {
  if (now < Date.parse(GIVEAWAY.opensAt)) return 'upcoming';
  if (now >= Date.parse(GIVEAWAY.closesAt)) return 'closed';
  return 'open';
};

// HashRouter site: the route lives after the hash, and react-router reads the query from inside it.
export const referralLink = (code) => `${window.location.origin}/#/giveaway?ref=${code}`;

// A referral code survives pre-entry navigation (reading the rules and coming
// back drops the query). Policy: the most recently opened link wins; the
// stored code is consumed by a successful new entry and never applied to an
// existing one (Codex REFERRAL_REVIEW, 2026-09-22).
const PENDING_REF_KEY = 'eiger_giveaway_pending_ref';
export const rememberReferral = (code) => {
  if (!code) return;
  try {
    sessionStorage.setItem(PENDING_REF_KEY, String(code).toUpperCase().slice(0, 12));
  } catch {
    /* private mode */
  }
};
export const pendingReferral = () => {
  try {
    return sessionStorage.getItem(PENDING_REF_KEY) || null;
  } catch {
    return null;
  }
};
export const clearReferral = () => {
  try {
    sessionStorage.removeItem(PENDING_REF_KEY);
  } catch {
    /* ignore */
  }
};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const isValidEmail = (email) => EMAIL_REGEX.test(String(email || '').trim());

const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// ---------------------------------------------------------------------------
// Local backend (review mode). One "entrant" per browser.
// ---------------------------------------------------------------------------
const LOCAL_KEY = 'eiger_giveaway_local_v1';
const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
  } catch {
    return null;
  }
};
const writeLocal = (state) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
  return state;
};

const localBackend = {
  mode: 'local',
  async status() {
    return readLocal();
  },
  async enter({ email, country, consent, ref }) {
    const existing = readLocal();
    // Review mode mirrors production: a known email gets no dashboard back, only the "link sent" reply.
    if (existing && existing.email === email.toLowerCase()) return { existing: true, emailOutcome: 'sent' };
    return writeLocal({
      id: makeCode(),
      email: email.toLowerCase(),
      country,
      consent: !!consent,
      referredBy: ref || null,
      referred: !!ref,
      code: makeCode(),
      magic: makeCode() + makeCode(),
      progress: { entry: 1 },
      emailOutcome: 'sent',
      createdAt: new Date().toISOString(),
    });
  },
  async complete(taskId) {
    const state = readLocal();
    if (!state) throw new Error('Enter first');
    const next = { ...state, progress: { ...state.progress } };
    if (taskId === 'referral') next.progress.referral = Math.min(3, (next.progress.referral ?? 0) + 1);
    else next.progress[taskId] = 1;
    return writeLocal(next);
  },
  async reset() {
    localStorage.removeItem(LOCAL_KEY);
  },
  // Review mode: the "emailed" link is just the stored entry's own code.
  async resume(entryToken) {
    const state = readLocal();
    if (!state || state.magic !== entryToken) throw new Error('That link is not valid. Enter with your email to get a new one.');
    return state;
  },
  async resend() {
    return { ok: true };
  },
};

// ---------------------------------------------------------------------------
// Supabase backend: every call goes through the edge function, which owns the
// service role. The browser never reads or writes the tables directly.
// ---------------------------------------------------------------------------
// supabase-js reports any non-2xx reply as a generic "non-2xx status code"
// error; the function always answers with a plain-language { error } body,
// so read that first and surface it (device, 2026-09-22: an expired dashboard
// link showed the generic text instead of "That link is not valid").
const call = async (action, body) => {
  const { data, error } = await supabase.functions.invoke('giveaway', { body: { action, ...body } });
  if (error) {
    let message = '';
    try {
      const payload = await error.context?.json?.();
      message = payload?.error || '';
    } catch {
      message = '';
    }
    throw new Error(message || 'Something went wrong. Please try again.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
};
const SESSION_KEY = 'eiger_giveaway_session';
const supabaseBackend = {
  mode: 'supabase',
  async status() {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) return null;
    return call('status', { token });
  },
  async enter({ email, country, consent, ref, website }) {
    const data = await call('enter', { email, country, consent, ref, website });
    if (data.existing) return { existing: true, emailOutcome: data.email, retryAfterSeconds: data.retryAfterSeconds };
    localStorage.setItem(SESSION_KEY, data.token);
    // The entrant keeps its address in `email`; the send result lives in `emailOutcome`.
    return { ...data.entrant, emailOutcome: data.email };
  },
  // Opened from the emailed dashboard link on any device.
  async resume(entryToken) {
    const data = await call('resume', { entry: entryToken });
    localStorage.setItem(SESSION_KEY, data.token);
    return data.entrant;
  },
  async resend(email) {
    return call('resend', { email });
  },
  async complete(taskId) {
    const token = localStorage.getItem(SESSION_KEY);
    return call('complete', { token, task: taskId });
  },
  async reset() {
    localStorage.removeItem(SESSION_KEY);
  },
};

// Fail closed: a production build with no backend configured takes no entries.
const disabledBackend = {
  mode: 'disabled',
  async status() {
    return null;
  },
  async enter() {
    throw new Error('Entries are not open on this site yet. Please check back soon.');
  },
  async complete() {
    throw new Error('Entries are not open on this site yet.');
  },
  async resume() {
    throw new Error('Entries are not open on this site yet.');
  },
  async resend() {
    return { ok: true };
  },
  async reset() {},
};

const selected = import.meta.env.VITE_GIVEAWAY_BACKEND;
export const backend =
  selected === 'supabase' ? supabaseBackend : selected === 'local' || (!selected && import.meta.env.DEV) ? localBackend : disabledBackend;

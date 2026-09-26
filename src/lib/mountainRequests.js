// Mountain requests: the backend behind "Which mountain next?".
//
// Same switch as the giveaway (VITE_GIVEAWAY_BACKEND, the site-wide backend
// flag set in the Pages workflow):
//   "supabase" reads the leaderboard through the mountain_request_top RPC
//              (anon key, aggregated counts only) and writes through the
//              mountain-request edge function (rate limited, one vote per
//              peak per hashed IP).
//   "local"    keeps everything in localStorage for review; nothing leaves
//              the browser. Default in `npm run dev` when the flag is unset.
//   unset in a production build -> disabled: the section shows the globe and
//              search but says requests are not open on this site yet.
//
// Copy in this file is user-facing: no dashes.

import { supabase } from './supabase';

const REQUESTED_KEY = 'eiger_mountain_requested';
const LOCAL_KEY = 'eiger_mountain_requests_local';

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or full storage: the request still counted server side */
  }
};

const isId = (v) => typeof v === 'string' && /^Q\d{1,10}$/.test(v);
const isRow = (r) =>
  r && typeof r === 'object' && isId(r.id) && typeof r.name === 'string' && Number.isFinite(r.lat) && Number.isFinite(r.lon) && Number.isFinite(r.requests);

// Peaks this browser already asked for, so the button can say "Requested".
// Storage may hold anything (old shapes, hand edits): keep only valid ids.
export const requestedIds = () => {
  const raw = readJson(REQUESTED_KEY, []);
  return new Set(Array.isArray(raw) ? raw.filter(isId) : []);
};
const rememberRequested = (id) => {
  const ids = requestedIds();
  ids.add(id);
  writeJson(REQUESTED_KEY, Array.from(ids));
};

// The server resolves name, country and coordinates from its own catalogue
// (migration 117); the browser sends only the id.
const toPayload = (peak) => ({ id: peak.id });
const toLocalRow = (peak) => ({ id: peak.id, name: peak.name, country: peak.country, elevation: peak.elevation ?? null, lat: peak.lat, lon: peak.lon });

// supabase-js hides the function's JSON body on non-2xx; read it back.
const functionError = async (error) => {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    /* fall through */
  }
  return 'We could not save that right now. Please try again.';
};

const supabaseBackend = {
  mode: 'supabase',
  async top(limit = 12) {
    const { data, error } = await supabase.rpc('mountain_request_top', { p_limit: limit });
    if (error) throw new Error('The leaderboard is unavailable right now.');
    return (data ?? []).map((r) => ({
      id: r.peak_id,
      name: r.name,
      country: r.country,
      elevation: r.elevation_m,
      lat: r.lat,
      lon: r.lon,
      requests: r.requests,
    }));
  },
  async request(peak, honeypot = '') {
    const { data, error } = await supabase.functions.invoke('mountain-request', { body: { peak: toPayload(peak), website: honeypot } });
    if (error) throw new Error(await functionError(error));
    rememberRequested(peak.id);
    return { requests: data?.requests ?? 1, counted: data?.counted ?? true };
  },
};

const localBackend = {
  mode: 'local',
  async top(limit = 12) {
    const rows = readJson(LOCAL_KEY, {});
    return Object.values(rows && typeof rows === 'object' ? rows : {})
      .filter(isRow)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);
  },
  async request(peak) {
    const stored = readJson(LOCAL_KEY, {});
    const rows = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    const already = requestedIds().has(peak.id);
    const row = isRow(rows[peak.id]) ? rows[peak.id] : { ...toLocalRow(peak), requests: 0 };
    if (!already) row.requests += 1;
    rows[peak.id] = row;
    writeJson(LOCAL_KEY, rows);
    rememberRequested(peak.id);
    return { requests: row.requests, counted: !already };
  },
};

const disabledBackend = {
  mode: 'disabled',
  async top() {
    return [];
  },
  async request() {
    throw new Error('Mountain requests are not open on this site yet.');
  },
};

const selected = import.meta.env.VITE_GIVEAWAY_BACKEND;
export const backend =
  selected === 'supabase' ? supabaseBackend : selected === 'local' || (!selected && import.meta.env.DEV) ? localBackend : disabledBackend;

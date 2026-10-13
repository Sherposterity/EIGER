// Live climber count for the home page's figures line (Muad 2026-10-13).
// The number comes from public.public_climber_count() in Supabase (hike
// migration 164): a security definer function that returns one integer, the
// signed-up accounts minus test, reviewer and deleted ones, and nothing else.
// The page polls it every 30 seconds while the tab is visible; signups arrive
// a few an hour, so that reads as live without hammering the database.

export const CLIMBER_POLL_MS = 30000;

/** The count from the RPC's JSON body, or null when it is not a usable number. */
export function parseClimberCount(body) {
  const n = typeof body === 'number' ? body : Number(body);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function fetchClimberCount({ url, key, signal } = {}) {
  if (!url || !key) return null;
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/rpc/public_climber_count`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal,
  });
  if (!res.ok) return null;
  return parseClimberCount(await res.json());
}

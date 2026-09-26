// Live Kickstarter totals for the goal bar. The database keeps a one-row cache
// (public.kickstarter_stats, refreshed every 15 minutes by an edge function);
// the page reads it with the public anon key and falls back to the values in
// src/data/store-links.json when the fetch fails or nothing has been fetched.

export function mergeStats(fallback, remote) {
  const goal = Number(remote?.goal_usd) > 0 ? Number(remote.goal_usd) : Number(fallback.goal);
  const pledged = Number.isFinite(Number(remote?.pledged_usd)) && remote?.pledged_usd !== null
    ? Number(remote.pledged_usd)
    : Number(fallback.pledged) || 0;
  const backers = Number.isFinite(Number(remote?.backers_count)) && remote?.backers_count !== null
    ? Number(remote.backers_count)
    : null;
  return {
    goal,
    pledged: Math.max(0, pledged),
    backers,
    live: Boolean(remote && remote.fetched_at),
    fetchedAt: remote?.fetched_at ?? null,
  };
}

export async function fetchKickstarterStats({ url, key, signal } = {}) {
  if (!url || !key) return null;
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/kickstarter_stats?select=goal_usd,pledged_usd,backers_count,state,fetched_at&id=eq.1`;
  const res = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal });
  if (!res.ok) throw new Error(`stats ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

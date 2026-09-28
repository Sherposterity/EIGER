// Kickstarter watchdog (run hourly by .github/workflows/kickstarter-watchdog.yml).
// Fails, and GitHub emails the workflow's owner, when the site's goal bar
// would be showing stale or missing numbers during the campaign:
//   - the kickstarter_stats cache was not refreshed in the last 60 minutes
//     (the database job refreshes it every 15), or
//   - Kickstarter reports a state other than live / successful, or
//   - the goal in the cache is not the campaign goal.
// Before launch and a few days after the end it only reports and passes.
// Reads the same public columns the website reads, with the public anon key.
import { campaignPhase, LAUNCH_AT } from '../src/lib/kickstarterStats.js';
import links from '../src/data/store-links.json' with { type: 'json' };

const WATCH_UNTIL = Date.parse('2026-11-19T00:00:00Z'); // campaign ends Nov 16 00:00 UTC (Nov 15 6 PM CST)
const MAX_AGE_MIN = 60;

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const now = Date.now();

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (repo Actions variables).');
  process.exit(1);
}

const res = await fetch(
  `${url.replace(/\/+$/, '')}/rest/v1/kickstarter_stats?select=goal_usd,pledged_usd,backers_count,state,fetched_at&id=eq.1`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
if (!res.ok) {
  console.error(`Could not read kickstarter_stats: HTTP ${res.status}`);
  process.exit(1);
}
const [row] = await res.json();
if (!row) {
  console.error('kickstarter_stats has no row.');
  process.exit(1);
}

const ageMin = row.fetched_at ? Math.round((now - Date.parse(row.fetched_at)) / 60000) : null;
console.log(
  `pledged $${row.pledged_usd ?? '?'} of $${row.goal_usd}, backers ${row.backers_count ?? '?'}, ` +
    `state ${row.state ?? 'none'}, last refresh ${ageMin === null ? 'never' : `${ageMin} min ago`}`,
);

if (now < LAUNCH_AT || now > WATCH_UNTIL) {
  console.log(`Outside the campaign window (${campaignPhase({ state: row.state, now })}); not alerting.`);
  process.exit(0);
}

const problems = [];
if (ageMin === null) problems.push('the cache has never been refreshed from Kickstarter (did the campaign launch?)');
else if (ageMin > MAX_AGE_MIN) problems.push(`the cache is ${ageMin} minutes old (limit ${MAX_AGE_MIN})`);
if (row.state && row.state !== 'live' && row.state !== 'successful') problems.push(`Kickstarter reports state "${row.state}"`);
if (Number(row.goal_usd) !== Number(links.kickstarter_goal_usd)) {
  problems.push(`cache goal $${row.goal_usd} differs from the site's $${links.kickstarter_goal_usd}`);
}

if (problems.length) {
  console.error(`Kickstarter goal bar needs attention:\n- ${problems.join('\n- ')}`);
  console.error('Check: select slug, fetched_at, last_error from public.kickstarter_stats; and the kickstarter-stats edge function logs.');
  process.exit(1);
}
console.log('OK');

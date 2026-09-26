# Kickstarter goal bar: live feed

- Source: Kickstarter's per-project `stats.json?v=1` (undocumented; returns pledged, backers_count, state). Verified 2026-09-25.
- Cache: `public.kickstarter_stats` (one row, id = 1) in the app's Supabase project; hike migration 111. Anon and authenticated may SELECT the totals; writes are service-role only.
- Refresh: edge function `kickstarter-stats` (POST refreshes at most every 5 min; GET returns the row), called every 15 min by pg_cron job `kickstarter-stats-refresh` through pg_net.
- Site: `src/lib/kickstarterStats.js` fetches the row via REST with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (already in the GitHub Actions variables) and merges it over the manual values in `src/data/store-links.json`. Any failure leaves the manual values in place.
- To switch it on once the campaign exists: `update public.kickstarter_stats set slug = 'creator/project-slug' where id = 1;` then trigger once with `curl -X POST https://pebwnpcnawdrytqlzjmb.supabase.co/functions/v1/kickstarter-stats -H "Authorization: Bearer <anon key>"`.
- If Kickstarter changes the endpoint, `last_error` fills in, the numbers stay at the last good fetch, and the site keeps working.

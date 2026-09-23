# Eiger launch giveaway: operations runbook (draft, 2026-09-22)

The page promises a random draw, a published ticket total and method, an
email alternative entry, winner verification and an announcement. This is how
each of those is done. Everything below runs with the service role from an
operator seat (SQL editor or the management API); nothing here is reachable
from the browser.

## Before opening (by 2026-10-01 16:00 UTC)

1. Apply `supabase/giveaway.sql` as the next numbered migration in the hike repo.
2. Deploy `supabase/functions/giveaway` with secrets `RESEND_API_KEY`, `GIVEAWAY_FROM`
   (`Eiger <giveaway@support.eiger014.com>`), `GIVEAWAY_SITE_URL` (`https://eiger014.com`)
   and, once it exists, `GIVEAWAY_KICKSTARTER_URL`. Until that last one is set the
   server refuses the Kickstarter task and the page shows it as coming soon.
3. Set the GitHub Actions repo variable `VITE_GIVEAWAY_BACKEND=supabase` on
   Sherposterity/EIGER. Without it the production build FAILS CLOSED: the page
   shows "entries are not open on this site yet" and takes nothing. The
   browser-only review mode only exists in local development.
4. Send one real entry from a personal address and check: the email arrives,
   the link restores the dashboard on a second device, "I signed up" fails
   for an address with no app account and succeeds for one with a confirmed
   account, and a second entry with the same email returns "already entered"
   without a token.

## Email alternative entries (rules, section 4)

For each "Giveaway entry" email received at business@ during the window:

```sql
insert into public.giveaway_entries (email, country, code, session_token, magic_token, progress, activated_at)
values (lower('<email>'), '<country>', upper(substr(md5(random()::text), 1, 6)),
        encode(gen_random_bytes(24), 'hex'), encode(gen_random_bytes(24), 'hex'), '{"entry": 1}', now());
-- activated_at = now(): the operator received the email, which is the ownership proof the
-- website gets from the activation link.
insert into public.giveaway_events (entry_id, kind, detail)
values ((select id from public.giveaway_entries where email = lower('<email>')), 'entered', '{"via": "email"}');
```

Reply to the sender that they are in with one ticket. They may open the page
and use "Already entered? Email me my dashboard link" to get the same dashboard.

## Pending entries

An entry is pending until its emailed activation link is opened (`activated_at`). Pending entries are not in the draw, the totals or the marketing audience, and cannot complete tasks or earn a referrer credit. Activation only happens before the close; a pending link opened afterwards is told the entry is not in the draw. The first activation also rotates the session token, so a browser that merely typed the address is signed out. If someone writes in that their activation email never arrives, verify the address by replying to it and then activate by hand (before the close only; this also credits any friends who verified while the entry was pending):

```sql
select public.giveaway_activate((select magic_token from public.giveaway_entries where email = lower('<email>')), '2026-11-10T16:00:00Z');
```

## Disqualifying an entry

```sql
update public.giveaway_entries set disqualified_at = now() where email = lower('<email>');
insert into public.giveaway_events (entry_id, kind, detail)
values ((select id from public.giveaway_entries where email = lower('<email>')), 'disqualified', '{"reason": "<why>"}');
```

Disqualified entries keep their rows for the audit trail but are excluded from
the draw and can no longer act on the page. Check `giveaway_referral_credits`
for anything credited from a disqualified entry and reverse it by hand.

## The draw (after 2026-11-10 16:00 UTC, within 7 days)

1. Freeze: confirm `now() > closes_at`; the function refuses new entries and tasks by itself.
2. Read the totals and publish them on the page before drawing:
   `select * from public.giveaway_ticket_totals;`
3. Pick a seed nobody could have chosen in advance and publish it too. Convention:
   the closing price of the S&P 500 on the first trading day after the close,
   as printed by a named public source, e.g. `SPX-2026-11-11-5123.45`.
4. Draw: `select * from public.giveaway_draw('<seed>');`
   The function expands every ticket into one row, orders the rows by
   `md5(seed || entry id || ticket number)` and returns the first. Anyone with
   the seed and the entry list can reproduce it. Record the result:
   `insert into public.giveaway_events (entry_id, kind, detail) values ('<winner id>', 'draw', '{"seed": "<seed>", "total_tickets": <n>}');`
5. If the winner does not respond in 7 days or is ineligible, redraw with the
   same seed and the skipped id: `select * from public.giveaway_draw('<seed>', array['<winner id>']::uuid[]);`

## Marketing emails (winner announcement, reminders)

The dashboard email is transactional. Anything else sent to entrants is marketing under the entry consent and must (1) be sent only to `select * from public.giveaway_marketing_audience` (consenting, not disqualified, not opted out), and (2) carry the same unsubscribe link and List-Unsubscribe headers the function uses (`<function url>?unsubscribe=<unsubscribe_token>`, never the magic token). Opt-outs land in `marketing_opt_out_at` and never affect the entry itself. This is the giveaway list only; it is not a global Eiger suppression list, and app auth emails are unaffected.

## Winner verification and prize

Email the winner from business@: confirm age and country of residence, the
skill-testing question for Canada (a four-step arithmetic question with a
time limit, e.g. "(12 x 5) + 20 - 8, divided by 4", answered within the reply),
the chosen item up to USD 500 retail, and a shipping address. Buy from a
retailer in the winner's country, never through Eiger affiliate links. Keep
the receipt. Delete the address from email once delivered. Announce first
name and country on the giveaway page and by email to entrants who consented.

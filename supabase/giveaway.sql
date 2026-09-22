-- Eiger launch giveaway: storage for entries, referrals and task confirmations.
-- DRAFT 2026-09-22, not applied. Lives in the same Supabase project as the app
-- (the edge function checks auth.users for the app-account task). Only the
-- service role reads or writes these tables; the browser goes through the
-- `giveaway` edge function.

create table if not exists public.giveaway_entries (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  country       text not null,
  consent_at    timestamptz not null default now(),
  code          text not null unique,                 -- referral code in the entrant's link
  referred_by   uuid references public.giveaway_entries(id) on delete set null,
  session_token text not null unique,                 -- returned to the browser after entry
  magic_token   text not null unique,                 -- in the emailed dashboard link; restores the session on any device
  magic_sent_at timestamptz,                          -- last time the link email went out (resend throttle)
  progress      jsonb not null default '{"entry": 1}'::jsonb,
  app_verified_at timestamptz,                        -- set once auth.users has the same email
  ip_hash       text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists giveaway_entries_referred_by_idx on public.giveaway_entries (referred_by);

alter table public.giveaway_entries enable row level security;
-- No policies on purpose: anon and authenticated get nothing; the service role bypasses RLS.
revoke all on public.giveaway_entries from anon, authenticated;

-- Event log for the draw and for auditing ticket changes.
create table if not exists public.giveaway_events (
  id          bigserial primary key,
  entry_id    uuid not null references public.giveaway_entries(id) on delete cascade,
  kind        text not null,       -- entered | task | referral_credit | verified_app | disqualified
  detail      jsonb,
  created_at  timestamptz not null default now()
);
alter table public.giveaway_events enable row level security;
revoke all on public.giveaway_events from anon, authenticated;

-- Ticket count as the app defines it (mirror of lib/giveaway.js ticketsFor).
create or replace function public.giveaway_tickets(p jsonb)
returns int language sql immutable as $$
  select least(20,
    coalesce((p->>'entry')::int, 0) * 1
    + case when coalesce((p->>'app')::int, 0) > 0 then 4 else 0 end
    + least(coalesce((p->>'referral')::int, 0), 3) * 2
    + case when coalesce((p->>'tiktok')::int, 0) > 0 then 3 else 0 end
    + case when coalesce((p->>'instagram')::int, 0) > 0 then 3 else 0 end
    + case when coalesce((p->>'kickstarter')::int, 0) > 0 then 3 else 0 end)
$$;

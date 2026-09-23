-- Eiger launch giveaway: storage, atomic ticket logic, rate limits, the draw.
-- DRAFT 2026-09-22 (rev 2 after Codex WEBSITE_GIVEAWAY_REVIEW), not applied.
-- Lives in the app's Supabase project (the account check reads auth.users).
-- Only the service role touches these objects; the browser goes through the
-- `giveaway` edge function, which calls the functions below so every ticket
-- change is one transaction on a locked row.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.giveaway_entries (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  country         text not null,
  consent_at      timestamptz not null default now(),
  code            text not null unique,                 -- referral code in the entrant's link
  referred_by     uuid references public.giveaway_entries(id) on delete set null,
  session_token   text not null unique,                 -- held by a browser that entered or opened the emailed link
  magic_token     text not null unique,                 -- in the emailed dashboard link
  magic_sent_at   timestamptz,                          -- last dashboard email (resend throttle)
  progress        jsonb not null default '{"entry": 1}'::jsonb,
  app_verified_at timestamptz,                          -- set once auth.users has the same confirmed email
  ip_hash         text,
  user_agent      text,
  disqualified_at timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists giveaway_entries_referred_by_idx on public.giveaway_entries (referred_by);

-- One credit per referred person, ever: the primary key is the referred entry.
create table if not exists public.giveaway_referral_credits (
  referred_entry_id uuid primary key references public.giveaway_entries(id) on delete cascade,
  referrer_id       uuid not null references public.giveaway_entries(id) on delete cascade,
  counted           boolean not null default true,      -- false when the referrer was already at the cap
  created_at        timestamptz not null default now()
);

-- Audit log for the draw and for every ticket change.
create table if not exists public.giveaway_events (
  id          bigserial primary key,
  entry_id    uuid references public.giveaway_entries(id) on delete cascade,
  kind        text not null,       -- entered | task | verified_app | referral_credit | dashboard_email | resumed | disqualified | draw
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists giveaway_events_entry_idx on public.giveaway_events (entry_id, created_at);

-- Request log for server-side rate limits (per hashed IP, per action kind).
create table if not exists public.giveaway_requests (
  id          bigserial primary key,
  ip_hash     text not null,
  kind        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists giveaway_requests_ip_kind_idx on public.giveaway_requests (ip_hash, kind, created_at);

alter table public.giveaway_entries          enable row level security;
alter table public.giveaway_referral_credits enable row level security;
alter table public.giveaway_events           enable row level security;
alter table public.giveaway_requests         enable row level security;
revoke all on public.giveaway_entries, public.giveaway_referral_credits, public.giveaway_events, public.giveaway_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ticket arithmetic (mirror of src/lib/giveaway.js ticketsFor; max 20)
-- ---------------------------------------------------------------------------
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

-- What the browser is allowed to see about its own entry.
create or replace function public.giveaway_public(e public.giveaway_entries)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'id', e.id, 'email', e.email, 'country', e.country, 'code', e.code,
    'progress', e.progress, 'tickets', public.giveaway_tickets(e.progress),
    'createdAt', e.created_at)
$$;

-- ---------------------------------------------------------------------------
-- Rate limit: records the request and says whether it is within the budget.
-- Serialised per (ip, kind) with a transaction-scoped advisory lock so two
-- simultaneous requests cannot both slip under the budget (Codex rev 2).
-- ---------------------------------------------------------------------------
create or replace function public.giveaway_rate_check(p_ip_hash text, p_kind text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_ip_hash is null or p_ip_hash = '' then return true; end if;
  perform pg_advisory_xact_lock(hashtext(p_ip_hash || ':' || p_kind));
  select count(*) into n from public.giveaway_requests
   where ip_hash = p_ip_hash and kind = p_kind and created_at > now() - make_interval(secs => p_window_seconds);
  insert into public.giveaway_requests (ip_hash, kind) values (p_ip_hash, p_kind);
  return n < p_max;
end $$;

-- ---------------------------------------------------------------------------
-- Email lease: claims the right to send the dashboard email for an entry, or
-- reports the cooldown left. One atomic conditional update, so two parallel
-- requests can never both send (Codex rev 2). The caller releases the lease
-- with giveaway_email_release if the provider refused the message.
-- ---------------------------------------------------------------------------
create or replace function public.giveaway_email_lease(p_entry_id uuid, p_cooldown_seconds int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  prev timestamptz;
  claimed boolean;
begin
  update public.giveaway_entries
     set magic_sent_at = now()
   where id = p_entry_id
     and disqualified_at is null
     and (magic_sent_at is null or magic_sent_at < now() - make_interval(secs => p_cooldown_seconds))
  returning true into claimed;
  if coalesce(claimed, false) then
    return jsonb_build_object('claimed', true);
  end if;
  select magic_sent_at into prev from public.giveaway_entries where id = p_entry_id;
  return jsonb_build_object('claimed', false,
    'retry_after_seconds', greatest(0, p_cooldown_seconds - extract(epoch from (now() - coalesce(prev, now())))::int));
end $$;

create or replace function public.giveaway_email_release(p_entry_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.giveaway_entries set magic_sent_at = null where id = p_entry_id;
$$;

-- ---------------------------------------------------------------------------
-- Honor task (tiktok / instagram / kickstarter): one atomic, idempotent update.
-- ---------------------------------------------------------------------------
create or replace function public.giveaway_complete_task(p_token text, p_task text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e public.giveaway_entries;
begin
  if p_task not in ('tiktok', 'instagram', 'kickstarter') then
    return jsonb_build_object('ok', false, 'reason', 'unknown_task');
  end if;
  select * into e from public.giveaway_entries where session_token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_session'); end if;
  if e.disqualified_at is not null then return jsonb_build_object('ok', false, 'reason', 'disqualified'); end if;
  if coalesce((e.progress->>p_task)::int, 0) = 0 then
    update public.giveaway_entries set progress = progress || jsonb_build_object(p_task, 1)
     where id = e.id returning * into e;
    insert into public.giveaway_events (entry_id, kind, detail) values (e.id, 'task', jsonb_build_object('task', p_task));
  end if;
  return jsonb_build_object('ok', true, 'entrant', public.giveaway_public(e));
end $$;

-- ---------------------------------------------------------------------------
-- App account verification + referral credit, in one transaction.
-- Idempotent: a retry after a partial failure still credits the referrer.
-- Locks the entrant first, then the referrer (same order everywhere).
-- ---------------------------------------------------------------------------
create or replace function public.giveaway_verify_app(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e public.giveaway_entries;
  r public.giveaway_entries;
  has_account boolean;
  inserted boolean := false;
begin
  select * into e from public.giveaway_entries where session_token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_session'); end if;
  if e.disqualified_at is not null then return jsonb_build_object('ok', false, 'reason', 'disqualified'); end if;

  if coalesce((e.progress->>'app')::int, 0) = 0 then
    -- Exact, confirmed-email match against the app's users; no paging, no client-side scan.
    select exists (
      select 1 from auth.users u where lower(u.email) = e.email and u.email_confirmed_at is not null
    ) into has_account;
    if not has_account then return jsonb_build_object('ok', false, 'reason', 'no_account'); end if;
    update public.giveaway_entries
       set progress = progress || '{"app": 1}'::jsonb, app_verified_at = now()
     where id = e.id returning * into e;
    insert into public.giveaway_events (entry_id, kind) values (e.id, 'verified_app');
  end if;

  if e.referred_by is not null then
    select * into r from public.giveaway_entries where id = e.referred_by for update;
    if found and r.disqualified_at is null then
      insert into public.giveaway_referral_credits (referred_entry_id, referrer_id, counted)
      values (e.id, r.id, coalesce((r.progress->>'referral')::int, 0) < 3)
      on conflict (referred_entry_id) do nothing;
      get diagnostics inserted = row_count;
      if inserted and coalesce((r.progress->>'referral')::int, 0) < 3 then
        update public.giveaway_entries
           set progress = progress || jsonb_build_object('referral', coalesce((r.progress->>'referral')::int, 0) + 1)
         where id = r.id;
        insert into public.giveaway_events (entry_id, kind, detail) values (r.id, 'referral_credit', jsonb_build_object('from', e.id));
      end if;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'entrant', public.giveaway_public(e));
end $$;

revoke all on function public.giveaway_rate_check(text, text, int, int) from anon, authenticated, public;
revoke all on function public.giveaway_email_lease(uuid, int) from anon, authenticated, public;
revoke all on function public.giveaway_email_release(uuid) from anon, authenticated, public;
revoke all on function public.giveaway_complete_task(text, text) from anon, authenticated, public;
revoke all on function public.giveaway_verify_app(text) from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- The draw. Deterministic given a published seed: every ticket becomes one
-- row, rows are ordered by md5(seed || entry id || ticket number), the first
-- row wins. Run once after close; publish the seed and the totals.
-- ---------------------------------------------------------------------------
create or replace view public.giveaway_ticket_totals as
  select count(*) as entrants, sum(public.giveaway_tickets(progress)) as tickets
    from public.giveaway_entries where disqualified_at is null;

create or replace function public.giveaway_draw(p_seed text, p_skip uuid[] default '{}')
returns table (entry_id uuid, email text, country text, tickets int, total_tickets bigint)
language sql security definer set search_path = public as $$
  with pool as (
    select e.id, e.email, e.country, public.giveaway_tickets(e.progress) as tickets
      from public.giveaway_entries e
     where e.disqualified_at is null and not (e.id = any (p_skip))
  ),
  expanded as (
    select p.id, p.email, p.country, p.tickets, g.n
      from pool p, generate_series(1, p.tickets) as g(n)
  )
  select x.id, x.email, x.country, x.tickets, (select count(*) from expanded) as total_tickets
    from expanded x
   order by md5(p_seed || x.id::text || x.n::text)
   limit 1
$$;
revoke all on function public.giveaway_draw(text, uuid[]) from anon, authenticated, public;

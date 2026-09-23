"""Live battery for the giveaway backend (migration 106 / supabase/giveaway.sql).

Runs against the real project through the management API. Each SQL request is
its own connection, so Python threads are genuinely parallel transactions.
Creates throwaway confirmed auth users (gvt-*@eiger014.com) and entries, then
deletes them all in `finally`. Prints only counts and PASS/FAIL. Exits nonzero
if any expected check is missing or failed, or if any unexpected exception
happens (Codex WEBSITE_GIVEAWAY_CONCURRENCY_REVIEW, 2026-09-22).

Credentials come from eiger-ops/scripts/secrets.py (in memory, never printed).
Usage: python supabase/tests/giveaway_live_battery.py
"""
import json
import sys
import threading
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Rishav Akilla\eiger-ops\scripts")
from secrets import secret  # noqa: E402

REF = "pebwnpcnawdrytqlzjmb"
MGMT = secret("supabase.txt", r"sbp_[A-Za-z0-9_]+")
SERVICE = secret("supabase.txt", r"(?<=SUPABASE_SERVICE_ROLE_KEY=)\S+").strip().strip('"')
BASE = f"https://{REF}.supabase.co"

EXPECTED_CHECKS = [
    "concurrent distinct tasks both persist",
    "duplicate verification: both ok, one credit, one verified event",
    "referral cap: 4 friends -> referral=3, 3 of 4 credits counted",
    "tickets arithmetic = 13",
    "no confirmed account: rejected, nothing written",
    "rollback: verify_app writes are undone when the transaction fails afterwards",
    "disqualified entry cannot complete tasks",
    "email lease: 5 parallel -> exactly 1 claimed, 4 throttled, no errors",
    "email lease: release then claim again",
    "rate check: 10 parallel, budget 5 -> exactly 5 true, 5 false, no errors",
    "draw: deterministic, total = independent eligible sum, never the disqualified entry, skip works",
    "anon: SELECT on giveaway_entries denied",
    "authenticated: SELECT on giveaway_entries denied",
    "anon: EXECUTE giveaway_complete_task denied",
    "authenticated: EXECUTE giveaway_verify_app denied",
]
results = {}


def check(name, ok, detail=""):
    assert name in EXPECTED_CHECKS, f"unexpected check name: {name}"
    results[name] = ok
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


class DbError(Exception):
    pass


def sql(q):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": q}).encode(),
        headers={"Authorization": f"Bearer {MGMT}", "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise DbError(e.read().decode()[:400]) from None


def expect_db_error(q, must_contain):
    """Runs q expecting a database error whose text contains must_contain."""
    try:
        sql(q)
        return False, "query succeeded"
    except DbError as e:
        return must_contain.lower() in str(e).lower(), str(e)[:120]


def parallel(fns):
    out = [None] * len(fns)

    def run(i, f):
        try:
            out[i] = ("ok", f())
        except Exception as e:  # noqa: BLE001
            out[i] = ("error", str(e)[:120])

    ts = [threading.Thread(target=run, args=(i, f)) for i, f in enumerate(fns)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    return out


def admin_create_user(email):
    req = urllib.request.Request(
        f"{BASE}/auth/v1/admin/users",
        data=json.dumps({"email": email, "password": "Gv-test-" + email.split("@")[0] + "-9x!", "email_confirm": True}).encode(),
        headers={"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())["id"]


def admin_delete_user(uid):
    req = urllib.request.Request(f"{BASE}/auth/v1/admin/users/{uid}", headers={"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}"}, method="DELETE")
    try:
        urllib.request.urlopen(req, timeout=60).read()
    except Exception:  # noqa: BLE001
        pass


TEST = ["gvt-referrer", "gvt-friend1", "gvt-friend2", "gvt-friend3", "gvt-friend4", "gvt-noacct", "gvt-rollback"]
emails = {t: f"{t}@eiger014.com" for t in TEST}
uids = {}
exit_code = 1
try:
    for t in TEST:
        if t != "gvt-noacct":
            uids[t] = admin_create_user(emails[t])
    print(f"created {len(uids)} confirmed test auth users")

    def mk(t, referred_by=None):
        ref = f"(select id from public.giveaway_entries where email='{emails['gvt-referrer']}')" if referred_by else "null"
        return sql(f"""insert into public.giveaway_entries (email, country, code, session_token, magic_token, referred_by)
                       values ('{emails[t]}', 'Test', upper(substr(md5('{t}'),1,6)), 'tok-{t}', 'magic-{t}', {ref}) returning id""")[0]["id"]

    ids = {"gvt-referrer": mk("gvt-referrer")}
    for t in TEST[1:]:
        ids[t] = mk(t, referred_by=True)
    print(f"created {len(ids)} test entries")

    # 1. concurrent distinct honor tasks on one entry
    r = parallel([lambda: sql("select public.giveaway_complete_task('tok-gvt-referrer','tiktok') as r")[0]["r"],
                  lambda: sql("select public.giveaway_complete_task('tok-gvt-referrer','instagram') as r")[0]["r"]])
    p = sql(f"select progress from public.giveaway_entries where email='{emails['gvt-referrer']}'")[0]["progress"]
    check("concurrent distinct tasks both persist", all(s == "ok" for s, _ in r) and p.get("tiktok") == 1 and p.get("instagram") == 1, json.dumps(p))

    # 2. duplicate app verification in parallel (same friend twice)
    r = parallel([lambda: sql("select public.giveaway_verify_app('tok-gvt-friend1') as r")[0]["r"]] * 2)
    oks = sum(1 for s, v in r if s == "ok" and v.get("ok"))
    credits = sql(f"select count(*) c from public.giveaway_referral_credits where referred_entry_id='{ids['gvt-friend1']}'")[0]["c"]
    events = sql(f"select count(*) c from public.giveaway_events where entry_id='{ids['gvt-friend1']}' and kind='verified_app'")[0]["c"]
    check("duplicate verification: both ok, one credit, one verified event", oks == 2 and credits == 1 and events == 1, f"oks={oks} credits={credits} events={events}")

    # 3. three more friends verify concurrently: cap at 3 counted
    r = parallel([lambda t=t: sql(f"select public.giveaway_verify_app('tok-{t}') as r")[0]["r"] for t in ["gvt-friend2", "gvt-friend3", "gvt-friend4"]])
    ref = sql(f"select progress, public.giveaway_tickets(progress) t from public.giveaway_entries where email='{emails['gvt-referrer']}'")[0]
    cr = sql(f"select count(*) filter (where counted) as counted, count(*) as total from public.giveaway_referral_credits where referrer_id='{ids['gvt-referrer']}'")[0]
    check("referral cap: 4 friends -> referral=3, 3 of 4 credits counted", all(s == "ok" for s, _ in r) and ref["progress"].get("referral") == 3 and cr["counted"] == 3 and cr["total"] == 4, f"progress={json.dumps(ref['progress'])} credits={cr}")
    check("tickets arithmetic = 13", ref["t"] == 13, f"tickets={ref['t']}")

    # 4. no confirmed account -> rejected, nothing written
    v = sql("select public.giveaway_verify_app('tok-gvt-noacct') as r")[0]["r"]
    p = sql(f"select progress, app_verified_at from public.giveaway_entries where email='{emails['gvt-noacct']}'")[0]
    check("no confirmed account: rejected, nothing written", v.get("reason") == "no_account" and not p["progress"].get("app") and p["app_verified_at"] is None)

    # 5. rollback: run verify_app (which writes app progress, timestamp, event, referral credit, referrer progress)
    #    in one transaction that then fails; every write must be undone. The management API executes a request as
    #    one transaction, so an error after the call rolls the whole thing back. No fault injection in the function.
    before = sql(f"""select (select progress from public.giveaway_entries where id='{ids['gvt-referrer']}') as referrer,
                            (select count(*) from public.giveaway_referral_credits) as credits,
                            (select count(*) from public.giveaway_events) as events""")[0]
    ok_err, detail = expect_db_error(f"select public.giveaway_verify_app('tok-gvt-rollback'); select 1/0;", "division by zero")
    after = sql(f"""select (select progress from public.giveaway_entries where id='{ids['gvt-referrer']}') as referrer,
                           (select count(*) from public.giveaway_referral_credits) as credits,
                           (select count(*) from public.giveaway_events) as events,
                           (select progress from public.giveaway_entries where email='{emails['gvt-rollback']}') as entrant,
                           (select app_verified_at from public.giveaway_entries where email='{emails['gvt-rollback']}') as verified_at""")[0]
    unchanged = ok_err and after["referrer"] == before["referrer"] and after["credits"] == before["credits"] and after["events"] == before["events"] and not after["entrant"].get("app") and after["verified_at"] is None
    check("rollback: verify_app writes are undone when the transaction fails afterwards", unchanged, f"error_seen={ok_err} credits {before['credits']}->{after['credits']} events {before['events']}->{after['events']}")
    # and prove the same call commits when the transaction succeeds
    v = sql("select public.giveaway_verify_app('tok-gvt-rollback') as r")[0]["r"]
    assert v.get("ok"), "verify_app should succeed on the confirmed rollback fixture after the rolled-back attempt"

    # 6. disqualification
    sql(f"update public.giveaway_entries set disqualified_at = now() where email='{emails['gvt-friend4']}'")
    v = sql("select public.giveaway_complete_task('tok-gvt-friend4','tiktok') as r")[0]["r"]
    check("disqualified entry cannot complete tasks", v.get("reason") == "disqualified")

    # 7. parallel email lease: exactly one claim, no errors
    r = parallel([lambda: sql(f"select public.giveaway_email_lease('{ids['gvt-referrer']}', 600) as r")[0]["r"]] * 5)
    claimed = sum(1 for s, v in r if s == "ok" and v.get("claimed") is True)
    throttled = sum(1 for s, v in r if s == "ok" and v.get("claimed") is False and v.get("retry_after_seconds", 0) > 0)
    errors = sum(1 for s, _ in r if s != "ok")
    check("email lease: 5 parallel -> exactly 1 claimed, 4 throttled, no errors", claimed == 1 and throttled == 4 and errors == 0, f"claimed={claimed} throttled={throttled} errors={errors}")
    sql(f"select public.giveaway_email_release('{ids['gvt-referrer']}')")
    v = sql(f"select public.giveaway_email_lease('{ids['gvt-referrer']}', 600) as r")[0]["r"]
    check("email lease: release then claim again", v.get("claimed") is True)

    # 8. parallel rate check: 10 requests, budget 5 -> exactly 5 true and 5 false, no errors
    r = parallel([lambda: sql("select public.giveaway_rate_check('iphash-test','enter',5,3600) as r")[0]["r"]] * 10)
    trues = sum(1 for s, v in r if s == "ok" and v is True)
    falses = sum(1 for s, v in r if s == "ok" and v is False)
    errors = sum(1 for s, _ in r if s != "ok")
    check("rate check: 10 parallel, budget 5 -> exactly 5 true, 5 false, no errors", trues == 5 and falses == 5 and errors == 0, f"true={trues} false={falses} errors={errors}")

    # 9. draw: independent eligible total, never the disqualified fixture, deterministic, skip works
    eligible = sql("select id, public.giveaway_tickets(progress) t from public.giveaway_entries where disqualified_at is null")
    indep_total = sum(row["t"] for row in eligible)
    view_total = sql("select tickets from public.giveaway_ticket_totals")[0]["tickets"]
    d1 = sql("select entry_id, total_tickets from public.giveaway_draw('seed-test-1')")[0]
    d2 = sql("select entry_id, total_tickets from public.giveaway_draw('seed-test-1')")[0]
    d3 = sql(f"select entry_id from public.giveaway_draw('seed-test-1', array['{d1['entry_id']}']::uuid[])")[0]
    disq = ids["gvt-friend4"]
    check("draw: deterministic, total = independent eligible sum, never the disqualified entry, skip works",
          d1 == d2 and d1["total_tickets"] == indep_total == view_total and d1["entry_id"] != disq and d3["entry_id"] not in (disq, d1["entry_id"]),
          f"independent={indep_total} view={view_total} draw={d1['total_tickets']}")

    # 10. permissions, each expected failure isolated and inspected
    ok, d = expect_db_error("set role anon; select count(*) from public.giveaway_entries;", "permission denied")
    check("anon: SELECT on giveaway_entries denied", ok, d)
    ok, d = expect_db_error("set role authenticated; select count(*) from public.giveaway_entries;", "permission denied")
    check("authenticated: SELECT on giveaway_entries denied", ok, d)
    ok, d = expect_db_error("set role anon; select public.giveaway_complete_task('tok-gvt-referrer','tiktok');", "permission denied")
    check("anon: EXECUTE giveaway_complete_task denied", ok, d)
    ok, d = expect_db_error("set role authenticated; select public.giveaway_verify_app('tok-gvt-referrer');", "permission denied")
    check("authenticated: EXECUTE giveaway_verify_app denied", ok, d)

    missing = [n for n in EXPECTED_CHECKS if n not in results]
    failed = [n for n, ok in results.items() if not ok]
    if missing:
        print("MISSING CHECKS:", missing)
    exit_code = 0 if not missing and not failed else 1
except Exception as e:  # noqa: BLE001
    print("UNEXPECTED ERROR:", str(e)[:400])
    exit_code = 2
finally:
    n = sql("with d as (delete from public.giveaway_entries where email like 'gvt-%@eiger014.com' returning id) select count(*) c from d")[0]["c"]
    m = sql("with d as (delete from public.giveaway_requests where ip_hash='iphash-test' returning id) select count(*) c from d")[0]["c"]
    for uid in uids.values():
        admin_delete_user(uid)
    left = sql("select (select count(*) from public.giveaway_entries where email like 'gvt-%') e, (select count(*) from auth.users where email like 'gvt-%@eiger014.com') u")[0]
    print(f"cleanup: deleted {n} entries, {m} rate rows, {len(uids)} test users; remaining test entries={left['e']} test users={left['u']}")
    passed = sum(1 for ok in results.values() if ok)
    print(f"RESULT: {passed}/{len(EXPECTED_CHECKS)} checks passed; exit {exit_code}")
    sys.exit(exit_code)

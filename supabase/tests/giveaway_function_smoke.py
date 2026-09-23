"""Smoke test for the deployed `giveaway` edge function, with assertions.

Requires the function to be deployed and, before Oct 1, the secret
GIVEAWAY_OPENS_AT set to a past date for the run (unset it afterwards; the
`--window-closed` mode checks that the window is enforced and creates nothing).
Sends real emails through Resend to the addresses given, so use throwaway
addresses. Cleans up ONLY the entries it created (tracked by id). Rate-limit
rows are never deleted by this script: a sequence or time boundary is not
ownership, and the rate window ignores old rows on its own (Codex
WEBSITE_GIVEAWAY_TEST_SCOPE_RECHECK). Exits nonzero on any failed or missing
check or any unexpected exception.

Usage: python supabase/tests/giveaway_function_smoke.py <email-without-app-account> <email-with-confirmed-app-account> [--window-closed]
"""
import json
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Rishav Akilla\eiger-ops\scripts")
from secrets import secret  # noqa: E402

REF = "pebwnpcnawdrytqlzjmb"
anon = secret("supabase.txt", r"(?<=SUPABASE_ANON_KEY=)\S+").strip().strip('"')
MGMT = secret("supabase.txt", r"sbp_[A-Za-z0-9_]+")
URL = f"https://{REF}.supabase.co/functions/v1/giveaway"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
if len(args) < 2:
    print(__doc__)
    sys.exit(2)
NOACCT, ACCT = args[0].lower(), args[1].lower()
WINDOW_CLOSED = "--window-closed" in sys.argv

EXPECTED = ["window closed: enter refused"] if WINDOW_CLOSED else [
    "enter: new entry with token, 1 ticket, email sent",
    "enter again: existing, throttled, no token or entrant",
    "status: returns own entry with code",
    "app task without a confirmed account: refused, tickets unchanged",
    "kickstarter task refused while unconfigured",
    "tiktok task: recorded once, tickets 4",
    "tiktok task again: idempotent, still 4",
    "resume via the emailed token: session restored",
    "resume with a bad link: 404, no token",
    "referred friend enters (confirmed account)",
    "friend's app task: verified, tickets 5",
    "referrer credited: 4 + 2 = 6 tickets",
    "honeypot: fake success, nothing stored",
    "resend: uniform reply for entered and unknown emails",
    "unsubscribe: GET redirects to the site and records the opt-out; entry stays valid",
    "unsubscribe: one-click POST answers 200; unknown token redirects with 0",
]
results = {}
created_entry_ids = []
unexpected = None


def check(name, ok, detail=""):
    assert name in EXPECTED, f"unexpected check name: {name}"
    results[name] = ok
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


def call(body):
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"apikey": anon, "Authorization": f"Bearer {anon}", "Content-Type": "application/json", "Origin": "https://eiger014.com"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def sql(q):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{REF}/database/query", data=json.dumps({"query": q}).encode(),
                                 headers={"Authorization": f"Bearer {MGMT}", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())


def track(resp):
    eid = ((resp or {}).get("entrant") or {}).get("id")
    if eid and eid not in created_entry_ids:
        created_entry_ids.append(eid)


# Preflight: never touch a real entrant. Fixture addresses must be unused.
pre = sql(f"select count(*) as used from public.giveaway_entries where email in ('{NOACCT}','{ACCT}','bot@example.com')")[0]
if pre["used"]:
    print(f"ABORT: {pre['used']} fixture address(es) already have an entry; choose unused throwaway addresses.")
    sys.exit(2)

try:
    if WINDOW_CLOSED:
        st, d = call({"action": "enter", "email": NOACCT, "country": "Test", "consent": True})
        err = d.get("error") or ""
        check("window closed: enter refused", st == 400 and ("October 1" in err or "closed" in err) and "token" not in d, f"{st} {err}")
    else:
        st, d = call({"action": "enter", "email": NOACCT, "country": "Test", "consent": True})
        track(d)
        check("enter: new entry with token, 1 ticket, email sent", st == 200 and bool(d.get("token")) and (d.get("entrant") or {}).get("tickets") == 1 and d.get("email") == "sent", f"{st} email={d.get('email')}")
        token = d.get("token")

        st, d2 = call({"action": "enter", "email": NOACCT, "country": "Test", "consent": True})
        check("enter again: existing, throttled, no token or entrant", st == 200 and d2.get("existing") is True and d2.get("email") == "throttled" and "token" not in d2 and "entrant" not in d2, f"{st} {d2.get('email')} retry={d2.get('retryAfterSeconds')}")

        st, d3 = call({"action": "status", "token": token})
        check("status: returns own entry with code", st == 200 and (d3 or {}).get("tickets") == 1 and bool((d3 or {}).get("code")))

        st, d4 = call({"action": "complete", "token": token, "task": "app"})
        check("app task without a confirmed account: refused, tickets unchanged", st == 400 and "No confirmed Eiger account" in (d4.get("error") or ""))

        st, d5 = call({"action": "complete", "token": token, "task": "kickstarter"})
        check("kickstarter task refused while unconfigured", st == 400 and "not open yet" in (d5.get("error") or ""))

        st, d6 = call({"action": "complete", "token": token, "task": "tiktok"})
        check("tiktok task: recorded once, tickets 4", st == 200 and d6.get("tickets") == 4)
        st, d7 = call({"action": "complete", "token": token, "task": "tiktok"})
        check("tiktok task again: idempotent, still 4", st == 200 and d7.get("tickets") == 4)

        magic = sql(f"select magic_token from public.giveaway_entries where id='{created_entry_ids[0]}'")[0]["magic_token"]
        st, d8 = call({"action": "resume", "entry": magic})
        check("resume via the emailed token: session restored", st == 200 and bool(d8.get("token")) and (d8.get("entrant") or {}).get("tickets") == 4)
        st, d9 = call({"action": "resume", "entry": "NOT-A-REAL-TOKEN"})
        check("resume with a bad link: 404, no token", st == 404 and "token" not in d9)

        st, da = call({"action": "enter", "email": ACCT, "country": "Test", "consent": True, "ref": (d3 or {}).get("code")})
        track(da)
        check("referred friend enters (confirmed account)", st == 200 and bool(da.get("token")))
        st, db = call({"action": "complete", "token": da.get("token"), "task": "app"})
        check("friend's app task: verified, tickets 5", st == 200 and db.get("tickets") == 5)
        st, dc = call({"action": "status", "token": token})
        check("referrer credited: 4 + 2 = 6 tickets", st == 200 and (dc or {}).get("tickets") == 6, f"tickets={(dc or {}).get('tickets')}")

        st, de = call({"action": "enter", "email": "bot@example.com", "country": "X", "consent": True, "website": "spam"})
        track(de)
        stored = sql("select count(*) c from public.giveaway_entries where email='bot@example.com'")[0]["c"]
        check("honeypot: fake success, nothing stored", st == 200 and de.get("entrant") is None and stored == 0)

        st, df = call({"action": "resend", "email": NOACCT})
        st2, dg = call({"action": "resend", "email": "never-entered@example.com"})
        check("resend: uniform reply for entered and unknown emails", st == 200 and st2 == 200 and df == dg == {"ok": True})

        # unsubscribe: footer link (GET) and RFC 8058 one-click (POST)
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **k):
                return None
        opener = urllib.request.build_opener(NoRedirect)
        def raw(method):
            req = urllib.request.Request(f"{URL}?unsubscribe={magic}", data=b"List-Unsubscribe=One-Click" if method == "POST" else None, method=method,
                                         headers={"Content-Type": "application/x-www-form-urlencoded"} if method == "POST" else {})
            try:
                with opener.open(req, timeout=60) as r:
                    return r.status, r.headers.get("Location", ""), r.read().decode()[:40]
            except urllib.error.HTTPError as e:
                return e.code, e.headers.get("Location", ""), ""
        st, loc, _ = raw("GET")
        opt = sql(f"select marketing_opt_out_at is not null as out, disqualified_at is null as valid, public.giveaway_tickets(progress) t from public.giveaway_entries where id='{created_entry_ids[0]}'")[0]
        check("unsubscribe: GET redirects to the site and records the opt-out; entry stays valid", st == 302 and loc.endswith("/#/giveaway?unsubscribed=1") and opt["out"] and opt["valid"] and opt["t"] == 6, f"{st} {loc} opt={opt}")
        st, _, body = raw("POST")
        req = urllib.request.Request(f"{URL}?unsubscribe=NOT-A-TOKEN", method="GET")
        try:
            with opener.open(req, timeout=60) as r:
                st2, loc2 = r.status, r.headers.get("Location", "")
        except urllib.error.HTTPError as e:
            st2, loc2 = e.code, e.headers.get("Location", "")
        check("unsubscribe: one-click POST answers 200; unknown token redirects with 0", st == 200 and body == "ok" and st2 == 302 and loc2.endswith("unsubscribed=0"), f"post={st} {body} unknown={st2} {loc2}")
except Exception as e:  # noqa: BLE001
    unexpected = f"{type(e).__name__}: {str(e)[:300]}"
    print("UNEXPECTED ERROR:", unexpected)
finally:
    # Only what this run created: tracked entry ids (events and credits cascade). Rate-limit rows are left alone.
    if created_entry_ids:
        idlist = ",".join(f"'{i}'" for i in created_entry_ids)
        n = sql(f"with d as (delete from public.giveaway_entries where id in ({idlist}) returning id) select count(*) c from d")[0]["c"]
    else:
        n = 0
    print(f"cleanup: deleted {n} entries created by this run; rate-limit rows untouched")

missing = [x for x in EXPECTED if x not in results]
failed = [x for x, ok in results.items() if not ok]
if unexpected:
    print(f"RESULT: unexpected error, {len(results)}/{len(EXPECTED)} checks ran")
    sys.exit(2)
if missing or failed:
    print(f"RESULT: {len(failed)} failed, {len(missing)} missing: {failed + missing}")
    sys.exit(1)
print(f"RESULT: all {len(EXPECTED)} checks passed")
sys.exit(0)

"""Smoke test for the deployed `giveaway` edge function, with assertions.

Note: the function rate-limits entries per IP (20 per hour) and this script
never clears rate rows, so repeated runs from one machine within an hour can
hit 429 on the enter steps; wait or run from another network.

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
    "enter: new entry with token, 1 ticket, email sent, pending",
    "enter again: existing, throttled, no token or entrant",
    "status: returns own entry with code, still pending",
    "pending: tiktok task refused with an activation message, nothing recorded",
    "resume via the emailed token: activates once, new session issued",
    "old pending session is dead after activation: status empty, task refused",
    "app task without a confirmed account: refused, tickets unchanged",
    "kickstarter task refused while unconfigured",
    "tiktok task: recorded once, tickets 4",
    "tiktok task again: idempotent, still 4",
    "resume again: idempotent, still one activated event, tickets kept",
    "resume with a bad link: 404, no token",
    "referred friend enters (confirmed account), pending",
    "regression: friend's app task while pending is refused, no app or referral credit",
    "friend activates via the emailed token, then app task: verified, tickets 5",
    "referrer credited: 4 + 2 = 6 tickets",
    "honeypot: fake success, nothing stored",
    "resend: uniform reply for entered and unknown emails",
    "unsubscribe: GET shows a confirmation page and changes nothing",
    "unsubscribe: one-click POST on a fresh fixture opts out, entry and tickets intact, gone from the audience",
    "unsubscribe: form POST redirects to the site; unknown token 404; repeat POST idempotent",
    "unsubscribe: multipart one-click POST on a fresh fixture answers 200 directly and opts out",
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
        check("enter: new entry with token, 1 ticket, email sent, pending", st == 200 and bool(d.get("token")) and (d.get("entrant") or {}).get("tickets") == 1 and d.get("email") == "sent" and (d.get("entrant") or {}).get("activated") is False, f"{st} email={d.get('email')} activated={(d.get('entrant') or {}).get('activated')}")
        token = d.get("token")

        st, d2 = call({"action": "enter", "email": NOACCT, "country": "Test", "consent": True})
        check("enter again: existing, throttled, no token or entrant", st == 200 and d2.get("existing") is True and d2.get("email") == "throttled" and "token" not in d2 and "entrant" not in d2, f"{st} {d2.get('email')} retry={d2.get('retryAfterSeconds')}")

        st, d3 = call({"action": "status", "token": token})
        check("status: returns own entry with code, still pending", st == 200 and (d3 or {}).get("tickets") == 1 and bool((d3 or {}).get("code")) and (d3 or {}).get("activated") is False)

        st, dp = call({"action": "complete", "token": token, "task": "tiktok"})
        prog = sql(f"select progress from public.giveaway_entries where id='{created_entry_ids[0]}'")[0]["progress"]
        check("pending: tiktok task refused with an activation message, nothing recorded", st == 403 and "activate" in (dp.get("error") or "") and not prog.get("tiktok"), f"{st} {dp.get('error')}")

        magic = sql(f"select magic_token from public.giveaway_entries where id='{created_entry_ids[0]}'")[0]["magic_token"]
        st, d8 = call({"action": "resume", "entry": magic})
        act_events = sql(f"select count(*) c from public.giveaway_events where entry_id='{created_entry_ids[0]}' and kind='activated'")[0]["c"]
        check("resume via the emailed token: activates once, new session issued", st == 200 and bool(d8.get("token")) and d8.get("token") != token and (d8.get("entrant") or {}).get("activated") is True and act_events == 1, f"{st} events={act_events} rotated={d8.get('token') != token}")
        old_token, token = token, d8.get("token")
        st, dz = call({"action": "status", "token": old_token})
        st2, dy = call({"action": "complete", "token": old_token, "task": "tiktok"})
        check("old pending session is dead after activation: status empty, task refused", st == 200 and not dz and st2 == 401, f"status={st} {dz!r} task={st2}")

        st, d4 = call({"action": "complete", "token": token, "task": "app"})
        check("app task without a confirmed account: refused, tickets unchanged", st == 400 and "No confirmed Eiger account" in (d4.get("error") or ""))

        st, d5 = call({"action": "complete", "token": token, "task": "kickstarter"})
        check("kickstarter task refused while unconfigured", st == 400 and "not open yet" in (d5.get("error") or ""))

        st, d6 = call({"action": "complete", "token": token, "task": "tiktok"})
        check("tiktok task: recorded once, tickets 4", st == 200 and d6.get("tickets") == 4)
        st, d7 = call({"action": "complete", "token": token, "task": "tiktok"})
        check("tiktok task again: idempotent, still 4", st == 200 and d7.get("tickets") == 4)

        st, d8 = call({"action": "resume", "entry": magic})
        act_events = sql(f"select count(*) c from public.giveaway_events where entry_id='{created_entry_ids[0]}' and kind='activated'")[0]["c"]
        check("resume again: idempotent, still one activated event, tickets kept", st == 200 and d8.get("token") == token and (d8.get("entrant") or {}).get("tickets") == 4 and act_events == 1, f"{st} events={act_events} same_token={d8.get('token') == token}")
        st, d9 = call({"action": "resume", "entry": "NOT-A-REAL-TOKEN"})
        check("resume with a bad link: 404, no token", st == 404 and "token" not in d9)

        st, da = call({"action": "enter", "email": ACCT, "country": "Test", "consent": True, "ref": (d3 or {}).get("code")})
        track(da)
        check("referred friend enters (confirmed account), pending", st == 200 and bool(da.get("token")) and (da.get("entrant") or {}).get("activated") is False)
        # Codex ALL_TICKET_PATHS_REVIEW P1 regression: an address that has a confirmed app account was entered
        # by whoever typed it; without opening the emailed link it must earn nothing and credit no referrer.
        st, dq = call({"action": "complete", "token": da.get("token"), "task": "app"})
        friend_id = created_entry_ids[-1]
        reg = sql(f"""select (select progress from public.giveaway_entries where id='{friend_id}') as p,
                          (select count(*) from public.giveaway_referral_credits where referred_entry_id='{friend_id}') as credits,
                          (select public.giveaway_tickets(progress) from public.giveaway_entries where id='{created_entry_ids[0]}') as referrer_t""")[0]
        check("regression: friend's app task while pending is refused, no app or referral credit", st == 403 and not reg["p"].get("app") and reg["credits"] == 0 and reg["referrer_t"] == 4, f"{st} credits={reg['credits']} referrer={reg['referrer_t']}")
        fmagic = sql(f"select magic_token from public.giveaway_entries where id='{friend_id}'")[0]["magic_token"]
        st, dr = call({"action": "resume", "entry": fmagic})
        st, db = call({"action": "complete", "token": dr.get("token"), "task": "app"})
        check("friend activates via the emailed token, then app task: verified, tickets 5", st == 200 and db.get("tickets") == 5 and (dr.get("entrant") or {}).get("activated") is True)
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
        utok = sql(f"select unsubscribe_token from public.giveaway_entries where id='{created_entry_ids[0]}'")[0]["unsubscribe_token"]
        def raw2(method, token, body=None, ctype=None):
            req = urllib.request.Request(f"{URL}?unsubscribe={token}", data=body, method=method, headers={"Content-Type": ctype} if ctype else {})
            try:
                with opener.open(req, timeout=60) as r:
                    return r.status, r.headers.get("Location", ""), r.read().decode()[:4000]
            except urllib.error.HTTPError as e:
                return e.code, e.headers.get("Location", ""), e.read().decode()[:4000]
        st, _, html = raw2("GET", utok)
        state = sql(f"select marketing_opt_out_at is null as still_in from public.giveaway_entries where id='{created_entry_ids[0]}'")[0]
        check("unsubscribe: GET shows a confirmation page and changes nothing", st == 200 and "<form" in html and "Unsubscribe" in html and state["still_in"], f"{st} still_in={state['still_in']}")
        st, _, body = raw2("POST", utok, b"List-Unsubscribe=One-Click", "application/x-www-form-urlencoded")
        opt = sql(f"select marketing_opt_out_at is not null as out, disqualified_at is null as valid, public.giveaway_tickets(progress) t, (select count(*) from public.giveaway_marketing_audience a where a.id='{created_entry_ids[0]}') as in_audience from public.giveaway_entries where id='{created_entry_ids[0]}'")[0]
        check("unsubscribe: one-click POST on a fresh fixture opts out, entry and tickets intact, gone from the audience", st == 200 and body == "ok" and opt["out"] and opt["valid"] and opt["t"] == 6 and opt["in_audience"] == 0, f"{st} {body} {opt}")
        st2, loc2, _ = raw2("POST", utok, b"confirm=1", "application/x-www-form-urlencoded")
        st3, _, _ = raw2("POST", "NOT-A-TOKEN", b"List-Unsubscribe=One-Click", "application/x-www-form-urlencoded")
        events = sql(f"select count(*) c from public.giveaway_events where entry_id='{created_entry_ids[0]}' and kind='opted_out'")[0]["c"]
        check("unsubscribe: form POST redirects to the site; unknown token 404; repeat POST idempotent", st2 == 303 and loc2.endswith("/#/giveaway?unsubscribed=1") and st3 == 404 and events == 1, f"form={st2} {loc2} unknown={st3} opted_out_events={events}")

        # multipart one-click (RFC 8058 s.3.2) on the second, still-subscribed fixture: direct 200, no redirect
        utok2 = sql(f"select unsubscribe_token from public.giveaway_entries where id='{created_entry_ids[1]}'")[0]["unsubscribe_token"]
        boundary = "----EigerSmoke7d2c"
        crlf = chr(13) + chr(10)
        mp = ("--" + boundary + crlf + 'Content-Disposition: form-data; name="List-Unsubscribe"' + crlf + crlf + "One-Click" + crlf + "--" + boundary + "--" + crlf).encode()
        st4, loc4, body4 = raw2("POST", utok2, mp, f"multipart/form-data; boundary={boundary}")
        opt2 = sql(f"select marketing_opt_out_at is not null as out from public.giveaway_entries where id='{created_entry_ids[1]}'")[0]
        check("unsubscribe: multipart one-click POST on a fresh fixture answers 200 directly and opts out", st4 == 200 and body4 == "ok" and not loc4 and opt2["out"], f"{st4} loc={loc4!r} body={body4!r} opted={opt2['out']}")
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

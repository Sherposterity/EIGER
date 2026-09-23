// Eiger launch giveaway edge function. DRAFT rev 2 (2026-09-22, after Codex
// WEBSITE_GIVEAWAY_REVIEW), not deployed. Deploy from the hike repo's
// supabase/functions once approved: `supabase functions deploy giveaway --no-verify-jwt`.
// Secrets/env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automatic),
// RESEND_API_KEY, GIVEAWAY_FROM, GIVEAWAY_SITE_URL, GIVEAWAY_KICKSTARTER_URL (optional).
//
// Actions (POST JSON { action, ... }):
//   enter    { email, country, consent, ref?, website? }
//              new email  -> { token, entrant, email: 'sent' | 'failed' }
//              known email-> { existing: true, email: 'sent' | 'throttled' | 'failed', retryAfterSeconds? }
//                            (NO token: the inbox link is the only way back in)
//   status   { token }                 -> entrant | null
//   resume   { entry }                 -> { token, entrant }   (entry = magic token from the email link)
//   resend   { email }                 -> { ok: true }         (uniform reply, throttled per email and per IP)
//   complete { token, task }           -> entrant
//   GET  ?unsubscribe=<unsubscribe token> -> confirmation page, NO state change (link scanners, RFC 8058 s.1)
//   POST ?unsubscribe=<unsubscribe token> -> records the marketing opt-out: a one-click POST from a mail client
//                                            answers 200; the confirmation form's POST redirects to the site.
//                                            Unknown token 404, database failure 503 (retryable).
//     tiktok | instagram | kickstarter : honor tasks, atomic + idempotent in SQL (giveaway_complete_task)
//     app                              : confirmed auth.users email + referral credit in one transaction (giveaway_verify_app)
//
// Every ticket change happens inside a Postgres function on a locked row, so
// concurrent requests cannot overwrite each other and a failed write is
// reported as a failure, never as tickets. The browser only ever holds a
// random session token. Everything runs with the service role.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
// Window. The env overrides exist for pre-launch testing only; unset them in production.
const OPENS_AT = Date.parse(Deno.env.get("GIVEAWAY_OPENS_AT") ?? "2026-10-01T16:00:00Z");
const CLOSES_AT = Date.parse(Deno.env.get("GIVEAWAY_CLOSES_AT") ?? "2026-11-10T16:00:00Z");
const SITE_URL = Deno.env.get("GIVEAWAY_SITE_URL") ?? "https://eiger014.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("GIVEAWAY_FROM") ?? "Eiger <giveaway@support.eiger014.com>";
const KICKSTARTER_URL = Deno.env.get("GIVEAWAY_KICKSTARTER_URL") ?? "";
const RESEND_THROTTLE_MS = 10 * 60 * 1000;
const HONOR_TASKS = new Set(["tiktok", "instagram", "kickstarter"]);
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const CORS = {
  "Access-Control-Allow-Origin": "https://eiger014.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const randomCode = (len: number) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

const isOpen = (now: number) => now >= OPENS_AT && now < CLOSES_AT;

const tickets = (p: Record<string, number>) =>
  Math.min(20, (p.entry ? 1 : 0) + (p.app ? 4 : 0) + Math.min(p.referral ?? 0, 3) * 2 + (p.tiktok ? 3 : 0) + (p.instagram ? 3 : 0) + (p.kickstarter ? 3 : 0));

const publicView = (row: Record<string, unknown>) => ({
  id: row.id,
  email: row.email,
  country: row.country,
  code: row.code,
  progress: row.progress,
  tickets: tickets((row.progress ?? {}) as Record<string, number>),
  referred: !!row.referred_by,
  createdAt: row.created_at,
});

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";

async function rateOk(ipHash: string, kind: string, max: number, windowSeconds: number) {
  if (!ipHash) return true;
  const { data, error } = await supabase.rpc("giveaway_rate_check", { p_ip_hash: ipHash, p_kind: kind, p_max: max, p_window_seconds: windowSeconds });
  if (error) return false; // fail closed on abuse checks
  return data === true;
}

async function byToken(token: string) {
  if (!token) return null;
  const { data } = await supabase.from("giveaway_entries").select("*").eq("session_token", token).is("disqualified_at", null).maybeSingle();
  return data;
}

async function log(entryId: string | null, kind: string, detail: unknown = null) {
  await supabase.from("giveaway_events").insert({ entry_id: entryId, kind, detail });
}

const dashboardLink = (magic: string) => `${SITE_URL}/#/giveaway?entry=${magic}`;
const FUNCTION_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/giveaway`;
const unsubscribeLink = (token: string) => `${FUNCTION_URL}?unsubscribe=${token}`;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#0A0A0A;color:#FAFAFA;font-family:system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:520px;margin:0 auto;padding:64px 24px}h1{font-size:26px;margin:0 0 12px}p{color:rgba(255,255,255,.65);line-height:1.6}button,a.btn{display:inline-block;background:#fff;color:#000;border:0;border-radius:999px;padding:14px 26px;font-weight:600;font-size:13px;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;cursor:pointer}small{display:block;margin-top:28px;color:rgba(255,255,255,.4);font-size:12px}</style></head>
<body><main>${body}</main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );

// Returns true only when Resend accepted the message. Never throws.
async function sendDashboardEmail(email: string, magic: string, unsubscribeToken: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const link = dashboardLink(magic);
  const html = `
  <div style="background:#0A0A0A;color:#FAFAFA;font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:40px 24px;">
    <div style="max-width:520px;margin:0 auto;">
      <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.5);">Eiger launch giveaway</div>
      <h1 style="font-size:26px;margin:18px 0 10px;">You are in the draw.</h1>
      <p style="color:rgba(255,255,255,0.65);line-height:1.6;margin:0 0 24px;">This link opens your giveaway dashboard on any device: your tickets, the tasks, and your referral link. Keep this email, it is your way back in.</p>
      <a href="${link}" style="display:inline-block;background:#FFFFFF;color:#000000;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;padding:14px 26px;border-radius:999px;">Open my dashboard</a>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;margin:28px 0 0;">If you did not enter the Eiger giveaway, ignore this email and nothing happens. No purchase necessary. Sponsor: Eiger LLC, Texas, USA. Official rules: ${SITE_URL}/#/giveaway/rules</p>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;margin:12px 0 0;">You received this because you entered the giveaway. To stop giveaway and Eiger marketing emails sent through this list, <a href="${unsubscribeLink(unsubscribeToken)}" style="color:rgba(255,255,255,0.6);">unsubscribe</a>. Your entry stays in the draw, and dashboard links you request are still sent.</p>
    </div>
  </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      // Replies go to the sponsor contact named in the rules, not to the sending address.
      body: JSON.stringify({
        from: FROM, to: [email], reply_to: "business@eiger014.com", subject: "Your Eiger giveaway dashboard", html,
        text: `You are in the Eiger launch giveaway. Open your dashboard on any device: ${link}

To stop giveaway and Eiger marketing emails sent through this list (your entry stays in the draw): ${unsubscribeLink(unsubscribeToken)}`,
        headers: {
          "List-Unsubscribe": `<${unsubscribeLink(unsubscribeToken)}>, <mailto:business@eiger014.com?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

type EmailOutcome = { email: "sent" | "throttled" | "failed"; retryAfterSeconds?: number };

// Sends the dashboard link to an entry under an atomic lease: the database
// claims the cooldown BEFORE the send, so two parallel requests cannot both
// send; a refused message releases the lease so the user can retry.
async function emailEntry(row: { id: string; email: string; magic_token: string; unsubscribe_token: string }, resend: boolean): Promise<EmailOutcome> {
  const { data, error } = await supabase.rpc("giveaway_email_lease", { p_entry_id: row.id, p_cooldown_seconds: RESEND_THROTTLE_MS / 1000 });
  if (error) return { email: "failed" };
  if (!data?.claimed) return { email: "throttled", retryAfterSeconds: Number(data?.retry_after_seconds ?? 0) };
  const sent = await sendDashboardEmail(row.email, row.magic_token, row.unsubscribe_token);
  if (!sent) await supabase.rpc("giveaway_email_release", { p_entry_id: row.id });
  await log(row.id, "dashboard_email", { sent, resend });
  return { email: sent ? "sent" : "failed" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Unsubscribe. GET never changes state (link scanners fetch footer URLs, RFC 8058 s.1): it shows a
  // confirmation page whose button POSTs. POST is the mutation: a mail client's one-click POST
  // (body "List-Unsubscribe=One-Click") gets a bare 200; the confirmation form's POST is redirected
  // to the site. Unknown token 404, database failure 503 so the client retries.
  const unsub = (new URL(req.url).searchParams.get("unsubscribe") ?? "").slice(0, 64);
  if (unsub && req.method === "GET") {
    return page(
      "Unsubscribe from Eiger emails",
      `<h1>Stop marketing emails?</h1><p>This stops giveaway and Eiger marketing emails sent through this list. Your giveaway entry stays in the draw, and dashboard links you request are still sent.</p>
<form method="post" action="${escapeHtml(unsubscribeLink(unsub))}"><input type="hidden" name="confirm" value="1"><button type="submit">Unsubscribe</button></form>
<small>Changed your mind? Just close this page. Questions: business@eiger014.com</small>`
    );
  }
  if (unsub && req.method === "POST") {
    // Parse the body properly (urlencoded or multipart, RFC 8058 s.3.1-3.2); never sniff raw text.
    // Only our own confirmation form (hidden confirm=1) gets the browser flow with redirect and
    // pages; every other POST is a machine (one-click) request and gets direct responses.
    let fields: FormData | null = null;
    try {
      fields = await req.formData();
    } catch {
      fields = null;
    }
    const browserForm = fields?.get("confirm") === "1";
    const { data, error } = await supabase.rpc("giveaway_opt_out", { p_token: unsub });
    if (error) {
      return browserForm
        ? page("Please try again", `<h1>We could not save that just now.</h1><p>Please try again in a minute, or write to business@eiger014.com and we will do it for you.</p>`, 503)
        : new Response("temporarily unavailable, retry", { status: 503, headers: { ...CORS, "Retry-After": "120" } });
    }
    if (data !== "ok") {
      return browserForm
        ? page("Link not recognised", `<h1>That unsubscribe link is not recognised.</h1><p>Write to business@eiger014.com and we will take care of it.</p>`, 404)
        : new Response("unknown", { status: 404, headers: CORS });
    }
    return browserForm ? Response.redirect(`${SITE_URL}/#/giveaway?unsubscribed=1`, 303) : new Response("ok", { status: 200, headers: CORS });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const action = String(body.action ?? "");
  const now = Date.now();
  const ipHash = await sha256(clientIp(req));


  if (action === "status") {
    const row = await byToken(String(body.token ?? ""));
    return json(row ? publicView(row) : null);
  }

  if (action === "resume") {
    const magic = String(body.entry ?? "");
    if (!magic) return json({ error: "Missing link" }, 400);
    if (!(await rateOk(ipHash, "resume", 30, 3600))) return json({ error: "Too many attempts. Please try again later." }, 429);
    const { data } = await supabase.from("giveaway_entries").select("*").eq("magic_token", magic).is("disqualified_at", null).maybeSingle();
    if (!data) return json({ error: "That link is not valid. Enter with your email to get a new one." }, 404);
    await log(data.id, "resumed");
    return json({ token: data.session_token, entrant: publicView(data) });
  }

  if (action === "enter") {
    if (now < OPENS_AT) return json({ error: "The giveaway opens on October 1. Come back then." }, 400);
    if (now >= CLOSES_AT) return json({ error: "Entries are closed." }, 400);
    // Honeypot: a filled hidden field means a bot. Answer like a success and store nothing.
    if (String(body.website ?? "").trim()) return json({ token: randomCode(32), entrant: null, emailed: true });
    const email = String(body.email ?? "").trim().toLowerCase();
    const country = String(body.country ?? "").trim().slice(0, 64);
    if (!EMAIL_REGEX.test(email) || email.length > 254 || !country) return json({ error: "Enter a valid email address and country." }, 400);
    if (body.consent !== true) return json({ error: "Please confirm you are 18 or older and agree to the rules." }, 400);
    // 20 per hour per address: a club or household behind one IP must not be locked out (5 was too tight).
    if (!(await rateOk(ipHash, "enter", 20, 3600))) return json({ error: "Too many entries from this connection. Please try again later." }, 429);

    const existing = await supabase.from("giveaway_entries").select("id, email, magic_token, unsubscribe_token, disqualified_at").eq("email", email).maybeSingle();
    if (existing.data) {
      // Knowing an email must never hand over its dashboard: no token here, only the inbox link.
      if (existing.data.disqualified_at) return json({ existing: true, email: "failed" });
      return json({ existing: true, ...(await emailEntry(existing.data, true)) });
    }

    let referredBy: string | null = null;
    if (body.ref) {
      const r = await supabase.from("giveaway_entries").select("id").eq("code", String(body.ref).toUpperCase().slice(0, 12)).is("disqualified_at", null).maybeSingle();
      referredBy = r.data?.id ?? null;
    }
    const row = {
      email,
      country,
      code: randomCode(6),
      session_token: randomCode(32),
      magic_token: randomCode(32),
      referred_by: referredBy,
      ip_hash: ipHash || null,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 200),
    };
    const { data, error } = await supabase.from("giveaway_entries").insert(row).select("*").single();
    if (error || !data) {
      // A race on the unique email lands here too: treat it as the known-email path.
      const again = await supabase.from("giveaway_entries").select("id, email, magic_token, unsubscribe_token").eq("email", email).maybeSingle();
      if (again.data) return json({ existing: true, ...(await emailEntry(again.data, true)) });
      return json({ error: "Could not save your entry. Please try again." }, 500);
    }
    await log(data.id, "entered", { referred_by: referredBy });
    const outcome = await emailEntry(data, false);
    return json({ token: data.session_token, entrant: publicView(data), ...outcome });
  }

  if (action === "resend") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!(await rateOk(ipHash, "resend", 10, 3600))) return json({ error: "Too many attempts. Please try again later." }, 429);
    const { data } = await supabase.from("giveaway_entries").select("id, email, magic_token, unsubscribe_token, disqualified_at").eq("email", email).maybeSingle();
    // Always the same answer, so this form cannot be used to test which emails entered.
    if (data && !data.disqualified_at) await emailEntry(data, true);
    return json({ ok: true });
  }

  if (action === "complete") {
    if (!isOpen(now)) return json({ error: now < OPENS_AT ? "The giveaway opens on October 1." : "Entries are closed." }, 400);
    const token = String(body.token ?? "");
    if (!token) return json({ error: "Enter the giveaway first." }, 401);
    const task = String(body.task ?? "");
    if (!(await rateOk(ipHash, "complete", 60, 3600))) return json({ error: "Too many attempts. Please try again later." }, 429);

    if (HONOR_TASKS.has(task)) {
      if (task === "kickstarter" && !KICKSTARTER_URL) return json({ error: "The Kickstarter task is not open yet." }, 400);
      const { data, error } = await supabase.rpc("giveaway_complete_task", { p_token: token, p_task: task });
      if (error) return json({ error: "Could not record that. Please try again." }, 503);
      if (!data?.ok) return json({ error: data?.reason === "no_session" ? "Enter the giveaway first." : "That task is not available." }, data?.reason === "no_session" ? 401 : 400);
      return json(data.entrant);
    }

    if (task === "app") {
      const { data, error } = await supabase.rpc("giveaway_verify_app", { p_token: token });
      if (error) return json({ error: "Could not check your account right now. Please try again." }, 503);
      if (!data?.ok) {
        if (data?.reason === "no_session") return json({ error: "Enter the giveaway first." }, 401);
        if (data?.reason === "no_account") return json({ error: "No confirmed Eiger account found for your email yet. Sign up in the app with the same email, confirm it, then try again." }, 400);
        return json({ error: "That task is not available." }, 400);
      }
      return json(data.entrant);
    }

    return json({ error: "Unknown task" }, 400);
  }

  return json({ error: "Unknown action" }, 400);
});

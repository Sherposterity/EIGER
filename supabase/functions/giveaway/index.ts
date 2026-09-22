// Eiger launch giveaway edge function. DRAFT 2026-09-22, not deployed.
// Deploy from the hike repo's supabase/functions alongside the webhook once
// the page is approved: `supabase functions deploy giveaway --no-verify-jwt`.
//
// Actions (POST JSON { action, ... }):
//   enter    { email, country, consent, ref? }  -> { token, entrant }   (also emails the dashboard link)
//   status   { token }                          -> entrant | null
//   resume   { entry }                          -> { token, entrant }   (entry = magic token from the email link)
//   resend   { email }                          -> { ok: true }         (re-sends the dashboard link, throttled)
//   complete { token, task }                    -> entrant
//     task = app        : verified against auth.users (same email); credits the referrer
//     task = tiktok | instagram | kickstarter : honor-based, recorded once
//     task = referral   : not accepted here; referral credit happens when the
//                         referred entrant's app account is verified
//
// The browser only ever holds a random session token, never an id or email
// of anyone else. Everything runs with the service role.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const OPENS_AT = Date.parse("2026-10-01T16:00:00Z");
const CLOSES_AT = Date.parse("2026-11-10T16:00:00Z");
const HONOR_TASKS = new Set(["tiktok", "instagram", "kickstarter"]);
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SITE_URL = Deno.env.get("GIVEAWAY_SITE_URL") ?? "https://eiger014.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// Same verified sending domain as the app's auth emails.
const FROM = Deno.env.get("GIVEAWAY_FROM") ?? "Eiger <giveaway@support.eiger014.com>";
const RESEND_THROTTLE_MS = 10 * 60 * 1000;
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

const publicView = (row: Record<string, unknown>) => ({
  id: row.id,
  email: row.email,
  country: row.country,
  code: row.code,
  progress: row.progress,
  createdAt: row.created_at,
});

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function byToken(token: string) {
  if (!token) return null;
  const { data } = await supabase.from("giveaway_entries").select("*").eq("session_token", token).maybeSingle();
  return data;
}

async function log(entryId: string, kind: string, detail: unknown = null) {
  await supabase.from("giveaway_events").insert({ entry_id: entryId, kind, detail });
}

const dashboardLink = (magic: string) => `${SITE_URL}/#/giveaway?entry=${magic}`;

// The dashboard email: house style, plain, no dashes. Doubles as proof the
// address is real, since the link only works from the inbox.
async function sendDashboardEmail(email: string, magic: string) {
  if (!RESEND_API_KEY) return false;
  const link = dashboardLink(magic);
  const html = `
  <div style="background:#0A0A0A;color:#FAFAFA;font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:40px 24px;">
    <div style="max-width:520px;margin:0 auto;">
      <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.5);">Eiger launch giveaway</div>
      <h1 style="font-size:26px;margin:18px 0 10px;">You are in the draw.</h1>
      <p style="color:rgba(255,255,255,0.65);line-height:1.6;margin:0 0 24px;">This link opens your giveaway dashboard on any device: your tickets, the tasks, and your referral link. Keep this email, it is your way back in.</p>
      <a href="${link}" style="display:inline-block;background:#FFFFFF;color:#000000;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;padding:14px 26px;border-radius:999px;">Open my dashboard</a>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;margin:28px 0 0;">If you did not enter the Eiger giveaway, ignore this email and nothing happens. No purchase necessary. Sponsor: Eiger014 LLC, Texas, USA. Official rules: ${SITE_URL}/#/giveaway/rules</p>
    </div>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    // Replies go to the sponsor contact named in the rules, not to the sending address.
    body: JSON.stringify({ from: FROM, to: [email], reply_to: "business@eiger014.com", subject: "Your Eiger giveaway dashboard", html, text: `You are in the Eiger launch giveaway. Open your dashboard on any device: ${link}` }),
  });
  return res.ok;
}

async function appAccountExists(email: string) {
  // auth.users is not exposed through PostgREST; use the admin API (paged, exact match).
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return false;
  return data.users.some((u) => (u.email ?? "").toLowerCase() === email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const action = String(body.action ?? "");
  const now = Date.now();

  if (action === "status") {
    const row = await byToken(String(body.token ?? ""));
    return json(row ? publicView(row) : null);
  }

  if (action === "enter") {
    if (now < OPENS_AT) return json({ error: "The giveaway has not opened yet." }, 400);
    if (now >= CLOSES_AT) return json({ error: "Entries are closed." }, 400);
    const email = String(body.email ?? "").trim().toLowerCase();
    const country = String(body.country ?? "").trim().slice(0, 64);
    if (!EMAIL_REGEX.test(email) || !country) return json({ error: "Enter a valid email address and country." }, 400);
    if (body.consent !== true) return json({ error: "Please confirm you are 18 or older and agree to the rules." }, 400);

    const existing = await supabase.from("giveaway_entries").select("*").eq("email", email).maybeSingle();
    if (existing.data) {
      // Same person coming back: hand the session back without a duplicate entry.
      return json({ token: existing.data.session_token, entrant: publicView(existing.data) });
    }
    let referredBy: string | null = null;
    if (body.ref) {
      const r = await supabase.from("giveaway_entries").select("id").eq("code", String(body.ref).toUpperCase()).maybeSingle();
      referredBy = r.data?.id ?? null;
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const row = {
      email,
      country,
      code: randomCode(6),
      session_token: randomCode(32),
      magic_token: randomCode(32),
      magic_sent_at: new Date().toISOString(),
      referred_by: referredBy,
      ip_hash: ip ? await sha256(ip) : null,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 200),
    };
    const { data, error } = await supabase.from("giveaway_entries").insert(row).select("*").single();
    if (error || !data) return json({ error: "Could not save your entry. Please try again." }, 500);
    await log(data.id, "entered", { referred_by: referredBy });
    const emailed = await sendDashboardEmail(email, data.magic_token);
    await log(data.id, "dashboard_email", { sent: emailed });
    return json({ token: data.session_token, entrant: publicView(data), emailed });
  }

  if (action === "resume") {
    const magic = String(body.entry ?? "");
    if (!magic) return json({ error: "Missing link" }, 400);
    const { data } = await supabase.from("giveaway_entries").select("*").eq("magic_token", magic).maybeSingle();
    if (!data) return json({ error: "That link is not valid. Enter with your email to get a new one." }, 404);
    await log(data.id, "resumed");
    return json({ token: data.session_token, entrant: publicView(data) });
  }

  if (action === "resend") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) return json({ error: "Enter a valid email address." }, 400);
    const { data } = await supabase.from("giveaway_entries").select("id, magic_token, magic_sent_at").eq("email", email).maybeSingle();
    // Always answer the same way so the form cannot be used to test which emails entered.
    if (data) {
      const last = data.magic_sent_at ? Date.parse(data.magic_sent_at) : 0;
      if (now - last >= RESEND_THROTTLE_MS) {
        const sent = await sendDashboardEmail(email, data.magic_token);
        await supabase.from("giveaway_entries").update({ magic_sent_at: new Date().toISOString() }).eq("id", data.id);
        await log(data.id, "dashboard_email", { sent, resend: true });
      }
    }
    return json({ ok: true });
  }

  if (action === "complete") {
    if (now >= CLOSES_AT) return json({ error: "Entries are closed." }, 400);
    const row = await byToken(String(body.token ?? ""));
    if (!row) return json({ error: "Enter the giveaway first." }, 401);
    const task = String(body.task ?? "");
    const progress = { ...(row.progress as Record<string, number>) };

    if (HONOR_TASKS.has(task)) {
      if (!progress[task]) {
        progress[task] = 1;
        await supabase.from("giveaway_entries").update({ progress }).eq("id", row.id);
        await log(row.id, "task", { task });
      }
      return json(publicView({ ...row, progress }));
    }

    if (task === "app") {
      if (progress.app) return json(publicView(row));
      if (!(await appAccountExists(row.email))) {
        return json({ error: `No Eiger account found for ${row.email} yet. Sign up in the app with that email, then try again.` }, 400);
      }
      progress.app = 1;
      await supabase.from("giveaway_entries").update({ progress, app_verified_at: new Date().toISOString() }).eq("id", row.id);
      await log(row.id, "verified_app");
      // Credit the referrer once, up to three friends.
      if (row.referred_by) {
        const ref = await supabase.from("giveaway_entries").select("id, progress").eq("id", row.referred_by).maybeSingle();
        if (ref.data) {
          const rp = { ...(ref.data.progress as Record<string, number>) };
          if ((rp.referral ?? 0) < 3) {
            rp.referral = (rp.referral ?? 0) + 1;
            await supabase.from("giveaway_entries").update({ progress: rp }).eq("id", ref.data.id);
            await log(ref.data.id, "referral_credit", { from: row.id });
          }
        }
      }
      return json(publicView({ ...row, progress }));
    }

    return json({ error: "Unknown task" }, 400);
  }

  return json({ error: "Unknown action" }, 400);
});

// "Which mountain next?" request endpoint for eiger014.com (2026-09-26).
// Deploy from the hike repo: `supabase functions deploy mountain-request`
// (config.toml sets verify_jwt = false: the browser calls it with the anon key).
//
// POST JSON { peak: { id }, website? }
//   -> { requests, counted }   counted=false when this IP already asked for it
//   400 invalid or unknown peak id, 429 rate limited, 503 database failure
//
// The browser sends ONLY a Wikidata id. Name, country and coordinates come
// from the server-side catalogue (public.peaks, migration 117), so the public
// leaderboard can never show a forged label or location (Codex review
// 2026-09-26). One vote per peak per hashed IP (sha256 of the client IP,
// never stored raw); 30 requests per IP per hour through
// giveaway_rate_check(kind 'mountain'). Runs with the service role.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS = {
  "Access-Control-Allow-Origin": "https://eiger014.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
// Client address for rate limiting and dedupe. The functions sit behind
// Cloudflare (Server: cloudflare, CF-Ray on every response), which sets
// cf-connecting-ip itself and cannot be spoofed by the caller; the first
// x-forwarded-for entry can be. Fall back to the LAST forwarded entry (the
// one the edge appended), never the first.
const clientIp = (req: Request) => {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return xff.length ? xff[xff.length - 1] : "";
};

async function rateOk(ipHash: string, kind: string, max: number, windowSeconds: number) {
  const { data, error } = await supabase.rpc("giveaway_rate_check", { p_ip_hash: ipHash, p_kind: kind, p_max: max, p_window_seconds: windowSeconds });
  if (error) return false; // fail closed on abuse checks
  return data === true;
}

// The only client input that is trusted at all: a Wikidata id shape. The
// catalogue decides whether it exists.
export function parsePeakId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as Record<string, unknown>).id;
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  return /^Q[0-9]{1,10}$/.test(trimmed) ? trimmed : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Bad request." }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  // Honeypot: bots fill the hidden field; answer as if it worked.
  if (typeof body.website === "string" && body.website.trim()) return json({ requests: 1, counted: true });

  const peakId = parsePeakId(body.peak);
  if (!peakId) return json({ error: "Pick a mountain from the list." }, 400);

  const ipHash = await sha256(clientIp(req));
  if (!(await rateOk(ipHash, "mountain", 30, 3600))) return json({ error: "Too many requests from this connection. Try again in an hour." }, 429);

  const { data, error } = await supabase.rpc("mountain_request_add", { p_peak_id: peakId, p_ip_hash: ipHash });
  if (error) {
    if (/unknown peak|invalid peak/.test(error.message ?? "")) return json({ error: "Pick a mountain from the list." }, 400);
    return json({ error: "We could not save that right now. Please try again." }, 503);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return json({ requests: row?.requests ?? 1, counted: row?.counted ?? false });
});

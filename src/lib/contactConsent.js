// Emergency contact pages for the check-in timer (hike Release 1.5.0, migration
// 172, edge function check-in-notify). Pure helpers, no DOM, so node --test can
// cover them; src/contact/main.js wires them to contact-confirm/index.html.
//
// The emails link here (the interface in "Check-in schema 2026-10-25", built by
// check-in-notify):
//   /contact-confirm?token=<64 hex>                 -> confirm_emergency_contact
//   /contact-confirm?token=<64 hex>&action=decline  -> decline_emergency_contact
//   /contact-confirm?action=stop&token=<64 hex>     -> withdraw_emergency_contact
// Each rpc is anon-executable, takes { p_token } and returns jsonb:
//   confirm  -> { status: 'confirmed' | 'invalid', contact_name, climber_name }
//   decline  -> { status: 'declined'  | 'invalid', contact_name }
//   withdraw -> { status: 'withdrawn' | 'invalid', contact_name }
// 'invalid' covers wrong, used and expired tokens alike.
//
// Privacy: the token is never logged, never sent anywhere but the rpc body, and
// the page strips it from the address bar as soon as it has read it. Names on
// the page come only from the rpc response and are set with textContent.

export const TOKEN_RE = /^[0-9a-f]{64}$/;

export const RPC = {
  confirm: 'confirm_emergency_contact',
  decline: 'decline_emergency_contact',
  stop: 'withdraw_emergency_contact',
};

// The longest climber name we print; safe_climber_name already refuses links,
// addresses and domains (K5), this only keeps the layout sane.
const NAME_MAX = 80;

/**
 * Read the link: which page to show and the token (lower-cased, or null when
 * missing or malformed). 'stop' wins over everything; 'decline' only preselects
 * Decline on the consent page, the contact still taps a button (link scanners
 * open links without a person behind them).
 * @param {string} search location.search
 * @returns {{ mode: 'consent' | 'stop', prefer: 'confirm' | 'decline', token: string | null }}
 */
export function parseLink(search) {
  const q = new URLSearchParams(search || '');
  const action = (q.get('action') || '').trim().toLowerCase();
  const raw = (q.get('token') || '').trim().toLowerCase();
  return {
    mode: action === 'stop' ? 'stop' : 'consent',
    prefer: action === 'decline' ? 'decline' : 'confirm',
    token: TOKEN_RE.test(raw) ? raw : null,
  };
}

/**
 * The PostgREST call for one action. Anon key only; the token travels in the
 * POST body, never in a URL.
 * @param {'confirm' | 'decline' | 'stop'} action
 * @param {string} token
 * @param {{ url: string, anonKey: string }} cfg
 */
export function buildRequest(action, token, cfg) {
  const fn = RPC[action];
  if (!fn) throw new Error('unknown action');
  return {
    url: `${String(cfg.url).replace(/\/+$/, '')}/rest/v1/rpc/${fn}`,
    init: {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ p_token: token }),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    },
  };
}

/** A printable climber name from the rpc, or a neutral stand-in. */
export function cleanName(name) {
  if (typeof name !== 'string') return 'the climber';
  // Drop control characters, collapse whitespace, cap the length.
  // eslint-disable-next-line no-control-regex
  const s = name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return 'the climber';
  return s.length > NAME_MAX ? `${s.slice(0, NAME_MAX).trim()}...` : s;
}

const EXPECTED = { confirm: 'confirmed', decline: 'declined', stop: 'withdrawn' };

/**
 * Turn the rpc answer into what the page says. kind 'done' is a success,
 * 'invalid' a dead link, 'error' anything we could not read (network, rpc not
 * deployed yet, a 5xx). Copy has no em or en dashes.
 * @param {'confirm' | 'decline' | 'stop'} action
 * @param {{ ok: boolean, data: unknown }} res
 * @returns {{ kind: 'done' | 'invalid' | 'error', title: string, body: string }}
 */
export function resultFor(action, res) {
  const data = res && res.ok && res.data && typeof res.data === 'object' ? res.data : null;
  const status = data && typeof data.status === 'string' ? data.status : null;

  if (status && status === EXPECTED[action]) {
    if (action === 'confirm') {
      return {
        kind: 'done',
        title: 'Confirmed.',
        body: `You will get an email only if ${cleanName(data.climber_name)} misses a check-in. Every email from us has a link to stop at any time.`,
      };
    }
    if (action === 'decline') {
      return { kind: 'done', title: 'Declined.', body: 'You will not hear from Eiger about this again.' };
    }
    return {
      kind: 'done',
      title: 'Done. You are no longer an emergency contact.',
      body: 'Eiger will not email you about this climber again. We have let them know so they can choose someone else before their next climb.',
    };
  }

  if (status === 'invalid') {
    if (action === 'stop') {
      return {
        kind: 'invalid',
        title: 'This link no longer works.',
        body: 'You may already have stopped being an emergency contact, or the climber removed you. Either way, no further check-in emails will reach you from this link. If one does, write to business@eiger014.com.',
      };
    }
    return {
      kind: 'invalid',
      title: 'This link has expired or was already used.',
      body: 'Invite links work once and for 7 days. If you still want to answer, ask the climber to send a new invite from the Eiger app.',
    };
  }

  return {
    kind: 'error',
    title: 'We could not reach Eiger just now.',
    body: 'Nothing has changed yet. Please try again in a few minutes.',
  };
}

/** What the page says when the link carries no usable token at all. */
export function missingTokenResult(mode) {
  return {
    kind: 'invalid',
    title: 'This link is incomplete.',
    body: mode === 'stop'
      ? 'Open the stop link from the email again, or write to business@eiger014.com and we will remove you by hand.'
      : 'Open the link from the invite email again. If it still does not work, ask the climber to send a new invite from the Eiger app.',
  };
}

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
// Before any button, the page calls the read-only preview_emergency_contact_token
// ({ p_token }) -> { kind: 'consent' | 'stop' | null, state: 'pending' |
// 'confirmed' | 'declined' | 'revoked' | 'expired' | 'invalid', climber_name,
// contact_first_name } to name the climber and to answer dead links up front.
// A read with no side effects is fine on load; the actions above still fire
// only from a click (security rule E9). If the preview cannot be read
// (network, preview_rate_limited, not deployed), the page falls back to the
// unnamed copy and the buttons, and the action rpc gives the answer.
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

export const PREVIEW_RPC = 'preview_emergency_contact_token';

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
 * @param {'confirm' | 'decline' | 'stop' | 'preview'} action
 * @param {string} token
 * @param {{ url: string, anonKey: string }} cfg
 */
export function buildRequest(action, token, cfg) {
  const fn = action === 'preview' ? PREVIEW_RPC : RPC[action];
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

const INVALID_STOP = {
  kind: 'invalid',
  title: 'This link no longer works.',
  body: 'You may already have stopped being an emergency contact, or the climber removed you. Either way, no further check-in emails will reach you from this link. If one does, write to business@eiger014.com.',
};
const INVALID_CONSENT = {
  kind: 'invalid',
  title: 'This link has expired or was already used.',
  body: 'Invite links work once and for 7 days. If you still want to answer, ask the climber to send a new invite from the Eiger app.',
};

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

  if (status === 'invalid') return action === 'stop' ? INVALID_STOP : INVALID_CONSENT;

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

/**
 * What to show before any button, from the read-only preview.
 *  - { show: 'consent' | 'stop', climber: string | null }: the buttons, named
 *    when the preview answered, unnamed (climber null) when it could not be
 *    read. The server's kind wins over the link's action (the token decides
 *    which rpc can accept it).
 *  - { show: 'result', result }: the link is dead or already answered; no buttons.
 * @param {{ mode: 'consent' | 'stop' }} link from parseLink
 * @param {{ ok: boolean, data: unknown }} res the preview answer
 */
export function previewView(link, res) {
  const data = res && res.ok && res.data && typeof res.data === 'object' ? res.data : null;
  const state = data && typeof data.state === 'string' ? data.state : null;
  const kind = data && (data.kind === 'consent' || data.kind === 'stop') ? data.kind : null;
  const unnamed = { show: link.mode, climber: null };
  if (!state) return unnamed;

  if (state === 'invalid' || !kind) {
    return state === 'invalid' ? { show: 'result', result: link.mode === 'stop' ? INVALID_STOP : INVALID_CONSENT } : unnamed;
  }
  const climber = typeof data.climber_name === 'string' && data.climber_name.trim() ? cleanName(data.climber_name) : null;
  const who = climber || 'the climber';
  const Who = climber || 'The climber';

  if (kind === 'stop') {
    if (state === 'pending' || state === 'confirmed') return { show: 'stop', climber };
    if (state === 'declined') {
      return { show: 'result', result: { kind: 'invalid', title: 'You already stopped.', body: `Eiger will not email you about ${who} again.` } };
    }
    if (state === 'revoked') {
      return { show: 'result', result: { kind: 'invalid', title: `${Who} already removed you as their emergency contact.`, body: 'Eiger will not email you about this again. There is nothing you need to do.' } };
    }
    return { show: 'result', result: INVALID_STOP };
  }

  // kind === 'consent'
  if (state === 'pending') return { show: 'consent', climber };
  if (state === 'confirmed') {
    return { show: 'result', result: { kind: 'invalid', title: 'You already confirmed.', body: `You will get an email only if ${who} misses a check-in. Every email from us has a link to stop at any time.` } };
  }
  if (state === 'declined') {
    return { show: 'result', result: { kind: 'invalid', title: 'You already declined.', body: 'You will not hear from Eiger about this again.' } };
  }
  if (state === 'revoked') {
    return { show: 'result', result: { kind: 'invalid', title: `${Who} removed you as their emergency contact.`, body: 'Eiger will not email you about this. There is nothing you need to do.' } };
  }
  if (state === 'expired') {
    return { show: 'result', result: { kind: 'invalid', title: 'This invite has expired.', body: `Invite links work for 7 days. If you still want to be ${who}'s emergency contact, ask them to send a new invite from the Eiger app.` } };
  }
  return unnamed;
}

/** Headline and button copy for the named views. */
export function namedCopy(view) {
  if (!view.climber) return null;
  if (view.show === 'stop') {
    return {
      title: `Stop being ${view.climber}'s emergency contact?`,
      button: `Stop being ${view.climber}'s emergency contact`,
    };
  }
  return {
    title: `${view.climber} added you as their emergency contact in Eiger`,
    lead: `Eiger is a mountaineering app. ${view.climber} uses it to plan climbs and to set a check-in time before heading up.`,
  };
}

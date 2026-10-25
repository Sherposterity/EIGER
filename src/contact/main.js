// Wires contact-confirm/index.html to the anon rpcs (see src/lib/contactConsent.js).
// No tracking scripts, no console output: the token must not end up in any log.
//
// On load: one read-only preview call (names the climber, answers dead links).
// Confirm, Decline and Stop fire only from a button click (security rule E9),
// never on load, so a mail scanner that opens the link changes nothing.
import { buildRequest, missingTokenResult, namedCopy, parseLink, previewView, resultFor } from '../lib/contactConsent.js';

const cfg = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};
const PREVIEW_TIMEOUT_MS = 6000;

const $ = (id) => document.getElementById(id);
const link = parseLink(window.location.search);

// Take the token out of the address bar (and so out of history, bookmarks and
// screenshots) as soon as it is read. It stays in memory for the buttons.
try {
  window.history.replaceState(null, '', window.location.pathname);
} catch {
  // Older browsers: the token simply stays in the address bar.
}

/** POST one rpc; never throws. */
async function call(action, timeoutMs) {
  if (!cfg.url || !cfg.anonKey) return { ok: false, data: null };
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && timeoutMs ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const { url, init } = buildRequest(action, link.token, cfg);
    const r = await fetch(url, ctrl ? { ...init, signal: ctrl.signal } : init);
    return { ok: r.ok, data: r.ok ? await r.json() : null };
  } catch {
    return { ok: false, data: null };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function show(result) {
  $('loading').hidden = true;
  $('consent').hidden = true;
  $('stop').hidden = true;
  $('result-title').textContent = result.title;
  $('result-body').textContent = result.body;
  $('result').hidden = false;
  $('result-title').focus?.();
}

async function run(action, buttons) {
  for (const b of buttons) b.disabled = true;
  const result = resultFor(action, await call(action));
  if (result.kind === 'error') {
    // Nothing changed server side; let them try again.
    for (const b of buttons) b.disabled = false;
    $('result-title').textContent = result.title;
    $('result-body').textContent = result.body;
    $('result').hidden = false;
    return;
  }
  show(result);
}

function renderStop(view) {
  const stop = $('btn-stop');
  const named = namedCopy(view);
  if (named) {
    $('stop-title').textContent = named.title;
    stop.textContent = named.button;
  }
  $('loading').hidden = true;
  $('stop').hidden = false;
  stop.addEventListener('click', () => run('stop', [stop]));
}

function renderConsent(view) {
  const confirm = $('btn-confirm');
  const decline = $('btn-decline');
  const named = namedCopy(view);
  if (named) {
    $('consent-title').textContent = named.title;
    $('consent-lead').textContent = named.lead;
  }
  if (link.prefer === 'decline') {
    // The contact clicked "Decline" in the email: make that the main button.
    confirm.className = 'btn-secondary';
    decline.className = 'btn-primary';
    decline.parentElement.insertBefore(decline, confirm);
  }
  $('loading').hidden = true;
  $('consent').hidden = false;
  confirm.addEventListener('click', () => run('confirm', [confirm, decline]));
  decline.addEventListener('click', () => run('decline', [confirm, decline]));
}

$('result-title').setAttribute('tabindex', '-1');

async function start() {
  if (!link.token) {
    show(missingTokenResult(link.mode));
    return;
  }
  const view = previewView(link, await call('preview', PREVIEW_TIMEOUT_MS));
  if (view.show === 'result') show(view.result);
  else if (view.show === 'stop') renderStop(view);
  else renderConsent(view);
}

start();

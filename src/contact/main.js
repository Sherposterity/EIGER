// Wires contact-confirm/index.html to the anon rpcs (see src/lib/contactConsent.js).
// No tracking scripts, no console output: the token must not end up in any log.
import { buildRequest, missingTokenResult, parseLink, resultFor } from '../lib/contactConsent.js';

const cfg = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

const $ = (id) => document.getElementById(id);
const link = parseLink(window.location.search);

// Take the token out of the address bar (and so out of history, bookmarks and
// screenshots) as soon as it is read. It stays in memory for the button.
try {
  window.history.replaceState(null, '', window.location.pathname);
} catch {
  // Older browsers: the token simply stays in the address bar.
}

function show(result) {
  $('consent').hidden = true;
  $('stop').hidden = true;
  $('result-title').textContent = result.title;
  $('result-body').textContent = result.body;
  $('result').hidden = false;
  $('result-title').focus?.();
}

async function run(action, buttons) {
  for (const b of buttons) b.disabled = true;
  let res = { ok: false, data: null };
  if (cfg.url && cfg.anonKey) {
    try {
      const { url, init } = buildRequest(action, link.token, cfg);
      const r = await fetch(url, init);
      res = { ok: r.ok, data: r.ok ? await r.json() : null };
    } catch {
      res = { ok: false, data: null };
    }
  }
  const result = resultFor(action, res);
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

$('result-title').setAttribute('tabindex', '-1');

if (!link.token) {
  show(missingTokenResult(link.mode));
} else if (link.mode === 'stop') {
  const stop = $('btn-stop');
  $('stop').hidden = false;
  stop.addEventListener('click', () => run('stop', [stop]));
} else {
  const confirm = $('btn-confirm');
  const decline = $('btn-decline');
  if (link.prefer === 'decline') {
    // The contact clicked "Decline" in the email: make that the main button.
    confirm.className = 'btn-secondary';
    decline.className = 'btn-primary';
    decline.parentElement.insertBefore(decline, confirm);
  }
  $('consent').hidden = false;
  confirm.addEventListener('click', () => run('confirm', [confirm, decline]));
  decline.addEventListener('click', () => run('decline', [confirm, decline]));
}

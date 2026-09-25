// Startup URL fix-ups for the move from HashRouter to BrowserRouter.
//
// Two kinds of incoming URL are rewritten (with history.replaceState, so no
// reload and no extra history entry) before the router renders:
//
// 1. Legacy hash routes, e.g. https://eiger014.com/#/giveaway?entry=abc
//    (every link the site and the giveaway emails produced before the move).
//    They become /giveaway?entry=abc with the query kept byte for byte.
// 2. The 404.html hand-off. GitHub Pages serves public/404.html for any path
//    it has no file for (/giveaway, /about, ...). That page redirects to
//    /?/giveaway&entry=abc (the spa-github-pages encoding: path after "?/",
//    original query after the first "&", literal "&" written as "~and~"),
//    and this module turns it back into /giveaway?entry=abc.
//
// Plain in-page anchors such as #platforms or #waitlist are left alone.

const normalizePath = (raw) => {
  // Collapse repeated slashes, drop a trailing slash (except on the root).
  let path = `/${raw}`.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
};

const joinQuery = (...parts) => {
  const kept = parts.map((p) => (p || '').replace(/^\?/, '')).filter(Boolean);
  return kept.length ? `?${kept.join('&')}` : '';
};

// Decodes the 404.html hand-off. Returns { pathname, search } or null.
const decodePagesRedirect = (search) => {
  if (!search || !search.startsWith('?/')) return null;
  const [rawPath, ...rest] = search.slice(2).split('&');
  const unescape = (s) => s.replace(/~and~/g, '&');
  return {
    pathname: normalizePath(unescape(rawPath)),
    search: joinQuery(rest.map(unescape).join('&')),
  };
};

/**
 * Pure resolver. Given the parts of window.location, returns the URL
 * (path + query + optional anchor) to replace the current one with, or null
 * when nothing needs to change.
 */
export function resolveHashUrl({ pathname = '/', search = '', hash = '' } = {}) {
  let path = pathname || '/';
  let query = search || '';
  let changed = false;

  const decoded = decodePagesRedirect(query);
  if (decoded) {
    path = decoded.pathname;
    query = decoded.search;
    changed = true;
  }

  if (hash && hash.startsWith('#/')) {
    // Legacy hash route. The hash holds the route and its query; a query that
    // sits before the hash (/?ref=abc#/giveaway) is merged in after it, so
    // the hash's own parameters win on a duplicate name.
    const body = hash.slice(1);
    const q = body.indexOf('?');
    const hashPath = q === -1 ? body : body.slice(0, q);
    const hashQuery = q === -1 ? '' : body.slice(q + 1);
    return normalizePath(hashPath) + joinQuery(hashQuery, query);
  }

  if (!changed) return null;
  // Keep an in-page anchor that survived the 404 hop (#platforms).
  const anchor = hash && hash !== '#' ? hash : '';
  return path + query + anchor;
}

// Thin wrapper: run once in main.jsx before the router renders.
export function applyHashRedirect(win = window) {
  const { pathname, search, hash } = win.location;
  const next = resolveHashUrl({ pathname, search, hash });
  if (next === null) return null;
  win.history.replaceState(win.history.state, '', next);
  return next;
}

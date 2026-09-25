# Routing

The site uses real path URLs (`https://eiger014.com/giveaway`) through
react-router's `BrowserRouter`. Until September 2026 it used `HashRouter`
(`https://eiger014.com/#/giveaway`). Every old `#/` link still works: it is
rewritten on load, with its query string kept exactly.

## Routes

Listed in `src/lib/routes.js` and rendered in `src/App.jsx` (pages are lazy
loaded as before):

| Path | Page |
| --- | --- |
| `/` | Home. `?section=<id>` scrolls to that section after load (unchanged). |
| `/mission` | MissionPage |
| `/about` | AboutPage |
| `/giveaway` | GiveawayPage. Reads `?ref=`, `?entry=`, `?unsubscribed=` |
| `/giveaway/rules` | GiveawayRulesPage. Reads `?ref=` |
| anything else | NotFound (placeholder copy, to be replaced by the founder) |

Matching is case insensitive and ignores a trailing slash (react-router default).

### MISSION_REDIRECT flag

`src/lib/routes.js` exports `MISSION_REDIRECT = false`. The Mission and About
pages are being merged; until the merge lands both render. Flip the flag to
`true` and `/mission` redirects to `/about` (replace, query kept). Also drop
`/mission` from `public/sitemap.xml` at that point.

## How a URL reaches the app

GitHub Pages only has real files for `/` (`index.html`) and the static pages
(`/privacy.html` and so on). For any other path it serves `public/404.html`
with HTTP status 404.

1. **404.html hand-off.** Its inline script redirects (with
   `location.replace`, so no extra history entry) to `/` with the original
   path and query encoded in the query string, using the spa-github-pages
   encoding:

   ```
   /giveaway?ref=abc&utm=1   ->   /?/giveaway&ref=abc~and~utm=1
   ```

   The path follows `?/`; the original query follows the first `&`; any `&`
   inside the path or query is written as `~and~`. A trailing `#anchor` is
   carried along. Paths whose last segment contains a dot (`/old.html`,
   `/videos/x.mp4`) are treated as missing files: no redirect, the static
   "That page does not exist" text is shown. The page stays `noindex`, and the
   static text is also what a visitor without JavaScript sees.

2. **Startup rewrite.** `src/main.jsx` calls `applyHashRedirect()` from
   `src/lib/hashRedirect.js` before rendering. It runs the pure function
   `resolveHashUrl({ pathname, search, hash })` and, when that returns a URL,
   applies it with `history.replaceState` (no reload). Then the router reads
   the clean URL.

## resolveHashUrl rules

Returns the replacement URL, or `null` when nothing should change.

1. A query starting with `?/` is the 404 hand-off: decode it back to
   `path?query` (undoing `~and~`), keep any `#anchor`.
2. A hash starting with `#/` is a legacy hash route: `#/path?query` becomes
   `/path?query`. The query is copied byte for byte (no decoding or
   re-encoding), so `?entry=`, `?ref=`, `?unsubscribed=`, `?section=` arrive
   unchanged.
   - A query before the hash is merged after the hash's own query:
     `/?ref=abc#/giveaway` becomes `/giveaway?ref=abc`;
     `/?utm=1#/giveaway?ref=abc` becomes `/giveaway?ref=abc&utm=1` (the hash
     query comes first, so it wins if a name appears twice).
   - Repeated slashes collapse and a trailing slash is dropped:
     `#/mission/` becomes `/mission`, `#//` becomes `/`.
   - `#/` and `#/?` become `/`; `#/?ref=abc` becomes `/?ref=abc`.
   - The pathname before the hash is ignored (the old site only ever had `/`).
   - Unknown hash paths are passed through (`#/unknown?x=1` becomes
     `/unknown?x=1`) and show NotFound.
3. Anything else, including plain in-page anchors (`#platforms`,
   `#waitlist`), returns `null`.

## Links inside the app

All internal links are react-router `<Link to="/path">` values, which now
produce path URLs. Changed in this migration:

- `src/lib/giveaway.js` `referralLink()` now builds
  `https://eiger014.com/giveaway?ref=CODE` (was `/#/giveaway?ref=CODE`).
- `src/pages/GiveawayPage.jsx` review mode links now `<Link>` to
  `/giveaway?entry=...` (were `<a href="/#/giveaway?entry=...">`).

Pages read query parameters from the router location
(`new URLSearchParams(useLocation().search)`), which works the same under
both routers. Parameter names and values are unchanged.

## Email links sent by the giveaway edge function

The function (`supabase/functions/giveaway/index.ts`, not changed by this
migration) still emits hash URLs. They keep working through rule 2 above, so
there is no deadline to change them; switching them to path URLs saves one
client side rewrite and is a founder decision:

- line 99: ``const dashboardLink = (magic: string) => `${SITE_URL}/#/giveaway?entry=${magic}`;``
  (activation and dashboard link in every entry email)
- line 124: `Official rules: ${SITE_URL}/#/giveaway/rules` (email footer text)
- line 203: ``Response.redirect(`${SITE_URL}/#/giveaway?unsubscribed=1`, 303)``
  (after a browser unsubscribe form post)

`SITE_URL` is `GIVEAWAY_SITE_URL`, default `https://eiger014.com` (line 36;
also in `supabase/GIVEAWAY_RUNBOOK.md` line 13). The unsubscribe link itself
points at the function URL, not the site, so it is unaffected.

## SEO caveat

Because Pages answers `/about`, `/mission`, `/giveaway` and `/giveaway/rules`
with status 404 before the hand-off, crawlers may treat the sitemap entries
as missing. The fix is a build step that copies `dist/index.html` to
`dist/about/index.html` (and the other routes) so Pages serves them with 200;
that needs a change to `vite.config.js`, `package.json` or the workflow and is
left for a follow-up.

## Tests

Unit tests: `node --test tests/*.test.js` (Node's built-in runner, no extra
dependency). They cover `resolveHashUrl`, `applyHashRedirect`, and a round
trip that runs the real `public/404.html` script against a fake location and
decodes the result.

Manual matrix (headless Chrome over the DevTools protocol, 2026-09-25). Run
against (a) a local static server that mimics Pages (real files, else
`404.html` with status 404) serving a production build with
`VITE_GIVEAWAY_BACKEND=local`, and (b) `npm run dev`. Both gave the same
results. No giveaway or waitlist form was submitted.

| Loaded URL | Landed on | Result |
| --- | --- | --- |
| `/about` | `/about` | About page |
| `/mission` | `/mission` | Mission page |
| `/giveaway/rules` | `/giveaway/rules` | Rules page |
| `/giveaway?ref=test123` | `/giveaway?ref=test123` | Referral notice shown |
| `/giveaway/rules?ref=test123` | `/giveaway/rules?ref=test123` | Rules page |
| `/#/giveaway?ref=test123` | `/giveaway?ref=test123` | Referral notice shown |
| `/?ref=test123#/giveaway` | `/giveaway?ref=test123` | Referral notice shown |
| `/#/giveaway/rules?ref=x` | `/giveaway/rules?ref=x` | Rules page |
| `/#/giveaway?unsubscribed=1` | `/giveaway?unsubscribed=1` | Unsubscribed notice shown |
| `/giveaway?unsubscribed=1` | `/giveaway?unsubscribed=1` | Unsubscribed notice shown |
| `/#/giveaway?entry=abc123` | `/giveaway?entry=abc123` | Token read (fake token rejected by the local backend, as expected) |
| `/#/mission/` | `/mission` | Mission page |
| `/#/` | `/` | Home |
| `/#platforms` | `/#platforms` | Home, anchor untouched |
| `/?section=platforms` | `/?section=platforms` | Home, scrolled to Platforms |
| `/#/unknown/path?x=1` | `/unknown/path?x=1` | NotFound |
| `/nope/deeper?x=1` | `/nope/deeper?x=1` | NotFound (through 404.html) |
| `/Giveaway/?ref=AbC` | `/Giveaway?ref=AbC` | Giveaway page (case insensitive) |
| `/giveaway?ref=test123`, click Official rules, back, forward | `/giveaway/rules?ref=test123`, `/giveaway?ref=test123`, `/giveaway/rules?ref=test123` | Correct page each step |
| `/about`, click the Get the app link | `/?section=platforms` | Home, scrolled to Platforms |

Not verified: the real GitHub Pages host (only a local imitation), and
whether a direct load of `/#platforms` scrolls to the section (the anchor is
kept but the section renders after the browser's own anchor jump).

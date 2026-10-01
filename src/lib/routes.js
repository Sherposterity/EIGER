// Single list of the site's client-side routes. App.jsx renders them and
// docs/ROUTING.md describes them. public/404.html does not need this list:
// it forwards every extensionless unknown path into the app, and the app's
// NotFound route handles anything not listed here.

export const ROUTE_PATHS = ['/', '/mission', '/about', '/pricing', '/mountains', '/mountains/*', '/disclosure', '/compare/alltrails', '/verification', '/giveaway', '/giveaway/rules', '/kickstarter', '/request', '/review', '/review/m/:trailId', '/review/admin', '/review/apply'];

// TODO(mission merge): the Mission and About pages are being merged. Until the
// merge lands both pages render at their own paths. Flip this to true when it
// does, and /mission will redirect to /about (query string kept).
export const MISSION_REDIRECT = true;

// The public mountain gear pages were removed 2026-09-30 (Rishav's decision).
// Outreach emails already link to /mountains, so /mountains and anything under
// it redirect to the home page. Not prerendered: GitHub Pages serves 404.html,
// which hands the path to the app, and App.jsx renders <Navigate to="/" />.
export const REMOVED_REDIRECTS = { '/mountains': '/', '/mountains/*': '/' };

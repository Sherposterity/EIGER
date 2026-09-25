// Single list of the site's client-side routes. App.jsx renders them and
// docs/ROUTING.md describes them. public/404.html does not need this list:
// it forwards every extensionless unknown path into the app, and the app's
// NotFound route handles anything not listed here.

export const ROUTE_PATHS = ['/', '/mission', '/about', '/giveaway', '/giveaway/rules'];

// TODO(mission merge): the Mission and About pages are being merged. Until the
// merge lands both pages render at their own paths. Flip this to true when it
// does, and /mission will redirect to /about (query string kept).
export const MISSION_REDIRECT = true;

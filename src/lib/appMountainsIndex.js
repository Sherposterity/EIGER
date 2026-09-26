// Pure index over the app's mountains (no JSON import, so Node tests can
// build it from the file on disk). appMountains.js binds it to
// src/data/app-mountains.json for the site.
//
// Identity is by id only: an app mountain carries the Wikidata id of its
// dataset peak (matched by name in the export, or through the reviewed alias
// table there). Proximity never establishes identity (Codex review
// 2026-09-26: Grand Pilier d'Angle sits within 2 km of Mont Blanc and is a
// different climb), so nearbyAppMountain() is only ever a hint.

export const kmBetween = (a, b) => {
  const p = Math.PI / 180;
  const x = 0.5 - Math.cos((b.lat - a.lat) * p) / 2 + (Math.cos(a.lat * p) * Math.cos(b.lat * p) * (1 - Math.cos((b.lon - a.lon) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(x));
};

export const createAppIndex = (mountains) => {
  const byPeak = new Map(mountains.filter((m) => m.peakId).map((m) => [m.peakId, m]));
  const byId = new Map(mountains.map((m) => [m.id, m]));

  // The app mountain this peak IS, or null.
  const appMountainFor = (peak) => {
    if (!peak) return null;
    if (peak.appId) return byId.get(peak.appId) ?? null;
    return byPeak.get(peak.id) ?? null;
  };

  // A different app mountain within `km` of this peak (a hint, never a match).
  const nearbyAppMountain = (peak, km = 2) => {
    if (!peak || appMountainFor(peak)) return null;
    let best = null;
    let bestKm = km;
    for (const m of mountains) {
      const d = kmBetween(peak, m);
      if (d < bestKm) {
        bestKm = d;
        best = m;
      }
    }
    return best;
  };

  // A selection built from a tapped green dot.
  const selectionFromApp = (m) => ({ id: m.peakId ?? `app:${m.id}`, appId: m.id, name: m.name, country: '', elevation: m.elevation, lat: m.lat, lon: m.lon });

  return { mountains, appMountainFor, nearbyAppMountain, selectionFromApp };
};

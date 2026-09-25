// Pure scoring for the "Try it yourself!" demo on the home page.
// No React, no DOM: tests/tryit.test.js runs it under node --test.
//
// A mountain is one entry of src/data/gear-snapshot.json `mountains`.
// Season is the user's toggle ('summer' | 'winter'), never a date.

// The ten demo tiles. `id` is the exact `gear.item` display name in the
// snapshot, so a tile's level comes straight from the mountain's gear list.
export const TILES = [
  'Mountaineering Boots',
  'Crampons',
  'Ice Axe',
  'Climbing Helmet',
  'Climbing Harness',
  'Rope',
  'Hardshell Jacket',
  'Down Jacket',
  'Headlamp',
  'Avalanche Beacon',
];

export const LEVEL_WEIGHT = { essential: 3, recommended: 2, optional: 1 };

// `winter_essentials` in the snapshot is free text written per mountain.
// Map the phrasings that mean one of the tiles; anything else (Gloves,
// Microspikes) has no tile and is ignored.
const WINTER_TO_TILE = {
  'insulated boots': 'Mountaineering Boots',
  'insulated alpine boots': 'Mountaineering Boots',
  'expedition boots': 'Mountaineering Boots',
  'steel crampons': 'Crampons',
  crampons: 'Crampons',
  'ice axe': 'Ice Axe',
  'technical ice tools': 'Ice Axe',
  helmet: 'Climbing Helmet',
  harness: 'Climbing Harness',
  rope: 'Rope',
  'winter shell': 'Hardshell Jacket',
  'storm shell': 'Hardshell Jacket',
  headlamp: 'Headlamp',
  'avalanche beacon': 'Avalanche Beacon',
};

export function winterTile(phrase) {
  return WINTER_TO_TILE[String(phrase).trim().toLowerCase()] ?? null;
}

// Weight of each of the ten tiles for this mountain and season.
// 0 means the mountain does not require it.
export function tileWeights(mountain, season = 'summer') {
  const weights = Object.fromEntries(TILES.map((t) => [t, 0]));
  if (!mountain) return weights;
  for (const row of mountain.gear ?? []) {
    if (row.item in weights) {
      weights[row.item] = Math.max(weights[row.item], LEVEL_WEIGHT[row.level] ?? 0);
    }
  }
  if (season === 'winter') {
    for (const phrase of mountain.winter_essentials ?? []) {
      const tile = winterTile(phrase);
      if (tile) weights[tile] = LEVEL_WEIGHT.essential;
    }
  }
  return weights;
}

export function insulationGsm(mountain, season = 'summer') {
  if (!mountain) return null;
  return season === 'winter' ? mountain.winter_insulation_gsm : mountain.summer_insulation_gsm;
}

// kitItems: tile names the visitor has added (order does not matter).
export function computeScore({ mountain, season = 'summer', kitItems = [] }) {
  const weights = tileWeights(mountain, season);
  const kit = new Set(kitItems.filter((t) => t in weights));
  let total = 0;
  let requiredCount = 0;
  let kitWeight = 0;
  let requiredInKit = 0;
  for (const tile of TILES) {
    const w = weights[tile];
    if (w > 0) {
      total += w;
      requiredCount += 1;
      if (kit.has(tile)) {
        kitWeight += w;
        requiredInKit += 1;
      }
    }
  }
  const percent = total === 0 ? 0 : Math.min(100, Math.round((kitWeight / total) * 100));
  return { weights, total, kitWeight, percent, requiredCount, requiredInKit };
}

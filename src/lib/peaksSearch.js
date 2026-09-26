// Pure search helpers for the peaks dataset (no Vite, no DOM), so Node tests
// and scripts/build-peaks.py's mirror can exercise exactly what the site runs.
// The chunk loader lives in peaks.js.
//
// Rows are compact arrays: [id number, name, country index, elevation_m, lat, lon];
// countries.json holds the country names. rowToPeak() expands a row.
//
// Chunking: one file per first letter of each meaningful word of the name.
// Generic words ("Mount", "Mont", "Pico", "Cerro" ...) do not count, so
// "Mount Rainier" lives in chunk r and typing "mount rainier" or "rainier"
// both look there; "Mont Blanc" lives in chunk b, so "blanc" finds it.
//
// Search is diacritic-insensitive and ranks: the name (or its meaningful
// part, "Blanc" for "Mont Blanc") starts with the query, then a later word
// starts with it, then any substring; ties go to the higher peak.

export const STOP_WORDS = new Set([
  'mount', 'mt', 'mont', 'monte', 'montagne', 'montana', 'montaña', 'pico', 'picco', 'piz', 'punta', 'cerro', 'nevado', 'volcan', 'volcán', 'volcano',
  'peak', 'mountain', 'berg', 'spitze', 'kogel', 'horn', 'gora', 'gunung', 'puncak', 'jabal', 'jebel', 'pik', 'the', 'of', 'de', 'la', 'le', 'les', 'du', 'del',
  'della', 'di', 'da', 'el', 'and', 'des', 'den', 'der', 'al',
]);

export const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const words = (normalized) => normalized.split(/[^a-z0-9]+/).filter(Boolean);

const letterOf = (word) => (/^[a-z]/.test(word) ? word[0] : '0');

// Chunk keys a peak name belongs to (the build script mirrors this).
export const chunkKeysFor = (name) => {
  const ws = words(normalize(name));
  const meaningful = ws.filter((w) => !STOP_WORDS.has(w));
  const source = meaningful.length ? meaningful : ws.slice(0, 1);
  return new Set(source.map(letterOf));
};

// The one chunk a query needs, or null when the query is too short.
export const queryKey = (query) => {
  const ws = words(normalize(query));
  const meaningful = ws.filter((w) => !STOP_WORDS.has(w));
  const first = meaningful[0] ?? ws[0];
  if (!first || normalize(query).length < 2) return null;
  return letterOf(first);
};

export const rowToPeak = (row, countries) => ({
  id: `Q${row[0]}`,
  name: row[1],
  country: countries?.[row[2]] ?? '',
  elevation: row[3],
  lat: row[4],
  lon: row[5],
});

export const searchPeaks = (peaks, query, limit = 8) => {
  const q = normalize(query);
  if (q.length < 2) return [];
  const qw = words(q);
  const meaningful = qw.filter((w) => !STOP_WORDS.has(w));
  const core = meaningful.length ? q.slice(q.indexOf(meaningful[0])) : q;
  const scored = [];
  for (const p of peaks) {
    const n = p._n ?? (p._n = normalize(p.name));
    if (p._core === undefined) {
      const nw = words(n);
      const firstMeaningful = nw.find((w) => !STOP_WORDS.has(w));
      p._core = firstMeaningful ? n.slice(n.indexOf(firstMeaningful)) : n;
    }
    let score;
    if (n.startsWith(q) || p._core.startsWith(core)) score = 3;
    else if (n.includes(' ' + core) || n.includes('-' + core)) score = 2;
    else if (n.includes(q)) score = 1;
    else continue;
    scored.push([score, p.elevation ?? 0, p]);
  }
  scored.sort((a, b) => b[0] - a[0] || b[1] - a[1] || a[2].name.localeCompare(b[2].name));
  const out = [];
  const seen = new Set();
  for (const [, , p] of scored) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
};

export const formatElevation = (m) => (m == null ? '' : `${m.toLocaleString('en-US')} m`);

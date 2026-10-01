// Pure helpers for the public mountain gear pages (/mountains and
// /mountains/:slug). No React, no JSON imports, so node --test and the build
// scripts (scripts/copy-routes.mjs) can use them directly. Data comes from
// src/data/mountains/*.json, written by scripts/export-mountain-gear.py.

export const SITE_URL = 'https://eiger014.com';
export const LEVELS = ['essential', 'recommended', 'optional'];
export const LEVEL_LABELS = { essential: 'Essential', recommended: 'Recommended', optional: 'Optional' };
export const SEASONS = ['summer', 'winter'];

export const mountainPath = (slug) => `/mountains/${slug}`;

// Rows whose season is 'all' show in both views; seasonal rows only in theirs.
export const rowInSeason = (row, season) => row.season === 'all' || row.season === season;

// Gear groups filtered to one season; groups left empty are dropped.
export function gearForSeason(gear, season) {
  return (gear || [])
    .map((g) => ({ group: g.group, items: g.items.filter((row) => rowInSeason(row, season)) }))
    .filter((g) => g.items.length > 0);
}

// Within a group: essential first, then recommended, then optional, keeping
// the export's order (the app's taxonomy sort order) inside each level.
export function byLevel(items) {
  return LEVELS.map((level) => ({ level, items: items.filter((i) => i.level === level) })).filter((l) => l.items.length);
}

export const hasWinterRows = (m) => (m?.gear || []).some((g) => g.items.some((i) => i.season === 'winter'));

// Honesty rule (docs/COPY.md, 2026-09-30): "Reviewed by a mountaineer" only
// when the export says a review is applied. Winter rows on unreviewed
// mountains are not mountaineer confirmed yet.
export const REVIEWED_LABEL = 'Reviewed by a mountaineer';
export const PENDING_LABEL =
  'Compiled by the EIGER team from manufacturer specs and guide sources, mountaineer review in progress.';
export const WINTER_PENDING_LABEL = 'Winter list pending mountaineer confirmation.';

export function reviewStatus(status, { winterRows = false } = {}) {
  const reviewed = status === 'reviewed';
  return {
    reviewed,
    label: reviewed ? REVIEWED_LABEL : PENDING_LABEL,
    winterNote: !reviewed && winterRows ? WINTER_PENDING_LABEL : null,
  };
}

export const DISCLOSURE_LINE = 'EIGER may earn a commission on some product links. It never changes what we recommend.';

export const formatMeters = (m) => `${Number(m).toLocaleString('en-US')} m`;

// One paragraph built only from exported facts; no invented prose.
export function introText(m) {
  const where = m.country ? `, ${m.country}` : '';
  const terrain = [
    m.glaciated ? 'glaciated' : 'non-glaciated',
    m.technical ? 'technical' : 'non-technical',
  ].join(', ');
  const parts = [
    `${m.name} (${formatMeters(m.altitude_m)}${where}) is rated ${m.difficulty} in EIGER: a ${terrain} climb${
      m.avalanche_terrain ? ' with avalanche terrain' : ''
    }${m.duration_days ? `, planned at about ${m.duration_days} ${m.duration_days === 1 ? 'day' : 'days'}` : ''}.`,
  ];
  if (m.temp_min_c != null && m.temp_max_c != null) {
    parts.push(`Typical temperatures run from ${m.temp_min_c} °C to ${m.temp_max_c} °C.`);
  }
  if (m.summer_insulation_gsm && m.winter_insulation_gsm) {
    parts.push(
      `The list targets insulation of about ${m.summer_insulation_gsm} g/m² in summer and ${m.winter_insulation_gsm} g/m² in winter.`,
    );
  }
  return parts.join(' ');
}

export const mountainTitle = (name) => `${name} gear list: what you need, summer and winter | EIGER`;

export function mountainDescription(m) {
  const c = m.counts || {};
  return `The ${m.name} gear list (${formatMeters(m.altitude_m)}): ${c.essential ?? 0} essential, ${
    c.recommended ?? 0
  } recommended and ${c.optional ?? 0} optional items, with summer and winter views and product picks. Free in the EIGER app.`;
}

export const INDEX_TITLE = 'Mountain gear lists: what to bring on every peak | EIGER';
export const INDEX_DESCRIPTION =
  'Free gear lists for every mountain in the EIGER app: essential, recommended and optional items, summer and winter, with product picks.';
export const DISCLOSURE_TITLE = 'Product link disclosure | EIGER';
export const DISCLOSURE_DESCRIPTION =
  'How product links on EIGER work: we may earn a commission on some links, and it never changes which products we recommend.';

// Search by name, filter by country and the two terrain flags ('any' | 'yes' | 'no').
export function filterMountains(list, { query = '', country = '', glaciated = 'any', technical = 'any' } = {}) {
  const fold = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const q = fold(query).trim();
  const flag = (want, value) => want === 'any' || (want === 'yes') === Boolean(value);
  return list.filter(
    (m) =>
      (!q || fold(m.name).includes(q)) &&
      (!country || (m.countries || [m.country]).includes(country)) &&
      flag(glaciated, m.glaciated) &&
      flag(technical, m.technical),
  );
}

// Single countries for the filter; a border peak counts under each of its countries.
export const countriesOf = (list) =>
  [...new Set(list.flatMap((m) => m.countries || [m.country]).filter(Boolean))].sort();

// JSON-LD ItemList of the gear slots shown in one season view.
export function gearItemList(m, season = 'summer') {
  const rows = gearForSeason(m.gear, season).flatMap((g) => g.items);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${m.name} gear list`,
    url: `${SITE_URL}${mountainPath(m.slug)}`,
    numberOfItems: rows.length,
    itemListElement: rows.map((row, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${row.name} (${LEVEL_LABELS[row.level] || row.level})`,
    })),
  };
}

// Sitemap: add the mountain routes before </urlset>, skipping any already listed.
export function sitemapWithMountains(xml, slugs) {
  const paths = ['/mountains', '/disclosure', ...slugs.map(mountainPath)];
  const missing = paths.filter((p) => !xml.includes(`<loc>${SITE_URL}${p}</loc>`));
  const lines = missing.map((p) => {
    const top = p === '/mountains';
    const legal = p === '/disclosure';
    return `  <url><loc>${SITE_URL}${p}</loc><changefreq>${legal ? 'yearly' : 'monthly'}</changefreq><priority>${
      top ? '0.8' : legal ? '0.3' : '0.6'
    }</priority></url>`;
  });
  return xml.replace('</urlset>', `${lines.join('\n')}${lines.length ? '\n' : ''}</urlset>`);
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Prerendered route folders get their own title, description, canonical and
// share tags in the static HTML, so crawlers that do not run JavaScript see
// the right page. Replaces the tags index.html already carries.
export function htmlWithHead(html, { title, description, path }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const url = `${SITE_URL}${path}`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${d}$2`);
}

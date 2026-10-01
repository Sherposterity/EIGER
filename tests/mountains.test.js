import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  PENDING_LABEL,
  REVIEWED_LABEL,
  WINTER_PENDING_LABEL,
  byLevel,
  countriesOf,
  filterMountains,
  gearForSeason,
  gearItemList,
  hasWinterRows,
  htmlWithHead,
  introText,
  mountainPath,
  mountainTitle,
  reviewStatus,
  sitemapWithMountains,
} from '../src/lib/mountains.js';
import { ROUTE_PATHS } from '../src/lib/routes.js';

const dir = new URL('../src/data/mountains/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), 'utf8');
const index = JSON.parse(read('index.json'));
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');
const LEVELS = ['essential', 'recommended', 'optional'];
// U+2013 en dash, U+2014 em dash, built from code points so this file has none.
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];

test('index.json: shape and one file per mountain', () => {
  assert.match(index.generated_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(index.mountains.length >= 68, `only ${index.mountains.length} mountains`);
  for (const m of index.mountains) {
    assert.equal(typeof m.name, 'string');
    assert.match(m.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, m.slug);
    assert.ok(Number.isInteger(m.altitude_m) && m.altitude_m > 0, m.slug);
    assert.equal(typeof m.glaciated, 'boolean');
    assert.equal(typeof m.technical, 'boolean');
    assert.ok(['reviewed', 'pending'].includes(m.review_status), m.slug);
    for (const k of [...LEVELS, 'winter', 'products']) assert.ok(Number.isInteger(m.counts[k]), `${m.slug} ${k}`);
  }
  assert.deepEqual(files.sort(), index.mountains.map((m) => `${m.slug}.json`).sort());
});

test('slugs are unique and routable', () => {
  const slugs = index.mountains.map((m) => m.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(ROUTE_PATHS.includes('/mountains'));
  assert.ok(ROUTE_PATHS.includes('/mountains/:slug'));
  assert.ok(ROUTE_PATHS.includes('/disclosure'));
  for (const s of slugs) assert.equal(mountainPath(s), `/mountains/${s}`);
});

test('per-mountain JSON: public fields only, levels, seasons, products', () => {
  for (const f of files) {
    const raw = read(f);
    const m = JSON.parse(raw);
    assert.equal(`${m.slug}.json`, f);
    assert.ok(m.generated_at);
    assert.ok(['reviewed', 'pending'].includes(m.review.status));
    for (const banned of ['rationale', 'reviewer_notes', 'reviewer_id', 'image_url', 'product_image']) {
      assert.ok(!raw.includes(`"${banned}`), `${f} has ${banned}`);
    }
    assert.ok(m.gear.length > 0, f);
    for (const g of m.gear) {
      for (const row of g.items) {
        assert.ok(LEVELS.includes(row.level), `${f} ${row.item_type}`);
        assert.ok(['all', 'summer', 'winter'].includes(row.season), `${f} ${row.item_type}`);
        assert.ok(row.name);
      }
    }
    for (const [type, picks] of Object.entries(m.products)) {
      assert.ok(picks.length >= 1 && picks.length <= 3, `${f} ${type}`);
      for (const p of picks) {
        assert.match(p.url, /^https?:\/\//);
        assert.ok(p.name && p.brand);
        assert.ok(Number.isInteger(p.fits_count) && p.fits_count >= 1);
      }
    }
  }
});

test('no em or en dashes in exported JSON', () => {
  for (const f of ['index.json', ...files]) {
    const raw = read(f);
    for (const d of DASHES) assert.ok(!raw.includes(d), f);
  }
});

const SAMPLE = {
  slug: 'sample-peak',
  name: 'Sample Peak',
  country: 'Switzerland',
  altitude_m: 4164,
  difficulty: 'Advanced',
  duration_days: 2,
  glaciated: true,
  technical: false,
  avalanche_terrain: true,
  temp_min_c: -12,
  temp_max_c: 4,
  counts: { essential: 2, recommended: 1, optional: 1, winter: 1 },
  gear: [
    {
      group: 'Clothing',
      items: [
        { item_type: 'fleece', name: 'Fleece', level: 'recommended', season: 'all' },
        { item_type: 'hardshell_jacket', name: 'Hardshell Jacket', level: 'essential', season: 'all' },
        { item_type: 'sun_hoodie', name: 'Sun Hoodie', level: 'optional', season: 'summer' },
      ],
    },
    {
      group: 'Technical Hardware',
      items: [{ item_type: 'avalanche_beacon', name: 'Avalanche Beacon', level: 'recommended', season: 'winter' }],
    },
  ],
};

test('season filter: all rows in both views, seasonal rows only in theirs, empty groups dropped', () => {
  const summer = gearForSeason(SAMPLE.gear, 'summer');
  assert.deepEqual(summer.map((g) => g.group), ['Clothing']);
  assert.deepEqual(summer[0].items.map((i) => i.item_type), ['fleece', 'hardshell_jacket', 'sun_hoodie']);
  const winter = gearForSeason(SAMPLE.gear, 'winter');
  assert.deepEqual(winter.map((g) => g.group), ['Clothing', 'Technical Hardware']);
  assert.deepEqual(winter[0].items.map((i) => i.item_type), ['fleece', 'hardshell_jacket']);
  assert.ok(hasWinterRows(SAMPLE));
  assert.deepEqual(byLevel(summer[0].items).map((l) => l.level), ['essential', 'recommended', 'optional']);
});

test('review status label: reviewed only when the data says so; winter note when pending', () => {
  assert.deepEqual(reviewStatus('reviewed', { winterRows: true }), { reviewed: true, label: REVIEWED_LABEL, winterNote: null });
  assert.deepEqual(reviewStatus('pending', { winterRows: true }), {
    reviewed: false,
    label: PENDING_LABEL,
    winterNote: WINTER_PENDING_LABEL,
  });
  assert.deepEqual(reviewStatus('pending'), { reviewed: false, label: PENDING_LABEL, winterNote: null });
  assert.equal(reviewStatus(undefined).reviewed, false);
  assert.equal(REVIEWED_LABEL, 'Reviewed by a mountaineer');
  for (const m of index.mountains) {
    const doc = JSON.parse(read(`${m.slug}.json`));
    assert.equal(doc.review.status, m.review_status, m.slug);
  }
});

test('intro, title and JSON-LD come from facts only', () => {
  assert.equal(
    introText(SAMPLE),
    'Sample Peak (4,164 m, Switzerland) is rated Advanced in EIGER: a glaciated, non-technical climb with avalanche terrain, planned at about 2 days. Typical temperatures run from -12 °C to 4 °C.',
  );
  assert.equal(mountainTitle('Mont Blanc'), 'Mont Blanc gear list: what you need, summer and winter | EIGER');
  const ld = gearItemList(SAMPLE, 'summer');
  assert.equal(ld['@type'], 'ItemList');
  assert.equal(ld.numberOfItems, 3);
  assert.equal(ld.url, 'https://eiger014.com/mountains/sample-peak');
});

test('filterMountains: name search ignores case and accents; country and flags filter', () => {
  const list = index.mountains;
  assert.ok(filterMountains(list, { query: 'ECRINS' }).some((m) => m.slug === 'barre-des-ecrins'));
  assert.ok(filterMountains(list, { glaciated: 'yes' }).every((m) => m.glaciated));
  assert.ok(filterMountains(list, { technical: 'no' }).every((m) => !m.technical));
  const swiss = filterMountains(list, { country: 'Switzerland' });
  assert.ok(swiss.length > 0 && swiss.every((m) => m.countries.includes('Switzerland')));
  // Border peaks name both countries and show under either filter.
  const blanc = list.find((m) => m.slug === 'mont-blanc');
  assert.equal(blanc.country, 'France and Italy');
  assert.deepEqual(blanc.countries, ['France', 'Italy']);
  assert.equal(list.find((m) => m.slug === 'matterhorn').country, 'Switzerland and Italy');
  assert.equal(list.find((m) => m.slug === 'dom').country, 'Switzerland');
  assert.ok(filterMountains(list, { country: 'France' }).some((m) => m.slug === 'mont-blanc'));
  assert.ok(countriesOf(list).every((c) => !c.includes(' and ')));
  assert.equal(filterMountains(list, {}).length, list.length);
});

test('sitemap contains every slug, /mountains and /disclosure, once each', () => {
  const base = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const slugs = index.mountains.map((m) => m.slug);
  const xml = sitemapWithMountains(base, slugs);
  for (const p of ['/mountains', '/disclosure', ...slugs.map(mountainPath)]) {
    const loc = `<loc>https://eiger014.com${p}</loc>`;
    assert.equal(xml.split(loc).length - 1, 1, p);
  }
  assert.ok(xml.trim().endsWith('</urlset>'));
  assert.equal(sitemapWithMountains(xml, slugs), xml);
});

test('htmlWithHead swaps title, description, canonical and share URL', () => {
  const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const html = htmlWithHead(shell, { title: 'A & B | EIGER', description: 'Desc "x"', path: '/mountains/mont-blanc' });
  assert.ok(html.includes('<title>A &amp; B | EIGER</title>'));
  assert.ok(html.includes('content="Desc &quot;x&quot;"'));
  assert.ok(html.includes('<link rel="canonical" href="https://eiger014.com/mountains/mont-blanc"'));
  assert.ok(html.includes('<meta property="og:url" content="https://eiger014.com/mountains/mont-blanc"'));
});

// Pure data and geometry for the verification pipeline demo on /verification.
// No React, no DOM, no JSON imports: tests/verification.test.js runs it under
// node --test and passes the data files in.

// The five real category_group values, in the order the clusters sit
// clockwise from 12 o'clock.
export const GROUPS = [
  'Clothing',
  'Footwear',
  'Technical Hardware',
  'Camp & Sleep',
  'Essentials & Accessories',
];

// Short visual labels (the full group name goes to title/aria text).
export const GROUP_LABEL = {
  Clothing: 'Clothing',
  Footwear: 'Footwear',
  'Technical Hardware': 'Hardware',
  'Camp & Sleep': 'Camp & Sleep',
  'Essentials & Accessories': 'Essentials',
};

// One muted hue per category, used only on connection lines and the list's
// category ticks. Green (145) is kept free for the verified check.
const GROUP_HUE = {
  Clothing: 250,
  Footwear: 70,
  'Technical Hardware': 25,
  'Camp & Sleep': 310,
  'Essentials & Accessories': 195,
};

export const VERIFIED_GREEN = 'oklch(0.74 0.16 145)';

export function groupColour(group) {
  return `oklch(0.7 0.08 ${GROUP_HUE[group] ?? 0})`;
}

// A cluster with more than MAX_SHOWN_LIMIT items shows the first SHOWN
// circles and one "+N" circle for the rest.
export const MAX_SHOWN_LIMIT = 12;
export const SHOWN = 10;

// Every distinct {item, group} pair in the snapshot, grouped and sorted.
export function buildTaxonomy(snapshot) {
  const byGroup = new Map(GROUPS.map((g) => [g, new Set()]));
  for (const m of snapshot.mountains) {
    for (const row of m.gear) {
      if (!byGroup.has(row.group)) throw new Error(`Unknown category_group: ${row.group}`);
      byGroup.get(row.group).add(row.item);
    }
  }
  return GROUPS.map((group) => ({
    group,
    items: [...byGroup.get(group)].sort((a, b) => a.localeCompare(b)),
  }));
}

// The circles a cluster draws: the items themselves, or the first SHOWN plus
// a "+N" overflow circle.
export function visibleCluster(items) {
  if (items.length <= MAX_SHOWN_LIMIT) return { shown: items, hidden: [], more: 0 };
  return { shown: items.slice(0, SHOWN), hidden: items.slice(SHOWN), more: items.length - SHOWN };
}

// Items the mountain lists at any level (essential, recommended, optional).
export function requiredItems(mountain) {
  return new Set(mountain.gear.map((g) => g.item));
}

export function groupCounts(mountain) {
  const counts = Object.fromEntries(GROUPS.map((g) => [g, 0]));
  for (const row of mountain.gear) counts[row.group] += 1;
  return counts;
}

export function levelCounts(mountain) {
  const counts = { essential: 0, recommended: 0, optional: 0 };
  for (const row of mountain.gear) {
    if (row.level in counts) counts[row.level] += 1;
  }
  return counts;
}

// Three consecutive phrases, starting at a different one per mountain so
// every phrase in the founder's list gets airtime.
export function phrasesFor(phrases, mountainIndex) {
  if (phrases.length <= 3) return phrases.slice(0, 3);
  const start = mountainIndex % phrases.length;
  return [0, 1, 2].map((k) => phrases[(start + k) % phrases.length]);
}

// Two or three demonstration tags for stage 3 ("x2 merged", "spec missing"):
// the first listed item in Clothing, Technical Hardware and Essentials that
// is drawn as its own circle. Illustrative of the checks, not a record.
export function dedupTags(taxonomy, mountain) {
  const need = requiredItems(mountain);
  const picks = [
    ['Clothing', 'x2 merged'],
    ['Technical Hardware', 'spec missing'],
    ['Essentials & Accessories', 'x2 merged'],
  ];
  const tags = [];
  for (const [group, label] of picks) {
    const cluster = taxonomy.find((c) => c.group === group);
    const item = cluster && visibleCluster(cluster.items).shown.find((i) => need.has(i));
    if (item) tags.push({ group, item, label });
  }
  return tags;
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export const STAGES = [
  { id: 1, title: 'The guidelines' },
  { id: 2, title: 'The agents scrape' },
  { id: 3, title: 'De-duplication and checks' },
  { id: 4, title: "The mountaineer's review" },
  { id: 5, title: 'Into the app' },
  { id: 6, title: 'It keeps going' },
];

export function stageSequence() {
  return STAGES.map((s) => s.id);
}

// The thinking beat: three phrases, two seconds each.
export const PHRASE_MS = 2000;

// Run button: every stage in order, about ten seconds end to end. Stage 2
// holds for the full thinking beat (3 x 2 s).
export const RUN_SCHEDULE = [
  { stage: 1, at: 0 },
  { stage: 2, at: 900 },
  { stage: 3, at: 900 + 3 * PHRASE_MS },
  { stage: 4, at: 900 + 3 * PHRASE_MS + 1100 },
  { stage: 5, at: 900 + 3 * PHRASE_MS + 1100 + 1500 },
  { stage: 6, at: 900 + 3 * PHRASE_MS + 1100 + 1500 + 700 },
];

// Timed marks (ms after a stage is entered) that drive the small beats
// inside a stage. The component counts how many have passed.
export function stageMarks(stage, reviewCount) {
  if (stage === 2) return [PHRASE_MS, 2 * PHRASE_MS];
  if (stage === 3) return [1800];
  if (stage === 4) {
    const marks = [];
    for (let i = 0; i < reviewCount; i += 1) marks.push(250 + i * 280);
    marks.push(250 + reviewCount * 280 + 150); // the check turns green
    return marks;
  }
  return [];
}

// One short sentence per stage for the visually hidden live region.
export function announce(stage, { name, total, changes }) {
  switch (stage) {
    case 1:
      return `Stage 1 of 6, the guidelines: the model reads the terrain of ${name}.`;
    case 2:
      return `Stage 2 of 6, the agents scrape the gear categories for ${name}.`;
    case 3:
      return `Stage 3 of 6, duplicates merged and gaps flagged: an unverified list of ${total} items.`;
    case 4:
      return `Stage 4 of 6, the mountaineer reviews the list: ${changes} recorded ${changes === 1 ? 'change' : 'changes'}, then verified.`;
    case 5:
      return `Stage 5 of 6, the verified list goes into the app.`;
    default:
      return `Stage 6 of 6, user reports go back to the mountaineer.`;
  }
}

// ---------------------------------------------------------------------------
// Geometry (px, origin at the canvas top left)
// ---------------------------------------------------------------------------

export const SPLIT_MIN = 560; // at or above this canvas width, ring left and list right
export const THUMB = 0.42; // stacked mode: the ring shrinks to this scale in stages 3 to 6

// Sunflower packing: loose, even, and the same every render.
export function sunflower(count, spacing) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  for (let k = 0; k < count; k += 1) {
    const r = spacing * Math.sqrt(k + 0.5);
    const a = k * golden;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return pts;
}

function clusterExtent(count, spacing, r) {
  return spacing * Math.sqrt(Math.max(0, count - 1) + 0.5) + r;
}

export function diagramLayout({ width, height, stage, taxonomy }) {
  const split = width >= SPLIT_MIN;
  const ringW = split ? Math.round(width * 0.58) : width;
  const circleR = split ? (width >= 640 ? 10 : 9) : 6.5;
  const spacing = circleR * (split ? 1.32 : 1.36);
  const maxCount = Math.max(
    ...taxonomy.map((c) => {
      const v = visibleCluster(c.items);
      return v.shown.length + (v.more ? 1 : 0);
    }),
  );
  const extent = clusterExtent(maxCount, spacing, circleR);
  const labelH = split ? 18 : 14;
  const modelR = split ? 30 : 22;

  const cx = ringW / 2;
  const cy = height / 2 - labelH / 2;
  const rx = Math.max(0, Math.min(ringW / 2 - extent - 6, split ? 170 : 150));
  const ry = Math.max(0, Math.min(height / 2 - extent - labelH, rx * 1.3));

  const clusters = taxonomy.map((c, k) => {
    const a = (k / taxonomy.length) * Math.PI * 2;
    const x = cx + rx * Math.sin(a);
    const y = cy - ry * Math.cos(a);
    const v = visibleCluster(c.items);
    const pts = sunflower(v.shown.length + (v.more ? 1 : 0), spacing);
    const circles = v.shown.map((item, i) => ({ item, x: x + pts[i].x, y: y + pts[i].y }));
    if (v.more) {
      const p = pts[v.shown.length];
      circles.push({ item: null, more: v.more, hidden: v.hidden, x: x + p.x, y: y + p.y });
    }
    return { group: c.group, x, y, circles, extent: clusterExtent(circles.length, spacing, circleR) };
  });

  const model = { x: cx, y: cy, r: modelR };

  // Where the ring sits: in place, or shrunk into the top left corner.
  const thumb = !split && stage >= 3;
  const ring = { scale: thumb ? THUMB : 1 };
  const place = (p) => (thumb ? { x: p.x * THUMB, y: p.y * THUMB } : { x: p.x, y: p.y });

  let card;
  let expert;
  let reviews;
  let phone;
  let reports;
  let cardCompact = false;
  if (split) {
    const colX = ringW;
    const colW = width - ringW;
    const cardW = Math.min(240, colW - 12);
    const cardX = colX + (colW - cardW) / 2;
    card = { x: cardX, y: 8, w: cardW };
    const cardH = 176;
    expert = { x: colX + colW / 2, y: card.y + cardH + 46, r: 22 };
    reviews = { x: cardX - 4, y: expert.y + expert.r + 24, w: cardW + 8 };
    phone = { x: colX + colW * 0.3, y: height - 44 };
    reports = { x: colX + colW * 0.76, y: height - 44, r: 20 };
  } else {
    const thumbW = width * THUMB;
    const thumbH = height * THUMB;
    cardCompact = stage >= 4;
    const cardX = Math.round(thumbW + 6);
    card = { x: cardX, y: 4, w: width - cardX - 2 };
    expert = { x: thumbW / 2, y: thumbH + 30, r: 18 };
    reviews = { x: 4, y: expert.y + expert.r + 22, w: width - 8 };
    phone = { x: width * 0.62, y: expert.y + 70 };
    reports = { x: width * 0.62, y: expert.y, r: 17 };
  }

  return {
    split,
    width,
    height,
    ringW,
    circleR,
    labelH,
    model,
    clusters,
    ring,
    place,
    card,
    cardCompact,
    expert,
    reviews,
    phone,
    reports,
  };
}

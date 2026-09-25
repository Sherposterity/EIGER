// Run with: node --test tests/verification.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GROUPS,
  RUN_SCHEDULE,
  buildTaxonomy,
  diagramLayout,
  requiredItems,
  stageSequence,
  visibleCluster,
} from '../src/components/verification/pipeline.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const snapshot = read('../src/data/gear-snapshot.json');
const taxonomyFile = read('../src/data/gear-taxonomy.json');
const reviews = read('../src/data/review-examples.json');
const phrases = read('../src/data/verification-phrases.json');

test('taxonomy built from the snapshot has no duplicates and matches the committed file', () => {
  const built = buildTaxonomy(snapshot);
  assert.deepEqual(built.map((c) => c.group), GROUPS);
  const all = built.flatMap((c) => c.items);
  assert.equal(new Set(all).size, all.length, 'an item appears in two clusters or twice in one');
  assert.deepEqual(taxonomyFile.clusters, built, 'gear-taxonomy.json is stale; rebuild it from the snapshot');
});

test('every snapshot gear item maps to exactly its own cluster', () => {
  const clusterOf = new Map(
    taxonomyFile.clusters.flatMap((c) => c.items.map((i) => [i, c.group])),
  );
  for (const m of snapshot.mountains) {
    for (const row of m.gear) {
      assert.equal(clusterOf.get(row.item), row.group, `${m.slug}: ${row.item}`);
    }
  }
});

test("every mountain's required set is a subset of the taxonomy", () => {
  const all = new Set(taxonomyFile.clusters.flatMap((c) => c.items));
  for (const m of snapshot.mountains) {
    for (const item of requiredItems(m)) assert.ok(all.has(item), `${m.slug}: ${item}`);
  }
});

test('large clusters show ten circles plus one overflow circle', () => {
  for (const c of taxonomyFile.clusters) {
    const v = visibleCluster(c.items);
    if (c.items.length > 12) {
      assert.equal(v.shown.length, 10);
      assert.equal(v.more, c.items.length - 10);
    } else {
      assert.equal(v.shown.length, c.items.length);
      assert.equal(v.more, 0);
    }
  }
});

test('stage sequencing returns stages 1 to 6 in order, and Run takes about ten seconds', () => {
  assert.deepEqual(stageSequence(), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(RUN_SCHEDULE.map((s) => s.stage), [1, 2, 3, 4, 5, 6]);
  for (let i = 1; i < RUN_SCHEDULE.length; i += 1) {
    assert.ok(RUN_SCHEDULE[i].at > RUN_SCHEDULE[i - 1].at);
  }
  const end = RUN_SCHEDULE.at(-1).at;
  assert.ok(end >= 9000 && end <= 11000, `Run reaches stage 6 at ${end} ms`);
  // Stage 2 holds for the whole thinking beat: three phrases, two seconds each.
  assert.ok(RUN_SCHEDULE[2].at - RUN_SCHEDULE[1].at >= 6000);
});

test('review examples: one entry per snapshot mountain, every change cites a source', () => {
  const slugs = snapshot.mountains.map((m) => m.slug).sort();
  assert.deepEqual(reviews.mountains.map((r) => r.mountain).sort(), slugs);
  for (const r of reviews.mountains) {
    assert.ok(r.changes.length >= 2 && r.changes.length <= 3, r.mountain);
    for (const c of r.changes) {
      assert.ok(['added', 'removed', 'changed', 'note'].includes(c.kind), `${r.mountain}: ${c.kind}`);
      assert.ok(c.text.trim().length > 0);
      assert.doesNotMatch(c.text, /[–—]/, 'no en or em dashes in copy');
      if (c.kind !== 'note') assert.match(c.source, /^\d{3}_.+\.sql$/, `${r.mountain}: ${c.text}`);
    }
  }
});

test('phrases file has at least three phrases', () => {
  assert.ok(phrases.phrases.length >= 3);
});

test('cluster circles stay inside the canvas and clusters do not overlap', () => {
  for (const [width, height] of [
    [680, 500],
    [600, 470],
    [358, 300],
    [320, 300],
  ]) {
    const geo = diagramLayout({ width, height, stage: 1, taxonomy: taxonomyFile.clusters });
    for (const c of geo.clusters) {
      for (const p of c.circles) {
        assert.ok(p.x - geo.circleR >= 0 && p.x + geo.circleR <= geo.ringW, `${width}: x ${p.x}`);
        assert.ok(p.y - geo.circleR >= 0 && p.y + geo.circleR + geo.labelH <= height, `${width}: y ${p.y}`);
      }
    }
    for (let i = 0; i < geo.clusters.length; i += 1) {
      for (let j = i + 1; j < geo.clusters.length; j += 1) {
        const a = geo.clusters[i];
        const b = geo.clusters[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        assert.ok(d > a.extent + b.extent, `${width}: ${a.group} overlaps ${b.group}`);
      }
      const c = geo.clusters[i];
      const dm = Math.hypot(c.x - geo.model.x, c.y - geo.model.y);
      assert.ok(dm > c.extent + geo.model.r, `${width}: ${c.group} overlaps the model node`);
    }
  }
});

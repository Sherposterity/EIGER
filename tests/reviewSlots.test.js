import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addedState, applyWrites, changesMap, currentState, deriveSlots, groupSlots, levelOf, liveStates, mergeState,
  modeOf, nextMode, planWrites, removedState, searchTaxonomy, splitState, summarize, summaryLine, withLevel, withMode,
} from '../src/lib/reviewSlots.js';

const types = [
  { item_type: 'helmet', display_name: 'Helmet', category_group: 'Technical Hardware', sort_order: 30 },
  { item_type: 'crampons', display_name: 'Crampons', category_group: 'Technical Hardware', sort_order: 20 },
  { item_type: 'base_layer', display_name: 'Base Layer', category_group: 'Clothing', sort_order: 1 },
  { item_type: 'headlamp', display_name: 'Headlamp', category_group: 'Essentials & Accessories', sort_order: 50 },
  { item_type: 'sleeping_bag', display_name: 'Sleeping Bag', category_group: 'Camp & Sleep', sort_order: 40 },
];
const live = [
  { item_type: 'helmet', season: 'all', requirement_level: 'essential', rationale: 'Rockfall' },
  { item_type: 'crampons', season: 'all', requirement_level: 'recommended', rationale: 'Glacier' },
  { item_type: 'base_layer', season: 'all', requirement_level: 'optional', rationale: null },
];
const orig = liveStates(live);

// Simulate a user action end to end: plan writes against current, apply locally.
const act = (changes, itemType, desiredFn) => {
  const original = orig.get(itemType) || {};
  const cur = currentState(original, changes, itemType);
  const writes = planWrites(cur, desiredFn(cur));
  return { writes, changes: applyWrites(changes, original, itemType, writes) };
};

test('no changes: every slot is same, summary says No changes', () => {
  const slots = deriveSlots(types, live, new Map());
  assert.equal(slots.length, 3);
  assert.ok(slots.every((s) => s.status === 'same' && s.mode === 'all'));
  assert.equal(summaryLine(summarize(slots)), 'No changes');
});

test('Both -> Winter only writes all:null and winter:level', () => {
  const { writes, changes } = act(new Map(), 'helmet', (c) => withMode(c, 'winter'));
  assert.deepEqual(writes, [{ season: 'all', level: null }, { season: 'winter', level: 'essential' }]);
  const s = deriveSlots(types, live, changes).find((x) => x.item_type === 'helmet');
  assert.equal(s.mode, 'winter');
  assert.equal(s.status, 'changed');
});

test('Both -> split writes all:null, summer, winter', () => {
  const { writes } = act(new Map(), 'crampons', splitState);
  assert.deepEqual(writes, [
    { season: 'all', level: null },
    { season: 'summer', level: 'recommended' },
    { season: 'winter', level: 'recommended' },
  ]);
});

test('split then back to Both returns to no change rows at all', () => {
  let { changes } = act(new Map(), 'crampons', splitState);
  ({ changes } = act(changes, 'crampons', (c) => withLevel(c, 'essential', 'winter')));
  assert.equal(modeOf(currentState(orig.get('crampons'), changes, 'crampons')), 'split');
  const back = act(changes, 'crampons', () => ({ all: 'recommended' }));
  assert.deepEqual(back.writes, [
    { season: 'all', level: 'recommended' },
    { season: 'summer', level: null },
    { season: 'winter', level: null },
  ]);
  assert.equal(back.changes.size, 0);
});

test('merge keeps the strongest seasonal level', () => {
  assert.deepEqual(mergeState({ summer: 'optional', winter: 'essential' }), { all: 'essential' });
  assert.equal(levelOf({ summer: 'recommended', winter: 'optional' }), 'recommended');
});

test('remove then undo leaves no change rows', () => {
  let { writes, changes } = act(new Map(), 'helmet', removedState);
  assert.deepEqual(writes, [{ season: 'all', level: null }]);
  assert.equal(deriveSlots(types, live, changes).find((s) => s.item_type === 'helmet').status, 'removed');
  ({ changes } = act(changes, 'helmet', () => orig.get('helmet')));
  assert.equal(changes.size, 0);
});

test('add a slot defaults to Both, recommended, and shows as added', () => {
  const { writes, changes } = act(new Map(), 'headlamp', addedState);
  assert.deepEqual(writes, [{ season: 'all', level: 'recommended' }]);
  const s = deriveSlots(types, live, changes).find((x) => x.item_type === 'headlamp');
  assert.equal(s.status, 'added');
  assert.equal(s.category_group, 'Essentials & Accessories');
  // removing an added slot drops it from the list entirely
  const gone = act(changes, 'headlamp', removedState);
  assert.equal(gone.changes.size, 0);
  assert.equal(deriveSlots(types, live, gone.changes).find((x) => x.item_type === 'headlamp'), undefined);
});

test('level change on an unsplit row writes only its season', () => {
  const { writes } = act(new Map(), 'base_layer', (c) => withLevel(c, 'essential'));
  assert.deepEqual(writes, [{ season: 'all', level: 'essential' }]);
  let r = act(new Map(), 'helmet', (c) => withMode(c, 'summer'));
  r = act(r.changes, 'helmet', (c) => withLevel(c, 'optional'));
  assert.deepEqual(r.writes, [{ season: 'summer', level: 'optional' }]);
});

test('changesMap and server rows round trip', () => {
  const m = changesMap([{ item_type: 'helmet', season: 'all', proposed_level: null }, { item_type: 'helmet', season: 'winter', proposed_level: 'essential' }]);
  assert.deepEqual(currentState(orig.get('helmet'), m, 'helmet'), { winter: 'essential' });
});

test('nextMode cycles Both, Summer, Winter', () => {
  assert.equal(nextMode('all'), 'summer');
  assert.equal(nextMode('summer'), 'winter');
  assert.equal(nextMode('winter'), 'all');
});

test('grouping follows the category order; summary counts', () => {
  let { changes } = act(new Map(), 'headlamp', addedState);
  ({ changes } = act(changes, 'helmet', removedState));
  ({ changes } = act(changes, 'crampons', (c) => withLevel(c, 'essential')));
  const slots = deriveSlots(types, live, changes);
  assert.deepEqual(groupSlots(slots).map((g) => g.group), ['Clothing', 'Technical Hardware', 'Essentials & Accessories']);
  assert.equal(summaryLine(summarize(slots, 1)), '1 added, 1 removed, 1 changed, 1 fact flagged');
});

test('taxonomy search skips slots already present, keeps removed ones addable', () => {
  const { changes } = act(new Map(), 'helmet', removedState);
  const slots = deriveSlots(types, live, changes);
  assert.deepEqual(searchTaxonomy(types, slots, 'h').map((t) => t.item_type).sort(), ['headlamp', 'helmet']);
  assert.deepEqual(searchTaxonomy(types, slots, 'cram'), []);
  assert.deepEqual(searchTaxonomy(types, slots, ''), []);
});

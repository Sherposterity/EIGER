import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKLIST_ITEM_TYPES, GEAR_KITS, GEAR_SYNONYMS, applySpec, isChecklistType, kitHit, createGapsApi, currentSpec, isMissingFeature, liveSpecs, specLine, specsMap, suggestionArgs,
  suggestionError, synonymScore, upsertSuggestion,
} from '../src/lib/reviewGaps.js';
import { searchTaxonomy, summarize, summaryLine } from '../src/lib/reviewSlots.js';

const T = (item_type, display_name, category_group = 'Technical Hardware', sort_order = 10) => ({ item_type, display_name, category_group, sort_order });
const before180 = [
  T('rescue_pulley', 'Rescue Pulley'),
  T('locking_carabiners', 'Locking Carabiners'),
  T('non_locking_carabiners', 'Non-Locking Carabiners'),
  T('quickdraws', 'Quickdraws'),
  T('helmet', 'Helmet'),
  T('avalanche_transceiver', 'Avalanche Transceiver', 'Essentials & Accessories'),
];
const after180 = [...before180, T('ice_screws', 'Ice Screws'), T('satellite_messenger', 'Satellite Messenger or PLB', 'Essentials & Accessories')];
const find = (types, q) => searchTaxonomy(types, [], q).map((t) => t.item_type);

// Reze's Mont Blanc review (2026-11-23): the live taxonomy plus mig 196 and the new types.
const reze = [
  ...after180,
  T('prusik_cords', 'Prusik Cords'),
  T('sling', 'Sling'),
  T('cordelette', 'Cordelette'),
  T('personal_anchor', 'Personal Anchor (PAS)'),
  T('spare_batteries', 'Spare Batteries', 'Essentials & Accessories'),
  T('portable_power_station', 'Portable Power Station', 'Essentials & Accessories'),
  T('water_bottles', 'Water Bottles', 'Essentials & Accessories'),
  T('backpack', 'Backpack', 'Essentials & Accessories'),
  T('sleeping_bag', 'Sleeping Bag', 'Camp & Sleep'),
  T('bear_canister', 'Bear Canister', 'Camp & Sleep'),
  T('tent', 'Tent', 'Camp & Sleep'),
  T('navigation', 'Navigation', 'Essentials & Accessories'),
  T('power_bank', 'Power Bank & Cables', 'Essentials & Accessories'),
  T('thermos', 'Thermos', 'Essentials & Accessories'),
  T('emergency_bivvy', 'Emergency Bivvy', 'Essentials & Accessories'),
  T('dry_bags', 'Dry Bags', 'Essentials & Accessories'),
  T('earplugs', 'Earplugs', 'Essentials & Accessories'),
  T('cash', 'Cash', 'Essentials & Accessories'),
  T('food_snacks', 'Food, Snacks & Energy Gels', 'Essentials & Accessories'),
];
const CREVASSE = ['rescue_pulley', 'ice_screws', 'cordelette', 'prusik_cords', 'sling', 'locking_carabiners'];

test('synonyms (2026-11-23): the new types and mig 196 map to the right type first', () => {
  const cases = {
    power_bank: ['power bank', 'battery pack', 'charger', 'cables', 'Anker powerbank'],
    thermos: ['thermos', 'vacuum flask', 'vacuum bottle'],
    emergency_bivvy: ['bivvy', 'bivy', 'emergency bag', 'space blanket'],
    dry_bags: ['dry bag', 'drybag', 'dry sack', 'stuff sack'],
    earplugs: ['earplugs', 'ear plugs'],
    cash: ['cash', 'money'],
    food_snacks: ['food', 'snacks', 'gels', 'energy gel', 'bars', 'energy bars'],
    cordelette: ['cordelette', 'anchor cord', 'cord loop'],
    personal_anchor: ['pas', 'daisy', 'daisy chain', 'tether', 'personal anchor', 'spider'],
  };
  for (const [type, words] of Object.entries(cases)) {
    for (const w of words) assert.equal(find(reze, w)[0], type, `${w} -> ${type}`);
  }
});

test('synonyms (2026-11-23): no collisions with the types that already existed', () => {
  assert.equal(find(reze, 'batteries')[0], 'spare_batteries');
  assert.equal(find(reze, 'power station')[0], 'portable_power_station');
  assert.equal(find(reze, 'sleeping bag')[0], 'sleeping_bag');
  assert.equal(find(reze, 'backpack')[0], 'backpack');
  assert.equal(find(reze, 'prusik')[0], 'prusik_cords');
  assert.equal(find(reze, 'water bottle')[0], 'water_bottles');
  for (const w of ['flask', 'soft flask', 'Nalgene', 'bladder', 'hydration']) assert.equal(find(reze, w)[0], 'water_bottles', w);
  for (const w of ['battery', 'batteries', 'AAA', 'AA']) assert.equal(find(reze, w)[0], 'spare_batteries', w);
  assert.equal(find(reze, 'battery pack')[0], 'power_bank');
  assert.equal(find(reze, 'food storage')[0], 'bear_canister');
  assert.equal(find(reze, 'food')[0], 'food_snacks');
  // 'bag' is a word in both names, so both show; the synonym lists add nothing more.
  assert.deepEqual(new Set(find(reze, 'bag')), new Set(['dry_bags', 'sleeping_bag']));
  assert.ok(!find(reze, 'compass').includes('personal_anchor'), "'pas' is a whole word, not inside compass");
  // Searching "cord" still offers both, Cordelette (name starts with it) ahead of Prusik Cords.
  assert.deepEqual(find(reze, 'cord').slice(0, 2), ['cordelette', 'prusik_cords']);
});

test('kits: "crevasse rescue" offers all six crevasse rescue parts', () => {
  assert.deepEqual(GEAR_KITS['crevasse rescue'], CREVASSE);
  for (const q of ['crevasse rescue', 'Crevasse rescue kit', 'crevasse kit', 'crev', 'rescue kit', 'glacier kit']) {
    assert.deepEqual(new Set(find(reze, q)), new Set(CREVASSE), q);
  }
  assert.equal(kitHit('sling', 'cr'), null, 'prefix needs 4 characters');
  assert.equal(kitHit('tent', 'crevasse rescue'), null);
});

test('kits: parts already on the mountain are not offered again', () => {
  const slots = [{ item_type: 'sling', status: 'same' }, { item_type: 'locking_carabiners', status: 'same' }];
  const hits = searchTaxonomy(reze, slots, 'crevasse rescue').map((t) => t.item_type);
  assert.deepEqual(new Set(hits), new Set(['rescue_pulley', 'ice_screws', 'cordelette', 'prusik_cords']));
});

test('checklist types: earplugs, cash and food are labelled, gear is not', () => {
  assert.deepEqual(CHECKLIST_ITEM_TYPES, ['earplugs', 'cash', 'food_snacks']);
  assert.ok(isChecklistType('earplugs'));
  assert.ok(isChecklistType({ item_type: 'cash' }));
  assert.ok(isChecklistType({ item_type: 'passport', checklist_only: true }));
  assert.ok(!isChecklistType({ item_type: 'thermos', checklist_only: false }));
  assert.ok(!isChecklistType('power_bank'));
  assert.ok(!isChecklistType(null));
});

test('synonyms: the brief list maps to the right types', () => {
  const cases = {
    rescue_pulley: ['traxion', 'Micro Traxion', 'nano traxion', 'Tibloc', 'ropeman', 'pulley'],
    locking_carabiners: ['screwgate', 'screw gate', 'HMS', 'auto-lock', 'autolock', 'triple lock', 'twistlock', 'locker'],
    non_locking_carabiners: ['wiregate', 'snapgate'],
    quickdraws: ['quickdraw', 'draw'],
    ice_screws: ['ice screw', 'screw'],
    satellite_messenger: ['inReach', 'Garmin', 'PLB', 'satellite', 'sat phone', 'SOS', 'messenger', 'Zoleo', 'spot', 'radio'],
  };
  for (const [type, words] of Object.entries(cases)) {
    for (const w of words) assert.equal(find(after180, w)[0], type, `${w} -> ${type}`);
  }
});

test('synonyms: beacon is not mapped to the satellite messenger', () => {
  assert.ok(!Object.values(GEAR_SYNONYMS).flat().includes('beacon'));
  assert.ok(!find(after180, 'beacon').includes('satellite_messenger'));
  assert.equal(synonymScore('satellite_messenger', 'avalanche beacon'), null);
});

test('synonyms: whole words inside a longer query and prefixes both hit', () => {
  assert.equal(synonymScore('rescue_pulley', 'petzl micro traxion'), 0);
  assert.equal(synonymScore('rescue_pulley', 'trax'), 1);
  assert.equal(synonymScore('satellite_messenger', 'garmin inreach mini 2'), 0);
  assert.equal(synonymScore('rescue_pulley', 't'), null, 'one letter never prefix matches');
  assert.equal(synonymScore('locking_carabiners', 'screwgate'), 0);
  assert.equal(synonymScore('ice_screws', 'screwgate'), null, 'screw is a whole word, not part of screwgate');
});

test('search: direct name hits rank before synonym hits', () => {
  // "screw" names Ice Screws directly and is a prefix of screwgate.
  assert.deepEqual(find(after180, 'screw'), ['ice_screws', 'locking_carabiners']);
  // "pulley" is in the display name, so it is a direct hit, scored 1.
  assert.deepEqual(find(after180, 'pulley'), ['rescue_pulley']);
  // Before 180 the new types are not loaded, so they never match.
  assert.deepEqual(find(before180, 'inreach'), []);
  assert.deepEqual(find(before180, 'ice screw'), []);
});

test('search: types already on the list are skipped for synonyms too', () => {
  const slots = [{ item_type: 'rescue_pulley', status: 'same' }];
  assert.deepEqual(searchTaxonomy(after180, slots, 'traxion'), []);
  const removed = [{ item_type: 'rescue_pulley', status: 'removed' }];
  assert.deepEqual(searchTaxonomy(after180, removed, 'traxion').map((t) => t.item_type), ['rescue_pulley']);
});

test('isMissingFeature knows the PostgREST and Postgres codes', () => {
  for (const code of ['PGRST202', 'PGRST205', 'PGRST204', '42883', '42P01', '42703']) assert.ok(isMissingFeature({ code }));
  assert.ok(isMissingFeature({ status: 404 }));
  assert.ok(!isMissingFeature({ code: 'P0001', status: 400 }));
  assert.ok(!isMissingFeature(null));
});

// ---- Fake Supabase client --------------------------------------------------

function fakeClient(handler) {
  const calls = [];
  const from = (table) => {
    const q = { kind: 'from', table, cols: null, filters: [] };
    const b = {
      select(c) {
        q.cols = c;
        return b;
      },
      eq(k, v) {
        q.filters.push([k, v]);
        return b;
      },
      order() {
        return b;
      },
      then(res, rej) {
        calls.push({ ...q });
        return Promise.resolve(handler({ ...q })).then(res, rej);
      },
    };
    return b;
  };
  const rpc = async (name, args) => {
    calls.push({ kind: 'rpc', name, args });
    return handler({ kind: 'rpc', name, args });
  };
  return { calls, from, rpc };
}
const missingTable = { data: null, error: { code: 'PGRST205', message: 'Could not find the table' }, status: 404 };
const missingColumn = { data: null, error: { code: '42703', message: 'column trail_gear_profile.detail does not exist' }, status: 400 };
const missingFn = { data: null, error: { code: 'PGRST202', message: 'Could not find the function' }, status: 404 };

test('degrade: before 180 the profile loads without detail and role, drafts are null', async () => {
  const client = fakeClient((q) => {
    if (q.table === 'trail_gear_profile') return q.cols.includes('detail') ? missingColumn : { data: [{ item_type: 'helmet', season: 'all' }], error: null };
    return missingTable;
  });
  const api = createGapsApi(client);
  const p = await api.loadProfile('t1');
  assert.equal(p.specs, false);
  assert.deepEqual(p.rows, [{ item_type: 'helmet', season: 'all' }]);
  assert.equal(await api.loadSpecs('r1'), null);
  assert.equal(await api.loadSuggestions('r1'), null);
  assert.equal(await api.adminSuggestions(), null);
  assert.equal(await api.adminSpecs(), null);
  const profileCalls = client.calls.filter((c) => c.table === 'trail_gear_profile');
  assert.equal(profileCalls.length, 2);
  assert.deepEqual(profileCalls[1].filters, [['trail_id', 't1'], ['status', 'approved']]);
});

test('types: checklist_only is read when migration 203 is live, and skipped before it', async () => {
  const live = fakeClient((q) => ({ data: [{ item_type: 'cash', checklist_only: true, cols: q.cols }], error: null }));
  const after = await createGapsApi(live).loadTypes();
  assert.ok(after[0].cols.includes('checklist_only'));
  assert.ok(isChecklistType(after[0]));
  const before = fakeClient((q) =>
    q.cols.includes('checklist_only')
      ? { data: null, error: { code: '42703', message: 'column gear_item_types.checklist_only does not exist' }, status: 400 }
      : { data: [{ item_type: 'helmet' }], error: null },
  );
  assert.deepEqual(await createGapsApi(before).loadTypes(), [{ item_type: 'helmet' }]);
  assert.equal(before.calls.filter((c) => c.table === 'gear_item_types').length, 2);
});

test('degrade: a write against a missing function throws with missing = true', async () => {
  const api = createGapsApi(fakeClient(() => missingFn));
  await assert.rejects(api.saveGearSuggestion('r1', { name: 'Ice screws' }), (e) => e.missing === true && e.code === 'PGRST202');
  await assert.rejects(api.saveSlotSpec('r1', 'helmet', {}), (e) => e.missing === true);
});

test('other errors are not treated as missing and keep the database sentence', async () => {
  const cap = { data: null, error: { code: 'P0001', message: 'up to 10 gear suggestions per mountain; use the mountain note for more' }, status: 400 };
  const api = createGapsApi(fakeClient(() => cap));
  await assert.rejects(api.saveGearSuggestion('r1', { name: 'Ice screws' }), (e) => !e.missing && /up to 10/.test(e.message));
  const denied = { data: null, error: { code: '42501', message: 'permission denied' }, status: 403 };
  await assert.rejects(createGapsApi(fakeClient(() => denied)).loadSpecs('r1'), /permission denied/);
});

test('after 180: profile carries detail and role; RPCs get the exact arguments', async () => {
  const client = fakeClient((q) => {
    if (q.kind === 'rpc' && q.name === 'save_gear_suggestion') return { data: 'uuid-1', error: null };
    if (q.kind === 'rpc') return { data: null, error: null };
    return { data: [], error: null };
  });
  const api = createGapsApi(client);
  assert.equal((await api.loadProfile('t1')).specs, true);
  await api.saveSlotSpec('r1', 'locking_carabiners', { detail: '  HMS auto-lock x2 ', role: 'leader' });
  assert.equal(await api.saveGearSuggestion('r1', { name: '  Ice   screws ', note: ' ', proposed_level: 'essential' }), 'uuid-1');
  await api.removeGearSuggestion('r1', 'uuid-1');
  await api.setGearSuggestionStatus('uuid-1', 'mapped', 'ice_screws', ' same thing ');
  await api.setGearSuggestionStatus('uuid-2', 'declined', 'ice_screws', '');
  const rpcs = client.calls.filter((c) => c.kind === 'rpc').map(({ name, args }) => ({ name, args }));
  assert.deepEqual(rpcs, [
    { name: 'save_slot_spec', args: { p_review_id: 'r1', p_item_type: 'locking_carabiners', p_detail: 'HMS auto-lock x2', p_role: 'leader' } },
    { name: 'save_gear_suggestion', args: { p_review_id: 'r1', p_name: 'Ice screws', p_note: null, p_proposed_level: 'essential', p_role: 'everyone' } },
    { name: 'remove_gear_suggestion', args: { p_review_id: 'r1', p_suggestion_id: 'uuid-1' } },
    { name: 'set_gear_suggestion_status', args: { p_suggestion_id: 'uuid-1', p_status: 'mapped', p_item_type: 'ice_screws', p_resolution: 'same thing' } },
    { name: 'set_gear_suggestion_status', args: { p_suggestion_id: 'uuid-2', p_status: 'declined', p_item_type: null, p_resolution: null } },
  ]);
});

test('spec mirror: equal to live deletes the draft, different keeps it', () => {
  const live = liveSpecs([
    { item_type: 'locking_carabiners', season: 'winter', detail: 'HMS x2', role: 'everyone' },
    { item_type: 'locking_carabiners', season: 'summer', detail: 'HMS x2', role: 'everyone' },
    { item_type: 'helmet', season: 'all', detail: null, role: null },
  ]);
  assert.deepEqual(live.get('locking_carabiners'), { detail: 'HMS x2', role: 'everyone' });
  let drafts = applySpec(new Map(), live, 'locking_carabiners', { detail: 'HMS auto-lock x2', role: 'leader' });
  assert.deepEqual(currentSpec(live, drafts, 'locking_carabiners'), { detail: 'HMS auto-lock x2', role: 'leader' });
  drafts = applySpec(drafts, live, 'locking_carabiners', { detail: ' HMS x2 ', role: 'everyone' });
  assert.equal(drafts.size, 0);
  drafts = applySpec(drafts, live, 'helmet', { detail: '', role: 'everyone' });
  assert.equal(drafts.size, 0, 'blank detail on a blank live slot is no change');
  assert.equal(liveSpecs([{ item_type: 'helmet', season: 'all' }]).size, 0, 'rows without the columns give no live spec');
  assert.deepEqual(specsMap([{ item_type: 'x', detail: '', role: null }]).get('x'), { detail: null, role: 'everyone' });
  assert.equal(specLine({ detail: 'HMS auto-lock x2', role: 'leader' }), 'HMS auto-lock x2, leader only');
  assert.equal(specLine({ detail: null, role: 'leader' }), 'Leader only');
  assert.equal(specLine({ detail: null, role: 'everyone' }), '');
});

test('suggestions: validation, full replace arguments, case-insensitive upsert', () => {
  assert.match(suggestionError({ name: ' a ' }), /at least 2/);
  assert.match(suggestionError({ name: 'x'.repeat(81) }), /80/);
  assert.match(suggestionError({ name: 'Ice screws', note: 'n'.repeat(501) }), /500/);
  assert.equal(suggestionError({ name: 'Ice screws', note: '' }), null);
  assert.deepEqual(suggestionArgs('r', { name: 'Radio', role: 'leader', note: ' VHF ' }), {
    p_review_id: 'r', p_name: 'Radio', p_note: 'VHF', p_proposed_level: null, p_role: 'leader',
  });
  let list = upsertSuggestion([], { id: 'a', name: 'Ice screws' });
  list = upsertSuggestion(list, { id: 'a', name: 'ICE  SCREWS', note: 'two' });
  list = upsertSuggestion(list, { id: 'b', name: 'Radio' });
  assert.deepEqual(list.map((s) => s.id), ['a', 'b']);
  assert.equal(list[0].note, 'two');
});

test('summary counts detail changes and gear suggestions', () => {
  const sum = summarize([], 0, { specs: 2, suggestions: 1 });
  assert.equal(sum.total, 3);
  assert.equal(summaryLine(sum), '2 details set, 1 gear suggestion');
  assert.equal(summaryLine(summarize([], 0)), 'No changes');
});

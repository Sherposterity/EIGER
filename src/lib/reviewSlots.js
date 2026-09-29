// Pure slot logic for the reviewer portal (no React, no Supabase), so it can
// be unit tested with node --test.
//
// Season model: each slot on a mountain is EITHER one row with season 'all'
// OR seasonal rows ('summer' and/or 'winter'), never both. A "state" below is
// a plain object { all?, summer?, winter? } whose values are levels
// ('essential' | 'recommended' | 'optional'); a missing key means "no row".
//
// Display state = live trail_gear_profile rows overlaid with review_changes
// rows. Every user action is expressed as a DESIRED end state for one slot;
// planWrites() turns it into save_change calls (one per season that differs).
// The server deletes a change row when the proposal equals the live row, and
// applyWrites() mirrors that locally, so there is never an explicit "undo".

export const SEASONS = ['all', 'summer', 'winter'];
export const LEVELS = ['essential', 'recommended', 'optional'];
const LEVEL_RANK = { essential: 0, recommended: 1, optional: 2 };

export const changeKey = (itemType, season) => `${itemType}|${season}`;

const clean = (state) => {
  const out = {};
  for (const s of SEASONS) if (state && state[s]) out[s] = state[s];
  return out;
};

export const isEmpty = (state) => !SEASONS.some((s) => state && state[s]);

export const sameState = (a, b) => SEASONS.every((s) => (a?.[s] || null) === (b?.[s] || null));

// 'all' | 'summer' | 'winter' | 'split' | null (no rows).
export function modeOf(state) {
  if (!state) return null;
  if (state.all) return 'all';
  if (state.summer && state.winter) return 'split';
  if (state.summer) return 'summer';
  if (state.winter) return 'winter';
  return null;
}

// The strongest level in a state (essential beats recommended beats optional).
export function levelOf(state) {
  let best = null;
  for (const s of SEASONS) {
    const l = state?.[s];
    if (l && (best === null || LEVEL_RANK[l] < LEVEL_RANK[best])) best = l;
  }
  return best;
}

// live rows [{item_type, season, requirement_level}] -> Map(item_type -> state)
export function liveStates(liveRows) {
  const map = new Map();
  for (const r of liveRows || []) {
    const st = map.get(r.item_type) || {};
    st[r.season] = r.requirement_level;
    map.set(r.item_type, st);
  }
  return map;
}

// review_changes rows -> Map(changeKey -> proposed_level | null)
export function changesMap(changeRows) {
  const map = new Map();
  for (const c of changeRows || []) map.set(changeKey(c.item_type, c.season), c.proposed_level ?? null);
  return map;
}

// Current state of one slot: live overlaid with changes.
export function currentState(original, changes, itemType) {
  const out = {};
  for (const s of SEASONS) {
    const k = changeKey(itemType, s);
    const v = changes.has(k) ? changes.get(k) : original?.[s] || null;
    if (v) out[s] = v;
  }
  return out;
}

// Writes needed to go from `current` to `desired`: [{season, level|null}].
export function planWrites(current, desired) {
  const writes = [];
  for (const s of SEASONS) {
    const from = current?.[s] || null;
    const to = desired?.[s] || null;
    if (from !== to) writes.push({ season: s, level: to });
  }
  return writes;
}

// Mirror of the server's save_change: a proposal equal to the live row
// removes the change entry. Returns a NEW map.
export function applyWrites(changes, original, itemType, writes) {
  const next = new Map(changes);
  for (const w of writes) {
    const k = changeKey(itemType, w.season);
    const live = original?.[w.season] || null;
    if ((w.level || null) === live) next.delete(k);
    else next.set(k, w.level || null);
  }
  return next;
}

// ---- Desired-state builders for each user action -------------------------

// Season chip: 'all' (Both) | 'summer' | 'winter' on an unsplit row.
export function withMode(current, mode) {
  const level = levelOf(current) || 'recommended';
  return { [mode]: level };
}

export function splitState(current) {
  const level = levelOf(current) || 'recommended';
  return { summer: current.summer || level, winter: current.winter || level };
}

// Back to Both: keeps the strongest seasonal level.
export function mergeState(current) {
  return { all: levelOf(current) || 'recommended' };
}

// Level on an unsplit row, or on one line of a split row (season given).
export function withLevel(current, level, season) {
  if (season) return { ...clean(current), [season]: level };
  const mode = modeOf(current);
  if (mode === 'split') return { summer: level, winter: level };
  return { [mode || 'all']: level };
}

export const removedState = () => ({});
export const addedState = () => ({ all: 'recommended' });

// Next chip value for the W shortcut: Both -> Summer -> Winter -> Both.
export function nextMode(mode) {
  if (mode === 'all') return 'summer';
  if (mode === 'summer') return 'winter';
  return 'all';
}

// ---- Derived list ---------------------------------------------------------

// Build the display list. types = gear_item_types rows; live = profile rows
// (with rationale); changes = Map from changesMap(). Returns slots sorted by
// the taxonomy's category order then sort_order, each:
// { item_type, display_name, category_group, sort_order, rationale,
//   original, current, mode, status: 'same'|'changed'|'added'|'removed' }
export function deriveSlots(types, liveRows, changes) {
  const orig = liveStates(liveRows);
  const rationale = new Map();
  for (const r of liveRows || []) if (r.rationale && !rationale.has(r.item_type)) rationale.set(r.item_type, r.rationale);
  const touched = new Set(orig.keys());
  for (const k of changes.keys()) touched.add(k.split('|')[0]);
  const typeMap = new Map((types || []).map((t) => [t.item_type, t]));

  const slots = [];
  for (const itemType of touched) {
    const original = orig.get(itemType) || {};
    const current = currentState(original, changes, itemType);
    const wasThere = !isEmpty(original);
    const isThere = !isEmpty(current);
    if (!wasThere && !isThere) continue;
    let status = 'same';
    if (!wasThere) status = 'added';
    else if (!isThere) status = 'removed';
    else if (!sameState(original, current)) status = 'changed';
    const t = typeMap.get(itemType);
    slots.push({
      item_type: itemType,
      display_name: t?.display_name || itemType,
      category_group: t?.category_group || 'Other',
      sort_order: t?.sort_order ?? 9999,
      rationale: rationale.get(itemType) || null,
      original,
      current,
      mode: modeOf(isThere ? current : original),
      status,
    });
  }
  slots.sort((a, b) => a.sort_order - b.sort_order || a.display_name.localeCompare(b.display_name));
  return slots;
}

export const CATEGORY_ORDER = ['Clothing', 'Footwear', 'Technical Hardware', 'Camp & Sleep', 'Essentials & Accessories'];

// Group slots by category_group in CATEGORY_ORDER (unknown groups last).
export function groupSlots(slots) {
  const groups = new Map();
  for (const s of slots) {
    if (!groups.has(s.category_group)) groups.set(s.category_group, []);
    groups.get(s.category_group).push(s);
  }
  const rank = (g) => {
    const i = CATEGORY_ORDER.indexOf(g);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([group, items]) => ({ group, items }));
}

// Counts for the change summary. factFlags = number of flagged facts.
export function summarize(slots, factFlags = 0) {
  const out = { added: 0, removed: 0, changed: 0, facts: factFlags };
  for (const s of slots) {
    if (s.status === 'added') out.added += 1;
    else if (s.status === 'removed') out.removed += 1;
    else if (s.status === 'changed') out.changed += 1;
  }
  out.total = out.added + out.removed + out.changed + out.facts;
  return out;
}

export function summaryLine(sum) {
  const parts = [];
  if (sum.added) parts.push(`${sum.added} added`);
  if (sum.removed) parts.push(`${sum.removed} removed`);
  if (sum.changed) parts.push(`${sum.changed} changed`);
  if (sum.facts) parts.push(`${sum.facts} ${sum.facts === 1 ? 'fact' : 'facts'} flagged`);
  return parts.length ? parts.join(', ') : 'No changes';
}

// Taxonomy search for the "Add a slot" box: names not already present.
export function searchTaxonomy(types, slots, query, limit = 8) {
  const present = new Set(slots.filter((s) => s.status !== 'removed').map((s) => s.item_type));
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const hits = [];
  for (const t of types || []) {
    if (present.has(t.item_type)) continue;
    const name = (t.display_name || t.item_type).toLowerCase();
    const idx = name.indexOf(q);
    const wordStart = name.split(/[\s/&-]+/).some((w) => w.startsWith(q));
    if (idx === -1 && !t.item_type.includes(q)) continue;
    hits.push({ t, score: idx === 0 ? 0 : wordStart ? 1 : 2 });
  }
  hits.sort((a, b) => a.score - b.score || a.t.display_name.localeCompare(b.t.display_name));
  return hits.slice(0, limit).map((h) => h.t);
}

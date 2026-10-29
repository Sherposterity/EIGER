// Review gear gaps (hike migration 181, live 2026-10-28): gear synonyms for the "Missing
// something?" search, per slot detail and role, and "Suggest new gear" when
// nothing in the taxonomy matches. Pure logic plus a small data layer that
// takes the Supabase client as an argument, so all of it runs under
// node --test with a fake client.
//
// Graceful degrade: written before migration 181 was live, and kept so a
// rollback cannot break the page. Every
// read here returns null (not []) when its table, column or function does not
// exist yet, and the screens then hide the new controls and behave exactly as
// before. A write that hits a missing function throws an Error whose
// `missing` flag is true, so a screen can switch the feature off and explain.

// ---- Synonyms --------------------------------------------------------------

// item_type -> words reviewers actually type. Data, not code: add a row here
// when a reviewer reports a miss. 'beacon' is deliberately absent: an
// avalanche beacon (transceiver) is a different piece of kit from a
// satellite messenger or PLB. Types that do not exist yet in gear_item_types
// never match, since the search only runs over the loaded types.
export const GEAR_SYNONYMS = {
  rescue_pulley: ['traxion', 'micro traxion', 'nano traxion', 'tibloc', 'ropeman', 'pulley'],
  locking_carabiners: ['screwgate', 'screw gate', 'hms', 'auto lock', 'autolock', 'triple lock', 'twistlock', 'twist lock', 'locker'],
  non_locking_carabiners: ['wiregate', 'wire gate', 'snapgate', 'snap gate'],
  quickdraws: ['quickdraw', 'draw'],
  ice_screws: ['ice screw', 'screw'],
  satellite_messenger: ['inreach', 'garmin', 'plb', 'satellite', 'sat phone', 'sos', 'messenger', 'zoleo', 'spot', 'radio'],
};

// Lowercase, any run of punctuation or spaces becomes one space.
export const normalizeTerm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// How well a query hits a type's synonyms: { score, length } or null.
// score 0 = the query names a synonym as whole words ("petzl micro traxion"),
// 1 = the query starts a synonym ("trax"). length is the matched synonym's
// length, so the more specific synonym wins a tie ("screw gate" is a
// carabiner before "screw" is an ice screw). Prefix hits need 2 characters,
// so one letter does not drag in half the list.
export function synonymHit(itemType, query, synonyms = GEAR_SYNONYMS) {
  const q = normalizeTerm(query);
  const list = synonyms[itemType];
  if (!q || !list) return null;
  const padded = ` ${q} `;
  let best = null;
  for (const raw of list) {
    const syn = normalizeTerm(raw);
    if (!syn) continue;
    let score = null;
    if (padded.includes(` ${syn} `)) score = 0;
    else if (q.length >= 2 && syn.startsWith(q)) score = 1;
    if (score === null) continue;
    if (!best || score < best.score || (score === best.score && syn.length > best.length)) best = { score, length: syn.length };
  }
  return best;
}

export const synonymScore = (itemType, query, synonyms = GEAR_SYNONYMS) => synonymHit(itemType, query, synonyms)?.score ?? null;

// ---- Missing feature detection ------------------------------------------

// PostgREST / Postgres codes for "this does not exist (yet)".
const MISSING_CODES = new Set([
  'PGRST202', // function not found in the schema cache
  'PGRST205', // table not found in the schema cache
  'PGRST204', // column not found in the schema cache
  '42883', // undefined_function
  '42P01', // undefined_table
  '42703', // undefined_column
]);

export const isMissingFeature = (err) => !!err && (MISSING_CODES.has(err.code) || err.status === 404 || err.missing === true);

// ---- Server refusals -> reviewer copy ------------------------------------

// Every sentence migration 181's reviewer and admin RPCs raise (and the shared
// review_require_open / review_require_admin guards from 122), mapped to copy
// a climber can act on. Keys are the server text exactly; a message that is
// not here is shown as the server wrote it.
const RETYPE = 'often from a copy and paste. Please type it again by hand.';
export const REFUSAL_COPY = {
  // shared guards
  'not a reviewer': 'This page is for approved Eiger reviewers. Sign in with your reviewer account.',
  'not your review': 'This review belongs to another reviewer, so you cannot change it.',
  'admin only': 'Only the Eiger team can do that.',
  // save_slot_spec
  'bad role': 'Choose who carries it: Every climber or Leader only.',
  'keep the detail to 80 characters': 'Keep the detail to 80 characters.',
  'the detail cannot contain control characters': 'The detail has to be one line of plain text. Remove any special characters and try again.',
  'the detail contains hidden formatting characters; please retype it': `The detail has hidden formatting characters, ${RETYPE}`,
  // save_gear_suggestion
  'name the gear in at least 2 characters': 'Name the gear in at least 2 characters.',
  'keep the gear name to 80 characters': 'Keep the gear name to 80 characters.',
  'the gear name cannot contain control characters': 'The gear name has to be plain text. Remove any special characters and try again.',
  'the gear name contains hidden formatting characters; please retype it': `The gear name has hidden formatting characters, ${RETYPE}`,
  'keep the note to 500 characters': 'Keep the note to 500 characters.',
  'the note contains hidden formatting characters; please retype it': `The note has hidden formatting characters, ${RETYPE}`,
  'bad level': 'Choose a level: Essential, Recommended, Optional or Not sure.',
  'this suggestion was already reviewed':
    'The Eiger team has already reviewed this suggestion, so it can no longer be changed. Add anything new to the mountain note.',
  'up to 10 gear suggestions per review; use the mountain note for more':
    'You can suggest up to 10 pieces of gear per review. Add the rest to the mountain note.',
  'you have 30 open gear suggestions; we will catch up on them first':
    'You have 30 suggestions waiting for the Eiger team. We will work through those before you add more.',
  // remove_gear_suggestion
  'no such suggestion on this review': 'That suggestion is no longer on this review. Reload the page to see the current list.',
  // set_gear_suggestion_status (admin)
  'bad status': 'Pick a status: Open, Added as a new type, Mapped to a type or Declined.',
  'mapped needs a slot': 'Pick the gear type this suggestion maps to.',
  'no such suggestion': 'That suggestion no longer exists. Reload the page.',
  'the resolution contains hidden formatting characters; please retype it': `The resolution has hidden formatting characters, ${RETYPE}`,
};

// Server sentence -> reviewer copy. Patterned messages (with a value in them)
// are matched by shape; the value itself is never echoed back.
export function reviewerMessage(message) {
  const m = String(message ?? '').trim();
  if (!m) return 'Something went wrong. Please try again.';
  if (Object.prototype.hasOwnProperty.call(REFUSAL_COPY, m)) return REFUSAL_COPY[m];
  if (/^unknown slot /.test(m)) return 'That gear type is not in the Eiger list any more. Reload the page and pick it again.';
  if (/^review is [a-z_]+; re-claim the mountain to keep editing$/.test(m))
    return 'This review is no longer open for edits. Claim the mountain again from the board to keep editing.';
  return m;
}

// { data, error, status } -> data, or throw Error(reviewer copy) keeping the
// code and the server's own sentence (serverMessage).
export function unwrapKeep(res) {
  const { data, error, status } = res || {};
  if (error) {
    const e = new Error(reviewerMessage(error.message));
    e.serverMessage = error.message || '';
    e.code = error.code;
    e.status = status ?? error.status;
    e.missing = isMissingFeature({ code: error.code, status: e.status });
    throw e;
  }
  return data;
}

// Run a read; null when the feature is missing, rethrow anything else.
async function readOrNull(promise) {
  try {
    return unwrapKeep(await promise);
  } catch (e) {
    if (e.missing) return null;
    throw e;
  }
}

// ---- Slot spec (detail + role) -------------------------------------------

export const DETAIL_MAX = 80;
export const ROLES = ['everyone', 'leader'];
export const ROLE_LABEL = { everyone: 'Every climber', leader: 'Leader only' };

// Same as the server: any run of whitespace (tabs, newlines) becomes one
// space, then trim; blank means no detail.
export const cleanDetail = (s) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t ? t : null;
};

// Characters the server refuses: ASCII control characters, and bidi
// override / isolate and zero-width space (U+202A..U+202E, U+2066..U+2069,
// U+200B), which make text read differently from what it stores.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_RE = /[\u0000-\u001f\u007f]/;
const HIDDEN_RE = /[\u202a-\u202e\u2066-\u2069\u200b]/;
export const hasHiddenChars = (s) => HIDDEN_RE.test(String(s ?? ''));
export const hasControlChars = (s) => CONTROL_RE.test(String(s ?? ''));
export const cleanRole = (r) => (r === 'leader' ? 'leader' : 'everyone');
export const detailError = (s) => {
  const d = cleanDetail(s);
  if (!d) return null;
  if (d.length > DETAIL_MAX) return REFUSAL_COPY['keep the detail to 80 characters'];
  if (hasControlChars(d)) return REFUSAL_COPY['the detail cannot contain control characters'];
  if (hasHiddenChars(d)) return REFUSAL_COPY['the detail contains hidden formatting characters; please retype it'];
  return null;
};

const blankSpec = () => ({ detail: null, role: 'everyone' });
export const sameSpec = (a, b) => cleanDetail(a?.detail) === cleanDetail(b?.detail) && cleanRole(a?.role) === cleanRole(b?.role);
export const isDefaultSpec = (s) => sameSpec(s, blankSpec());

// Live profile rows -> Map(item_type -> {detail, role}). All season rows of a
// slot share one spec; like the server, the first row by season wins.
export function liveSpecs(liveRows) {
  const map = new Map();
  const rows = [...(liveRows || [])].sort((a, b) => String(a.season).localeCompare(String(b.season)));
  for (const r of rows) {
    if (map.has(r.item_type)) continue;
    if (!('detail' in r) && !('role' in r)) continue;
    map.set(r.item_type, { detail: cleanDetail(r.detail), role: cleanRole(r.role) });
  }
  return map;
}

// review_slot_specs rows -> Map(item_type -> {detail, role}).
export const specsMap = (rows) => new Map((rows || []).map((r) => [r.item_type, { detail: cleanDetail(r.detail), role: cleanRole(r.role) }]));

export const currentSpec = (live, drafts, itemType) => drafts.get(itemType) || live.get(itemType) || blankSpec();

// Mirror of save_slot_spec: a spec equal to the live one deletes the draft
// row. Returns a NEW map.
export function applySpec(drafts, live, itemType, spec) {
  const next = new Map(drafts);
  const want = { detail: cleanDetail(spec?.detail), role: cleanRole(spec?.role) };
  if (sameSpec(want, live.get(itemType) || blankSpec())) next.delete(itemType);
  else next.set(itemType, want);
  return next;
}

// "HMS auto-lock x2, leader only", or '' when there is nothing to say.
export function specLine(spec) {
  const parts = [];
  const d = cleanDetail(spec?.detail);
  if (d) parts.push(d);
  if (cleanRole(spec?.role) === 'leader') parts.push(d ? 'leader only' : ROLE_LABEL.leader);
  return parts.join(', ');
}

// ---- Gear suggestions -----------------------------------------------------

export const SUGGESTION_NAME_MIN = 2;
export const SUGGESTION_NAME_MAX = 80;
export const SUGGESTION_NOTE_MAX = 500;
export const SUGGESTIONS_PER_REVIEW = 10;
export const SUGGESTION_STATUSES = ['open', 'added', 'mapped', 'declined'];
export const SUGGESTION_STATUS_LABEL = { open: 'Open', added: 'Added as a new type', mapped: 'Mapped to a type', declined: 'Declined' };

export const cleanName = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// The first problem with a suggestion, as a sentence, or null.
export function suggestionError({ name, note }) {
  const n = cleanName(name);
  const t = String(note ?? '').trim();
  if (n.length < SUGGESTION_NAME_MIN) return REFUSAL_COPY['name the gear in at least 2 characters'];
  if (n.length > SUGGESTION_NAME_MAX) return REFUSAL_COPY['keep the gear name to 80 characters'];
  if (hasControlChars(n)) return REFUSAL_COPY['the gear name cannot contain control characters'];
  if (hasHiddenChars(n)) return REFUSAL_COPY['the gear name contains hidden formatting characters; please retype it'];
  if (t.length > SUGGESTION_NOTE_MAX) return REFUSAL_COPY['keep the note to 500 characters'];
  if (hasHiddenChars(t)) return REFUSAL_COPY['the note contains hidden formatting characters; please retype it'];
  return null;
}

// Triaged suggestions (added, mapped, declined) are read-only on the server.
export const isTriaged = (g) => !!g && !!g.status && g.status !== 'open';

// The triaged suggestion a save with this name would hit (the server matches
// names case-insensitively on the same review), or null.
export function triagedWithName(list, name) {
  const key = cleanName(name).toLowerCase();
  return (list || []).find((g) => isTriaged(g) && cleanName(g.name).toLowerCase() === key) || null;
}

// Full argument set for save_gear_suggestion. The RPC is a full replace, so
// every field is always sent.
export const suggestionArgs = (reviewId, s) => ({
  p_review_id: reviewId,
  p_name: cleanName(s.name),
  p_note: String(s.note ?? '').trim() || null,
  p_proposed_level: s.proposed_level || null,
  p_role: cleanRole(s.role),
});

// Mirror of the server's upsert: the same name on the same review (any case)
// replaces that row. Returns a NEW array.
export function upsertSuggestion(list, row) {
  const key = cleanName(row.name).toLowerCase();
  const rest = (list || []).filter((s) => s.id !== row.id && cleanName(s.name).toLowerCase() !== key);
  return [...rest, row];
}

// ---- Data layer -----------------------------------------------------------

const PROFILE_BASE = 'item_type, season, requirement_level, rationale';

export function createGapsApi(client) {
  const rpc = async (name, args) => unwrapKeep(await client.rpc(name, args));

  return {
    // Live profile rows for a mountain, with detail and role when the
    // columns exist. Resolves { rows, specs: boolean }.
    async loadProfile(trailId) {
      const query = (cols) => client.from('trail_gear_profile').select(cols).eq('trail_id', trailId).eq('status', 'approved');
      try {
        return { rows: unwrapKeep(await query(`${PROFILE_BASE}, detail, role`)) || [], specs: true };
      } catch (e) {
        if (!e.missing) throw e;
        return { rows: unwrapKeep(await query(PROFILE_BASE)) || [], specs: false };
      }
    },

    // Reviewer drafts. null = the feature is not live.
    loadSpecs: (reviewId) =>
      readOrNull(client.from('review_slot_specs').select('item_type, detail, role, original_detail, original_role').eq('review_id', reviewId)),
    loadSuggestions: (reviewId) =>
      readOrNull(client.from('review_gear_suggestions').select('id, name, note, proposed_level, role, status').eq('review_id', reviewId)),

    saveSlotSpec: (reviewId, itemType, spec) =>
      rpc('save_slot_spec', { p_review_id: reviewId, p_item_type: itemType, p_detail: cleanDetail(spec?.detail), p_role: cleanRole(spec?.role) }),
    saveGearSuggestion: (reviewId, s) => rpc('save_gear_suggestion', suggestionArgs(reviewId, s)),
    removeGearSuggestion: (reviewId, suggestionId) => rpc('remove_gear_suggestion', { p_review_id: reviewId, p_suggestion_id: suggestionId }),

    // Admin. Reads are null when the feature is not live.
    adminSuggestions: () =>
      readOrNull(
        client
          .from('review_gear_suggestions')
          .select('id, review_id, reviewer_id, trail_id, name, note, proposed_level, role, status, mapped_item_type, resolution, resolved_at, created_at'),
      ),
    adminSpecs: () => readOrNull(client.from('review_slot_specs').select('review_id, item_type, detail, role, original_detail, original_role')),
    setGearSuggestionStatus: (suggestionId, status, itemType = null, resolution = null) =>
      rpc('set_gear_suggestion_status', {
        p_suggestion_id: suggestionId,
        p_status: status,
        p_item_type: status === 'mapped' ? itemType || null : null,
        p_resolution: String(resolution ?? '').trim() || null,
      }),
  };
}

// review_id -> rows, for the admin view.
export function byReview(rows) {
  const map = new Map();
  for (const r of rows || []) {
    if (!map.has(r.review_id)) map.set(r.review_id, []);
    map.get(r.review_id).push(r);
  }
  return map;
}
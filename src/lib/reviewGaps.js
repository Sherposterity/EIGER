// Review gear gaps (hike migration 180): gear synonyms for the "Missing
// something?" search, per slot detail and role, and "Suggest new gear" when
// nothing in the taxonomy matches. Pure logic plus a small data layer that
// takes the Supabase client as an argument, so all of it runs under
// node --test with a fake client.
//
// Graceful degrade: the site may ship before migration 180 is live. Every
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

// { data, error, status } -> data, or throw Error(message) keeping the code.
export function unwrapKeep(res) {
  const { data, error, status } = res || {};
  if (error) {
    const e = new Error(error.message || 'Something went wrong. Please try again.');
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

export const cleanDetail = (s) => {
  const t = String(s ?? '').trim();
  return t ? t : null;
};
export const cleanRole = (r) => (r === 'leader' ? 'leader' : 'everyone');
export const detailError = (s) => {
  const d = cleanDetail(s);
  return d && d.length > DETAIL_MAX ? `Keep the detail to ${DETAIL_MAX} characters.` : null;
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
  if (n.length < SUGGESTION_NAME_MIN) return `Name the gear in at least ${SUGGESTION_NAME_MIN} characters.`;
  if (n.length > SUGGESTION_NAME_MAX) return `Keep the gear name to ${SUGGESTION_NAME_MAX} characters.`;
  if (String(note ?? '').trim().length > SUGGESTION_NOTE_MAX) return `Keep the note to ${SUGGESTION_NOTE_MAX} characters.`;
  return null;
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
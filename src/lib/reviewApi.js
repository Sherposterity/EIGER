// Thin data layer for the reviewer portal. Every call goes through the shared
// signed-in Supabase client; row level security and the SECURITY DEFINER
// RPCs enforce who may read or write what, the UI only reflects it.
// Errors are thrown as Error(message) with the database's own sentence.
import { supabase } from './supabase';

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message || 'Something went wrong. Please try again.');
  return data;
};

export const rpc = async (name, args) => unwrap(await supabase.rpc(name, args));

export const reviewerMe = () => rpc('reviewer_me');
export const reviewBoard = () => rpc('review_board');
export const claimMountain = (trailId) => rpc('claim_mountain', { p_trail_id: trailId });
export const releaseClaim = (reviewId) => rpc('release_claim', { p_review_id: reviewId });
export const saveChange = (reviewId, itemType, season, level) =>
  rpc('save_change', { p_review_id: reviewId, p_item_type: itemType, p_season: season, p_proposed_level: level });
export const saveSlotNote = (reviewId, itemType, note, scope = 'mountain', condition = null) =>
  rpc('save_slot_note', { p_review_id: reviewId, p_item_type: itemType, p_note: note, p_scope: scope, p_condition: condition });
export const saveFactFlag = (reviewId, field, claimed, note) =>
  rpc('save_fact_flag', { p_review_id: reviewId, p_field: field, p_claimed_value: claimed, p_note: note });
export const setMountainNote = (reviewId, note) => rpc('set_mountain_note', { p_review_id: reviewId, p_note: note });
export const submitReview = (reviewId, scrolled) => rpc('submit_review', { p_review_id: reviewId, p_scrolled_to_end: scrolled });

const TRAIL_COLUMNS =
  'id, name, altitude_m, approach_start_m, elevation_gain_m, elevation_loss_m, distance_km, duration_days, difficulty, technical, glaciated, avalanche_terrain, typical_temperature_min_c, typical_temperature_max_c, boots_crampon_rating, climate_zone, description, image_url';

// Everything the review screen needs for one mountain, in parallel.
export async function loadMountain(trailId, reviewerId) {
  const [trail, types, live, reviews] = await Promise.all([
    supabase.from('trails').select(TRAIL_COLUMNS).eq('id', trailId).maybeSingle().then(unwrap),
    supabase.from('gear_item_types').select('item_type, display_name, category_group, sort_order').order('sort_order').then(unwrap),
    supabase
      .from('trail_gear_profile')
      .select('item_type, season, requirement_level, rationale')
      .eq('trail_id', trailId)
      .eq('status', 'approved')
      .then(unwrap),
    supabase
      .from('mountain_reviews')
      .select('id, trail_id, reviewer_id, state, claimed_at, lock_expires_at, submitted_at, verified_at, mountain_note, scrolled_to_end')
      .eq('trail_id', trailId)
      .eq('reviewer_id', reviewerId)
      .order('claimed_at', { ascending: false })
      .then(unwrap),
  ]);
  return { trail, types: types || [], live: live || [], reviews: reviews || [] };
}

// The reviewer's own draft rows for one review.
export async function loadDraft(reviewId) {
  const [changes, notes, flags] = await Promise.all([
    supabase.from('review_changes').select('item_type, season, original_level, proposed_level').eq('review_id', reviewId).then(unwrap),
    supabase.from('review_slot_notes').select('item_type, note, scope, condition').eq('review_id', reviewId).then(unwrap),
    supabase.from('review_fact_flags').select('field, current_value, claimed_value, note').eq('review_id', reviewId).then(unwrap),
  ]);
  return { changes: changes || [], notes: notes || [], flags: flags || [] };
}

export const fromTable = (table, columns = '*') => supabase.from(table).select(columns).then(unwrap);

// "Oct 2"
export const shortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
// "Oct 2, 14:05"
export const shortDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

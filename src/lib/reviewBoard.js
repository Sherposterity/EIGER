// Board rules for the reviewer portal (Muad 2026-10-28, hike migration 180):
// unlimited reviewers per mountain, a reviewed mountain stays claimable by
// other reviewers, one live claim per mountain, and nobody reviews the same
// mountain twice. The database enforces all of it (claim_mountain); these
// helpers only decide what the board shows. Plain functions so node --test
// can check them.

export const TIER_LABELS = {
  certified_guide: 'Certified guide',
  aspirant_guide: 'Aspirant guide',
  experienced_amateur: 'Experienced amateur',
  club_leader: 'Club leader',
  other: 'Climber',
};

export const tierLabel = (tier) => TIER_LABELS[tier] || TIER_LABELS.other;

// review_board() row: a verified row with is_mine = true is the caller's own
// verified review (the board sorts it first), so it cannot be claimed again.
export const reviewedByMe = (row) => !!row && row.state === 'verified' && row.is_mine === true;

// Open, or reviewed by other climbers only, and the caller holds no claim.
export const canClaim = (row, holdingClaim) =>
  !!row && !holdingClaim && (row.state === 'open' || (row.state === 'verified' && !reviewedByMe(row)));

export const reviewerCount = (row) => {
  const n = Number(row?.reviewer_count);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

// The count only, the same words the app's badge uses.
export const reviewerCountLabel = (n) =>
  n <= 0 ? 'No reviews yet' : n === 1 ? 'Reviewed by 1 climber' : `Reviewed by ${n} climbers`;

const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// review_board().prior_reviewers: [{ display_name, tier, verified_at, email }],
// email only when that reviewer opted in to sharing it. Oldest first.
export function priorReviewers(row) {
  let list = row?.prior_reviewers;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({
      name: text(p.display_name) || 'An Eiger reviewer',
      tier: tierLabel(p.tier),
      verifiedAt: text(p.verified_at),
      email: text(p.email),
    }));
}

// Reviewers shown in the Verified by strip (src/components/VerifiedBy.jsx).
// Only rows where the person said yes (consent true) and that carry a name are
// ever shown; everything else in src/data/reviewers.json stays private.

export function visibleReviewers(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (r) => r && r.consent === true && typeof r.name === 'string' && r.name.trim() !== '',
  );
}

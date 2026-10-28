import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import RequireReviewer from './ReviewGate';
import { claimMountain, reviewBoard, shortDate } from '@/lib/reviewApi';
import { canClaim, priorReviewers, reviewedByMe, reviewerCount, reviewerCountLabel } from '@/lib/reviewBoard';
import ReviewerConsent from './ReviewerConsent';
import { EYEBROW, STATE_LABEL, btnGhost, btnPrimary, btnQuiet, field, focusRing, surface } from './reviewStyles';

// The board: every catalog mountain with its review state and how many
// climbers reviewed it (Muad 2026-10-28: unlimited reviewers per mountain).
// Claim an open one, add a review to one other climbers reviewed, or continue
// the one you hold. Four states, told apart by a small static mark (hollow,
// half, solid, filled) so they read without colour.

const STATE_MARK = {
  open: 'border border-fg-subtle',
  in_progress: 'border border-fg bg-[linear-gradient(90deg,var(--color-fg)_50%,transparent_50%)]',
  submitted: 'bg-fg',
  verified: 'bg-live',
};

const StateMark = ({ state }) => (
  <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full ${STATE_MARK[state] || STATE_MARK.open}`} />
);

const Legend = () => (
  <ul className="flex flex-wrap gap-x-5 gap-y-2 text-small text-fg-muted" aria-label="States">
    {['open', 'in_progress', 'submitted', 'verified'].map((s) => (
      <li key={s} className="flex items-center gap-2">
        <StateMark state={s} />
        {STATE_LABEL[s]}
      </li>
    ))}
  </ul>
);

function stateLine(row) {
  if (row.state === 'in_progress') {
    if (row.is_mine) return `Yours until ${shortDate(row.lock_expires_at)}`;
    return `Claimed by ${row.holder || 'a reviewer'}, frees up ${shortDate(row.lock_expires_at)}`;
  }
  if (row.state === 'submitted') return `Submitted ${shortDate(row.submitted_at)}${row.holder ? ` by ${row.holder}` : ''}`;
  if (row.state === 'verified') return `${row.slot_count} gear slots · last review ${shortDate(row.verified_at)}`;
  return `${row.slot_count} gear slots`;
}

// Who reviewed this mountain before: name, background, date, and the email
// only when that reviewer chose to share it with other reviewers.
function PriorReviewers({ row }) {
  const prior = priorReviewers(row);
  if (prior.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2 text-small text-fg-muted" aria-label={`Reviewers of ${row.name}`}>
      {prior.map((p, i) => (
        <li key={`${p.verifiedAt || ''}-${i}`} className="min-w-0 break-words">
          <span className="text-fg">{p.name}</span>
          <span className="text-fg-subtle">
            {' '}
            · {p.tier}
            {p.verifiedAt ? ` · ${shortDate(p.verifiedAt)}` : ''}
          </span>
          {p.email ? (
            <>
              {' '}
              <span className="text-fg-subtle">·</span>{' '}
              <a href={`mailto:${p.email}`} className={`rounded-sm font-mono underline decoration-line-strong underline-offset-4 hover:text-fg ${focusRing}`}>
                {p.email}
              </a>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Board({ me, signOut, toast, updateMe }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    reviewBoard()
      .then((r) => setRows(r || []))
      .catch((e) => {
        setRows([]);
        toast(e.message);
      });
  }, [toast]);
  useEffect(load, [load]);

  const mine = rows?.find((r) => r.is_mine && r.state === 'in_progress') || null;

  const claim = async (row) => {
    setBusyId(row.trail_id);
    try {
      await claimMountain(row.trail_id);
      navigate(`/review/m/${row.trail_id}`);
    } catch (e) {
      toast(e.message);
      setBusyId(null);
      load();
    }
  };

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => r !== mine)
      .filter((r) => (filter === 'all' ? true : r.state === filter))
      .filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [rows, query, filter, mine]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, submitted: 0, verified: 0 };
    for (const r of rows || []) c[r.state] = (c[r.state] || 0) + 1;
    return c;
  }, [rows]);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={EYEBROW}>Hi {me.first_name || 'there'}</p>
          <h1 className="mt-2 font-display text-display-md font-semibold text-fg">Mountains to review</h1>
        </div>
        <div className="flex items-center gap-4">
          {me.is_admin ? (
            <Link to="/review/admin" className={btnGhost}>
              Admin
            </Link>
          ) : null}
          <button type="button" onClick={signOut} className={btnGhost}>
            Sign out
          </button>
        </div>
      </div>

      <ReviewerConsent me={me} updateMe={updateMe} toast={toast} />

      {mine ? (
        <section aria-label="Your mountain" className={`${surface} mt-8 flex flex-wrap items-center justify-between gap-4 border-line-strong p-5`}>
          <div className="min-w-0">
            <p className={EYEBROW}>Your mountain</p>
            <p className="mt-1 truncate font-display text-heading font-semibold text-fg">{mine.name}</p>
            <p className="mt-1 font-mono text-small text-fg-muted">
              {mine.slot_count} slots · yours until {shortDate(mine.lock_expires_at)}
            </p>
          </div>
          <Link to={`/review/m/${mine.trail_id}`} className={btnPrimary}>
            Continue <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      ) : null}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a mountain"
            aria-label="Find a mountain"
            className={`${field} pl-10`}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by state">
          {[['all', 'All'], ['open', 'Open'], ['in_progress', 'Claimed'], ['submitted', 'Submitted'], ['verified', 'Verified']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-small transition-colors ${focusRing} ${
                filter === k ? 'border-fg bg-fg text-bg' : 'border-line-strong text-fg-muted hover:text-fg'
              }`}
            >
              {label}
              {k !== 'all' && rows ? <span className="font-mono text-[0.7rem] opacity-70">{counts[k]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Legend />
      </div>

      {rows === null ? (
        <p className="mt-10 text-small text-fg-subtle">Loading the board</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-small text-fg-subtle">No mountains match.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visible.map((row) => {
            const claimable = canClaim(row, !!mine);
            const count = reviewerCount(row);
            const yours = reviewedByMe(row);
            return (
              <li key={row.trail_id} className={`${surface} px-4 py-3`}>
                <div className="flex items-center gap-3">
                  <StateMark state={row.state} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">
                      {row.name}
                      {row.altitude_m ? (
                        <span className="ml-2 font-mono text-small font-normal text-fg-subtle">{row.altitude_m.toLocaleString('en-US')} m</span>
                      ) : null}
                    </p>
                    <p className="truncate text-small text-fg-muted">
                      {row.my_expired_draft && (row.state === 'open' || row.state === 'verified') ? 'Your earlier draft is saved' : stateLine(row)}
                    </p>
                    <p className="truncate text-small text-fg-subtle" data-testid="reviewer-count">
                      {reviewerCountLabel(count)}
                      {yours ? <span className="text-fg"> · You reviewed this</span> : null}
                    </p>
                  </div>
                  {claimable ? (
                    <button type="button" disabled={busyId !== null} onClick={() => claim(row)} className={btnQuiet}>
                      {busyId === row.trail_id ? 'Claiming' : row.my_expired_draft ? 'Re-claim' : count > 0 ? 'Add a review' : 'Claim'}
                    </button>
                  ) : null}
                </div>
                <PriorReviewers row={row} />
              </li>
            );
          })}
        </ul>
      )}
      {mine && rows?.some((r) => canClaim(r, false)) ? (
        <p className="mt-6 text-small text-fg-subtle">You can hold one mountain at a time. Submit or release {mine.name} to claim another.</p>
      ) : null}
    </main>
  );
}

export default function ReviewBoard() {
  return <RequireReviewer>{(ctx) => <Board {...ctx} />}</RequireReviewer>;
}

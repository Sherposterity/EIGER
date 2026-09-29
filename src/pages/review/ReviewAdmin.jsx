import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RequireReviewer from './ReviewGate';
import { fromTable, reviewBoard, rpc, shortDate, shortDateTime } from '@/lib/reviewApi';
import { EYEBROW, STATE_LABEL, TIERS, btnGhost, btnQuiet, fieldSm, surface } from './reviewStyles';

// Admin view. Plain and usable: applications, reviewers, the full board,
// submitted reviews to apply, lessons and disputes. Every action is an RPC
// that re-checks is_admin on the server.

const TABS = [
  ['applications', 'Applications'],
  ['reviewers', 'Reviewers'],
  ['board', 'Board'],
  ['submitted', 'Submitted'],
  ['lessons', 'Lessons'],
  ['disputes', 'Disputes'],
];

const TIER_LABEL = Object.fromEntries(TIERS);
const LESSON_STATUSES = ['pending', 'disputed', 'accepted', 'rejected', 'superseded'];
const Section = ({ title, children }) => (
  <section className="mt-6">
    <h2 className="font-display text-heading font-semibold text-fg">{title}</h2>
    <div className="mt-4 flex flex-col gap-3">{children}</div>
  </section>
);
const Empty = ({ children }) => <p className="text-small text-fg-subtle">{children}</p>;
const Kv = ({ k, v }) =>
  v ? (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr]">
      <dt className="text-small text-fg-subtle">{k}</dt>
      <dd className="whitespace-pre-wrap text-small text-fg">{Array.isArray(v) ? v.join(', ') : v}</dd>
    </div>
  ) : null;

function useAsync(loader, toast) {
  const [data, setData] = useState(null);
  const reload = useCallback(() => {
    loader()
      .then(setData)
      .catch((e) => {
        setData([]);
        toast(e.message);
      });
  }, [loader, toast]);
  useEffect(reload, [reload]);
  return [data, reload];
}

function Applications({ toast }) {
  const loader = useCallback(() => fromTable('reviewer_applications'), []);
  const [rows, reload] = useAsync(loader, toast);
  const [tiers, setTiers] = useState({});
  const [showAll, setShowAll] = useState(false);
  const list = (rows || [])
    .filter((r) => showAll || r.status === 'pending')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const run = async (fn, okMsg) => {
    try {
      await fn();
      toast(okMsg, 'ok');
      reload();
    } catch (e) {
      toast(e.message);
    }
  };

  return (
    <Section title={showAll ? 'All applications' : 'Pending applications'}>
      <label className="flex items-center gap-2 text-small text-fg-muted">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show decided ones too
      </label>
      {rows === null ? <Empty>Loading</Empty> : list.length === 0 ? <Empty>Nothing waiting.</Empty> : null}
      {list.map((a) => (
        <article key={a.id} className={`${surface} p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-fg">
              {a.full_name} <span className="font-mono text-small text-fg-subtle">{a.email}</span>
            </p>
            <p className="font-mono text-small text-fg-subtle">
              {a.status} · {shortDate(a.created_at)}
            </p>
          </div>
          <dl className="mt-4 flex flex-col gap-2">
            <Kv k="Based in" v={a.location} />
            <Kv k="Ranges" v={a.ranges} />
            <Kv k="Peaks" v={a.peaks} />
            <Kv k="Background" v={TIER_LABEL[a.background] || a.background} />
            <Kv k="Certifications" v={a.certifications} />
            <Kv k="Winter and glacier" v={a.winter_experience} />
            <Kv k="Prior reviews" v={a.prior_reviews} />
            <Kv k="Would check first" v={a.first_check} />
            <Kv k="Hours a month" v={a.hours_per_month} />
            <Kv k="Public links" v={a.public_links} />
            <Kv k="Uses the app" v={a.uses_app} />
            <Kv k="Anything else" v={a.extra} />
            <Kv k="Decision note" v={a.decision_note} />
          </dl>
          {a.status === 'pending' ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                aria-label="Tier"
                value={tiers[a.id] || a.background || 'experienced_amateur'}
                onChange={(e) => setTiers((t) => ({ ...t, [a.id]: e.target.value }))}
                className={`${fieldSm} w-auto`}
              >
                {TIERS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={btnQuiet}
                onClick={() =>
                  run(
                    () => rpc('approve_application', { p_application_id: a.id, p_tier: tiers[a.id] || a.background || null }),
                    `${a.full_name} approved`,
                  )
                }
              >
                Approve
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  const note = window.prompt('Reason (optional, internal)');
                  if (note === null) return;
                  run(() => rpc('reject_application', { p_application_id: a.id, p_note: note || null }), `${a.full_name} rejected`);
                }}
              >
                Reject
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </Section>
  );
}

function Reviewers({ toast }) {
  const loader = useCallback(() => fromTable('reviewers', 'id, email, first_name, last_name, tier, is_admin, active, created_at'), []);
  const [rows, reload] = useAsync(loader, toast);
  const [form, setForm] = useState({ email: '', first: '', last: '', tier: 'experienced_amateur' });

  const add = async (e) => {
    e.preventDefault();
    try {
      await rpc('add_reviewer', { p_email: form.email.trim(), p_first_name: form.first.trim(), p_last_name: form.last.trim(), p_tier: form.tier });
      toast(`${form.first} added`, 'ok');
      setForm({ email: '', first: '', last: '', tier: 'experienced_amateur' });
      reload();
    } catch (err) {
      toast(err.message);
    }
  };
  const toggle = async (r) => {
    try {
      await rpc('set_reviewer_active', { p_reviewer_id: r.id, p_active: !r.active });
      reload();
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <Section title="Reviewers">
      <form onSubmit={add} className={`${surface} grid gap-2 p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]`}>
        <input required type="email" placeholder="Email" aria-label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldSm} />
        <input required placeholder="First name" aria-label="First name" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} className={fieldSm} />
        <input placeholder="Last name" aria-label="Last name" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} className={fieldSm} />
        <select aria-label="Tier" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className={fieldSm}>
          {TIERS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button type="submit" className={btnQuiet}>
          Add reviewer
        </button>
      </form>
      {rows === null ? <Empty>Loading</Empty> : null}
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {(rows || []).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className={`text-fg ${r.active ? '' : 'text-fg-subtle line-through'}`}>
                {r.first_name} {r.last_name} {r.is_admin ? <span className="font-mono text-[0.7rem] text-fg-subtle">admin</span> : null}
              </p>
              <p className="truncate font-mono text-small text-fg-subtle">
                {r.email} · {TIER_LABEL[r.tier] || r.tier} · since {shortDate(r.created_at)}
              </p>
            </div>
            <button type="button" className={btnGhost} onClick={() => toggle(r)}>
              {r.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function AdminBoard({ toast }) {
  const [rows, reload] = useAsync(reviewBoard, toast);
  const [q, setQ] = useState('');
  const list = (rows || []).filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
  const reopen = async (r) => {
    if (!window.confirm(`Reopen ${r.name}? It goes back to open.`)) return;
    try {
      await rpc('reopen_mountain', { p_trail_id: r.trail_id });
      reload();
    } catch (e) {
      toast(e.message);
    }
  };
  return (
    <Section title="Board">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a mountain" aria-label="Find a mountain" className={`${fieldSm} sm:w-72`} />
      {rows === null ? <Empty>Loading</Empty> : null}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[40rem] text-left text-small">
          <thead className="text-fg-subtle">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">Mountain</th>
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">Holder</th>
              <th className="px-3 py-2 font-medium">Lock until</th>
              <th className="px-3 py-2 font-medium">Submitted</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.trail_id} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-fg">{r.name}</td>
                <td className="px-3 py-2 text-fg-muted">{STATE_LABEL[r.state] || r.state}</td>
                <td className="px-3 py-2 text-fg-muted">
                  {r.holder}
                  {r.holder_email ? <span className="block font-mono text-[0.7rem] text-fg-subtle">{r.holder_email}</span> : null}
                </td>
                <td className="px-3 py-2 font-mono text-fg-muted">{r.state === 'in_progress' ? shortDateTime(r.lock_expires_at) : ''}</td>
                <td className="px-3 py-2 font-mono text-fg-muted">{shortDate(r.submitted_at)}</td>
                <td className="px-3 py-2 text-right">
                  {r.state === 'verified' ? (
                    <button type="button" className={btnGhost} onClick={() => reopen(r)}>
                      Reopen
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Submitted({ toast }) {
  const loader = useCallback(async () => {
    const [reviews, changes, board, reviewers] = await Promise.all([
      fromTable('mountain_reviews', 'id, trail_id, reviewer_id, state, submitted_at, mountain_note'),
      fromTable('review_changes', 'review_id'),
      reviewBoard(),
      fromTable('reviewers', 'id, first_name, last_name, email'),
    ]);
    const names = new Map(board.map((b) => [b.trail_id, b.name]));
    const who = new Map(reviewers.map((r) => [r.id, r]));
    const counts = new Map();
    for (const c of changes) counts.set(c.review_id, (counts.get(c.review_id) || 0) + 1);
    return reviews
      .filter((r) => r.state === 'submitted')
      .sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1))
      .map((r) => ({ ...r, mountain: names.get(r.trail_id) || r.trail_id, reviewer: who.get(r.reviewer_id), changes: counts.get(r.id) || 0 }));
  }, []);
  const [rows] = useAsync(loader, toast);
  return (
    <Section title="Submitted, waiting to apply">
      {rows === null ? <Empty>Loading</Empty> : rows.length === 0 ? <Empty>Nothing submitted.</Empty> : null}
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {(rows || []).map((r) => (
          <li key={r.id} className="px-4 py-3">
            <p className="text-fg">
              {r.mountain} <span className="font-mono text-small text-fg-subtle">· {r.changes} {r.changes === 1 ? 'change' : 'changes'}</span>
            </p>
            <p className="font-mono text-small text-fg-subtle">
              {r.reviewer ? `${r.reviewer.first_name} ${r.reviewer.last_name} (${r.reviewer.email})` : r.reviewer_id} · {shortDateTime(r.submitted_at)} · review {r.id}
            </p>
            {r.mountain_note ? <p className="mt-1 whitespace-pre-wrap text-small text-fg-muted">{r.mountain_note}</p> : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Lessons({ toast }) {
  const loader = useCallback(() => fromTable('review_lessons'), []);
  const [rows, reload] = useAsync(loader, toast);
  const [status, setStatus] = useState('pending');
  const list = (rows || []).filter((r) => status === 'any' || r.status === status).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const setLesson = async (l, s) => {
    const resolution = window.prompt('Resolution note (optional)');
    if (resolution === null) return;
    try {
      await rpc('set_lesson_status', { p_lesson_id: l.id, p_status: s, p_resolution: resolution || null });
      reload();
    } catch (e) {
      toast(e.message);
    }
  };
  return (
    <Section title="Lessons">
      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className={`${fieldSm} w-auto`}>
        <option value="any">Any status</option>
        {LESSON_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {rows === null ? <Empty>Loading</Empty> : list.length === 0 ? <Empty>No lessons here.</Empty> : null}
      {list.map((l) => (
        <LessonCard key={l.id} l={l}>
          {l.status !== 'accepted' ? (
            <button type="button" className={btnQuiet} onClick={() => setLesson(l, 'accepted')}>
              Accept
            </button>
          ) : null}
          {l.status !== 'rejected' ? (
            <button type="button" className={btnGhost} onClick={() => setLesson(l, 'rejected')}>
              Reject
            </button>
          ) : null}
          {l.status !== 'superseded' ? (
            <button type="button" className={btnGhost} onClick={() => setLesson(l, 'superseded')}>
              Superseded
            </button>
          ) : null}
        </LessonCard>
      ))}
    </Section>
  );
}

function LessonCard({ l, children }) {
  return (
    <article className={`${surface} p-4`}>
      <p className="font-mono text-[0.72rem] uppercase tracking-wider text-fg-subtle">
        {l.item_type || 'whole mountain'} · {l.direction} · {l.scope}
        {l.condition ? ` (${l.condition})` : ''} · {l.status}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-body text-fg">{l.body}</p>
      {l.resolution ? <p className="mt-2 text-small text-fg-muted">Resolution: {l.resolution}</p> : null}
      {children ? <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div> : null}
    </article>
  );
}

function Disputes({ toast }) {
  const loader = useCallback(async () => {
    const [disputes, lessons] = await Promise.all([fromTable('review_disputes'), fromTable('review_lessons')]);
    const byId = new Map(lessons.map((l) => [l.id, l]));
    return disputes.filter((d) => d.status === 'open').map((d) => ({ ...d, a: byId.get(d.lesson_a), b: byId.get(d.lesson_b) }));
  }, []);
  const [rows, reload] = useAsync(loader, toast);
  const [picks, setPicks] = useState({});
  const [notes, setNotes] = useState({});
  const resolve = async (d) => {
    const winner = picks[d.id] ?? null;
    try {
      await rpc('resolve_dispute', { p_dispute_id: d.id, p_winner_lesson_id: winner === 'none' ? null : winner, p_resolution: notes[d.id] || '' });
      reload();
    } catch (e) {
      toast(e.message);
    }
  };
  return (
    <Section title="Open disputes">
      {rows === null ? <Empty>Loading</Empty> : rows.length === 0 ? <Empty>No open disputes.</Empty> : null}
      {(rows || []).map((d) => (
        <article key={d.id} className="rounded-lg border border-line-strong p-4">
          <div className="grid gap-3 md:grid-cols-2">
            {[d.a, d.b].map((l, i) =>
              l ? (
                <label key={l.id} className="flex cursor-pointer flex-col gap-2">
                  <span className="flex items-center gap-2 text-small text-fg">
                    <input type="radio" name={`win-${d.id}`} checked={picks[d.id] === l.id} onChange={() => setPicks((p) => ({ ...p, [d.id]: l.id }))} />
                    {i === 0 ? 'Lesson A wins' : 'Lesson B wins'}
                  </span>
                  <LessonCard l={l} />
                </label>
              ) : (
                <Empty key={i}>Lesson not found</Empty>
              ),
            )}
          </div>
          <label className="mt-3 flex items-center gap-2 text-small text-fg-muted">
            <input type="radio" name={`win-${d.id}`} checked={picks[d.id] === 'none'} onChange={() => setPicks((p) => ({ ...p, [d.id]: 'none' }))} />
            Neither
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={notes[d.id] || ''}
              onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
              placeholder="Resolution"
              aria-label="Resolution"
              className={fieldSm}
            />
            <button type="button" className={btnQuiet} disabled={!picks[d.id] || !(notes[d.id] || '').trim()} onClick={() => resolve(d)}>
              Resolve
            </button>
          </div>
        </article>
      ))}
    </Section>
  );
}

function Admin({ toast, signOut }) {
  const [tab, setTab] = useState('applications');
  const Panel = { applications: Applications, reviewers: Reviewers, board: AdminBoard, submitted: Submitted, lessons: Lessons, disputes: Disputes }[tab];
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={EYEBROW}>Admin</p>
          <h1 className="mt-1 font-display text-heading font-semibold text-fg">Reviewer portal</h1>
        </div>
        <div className="flex gap-4">
          <Link to="/review" className={btnGhost}>
            Board
          </Link>
          <button type="button" className={btnGhost} onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
            className={`h-8 rounded-pill border px-3 text-small transition-colors ${tab === k ? 'border-fg bg-fg text-bg' : 'border-line-strong text-fg-muted hover:text-fg'}`}
          >
            {l}
          </button>
        ))}
      </nav>
      <Panel toast={toast} />
    </main>
  );
}

export default function ReviewAdmin() {
  return <RequireReviewer admin>{(ctx) => <Admin {...ctx} />}</RequireReviewer>;
}

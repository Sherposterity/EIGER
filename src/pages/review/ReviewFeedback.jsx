import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { shortDate, shortDateTime } from '@/lib/reviewApi';
import {
  FEEDBACK_STATUSES, PAGE_SIZE, SOURCE_LABEL, STATUS_FILTERS, STATUS_LABEL, TYPE_FILTERS, createInboxApi, deviceText, gmailReplyUrl, isGearReport,
  rowMatches, typeText,
} from '@/lib/feedbackInbox';
import { btnGhost, btnQuiet, fieldSm, surface } from './reviewStyles';

// Feedback inbox (admin tab). Notes from the app's Send feedback sheet and
// the older mountain gear reports, newest first. Reply opens Gmail compose
// as business@. /cybersecurity I1: every climber field renders as plain
// React text; the only link out is the encoded Gmail URL, opened by a button.

const inbox = createInboxApi(supabase);

const Meta = ({ k, v }) =>
  v ? (
    <span className="whitespace-nowrap">
      <span className="text-fg-subtle">{k}</span> <span className="text-fg-muted">{v}</span>
    </span>
  ) : null;

function FeedbackCard({ row, toast, onStatus }) {
  const [busy, setBusy] = useState(false);
  const reply = () => {
    const url = gmailReplyUrl(row, shortDate(row.created_at));
    if (!url) {
      toast('This climber has no email address on file.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const mark = async (status) => {
    setBusy(true);
    try {
      await inbox.setStatus(row.id, status);
      toast(`Marked ${STATUS_LABEL[status].toLowerCase()}`, 'ok');
      onStatus(row.id, status);
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  };
  return (
    <article className={`${surface} p-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[0.72rem] uppercase tracking-wider text-fg-subtle">
          {typeText(row)} · {STATUS_LABEL[row.status] || row.status}
        </p>
        <p className="font-mono text-small text-fg-subtle">{shortDateTime(row.created_at)}</p>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-body text-fg">{row.body}</p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.75rem]">
        <Meta k="From" v={row.email || 'no email'} />
        <Meta k="Mountain" v={row.trail_name} />
        <Meta k="Section" v={row.section} />
        <Meta k="Sent from" v={SOURCE_LABEL[row.source] || row.source} />
        <Meta k="App" v={row.app_version} />
        <Meta k="Device" v={deviceText(row)} />
        <Meta k="Answered" v={row.answered_at ? shortDate(row.answered_at) : null} />
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={btnQuiet} onClick={reply} disabled={!row.email}>
          Reply in Gmail
        </button>
        {isGearReport(row)
          ? <span className="text-small text-fg-subtle">Gear report status is set on the reports path, not here.</span>
          : FEEDBACK_STATUSES.filter((s) => s !== row.status && s !== 'open').map((s) => (
              <button key={s} type="button" className={btnGhost} disabled={busy} onClick={() => mark(s)}>
                Mark {STATUS_LABEL[s].toLowerCase()}
              </button>
            ))}
        {!isGearReport(row) && row.status !== 'open' ? (
          <button type="button" className={btnGhost} disabled={busy} onClick={() => mark('open')}>
            Reopen
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function FeedbackInbox({ toast }) {
  const [rows, setRows] = useState(null);
  const [more, setMore] = useState(false);
  const [status, setStatus] = useState('open');
  const [type, setType] = useState('all');

  // Keyset paging: before = the oldest created_at already shown.
  const load = useCallback(
    (before = null) =>
      inbox.list(before).then(
        (page) => {
          setRows((prev) => (before ? [...(prev || []), ...page] : page));
          setMore(page.length >= PAGE_SIZE);
        },
        (e) => {
          setRows((prev) => prev || []);
          toast(e.message);
        },
      ),
    [toast],
  );
  const reload = useCallback(() => {
    load();
  }, [load]);
  useEffect(reload, [reload]);

  const onStatus = (id, s) => setRows((prev) => prev.map((r) => (r.id === id && !isGearReport(r) ? { ...r, status: s } : r)));
  const list = (rows || []).filter((r) => rowMatches(r, status, type));

  return (
    <section className="mt-6">
      <h2 className="font-display text-heading font-semibold text-fg">Feedback</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${fieldSm} w-auto`}>
          {STATUS_FILTERS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className={`${fieldSm} w-auto`}>
          {TYPE_FILTERS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button type="button" className={btnGhost} onClick={reload}>
          Reload
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {rows === null ? <p className="text-small text-fg-subtle">Loading</p> : list.length === 0 ? <p className="text-small text-fg-subtle">Nothing here.</p> : null}
        {list.map((r) => (
          <FeedbackCard key={`${r.origin}:${r.id}`} row={r} toast={toast} onStatus={onStatus} />
        ))}
        {more ? (
          <button type="button" className={`${btnQuiet} self-start`} onClick={() => load(rows[rows.length - 1].created_at)}>
            Load older
          </button>
        ) : null}
      </div>
    </section>
  );
}

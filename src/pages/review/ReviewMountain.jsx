import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, RotateCcw, X } from 'lucide-react';
import RequireReviewer from './ReviewGate';
import {
  claimMountain, loadDraft, loadMountain, releaseClaim, saveChange, saveFactFlag, saveSlotNote, setMountainNote, shortDate,
  submitReview,
} from '@/lib/reviewApi';
import {
  LEVELS, addedState, applyWrites, changesMap, currentState, deriveSlots, groupSlots, liveStates, mergeState, modeOf,
  nextMode, planWrites, searchTaxonomy, splitState, summarize, summaryLine, withLevel, withMode,
} from '@/lib/reviewSlots';
import { EYEBROW, FACTS, btnGhost, btnPrimary, btnQuiet, factValue, field, fieldSm, focusRing, surface } from './reviewStyles';

// One mountain, one screen. Review by exception: the reviewer only touches
// what is wrong. Every edit saves at once through the RPCs (optimistic; on a
// failure the draft is re-read from the server and the database's sentence is
// shown). The slot logic itself is pure and tested in src/lib/reviewSlots.js.

const LEVEL_LABEL = { essential: 'Essential', recommended: 'Recommended', optional: 'Optional' };
const MODE_LABEL = { all: 'Both seasons', summer: 'Summer only', winter: 'Winter only' };
const SCOPES = [
  ['mountain', 'This mountain'],
  ['similar', 'Mountains like this'],
  ['everywhere', 'Everywhere'],
];

const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

// ---------------------------------------------------------------- pieces

function LevelSwitch({ value, onChange, disabled, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-pill border border-line-strong p-0.5">
      {LEVELS.map((l) => {
        const on = value === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => !on && onChange(l)}
            className={`h-8 flex-1 rounded-pill px-2 text-[0.8rem] font-medium transition-colors sm:px-3 ${focusRing} ${
              on ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg disabled:hover:text-fg-muted'
            }`}
          >
            {LEVEL_LABEL[l]}
          </button>
        );
      })}
    </div>
  );
}

const Tag = ({ children, strong }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
      strong ? 'bg-fg text-bg' : 'border border-line-strong text-fg-muted'
    }`}
  >
    {children}
  </span>
);

function SlotNote({ slot, note, onSave, disabled }) {
  const [text, setText] = useState(note?.note || '');
  const [scope, setScope] = useState(note?.scope || 'mountain');
  const [condition, setCondition] = useState(note?.condition || '');
  const saved = useRef({ text: note?.note || '', scope: note?.scope || 'mountain', condition: note?.condition || '' });

  const commit = (next = {}) => {
    const v = { text, scope, condition, ...next };
    const s = saved.current;
    if (v.text === s.text && v.scope === s.scope && v.condition === s.condition) return;
    if (!v.text.trim() && !s.text.trim()) {
      saved.current = v;
      return;
    }
    saved.current = v;
    onSave(v.text.trim(), v.scope, v.scope === 'similar' ? v.condition.trim() || null : null);
  };

  const id = `note-${slot.item_type}`;
  return (
    <div className="mt-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <label htmlFor={id} className="sr-only">
        What did the model get wrong here? Optional
      </label>
      <textarea
        id={id}
        rows={text ? 2 : 1}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit()}
        placeholder="What did the model get wrong here? Optional"
        className={`${fieldSm} resize-y`}
      />
      {text.trim() ? (
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Where this applies">
        <span className="mr-1 text-[0.75rem] text-fg-subtle">Applies to</span>
        {SCOPES.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={scope === k}
            disabled={disabled}
            onClick={() => {
              setScope(k);
              commit({ scope: k });
            }}
            className={`h-7 rounded-pill border px-2.5 text-[0.75rem] transition-colors ${focusRing} ${
              scope === k ? 'border-fg text-fg' : 'border-line text-fg-subtle hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      ) : null}
      {text.trim() && scope === 'similar' ? (
        <input
          type="text"
          value={condition}
          disabled={disabled}
          onChange={(e) => setCondition(e.target.value)}
          onBlur={() => commit()}
          aria-label="Which mountains?"
          placeholder="Which ones? For example: glaciated peaks over 4,000 m"
          className={fieldSm}
        />
      ) : null}
    </div>
  );
}

function SlotRow({ slot, focused, editable, note, act, onNote, rowRef, onFocusRow }) {
  const { status, current, original } = slot;
  const mode = modeOf(current);
  const removed = status === 'removed';
  const showNote = status !== 'same' || !!note;

  const frame = `${focused ? 'ring-2 ring-fg/60' : ''} scroll-mt-24 scroll-mb-32`;

  if (removed) {
    return (
      <li ref={rowRef} onClick={onFocusRow} className={`rounded-md border border-dashed border-line-strong px-4 py-3 ${frame}`}>
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-fg-subtle line-through decoration-fg-subtle">{slot.display_name}</span>
          <Tag>Removed</Tag>
          {editable ? (
            <button type="button" onClick={() => act(slot, original)} className={btnGhost}>
              <RotateCcw aria-hidden="true" className="size-3.5" /> Undo
            </button>
          ) : null}
        </div>
        {showNote ? <SlotNote slot={slot} note={note} onSave={onNote} disabled={!editable} /> : null}
      </li>
    );
  }

  const changed = status === 'changed' || status === 'added';
  return (
    <li
      ref={rowRef}
      onClick={onFocusRow}
      className={`rounded-md border px-4 py-3 transition-colors ${changed ? 'border-fg/40 bg-surface-2' : 'border-line bg-surface-1'} ${frame}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-fg">{slot.display_name}</span>
            {status === 'added' ? <Tag strong>Added</Tag> : status === 'changed' ? <Tag strong>Changed</Tag> : null}
            {editable ? (
              <button
                type="button"
                onClick={() => act(slot, {})}
                aria-label={`Remove ${slot.display_name}`}
                className={`ml-auto rounded-pill p-1 text-fg-subtle transition-colors hover:text-fg md:hidden ${focusRing}`}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>
          {slot.rationale ? <Rationale text={slot.rationale} /> : null}
          {status === 'changed' ? <p className="mt-1 font-mono text-[0.72rem] text-fg-subtle">Was: {describe(original)}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-[23rem]">
          {mode === 'split' ? (
            <>
              {['summer', 'winter'].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 font-mono text-[0.72rem] uppercase tracking-wider text-fg-subtle">{s}</span>
                  <div className="flex-1">
                    <LevelSwitch
                      value={current[s]}
                      disabled={!editable}
                      label={`${slot.display_name}, ${s}`}
                      onChange={(l) => act(slot, withLevel(current, l, s))}
                    />
                  </div>
                </div>
              ))}
              {editable ? (
                <div className="flex items-center justify-end gap-4">
                  <button type="button" className={btnGhost} onClick={() => act(slot, mergeState(current))}>
                    Same in both seasons
                  </button>
                  <span className="hidden md:inline-flex">
                    <RemoveButton slot={slot} act={act} />
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <LevelSwitch
                value={current[mode]}
                disabled={!editable}
                label={`${slot.display_name}, level`}
                onChange={(l) => act(slot, withLevel(current, l))}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => act(slot, withMode(current, nextMode(mode)))}
                  aria-label={`Season: ${MODE_LABEL[mode]}. Tap to change.`}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-pill border px-3 text-[0.75rem] transition-colors ${focusRing} ${
                    mode === 'all' ? 'border-line-strong text-fg-muted' : 'border-fg text-fg'
                  } hover:text-fg`}
                >
                  {mode === 'all' ? 'Both' : mode === 'summer' ? 'Summer' : 'Winter'}
                </button>
                {editable ? (
                  <button type="button" className={`${btnGhost} text-[0.75rem]`} onClick={() => act(slot, splitState(current))}>
                    Split by season
                  </button>
                ) : null}
                <span className="ml-auto hidden md:inline-flex">
                  <RemoveButton slot={slot} act={act} editable={editable} />
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      {showNote ? <SlotNote slot={slot} note={note} onSave={onNote} disabled={!editable} /> : null}
    </li>
  );
}

// The model's reason for the slot, two lines by default; tap to read it all.
function Rationale({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
      aria-expanded={open}
      className={`mt-1 w-full rounded-sm text-left text-small leading-snug text-fg-subtle transition-colors hover:text-fg-muted ${focusRing} ${open ? '' : 'line-clamp-2'}`}
    >
      {text}
    </button>
  );
}

function RemoveButton({ slot, act, editable = true }) {
  if (!editable) return null;
  return (
    <button
      type="button"
      onClick={() => act(slot, {})}
      aria-label={`Remove ${slot.display_name}`}
      className={`inline-flex items-center gap-1 rounded-pill px-1.5 py-1 text-[0.75rem] text-fg-subtle transition-colors hover:text-fg ${focusRing}`}
    >
      <X aria-hidden="true" className="size-3.5" /> Remove
    </button>
  );
}

function describe(state) {
  const m = modeOf(state);
  if (!m) return 'not on the list';
  if (m === 'split') return `summer ${state.summer}, winter ${state.winter}`;
  return `${state[m]}${m === 'all' ? '' : `, ${m} only`}`;
}

function FactStrip({ trail, flags, editable, onSave }) {
  const [open, setOpen] = useState(null);
  const [claimed, setClaimed] = useState('');
  const [note, setNote] = useState('');

  const start = (fact) => {
    if (!editable && !flags.has(fact.field)) return;
    if (open === fact.field) {
      setOpen(null);
      return;
    }
    const f = flags.get(fact.field);
    setClaimed(f?.claimed_value || '');
    setNote(f?.note || '');
    setOpen(fact.field);
  };
  const fact = FACTS.find((f) => f.field === open);

  const save = async (e) => {
    e.preventDefault();
    const ok = await onSave(open, claimed.trim(), note.trim());
    if (ok) setOpen(null);
  };
  const clear = async () => {
    const ok = await onSave(open, '', '');
    if (ok) setOpen(null);
  };

  return (
    <section aria-label="Mountain facts" className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className={EYEBROW}>Facts</p>
        {editable ? <p className="text-[0.75rem] text-fg-subtle">Tap a fact to flag it as wrong</p> : null}
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {FACTS.map((f) => {
          const v = factValue(f, trail);
          const flagged = flags.get(f.field);
          return (
            <li key={f.field} className={f.long ? 'w-full' : ''}>
              <button
                type="button"
                onClick={() => start(f)}
                aria-expanded={open === f.field}
                className={`flex max-w-full flex-col items-start rounded-md border px-3 py-1.5 text-left transition-colors ${focusRing} ${
                  flagged ? 'border-fg bg-surface-2' : open === f.field ? 'border-fg/50' : 'border-line hover:border-line-strong'
                } ${f.long ? 'w-full' : ''}`}
              >
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle">
                  {f.label}
                  {flagged ? <span className="ml-1.5 text-fg">· flagged</span> : null}
                </span>
                <span className={`text-small ${f.long ? 'line-clamp-2' : ''} ${v ? 'text-fg' : 'italic text-fg-subtle'} ${flagged ? 'line-through decoration-fg-subtle' : ''}`}>
                  {v || 'not on file'}
                </span>
                {flagged?.claimed_value ? <span className="text-small font-medium text-fg">{flagged.claimed_value}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {fact ? (
        <form onSubmit={save} className={`${surface} mt-3 flex flex-col gap-3 p-4`}>
          <p className="text-small text-fg-muted">
            <span className="text-fg">{fact.label}</span> is on file as{' '}
            <span className="text-fg">{factValue(fact, trail) || 'not on file'}</span>. What is right?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              autoFocus
              value={claimed}
              disabled={!editable}
              onChange={(e) => setClaimed(e.target.value)}
              placeholder="Correct value"
              aria-label="Correct value"
              className={`${fieldSm} sm:w-48`}
            />
            <input
              value={note}
              disabled={!editable}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note or source, optional"
              aria-label="Note"
              className={fieldSm}
            />
          </div>
          {editable ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className={btnQuiet} disabled={!claimed.trim() && !note.trim()}>
                Flag it
              </button>
              {flags.has(open) ? (
                <button type="button" className={btnGhost} onClick={clear}>
                  Remove flag
                </button>
              ) : null}
              <button type="button" className={btnGhost} onClick={() => setOpen(null)}>
                Cancel
              </button>
            </div>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

function AddSlot({ types, slots, onAdd, inputRef, disabled }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchTaxonomy(types, slots, q), [types, slots, q]);

  const add = (t) => {
    onAdd(t);
    setQ('');
    setActive(0);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hits[active]) add(hits[active]);
    } else if (e.key === 'Escape') {
      setQ('');
      e.currentTarget.blur();
    }
  };

  return (
    <section aria-label="Add a slot" className="mt-8">
      <label htmlFor="add-slot" className={EYEBROW}>
        Missing something?
      </label>
      <div className="relative mt-3">
        <Plus aria-hidden="true" className="pointer-events-none absolute left-3.5 top-[1.4rem] size-4 -translate-y-1/2 text-fg-subtle" />
        <input
          id="add-slot"
          ref={inputRef}
          value={q}
          disabled={disabled}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Add a slot: type a gear name, Enter adds"
          autoComplete="off"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="add-slot-list"
          aria-activedescendant={hits[active] ? `add-${hits[active].item_type}` : undefined}
          className={`${field} pl-10`}
        />
        {hits.length ? (
          <ul id="add-slot-list" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-line-strong bg-surface-3 shadow-lg">
            {hits.map((t, i) => (
              <li
                key={t.item_type}
                id={`add-${t.item_type}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(t);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2.5 ${i === active ? 'bg-fg/10' : ''}`}
              >
                <span className="text-fg">{t.display_name}</span>
                <span className="font-mono text-[0.7rem] text-fg-subtle">{t.category_group}</span>
              </li>
            ))}
          </ul>
        ) : q.trim() ? (
          <p className="mt-2 text-small text-fg-subtle">Nothing in the taxonomy matches that, or it is already on the list.</p>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- screen

function MountainReview({ me, toast, trailId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [changes, setChangesState] = useState(new Map());
  const changesRef = useRef(new Map());
  const [notes, setNotes] = useState(new Map());
  const [flags, setFlags] = useState(new Map());
  const [mountainNote, setMountainNoteText] = useState('');
  const savedMountainNote = useRef('');
  const [scrolled, setScrolled] = useState(false);
  const [focusKey, setFocusKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const queue = useRef(Promise.resolve());
  const rowRefs = useRef(new Map());
  const addRef = useRef(null);
  const sentinelRef = useRef(null);

  const setChanges = useCallback((m) => {
    changesRef.current = m;
    setChangesState(m);
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await loadMountain(trailId, me.id);
      if (!d.trail) {
        setLoadError('This mountain was not found.');
        return;
      }
      const review = d.reviews.find((r) => r.state === 'in_progress') || d.reviews[0] || null;
      const now = Date.now();
      const lockOk = review?.state === 'in_progress' && Date.parse(review.lock_expires_at) > now;
      let draft = { changes: [], notes: [], flags: [] };
      if (review) draft = await loadDraft(review.id);
      setChanges(changesMap(draft.changes));
      setNotes(new Map(draft.notes.map((n) => [n.item_type, n])));
      setFlags(new Map(draft.flags.map((f) => [f.field, f])));
      setMountainNoteText(review?.mountain_note || '');
      savedMountainNote.current = review?.mountain_note || '';
      setScrolled(!!review?.scrolled_to_end);
      setData({ ...d, review, editable: lockOk, expired: review?.state === 'expired' || (review?.state === 'in_progress' && !lockOk) });
    } catch (e) {
      setLoadError(e.message);
    }
  }, [trailId, me.id, setChanges]);

  useEffect(() => {
    // load() only sets state after its first await.
    Promise.resolve().then(load);
  }, [load]);

  const review = data?.review;
  const editable = !!data?.editable;
  const original = useMemo(() => liveStates(data?.live), [data]);
  const slots = useMemo(() => (data ? deriveSlots(data.types, data.live, changes) : []), [data, changes]);
  const groups = useMemo(() => groupSlots(slots), [slots]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const summary = summarize(slots, flags.size);

  // Serial queue so rapid taps reach the server in order.
  const enqueue = useCallback((fn) => {
    const p = queue.current.then(fn);
    queue.current = p.catch(() => {});
    return p;
  }, []);

  const resync = useCallback(async () => {
    if (!review) return;
    try {
      const d = await loadDraft(review.id);
      setChanges(changesMap(d.changes));
    } catch {
      /* the error toast already explains; a reload fixes the rest */
    }
  }, [review, setChanges]);

  // Move one slot to a desired end state.
  const act = useCallback(
    (slot, desired) => {
      if (!editable) return;
      const itemType = slot.item_type;
      const orig = original.get(itemType) || {};
      const cur = currentState(orig, changesRef.current, itemType);
      const writes = planWrites(cur, desired);
      if (!writes.length) return;
      setChanges(applyWrites(changesRef.current, orig, itemType, writes));
      enqueue(async () => {
        for (const w of writes) await saveChange(review.id, itemType, w.season, w.level);
      }).catch((e) => {
        toast(e.message);
        resync();
      });
    },
    [editable, original, review, enqueue, toast, resync, setChanges],
  );

  const addSlot = useCallback(
    (t) => {
      const existing = slots.find((s) => s.item_type === t.item_type);
      const slot = existing || { item_type: t.item_type };
      act(slot, existing?.status === 'removed' ? existing.original : addedState());
      setFocusKey(t.item_type);
    },
    [slots, act],
  );

  const saveNote = useCallback(
    (itemType, note, scope, condition) => {
      setNotes((m) => {
        const next = new Map(m);
        if (note) next.set(itemType, { item_type: itemType, note, scope, condition });
        else next.delete(itemType);
        return next;
      });
      enqueue(() => saveSlotNote(review.id, itemType, note, scope, condition)).catch((e) => toast(e.message));
    },
    [review, enqueue, toast],
  );

  const saveFlag = useCallback(
    async (fieldName, claimed, note) => {
      const prev = flags;
      setFlags((m) => {
        const next = new Map(m);
        if (claimed || note) next.set(fieldName, { field: fieldName, claimed_value: claimed, note });
        else next.delete(fieldName);
        return next;
      });
      try {
        await enqueue(() => saveFactFlag(review.id, fieldName, claimed, note));
        return true;
      } catch (e) {
        setFlags(prev);
        toast(e.message);
        return false;
      }
    },
    [flags, review, enqueue, toast],
  );

  const commitMountainNote = useCallback(() => {
    const v = mountainNote.trim();
    if (v === savedMountainNote.current.trim() || !review) return;
    savedMountainNote.current = v;
    enqueue(() => setMountainNote(review.id, v)).catch((e) => toast(e.message));
  }, [mountainNote, review, enqueue, toast]);

  // Sentinel after the last row: seen once is enough. A list that fits on
  // screen intersects immediately and counts as scrolled.
  const hasData = !!data;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || scrolled) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setScrolled(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setScrolled(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasData, scrolled]);

  // Keyboard shortcuts (desktop). Ignored while typing in a field.
  useEffect(() => {
    if (!editable) return undefined;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(document.activeElement)) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }
      const idx = flat.findIndex((s) => s.item_type === focusKey);
      const slot = idx >= 0 ? flat[idx] : null;
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'j' || k === 'k') {
        if (!flat.length) return;
        e.preventDefault();
        const step = k === 'ArrowDown' || k === 'j' ? 1 : -1;
        const next = idx < 0 ? (step > 0 ? 0 : flat.length - 1) : Math.max(0, Math.min(flat.length - 1, idx + step));
        setFocusKey(flat[next].item_type);
      } else if (k === 'Escape') {
        setFocusKey(null);
      } else if (k === 'a' || k === 'A') {
        e.preventDefault();
        addRef.current?.focus();
      } else if (slot && (k === '1' || k === '2' || k === '3')) {
        if (slot.status === 'removed') return;
        e.preventDefault();
        act(slot, withLevel(slot.current, LEVELS[Number(k) - 1]));
      } else if (slot && (k === 'w' || k === 'W')) {
        if (slot.status === 'removed') return;
        e.preventDefault();
        const m = modeOf(slot.current);
        act(slot, m === 'split' ? mergeState(slot.current) : withMode(slot.current, nextMode(m)));
      } else if (slot && (k === 'Backspace' || k === 'Delete')) {
        e.preventDefault();
        act(slot, slot.status === 'removed' ? slot.original : {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editable, flat, focusKey, act]);

  useEffect(() => {
    if (!focusKey) return;
    rowRefs.current.get(focusKey)?.scrollIntoView({ block: 'nearest' });
  }, [focusKey]);

  const release = async () => {
    if (!window.confirm(`Release ${data.trail.name}? Someone else can claim it.`)) return;
    setBusy(true);
    try {
      await enqueue(() => releaseClaim(review.id));
      navigate('/review');
    } catch (e) {
      toast(e.message);
      setBusy(false);
    }
  };

  const reclaim = async () => {
    setBusy(true);
    try {
      await claimMountain(trailId);
      await load();
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  };

  const submit = async () => {
    commitMountainNote();
    setBusy(true);
    try {
      await enqueue(() => submitReview(review.id, scrolled));
      toast(
        summary.total === 0 ? `Thanks. ${data.trail.name} is marked as right.` : `Thanks. Your review of ${data.trail.name} is in.`,
        'ok',
      );
      navigate('/review');
    } catch (e) {
      toast(e.message);
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-body text-fg">{loadError}</p>
        <Link to="/review" className={`${btnQuiet} mt-6`}>
          Back to the board
        </Link>
      </main>
    );
  }
  if (!data) return <p className="px-4 py-24 text-center text-small text-fg-subtle">Loading the mountain</p>;

  const { trail } = data;

  let banner = null;
  if (!editable) {
    if (data.expired) {
      banner = (
        <Banner
          title="Your hold on this mountain ran out"
          body="Your draft is saved. Claim it again to carry on, if nobody else has taken it."
          action={
            <button type="button" className={btnPrimary} disabled={busy} onClick={reclaim}>
              Re-claim
            </button>
          }
        />
      );
    } else if (review?.state === 'submitted' || review?.state === 'verified') {
      banner = (
        <Banner
          title={review.state === 'verified' ? 'Your review was verified' : 'You submitted this review'}
          body={`Submitted ${shortDate(review.submitted_at)}. This is a read only view of the list with your changes.`}
        />
      );
    } else {
      banner = (
        <Banner
          title="You have not claimed this mountain"
          body="Claim it from the board to start reviewing. You can look around here first."
          action={
            <button type="button" className={btnQuiet} disabled={busy} onClick={reclaim}>
              Claim
            </button>
          }
        />
      );
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-40 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/review" className={btnGhost}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Board
        </Link>
        {editable ? (
          <div className="flex items-center gap-3 text-small">
            <span className="font-mono text-fg-muted">Yours until {shortDate(review.lock_expires_at)}</span>
            <button type="button" className={btnGhost} onClick={release} disabled={busy}>
              Release
            </button>
          </div>
        ) : null}
      </div>

      <h1 className="mt-4 font-display text-display-md font-semibold text-fg">{trail.name}</h1>
      {editable ? (
        <p className="mt-2 max-w-prose text-body text-fg-muted">
          Only touch what is wrong. Everything saves as you go. If the list is right, scroll to the end and tap Looks right.
        </p>
      ) : null}

      {banner}

      <FactStrip trail={trail} flags={flags} editable={editable} onSave={saveFlag} />

      <div className="mt-10 flex items-baseline justify-between gap-3">
        <p className={EYEBROW}>Gear list · {slots.filter((s) => s.status !== 'removed').length} slots</p>
        {editable ? (
          <p className="hidden font-mono text-[0.7rem] text-fg-subtle pointer-fine:md:block">
            ↑↓ move · 1 2 3 level · W season · Del remove · A add · Esc clear
          </p>
        ) : null}
      </div>

      {groups.length === 0 ? <p className="mt-4 text-small text-fg-subtle">No gear slots on file for this mountain yet.</p> : null}

      {groups.map((g) => (
        <section key={g.group} aria-label={g.group} className="mt-6">
          <h2 className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-fg-muted">{g.group}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {g.items.map((s) => (
              <SlotRow
                key={s.item_type}
                slot={s}
                focused={focusKey === s.item_type}
                editable={editable}
                note={notes.get(s.item_type)}
                act={act}
                onNote={(n, sc, c) => saveNote(s.item_type, n, sc, c)}
                onFocusRow={() => setFocusKey(s.item_type)}
                rowRef={(el) => {
                  if (el) rowRefs.current.set(s.item_type, el);
                  else rowRefs.current.delete(s.item_type);
                }}
              />
            ))}
          </ul>
        </section>
      ))}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      <AddSlot types={data.types} slots={slots} onAdd={addSlot} inputRef={addRef} disabled={!editable} />

      <section aria-label="Finish" className="mt-12 border-t border-line pt-8">
        <label htmlFor="mountain-note" className="text-body text-fg">
          Anything else the list gets wrong for this mountain?
        </label>
        <p className="mt-1 text-small text-fg-subtle">Optional; it helps improve the algorithm.</p>
        <textarea
          id="mountain-note"
          rows={3}
          value={mountainNote}
          disabled={!editable}
          onChange={(e) => setMountainNoteText(e.target.value)}
          onBlur={commitMountainNote}
          className={`${field} mt-3 resize-y`}
        />
      </section>

      {editable ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-small text-fg" aria-live="polite">
                {summaryLine(summary)}
              </p>
              {!scrolled ? <p className="text-[0.75rem] text-fg-subtle">Scroll through the whole list first</p> : null}
            </div>
            <button type="button" className={btnPrimary} disabled={!scrolled || busy} onClick={submit}>
              {busy ? 'Sending' : summary.total === 0 ? 'Looks right' : 'Submit review'}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Banner({ title, body, action }) {
  return (
    <div className={`${surface} mt-6 flex flex-wrap items-center justify-between gap-4 border-line-strong p-5`}>
      <div className="min-w-0 max-w-prose">
        <p className="font-medium text-fg">{title}</p>
        <p className="mt-1 text-small text-fg-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}

export default function ReviewMountain() {
  const { trailId } = useParams();
  return <RequireReviewer>{(ctx) => <MountainReview key={trailId} {...ctx} trailId={trailId} />}</RequireReviewer>;
}

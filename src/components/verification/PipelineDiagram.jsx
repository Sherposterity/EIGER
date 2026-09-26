import { AnimatePresence, motion } from 'motion/react';
import { BrainCircuit, Check, FileText, MessageSquareText, Smartphone, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { driftFor } from '@/components/home/tryit/glyphs';
import { GROUP_LABEL, VERIFIED_GREEN, groupColour } from './pipeline';

const EASE = [0.22, 1, 0.36, 1];
const mono = 'font-mono leading-none';

// Point on the edge of a circle (centre c, radius r) facing point p.
function edge(c, r, p) {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: c.x + (dx / d) * r, y: c.y + (dy / d) * r };
}

// Smooth cubic between two points, bending along the longer axis.
function curve(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return `M ${a.x} ${a.y} C ${a.x + dx / 2} ${a.y}, ${b.x - dx / 2} ${b.y}, ${b.x} ${b.y}`;
  }
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy / 2}, ${b.x} ${b.y - dy / 2}, ${b.x} ${b.y}`;
}

function FlowLine({ d, on, active, reduce, delay = 0 }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={active ? 'var(--color-fg-muted)' : 'var(--color-fg-subtle)'}
      strokeWidth={1.25}
      initial={false}
      animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { pathLength: { duration: 0.7, ease: EASE, delay }, opacity: { duration: 0.2, delay } }
      }
    />
  );
}

// A round node with a Lucide glyph (model, mountaineer, user reports).
function Node({ at, r, icon, label, sub, lit, dim, hidden, reduce, labelBelow = true }) {
  const Icon = icon;
  return (
    <motion.div
      className="absolute"
      style={{ left: at.x, top: at.y }}
      initial={false}
      animate={{ opacity: hidden ? 0 : dim ? 0.28 : 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4 }}
    >
      <div
        className={cn(
          'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-surface-2 transition-[border-color,box-shadow,color] duration-500',
          lit ? 'border-fg text-fg shadow-[0_0_0_6px_rgb(255_255_255/0.06)]' : 'border-line-strong text-fg-muted',
        )}
        style={{ width: r * 2, height: r * 2 }}
      >
        <Icon style={{ width: r * 0.95, height: r * 0.95 }} strokeWidth={1.5} aria-hidden="true" />
      </div>
      {label && labelBelow && (
        <div
          className="absolute -translate-x-1/2 whitespace-nowrap text-center"
          style={{ top: r + 6 }}
        >
          <p className={cn(mono, 'inline-block rounded-sm bg-bg/85 px-1 py-0.5 text-[10px] text-fg-muted sm:text-[11px]')}>
            {label}
          </p>
          {sub && (
            <p className={cn(mono, 'mx-auto mt-0.5 w-fit rounded-sm bg-bg/85 px-1 py-0.5 text-[10px] text-fg-subtle')}>
              {sub}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CheckBox({ on, size = 18 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-500"
      style={{
        width: size,
        height: size,
        borderColor: on ? VERIFIED_GREEN : 'var(--color-fg-subtle)',
        background: on ? VERIFIED_GREEN : 'transparent',
      }}
    >
      {on && <Check className="text-bg" style={{ width: size - 5, height: size - 5 }} strokeWidth={3} />}
    </span>
  );
}

// The drafted gear list: unverified (empty outlined square) until the
// mountaineer signs it off, then a green check and a "Verified" tag.
function ListCard({ geo, mountain, counts, total, verified, visible, collapsed, reduce }) {
  const { card, phone, cardCompact } = geo;
  const to = collapsed
    ? { x: phone.x - card.x - card.w / 2, y: phone.y - card.y - 40, scale: 0.25, opacity: 0 }
    : { x: 0, y: 0, scale: 1, opacity: visible ? 1 : 0 };
  return (
    <motion.div
      className="absolute origin-center rounded-md border border-line-strong bg-surface-1 p-3 shadow-[0_8px_24px_rgb(0_0_0/0.4)]"
      style={{ left: card.x, top: card.y, width: card.w }}
      initial={false}
      animate={to}
      transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn(mono, 'text-[10px] uppercase tracking-[0.16em] text-fg-subtle')}>Gear list</p>
          <p className="mt-1.5 truncate text-[13px] font-medium leading-tight text-fg">{mountain.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <CheckBox on={verified} />
          <span
            className={cn(mono, 'text-[9.5px] transition-colors duration-500')}
            style={{ color: verified ? VERIFIED_GREEN : 'var(--color-fg-subtle)' }}
          >
            {verified ? 'Verified' : 'Unverified'}
          </span>
        </div>
      </div>
      <AnimatePresence initial={false}>
      {!cardCompact && (
        <motion.ul
          className="flex flex-col gap-1.5 overflow-hidden"
          initial={{ height: 0, opacity: 0, marginTop: 0 }}
          animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
          exit={{ height: 0, opacity: 0, marginTop: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE }}
        >
          {Object.entries(counts).map(([group, n]) => (
            <li key={group} className="flex items-center gap-2">
              <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: groupColour(group) }} />
              <span className="flex-1 truncate text-[11.5px] leading-tight text-fg-muted">{GROUP_LABEL[group]}</span>
              <span className={cn(mono, 'text-[11px] tabular-nums text-fg')}>{n}</span>
            </li>
          ))}
        </motion.ul>
      )}
      </AnimatePresence>
      <p className={cn(mono, 'mt-2.5 border-t border-line pt-2 text-[10.5px] text-fg-muted')}>
        {total} items
      </p>
    </motion.div>
  );
}

const KIND_MARK = { added: '+ added', removed: '- removed', changed: 'changed', note: 'note' };

function Reviews({ geo, changes, shown, visible, reduce }) {
  return (
    <motion.ul
      className="absolute flex flex-col gap-2"
      style={{ left: geo.reviews.x, top: geo.reviews.y, width: geo.reviews.w }}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.3 }}
    >
      {changes.map((c, i) => (
        <motion.li
          key={c.text}
          className="flex items-baseline gap-2 text-[11px] leading-snug text-fg-muted"
          title={c.source ? `Source: ${c.source}` : undefined}
          initial={false}
          animate={{ opacity: i < shown ? 1 : 0, y: i < shown ? 0 : 4 }}
          transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
        >
          <span
            className={cn(
              mono,
              'shrink-0 rounded-sm border px-1 py-0.5 text-[9.5px]',
              c.kind === 'note' ? 'border-line text-fg-subtle' : 'border-line-strong text-fg',
            )}
          >
            {KIND_MARK[c.kind]}
          </span>
          <span className="min-w-0">{c.text}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function Phone({ geo, levels, visible, reduce }) {
  const { phone } = geo;
  return (
    <motion.div
      className="absolute flex items-center gap-3"
      style={{ left: phone.x - 20, top: phone.y - 26 }}
      initial={false}
      animate={{ opacity: visible ? 1 : geo.split ? 0.28 : 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4 }}
    >
      <div className="relative flex h-[52px] w-[40px] items-center justify-center">
        <Smartphone className="size-[46px] text-fg-muted" strokeWidth={1.25} aria-hidden="true" />
        <span className="absolute -right-1 -top-1">
          <CheckBox on={visible} size={14} />
        </span>
      </div>
      {visible && (
        <ul className={cn(mono, 'flex flex-col gap-1.5 text-[10.5px] text-fg-muted')}>
          <li>
            essential <span className="text-fg tabular-nums">{levels.essential}</span>
          </li>
          <li>
            recommended <span className="text-fg tabular-nums">{levels.recommended}</span>
          </li>
          <li>
            optional <span className="text-fg tabular-nums">{levels.optional}</span>
          </li>
        </ul>
      )}
    </motion.div>
  );
}


// Stage 1: the handwritten expert guidelines arrive as a small document that
// drifts into the model node and is absorbed (the node flashes once). Replays
// every time stage 1 is entered. Reduced motion: the document sits docked
// beside the node with a short connector and nothing moves.
function GuidelinesDoc({ model, thumb, reduce, playKey }) {
  const dx = thumb ? -96 : -196;
  const dy = thumb ? -96 : -172;
  const start = { x: model.x + dx, y: model.y + dy };
  const w = thumb ? 56 : 92;
  const h = thumb ? 68 : 110;
  const line = `M ${start.x + w / 2} ${start.y + h / 2} L ${model.x} ${model.y}`;
  if (reduce) {
    return (
      <>
        <svg className="pointer-events-none absolute inset-0 overflow-visible">
          <path d={line} stroke="var(--color-line-strong)" strokeWidth="1" fill="none" />
        </svg>
        <DocCard x={start.x} y={start.y} w={w} h={h} thumb={thumb} />
      </>
    );
  }
  return (
    <>
      <motion.div
        key={`doc-${playKey}`}
        className="pointer-events-none absolute left-0 top-0 z-20 origin-center"
        style={{ width: w, height: h }}
        initial={{ x: start.x - 36, y: start.y - 24, opacity: 0, scale: 1 }}
        animate={{
          x: [start.x - 36, start.x, start.x, model.x - w / 2],
          y: [start.y - 24, start.y, start.y, model.y - h / 2],
          opacity: [0, 1, 1, 0],
          scale: [1, 1, 1, 0.12],
        }}
        transition={{ duration: 2.4, times: [0, 0.18, 0.55, 1], ease: ['easeOut', 'linear', 'easeIn'] }}
      >
        <DocCard x={0} y={0} w={w} h={h} thumb={thumb} relative />
      </motion.div>
      <motion.div
        key={`absorb-${playKey}`}
        className="pointer-events-none absolute rounded-full border border-fg"
        style={{ left: model.x - model.r, top: model.y - model.r, width: model.r * 2, height: model.r * 2 }}
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: [0, 0.7, 0], scale: [1, 1.55, 1.7] }}
        transition={{ duration: 0.9, delay: 2.25, ease: 'easeOut' }}
      />
    </>
  );
}

function DocCard({ x, y, w, h, thumb, relative }) {
  const lines = thumb ? 3 : 5;
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-[6px] border border-line-strong bg-surface-1 p-2.5 shadow-[0_8px_24px_rgb(0_0_0/0.4)]',
        relative ? 'relative' : 'absolute',
      )}
      style={relative ? { width: w, height: h } : { left: x, top: y, width: w, height: h }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5 text-fg">
        <FileText className={thumb ? 'size-3' : 'size-3.5'} />
        {!thumb && <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle">Guidelines</span>}
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="block h-[3px] rounded-full bg-line-strong" style={{ width: `${88 - (i % 3) * 22}%` }} />
      ))}
    </div>
  );
}

export default function PipelineDiagram({
  geo,
  stage,
  reduce,
  mountain,
  need,
  tags,
  tagsOn,
  counts,
  levels,
  changes,
  reviewsShown,
  verified,
}) {
  const { model, clusters, circleR, split } = geo;
  const T = reduce ? { duration: 0 } : { duration: 0.6, ease: EASE };

  // Model to item lines, one per circle the mountain needs (an item hidden in
  // a "+N" circle draws to that circle, once).
  const lines = [];
  for (const c of clusters) {
    for (const p of c.circles) {
      const needed = p.item ? need.has(p.item) : p.hidden.some((i) => need.has(i));
      if (needed) lines.push({ key: `${c.group}:${p.item ?? '+'}`, group: c.group, p });
    }
  }

  const ringOn = stage >= 2;
  const signedOff = changes.filter((c) => c.kind !== 'note').length;
  const cardVisible = split ? stage >= 3 : stage >= 4;
  const T3 = geo.place(model);
  const modelOut = { x: T3.x + model.r * geo.ring.scale, y: T3.y };
  const { card, expert, phone, reports } = geo;
  const cardAnchor = split ? { x: card.x, y: card.y + 34 } : { x: card.x, y: card.y + 22 };
  const cardBottom = split ? { x: card.x + card.w / 2, y: card.y + 96 } : { x: card.x + 28, y: card.y + card.h };
  const phoneTop = { x: phone.x - 6, y: phone.y - 30 };
  const loop = split
    ? `M ${reports.x} ${reports.y - reports.r} C ${reports.x} ${expert.y}, ${reports.x} ${expert.y}, ${expert.x + expert.r + 3} ${expert.y}`
    : curve(edge(reports, reports.r, expert), edge(expert, expert.r + 3, reports));
  // Sideways out of the mountaineer, clear of his labels, then down.
  const side = split ? -1 : 1;
  const ex = expert.x + side * (expert.r + 2);
  const expertToPhone = `M ${ex} ${expert.y} C ${phoneTop.x} ${expert.y}, ${phoneTop.x} ${expert.y}, ${phoneTop.x} ${phoneTop.y}`;
  // Up out of the phone, then across to the reports node.
  const phoneToReports = split
    ? `M ${phone.x + 12} ${phone.y - 30} C ${phone.x + 12} ${reports.y}, ${phone.x + 12} ${reports.y}, ${reports.x - reports.r - 2} ${reports.y}`
    : (() => {
        const a = { x: phone.x + 12, y: phone.y - 30 };
        const b = { x: reports.x, y: reports.y + reports.r + 22 };
        const m = (a.y + b.y) / 2;
        return `M ${a.x} ${a.y} C ${a.x} ${m}, ${b.x} ${m}, ${b.x} ${b.y}`;
      })();

  return (
    <div className="relative h-full w-full select-none">
      {/* The ring: model, category clusters and the lines between them. On
          phones it shrinks into the top left corner from stage 4. */}
      <motion.div
        className="absolute inset-0 origin-top-left"
        initial={false}
        animate={{ scale: geo.ring.scale }}
        transition={T}
      >
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={geo.width} height={geo.height}>
          {lines.map((l, i) => (
            <motion.path
              key={l.key}
              d={`M ${model.x} ${model.y} L ${l.p.x} ${l.p.y}`}
              stroke={groupColour(l.group)}
              strokeWidth={1}
              fill="none"
              initial={false}
              animate={{ pathLength: ringOn ? 1 : 0, opacity: ringOn ? 0.55 : 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : stage === 2
                    ? {
                        pathLength: { duration: 0.9, ease: EASE, delay: 0.3 + (i / lines.length) * 4.6 },
                        opacity: { duration: 0.2, delay: 0.3 + (i / lines.length) * 4.6 },
                      }
                    : { duration: 0.4 }
              }
            />
          ))}
        </svg>

        {clusters.map((c, k) => {
          const labelTop = c.extent + 4;
          return (
            <div key={c.group} className="absolute" style={{ left: c.x, top: c.y }}>
              <div className="tryit-dx" style={driftFor(k + 3, 3)}>
                <div className="tryit-dy">
                  {c.circles.map((p) => {
                    const needed = p.item ? need.has(p.item) : p.hidden.some((i) => need.has(i));
                    const tag = tagsOn && stage === 3 && tags.find((t) => t.item === p.item);
                    const leftSide = c.x > model.x;
                    return (
                      <div
                        key={p.item ?? '+'}
                        className="absolute"
                        style={{ left: p.x - c.x, top: p.y - c.y }}
                      >
                        <div
                          title={p.item ?? `${p.more} more: ${p.hidden.join(', ')}`}
                          className={cn(
                            'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-[opacity,background-color,border-color] duration-500',
                            ringOn && needed
                              ? 'border-fg-muted bg-surface-3'
                              : 'border-line-strong bg-surface-1',
                            ringOn && !needed && 'opacity-30',
                          )}
                          style={{ width: circleR * 2, height: circleR * 2 }}
                        >
                          {p.more ? (
                            <span className={cn(mono, split ? 'text-[8.5px]' : 'text-[6.5px]', 'text-fg-muted')}>
                              +{p.more}
                            </span>
                          ) : null}
                        </div>
                        {tag && (
                          <motion.span
                            initial={reduce ? false : { opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                              mono,
                              'absolute top-0 z-10 -translate-y-1/2 whitespace-nowrap rounded-sm border border-fg-subtle bg-bg px-1.5 py-1 text-fg',
                              split ? 'text-[10px]' : 'text-[9px]',
                            )}
                            style={leftSide ? { right: circleR + 4 } : { left: circleR + 4 }}
                          >
                            {tag.label}
                          </motion.span>
                        )}
                      </div>
                    );
                  })}
                  <p
                    className={cn(
                      mono,
                      'absolute -translate-x-1/2 whitespace-nowrap rounded-sm bg-bg/85 px-1 py-0.5 text-fg-subtle transition-opacity duration-300',
                      split ? 'text-[10.5px]' : 'text-[9.5px]',
                      geo.thumb && 'opacity-0',
                    )}
                    style={{ top: labelTop }}
                    title={c.group}
                  >
                    {GROUP_LABEL[c.group]}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {stage === 1 && <GuidelinesDoc key={mountain?.slug} model={model} thumb={geo.thumb} reduce={reduce} playKey={mountain?.slug ?? 'doc'} />}

        <Node
          at={model}
          r={model.r}
          icon={BrainCircuit}
          label="Fine-tuned model"
          sub={stage === 1 && split ? 'prompt written by experts' : null}
          lit={stage <= 3}
          reduce={reduce}
          labelBelow={!geo.thumb}
        />
      </motion.div>

      {/* The hand-offs: model to list, list to mountaineer, into the app, and
          the user reports loop. */}
      <svg className="pointer-events-none absolute inset-0 overflow-visible" width={geo.width} height={geo.height}>
        <defs>
          <marker id="vp-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--color-fg-muted)" />
          </marker>
        </defs>
        <FlowLine d={curve(modelOut, cardAnchor)} on={cardVisible && stage <= 4} active={stage === 3} reduce={reduce} />
        <FlowLine
          d={curve(cardBottom, edge(expert, expert.r + 2, cardBottom))}
          on={stage === 4}
          active
          reduce={reduce}
        />
        <FlowLine
          d={expertToPhone}
          on={stage >= 5}
          active={stage === 5}
          reduce={reduce}
        />
        <FlowLine
          d={phoneToReports}
          on={stage >= 6}
          active
          reduce={reduce}
        />
        {stage >= 6 && (
          <motion.path
            d={loop}
            fill="none"
            stroke="var(--color-fg-muted)"
            strokeWidth={1.25}
            markerEnd="url(#vp-arrow)"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.8, ease: EASE, delay: 0.5 }}
          />
        )}
      </svg>

      <Node
        at={expert}
        r={expert.r}
        icon={UserCheck}
        label="The mountaineer"
        lit={stage === 4 || stage === 6}
        dim={stage < 4}
        hidden={split ? stage === 3 : stage < 4}
        reduce={reduce}
      />

      <Reviews geo={geo} changes={changes} shown={reviewsShown} visible={stage === 4} reduce={reduce} />
      <motion.p
        className={cn(mono, 'absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-fg-subtle')}
        style={{ left: expert.x, top: expert.y + expert.r + 28 }}
        initial={false}
        animate={{ opacity: stage >= 5 ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.3 }}
      >
        {signedOff} {signedOff === 1 ? 'change' : 'changes'} signed off
      </motion.p>

      <Phone geo={geo} levels={levels} visible={stage >= 5} reduce={reduce} />

      <Node
        at={reports}
        r={reports.r}
        icon={MessageSquareText}
        label="User reports"
        lit={stage === 6}
        hidden={stage < 6}
        reduce={reduce}
      />

      <ListCard
        geo={geo}
        mountain={mountain}
        counts={counts}
        total={mountain.gear.length}
        verified={verified}
        visible={cardVisible}
        collapsed={stage >= 5}
        reduce={reduce}
      />
    </div>
  );
}

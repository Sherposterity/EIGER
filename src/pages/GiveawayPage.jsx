import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import { GIVEAWAY, TASKS, backend, isValidEmail, phaseFor, referralLink, ticketsFor } from '../lib/giveaway';

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'France', 'Switzerland', 'Germany', 'Austria', 'Norway', 'Other'];

const pad = (n) => String(n).padStart(2, '0');

// A one-second clock as an external store, so render stays pure
// (react-hooks/purity) and nothing sets state inside an effect. The snapshot
// is rounded to the second so it is stable between ticks; 0 on the server.
const subscribeClock = (onTick) => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
};
const readClock = () => Math.floor(Date.now() / 1000) * 1000;
const useNow = () => useSyncExternalStore(subscribeClock, readClock, () => 0);

const useCountdown = (targetIso) => {
  const now = useNow();
  const diff = now ? Math.max(0, Date.parse(targetIso) - now) : 0;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    now,
  };
};

const Eyebrow = ({ children }) => (
  <span className="inline-block rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-white/50">
    {children}
  </span>
);

const Countdown = ({ phase }) => {
  const target = phase === 'upcoming' ? GIVEAWAY.opensAt : GIVEAWAY.closesAt;
  const t = useCountdown(target);
  const label = phase === 'upcoming' ? 'Opens in' : phase === 'closed' ? 'Entries closed' : 'Closes in';
  return (
    <div className="mt-10">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{label}</div>
      {phase === 'closed' ? (
        <div className="mt-3 text-2xl text-white/70">The draw is being run. Winner announced by email and on this page.</div>
      ) : (
        <div className="mt-4 flex justify-center gap-3 sm:gap-6">
          {[
            ['Days', t.days],
            ['Hours', t.hours],
            ['Min', t.minutes],
            ['Sec', t.seconds],
          ].map(([unit, value]) => (
            <div key={unit} className="glass-card w-[72px] py-4 sm:w-24 sm:py-5">
              <div className="text-3xl font-bold tabular-nums sm:text-4xl">{pad(value)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">{unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TicketMeter = ({ tickets }) => {
  const pct = Math.round((tickets / GIVEAWAY.maxTickets) * 100);
  return (
    <div className="glass-card p-6 sm:p-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Your tickets</div>
          <div className="mt-1 text-5xl font-bold tabular-nums">
            {tickets}
            <span className="text-2xl text-white/30"> / {GIVEAWAY.maxTickets}</span>
          </div>
        </div>
        <div className="text-right text-sm text-white/50">More tickets, better odds.<br />Every task is free.</div>
      </div>
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const TaskRow = ({ task, units, onDo, busy }) => {
  const done = task.perUnit ? units >= task.maxUnits : units > 0;
  const earned = task.perUnit ? task.tickets * Math.min(units, task.maxUnits) : units ? task.tickets : 0;
  const available = task.perUnit ? task.tickets * task.maxUnits : task.tickets;
  const comingSoon = task.id === 'kickstarter' && !GIVEAWAY.links.kickstarter;
  return (
    <li className={`glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${done ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${done ? 'border-white bg-white text-black' : 'border-white/20 text-white/60'}`}>
          {done ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <span className="text-xs font-semibold">{available}</span>
          )}
        </div>
        <div>
          <div className="font-semibold">{task.label}</div>
          <div className="mt-1 text-sm text-white/50">{task.detail}</div>
          {task.perUnit ? <div className="mt-1 text-xs text-white/40">{units} of {task.maxUnits} friends counted</div> : null}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <span className="text-sm tabular-nums text-white/50">
          {earned}/{available} tickets
        </span>
        {task.auto ? null : comingSoon ? (
          <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/30">Coming soon</span>
        ) : done ? null : (
          <button
            type="button"
            onClick={() => onDo(task)}
            disabled={busy}
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {task.id === 'app' ? 'I signed up' : task.id === 'referral' ? 'Copy my link' : 'Follow'}
          </button>
        )}
      </div>
    </li>
  );
};

export default function GiveawayPage() {
  const location = useLocation();
  const ref = useMemo(() => new URLSearchParams(location.search).get('ref'), [location.search]);
  const now = useNow();
  const phase = now ? phaseFor(now) : 'open';
  const [entrant, setEntrant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', country: 'United States', consent: false, honeypot: '' });
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    backend.status().then((s) => setEntrant(s)).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  const tickets = ticketsFor(entrant?.progress);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.honeypot) return;
    if (!isValidEmail(form.email)) return setError('Enter a valid email address.');
    if (!form.consent) return setError('Please confirm you are 18 or older and agree to the rules.');
    setBusy(true);
    try {
      setEntrant(await backend.enter({ email: form.email.trim(), country: form.country, consent: true, ref }));
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const doTask = async (task) => {
    setBusy(true);
    try {
      if (task.id === 'tiktok' || task.id === 'instagram' || task.id === 'kickstarter') {
        window.open(GIVEAWAY.links[task.id], '_blank', 'noopener');
      }
      if (task.id === 'referral') {
        await navigator.clipboard.writeText(referralLink(entrant.code));
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        // Review mode only: pretend a friend just signed up so the meter moves.
        if (backend.mode === 'local') setEntrant(await backend.complete('referral'));
        return;
      }
      setEntrant(await backend.complete(task.id));
    } catch (err) {
      setError(err.message || 'Could not record that. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-36 text-center lg:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_50%_10%,rgba(255,255,255,0.07),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <Eyebrow>Launch giveaway</Eyebrow>
          <h1 className="mt-8 text-4xl font-bold leading-tight sm:text-6xl">
            Win the piece of gear you have been putting off.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
            {GIVEAWAY.prize.line} Free to enter. Up to {GIVEAWAY.maxTickets} tickets from easy tasks, and every ticket is one more name in the hat.
          </p>
          <Countdown phase={phase} />
        </div>
      </section>

      {/* Prize */}
      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="glass-card p-8 sm:p-10">
            <Eyebrow>The prize</Eyebrow>
            <h2 className="mt-6 text-3xl font-bold">{GIVEAWAY.prize.title}</h2>
            <div className="mt-2 text-white/40">Up to USD {GIVEAWAY.prize.valueUsd} retail value</div>
            <ul className="mt-6 space-y-3 text-white/60">
              <li>One winner, drawn at random from every ticket.</li>
              <li>You choose the item. We buy it from a retailer in your country and ship it to you.</li>
              <li>Open worldwide where lawful. United States, Canada, the United Kingdom, France, and Switzerland are all in.</li>
            </ul>
          </div>
          <div className="glass-card flex flex-col justify-between p-8 sm:p-10">
            <div>
              <Eyebrow>How it works</Eyebrow>
              <ol className="mt-6 space-y-4 text-white/70">
                <li><span className="mr-3 text-white/30">1</span>Enter with your email. That alone puts you in the draw.</li>
                <li><span className="mr-3 text-white/30">2</span>Do any of the tasks below for more tickets. All of them are free.</li>
                <li><span className="mr-3 text-white/30">3</span>Share your link. Friends who join earn you tickets too.</li>
              </ol>
            </div>
            <Link to="/giveaway/rules" className="mt-8 text-sm text-white/50 underline-offset-4 hover:text-white hover:underline">
              Read the official rules
            </Link>
          </div>
        </div>
      </section>

      {/* Entry or dashboard */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          {loading ? null : !entrant ? (
            <div className="glass-card mx-auto max-w-xl p-8 sm:p-10">
              <Eyebrow>Enter the draw</Eyebrow>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-white placeholder-white/30 outline-none transition focus:border-white/40"
                  disabled={phase !== 'open' && phase !== 'upcoming'}
                />
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-white outline-none transition focus:border-white/40 [&>option]:bg-[#0A0A0A]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input type="text" value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <label className="flex items-start gap-3 text-sm text-white/50">
                  <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1 h-4 w-4 accent-white" />
                  <span>
                    I am 18 or older, I live somewhere this giveaway is open, and I agree to the{' '}
                    <Link to="/giveaway/rules" className="underline underline-offset-4 hover:text-white">official rules</Link> and the{' '}
                    <a href="/privacy.html" className="underline underline-offset-4 hover:text-white">privacy policy</a>. Eiger may email me about the giveaway and the app. I can unsubscribe any time.
                  </span>
                </label>
                {error ? <div className="text-sm text-red-300">{error}</div> : null}
                <button
                  type="submit"
                  disabled={busy || phase === 'closed'}
                  className="w-full rounded-full bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {phase === 'closed' ? 'Entries closed' : busy ? 'Entering' : 'Enter the giveaway'}
                </button>
                {ref ? <div className="text-center text-xs text-white/40">Referred by a friend. They get tickets when you sign up for Eiger.</div> : null}
                <div className="text-center text-xs text-white/30">No purchase necessary. One entry per person.</div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <TicketMeter tickets={tickets} />
              <ul className="space-y-3">
                {TASKS.map((task) => (
                  <TaskRow key={task.id} task={task} units={entrant.progress?.[task.id] ?? 0} onDo={doTask} busy={busy} />
                ))}
              </ul>
              <div className="glass-card p-6 sm:p-8">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Your referral link</div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <code className="flex-1 truncate rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70">{referralLink(entrant.code)}</code>
                  <button
                    type="button"
                    onClick={() => doTask(TASKS.find((t) => t.id === 'referral'))}
                    className="rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="mt-3 text-xs text-white/40">
                  Get the app: <a className="underline underline-offset-4 hover:text-white" href={GIVEAWAY.links.appStore} target="_blank" rel="noreferrer">iPhone</a> or{' '}
                  <a className="underline underline-offset-4 hover:text-white" href={GIVEAWAY.links.playStore} target="_blank" rel="noreferrer">Android</a>. Sign up with {entrant.email}.
                </div>
                {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
              </div>
              {backend.mode === 'local' ? (
                <button type="button" onClick={async () => { await backend.reset(); setEntrant(null); }} className="text-xs text-white/30 underline underline-offset-4 hover:text-white/60">
                  Review mode: reset this browser's entry
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-white/30">
          No purchase necessary. Open to entrants 18 or older, or the age of majority where they live, in any country where such promotions are lawful, excluding {GIVEAWAY.excludedRegions}. Void where prohibited. Ends {new Date(GIVEAWAY.closesAt).toUTCString().slice(0, 16)}. One prize, approximate retail value USD {GIVEAWAY.prize.valueUsd}. Odds depend on the number of tickets received. Sponsor: {GIVEAWAY.sponsor.name}, {GIVEAWAY.sponsor.place}. This promotion is in no way sponsored, endorsed, administered by, or associated with TikTok, Instagram, Meta, Apple, Google, or Kickstarter. See the <Link to="/giveaway/rules" className="underline underline-offset-4 hover:text-white/60">official rules</Link>.
        </div>
      </section>

      <Footer />
    </div>
  );
}

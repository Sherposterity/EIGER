import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GIVEAWAY, TASKS, backend, clearReferral, isValidEmail, pendingReferral, phaseFor, referralLink, rememberReferral, ticketsFor } from '../lib/giveaway';

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

// Shared styles. Monochrome only: state is shown by white versus grey, never
// by colour. Errors are white text with a marker, not red.
const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-line-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg';
const surface = 'rounded-lg border border-line bg-surface-1';
const primaryBtn = `inline-flex items-center justify-center rounded-pill bg-fg font-semibold uppercase tracking-[0.18em] text-bg transition-opacity duration-300 hover:opacity-85 disabled:opacity-50 ${focusRing}`;
const outlineBtn = `inline-flex items-center justify-center rounded-pill border border-line-strong font-semibold uppercase tracking-[0.18em] text-fg transition-colors duration-300 hover:bg-surface-3 disabled:opacity-50 ${focusRing}`;
const textLink = `rounded-sm underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg ${focusRing}`;
const fieldClass =
  'h-12 rounded-pill border-line-strong bg-surface-2 px-5 text-body text-fg placeholder:text-fg-subtle aria-invalid:border-fg aria-invalid:ring-fg/20 dark:bg-surface-2 dark:aria-invalid:border-fg dark:aria-invalid:ring-fg/20';

const Eyebrow = ({ children, as = 'p' }) => {
  const Tag = as;
  return <Tag className="font-mono text-eyebrow font-semibold uppercase text-fg-subtle">{children}</Tag>;
};

// Error text: announced politely, monochrome, marked so it does not rely on colour.
const ErrorText = ({ children, className = '' }) =>
  children ? (
    <p className={`flex items-start gap-2 text-small font-medium text-fg ${className}`}>
      <span aria-hidden="true" className="font-mono">!</span>
      <span>{children}</span>
    </p>
  ) : null;

// The countdown ticks every second, so it is deliberately not a live region:
// screen readers read it when they reach it and are not interrupted by it.
const Countdown = ({ phase }) => {
  const target = phase === 'upcoming' ? GIVEAWAY.opensAt : GIVEAWAY.closesAt;
  const t = useCountdown(target);
  const label = phase === 'upcoming' ? 'Opens in' : phase === 'closed' ? 'Entries closed' : 'Closes in';
  return (
    <div className="mt-12">
      <Eyebrow>{label}</Eyebrow>
      {phase === 'closed' ? (
        <div className="mt-3 text-heading text-fg-muted">The draw is being run. Winner announced by email and on this page.</div>
      ) : (
        <div className="mt-4 flex justify-center gap-2 sm:gap-4">
          {[
            ['Days', t.days],
            ['Hours', t.hours],
            ['Min', t.minutes],
            ['Sec', t.seconds],
          ].map(([unit, value]) => (
            <div key={unit} className={`${surface} w-[68px] py-4 sm:w-24 sm:py-5`}>
              <div className="font-mono text-3xl font-semibold tabular-nums sm:text-4xl">{pad(value)}</div>
              <div className="mt-1 font-mono text-eyebrow uppercase text-fg-subtle">{unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// The prize value arrives redacted: a censor bar sits over the number and
// peels off while each digit rolls down a column (three blocks, two decoy
// digits, the real one) and settles. Keyframes live in index.css; it runs once
// on load and reduced motion shows the number at once. The blocks are drawn
// with CSS, not block glyphs, so the mono font subset does not matter.
const REDACT_BLOCKS = ['opacity-100', 'opacity-60', 'opacity-30'];
const PrizeValue = ({ value }) => {
  const digits = String(value).split('');
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-center gap-3">
        <span className="font-mono text-2xl font-medium text-fg-subtle sm:text-3xl">USD</span>
        <span
          role="img"
          aria-label={String(value)}
          className="relative inline-flex font-mono text-7xl font-semibold leading-none tabular-nums sm:text-8xl lg:text-9xl"
        >
          {digits.map((d, i) => {
            const n = Number(d);
            const column = [...REDACT_BLOCKS, String((n + 7) % 10), String((n + 3) % 10), d];
            return (
              <span key={i} aria-hidden="true" className="inline-block h-[1em] overflow-hidden">
                <span className="redact-digit flex flex-col" style={{ animationDelay: `${i * 90}ms` }}>
                  {column.map((cell, j) => (
                    <span key={j} className="flex h-[1em] items-center">
                      {j < REDACT_BLOCKS.length ? (
                        <span className={`block h-[0.72em] w-full bg-fg ${cell}`}>
                          <span className="invisible">{d}</span>
                        </span>
                      ) : (
                        cell
                      )}
                    </span>
                  ))}
                </span>
              </span>
            );
          })}
          <span aria-hidden="true" className="redact-bar absolute -inset-x-[0.06em] inset-y-[0.08em] rounded-sm bg-fg" />
        </span>
      </div>
      <div className="mt-4 font-mono text-eyebrow font-semibold uppercase text-fg-muted">Retail value. Gear of your choice. One winner.</div>
    </div>
  );
};

const TicketMeter = ({ tickets }) => {
  const pct = Math.round((tickets / GIVEAWAY.maxTickets) * 100);
  return (
    <div className={`${surface} p-6 sm:p-8`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Your tickets</Eyebrow>
          <div className="mt-1 font-mono text-5xl font-semibold tabular-nums">
            {tickets}
            <span className="text-2xl text-fg-subtle"> / {GIVEAWAY.maxTickets}</span>
          </div>
        </div>
        <div className="text-right text-small text-fg-muted">More tickets, better odds.<br />Every task is free.</div>
      </div>
      <div className="mt-5 h-2 w-full overflow-hidden rounded-pill bg-surface-3">
        <div className="h-full rounded-pill bg-fg transition-[width] duration-700 ease-out-expo" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const TaskRow = ({ task, units, onDo, busy, open, activated, opened, onOpen, copied }) => {
  const done = task.perUnit ? units >= task.maxUnits : units > 0;
  const honor = task.id === 'tiktok' || task.id === 'instagram' || task.id === 'kickstarter';
  const earned = task.perUnit ? task.tickets * Math.min(units, task.maxUnits) : units ? task.tickets : 0;
  const available = task.perUnit ? task.tickets * task.maxUnits : task.tickets;
  const comingSoon = task.id === 'kickstarter' && !GIVEAWAY.links.kickstarter;
  const isReferral = task.id === 'referral';
  return (
    <li className={`${surface} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-pill border ${done ? 'border-fg bg-fg text-bg' : 'border-line-strong text-fg-muted'}`}>
          {done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : <span className="font-mono text-xs font-semibold">{available}</span>}
        </div>
        <div>
          <div className={`font-semibold ${done ? 'text-fg-muted' : 'text-fg'}`}>{task.label}</div>
          <div className="mt-1 text-small text-fg-muted">{task.detail}</div>
          {task.perUnit ? <div className="mt-1 font-mono text-xs text-fg-subtle">{units} of {task.maxUnits} friends counted</div> : null}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <span className="whitespace-nowrap font-mono text-small tabular-nums text-fg-muted">
          {earned}/{available} tickets
        </span>
        {task.auto ? null : comingSoon ? (
          // Until the campaign URL exists the pill points at our own /kickstarter page.
          <Link
            to="/kickstarter"
            className={`whitespace-nowrap rounded-pill border border-line px-4 py-2 font-mono text-eyebrow uppercase text-fg-subtle transition-colors hover:border-line-strong hover:text-fg ${focusRing}`}
          >
            Coming soon
          </Link>
        ) : done ? null : honor && !opened ? (
          <button
            type="button"
            onClick={() => onOpen(task)}
            disabled={busy || !open || !activated}
            className={`${outlineBtn} h-9 whitespace-nowrap px-5 text-xs`}
          >
            {task.id === 'kickstarter' ? 'Open Kickstarter' : `Open ${task.id === 'tiktok' ? 'TikTok' : 'Instagram'}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isReferral && busy) return;
              onDo(task);
            }}
            aria-disabled={isReferral && busy ? true : undefined}
            // The copy button stays enabled while busy so keyboard focus stays on it.
            disabled={isReferral ? false : busy || !open || !activated}
            className={`${primaryBtn} h-9 whitespace-nowrap px-5 text-xs`}
          >
            {task.id === 'app' ? 'I signed up' : isReferral ? (copied ? 'Copied' : 'Copy my link') : task.id === 'kickstarter' ? 'I had a look' : 'I followed'}
          </button>
        )}
      </div>
    </li>
  );
};

export default function GiveawayPage() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  // The link's code is remembered so reading the rules and coming back keeps the attribution.
  const refParam = params.get('ref');
  useEffect(() => {
    if (refParam) rememberReferral(refParam);
  }, [refParam]);
  const ref = refParam || pendingReferral();
  const rulesTo = ref ? `/giveaway/rules?ref=${encodeURIComponent(ref)}` : '/giveaway/rules';
  const entryToken = params.get('entry');
  const unsubscribed = params.get('unsubscribed');
  const now = useNow();
  const realPhase = now ? phaseFor(now) : 'open';
  // Review mode (local backend) keeps the window open so the flow can be
  // walked through before November 15; the countdown still shows the real dates.
  const phase = backend.mode === 'local' ? 'open' : realPhase;
  const [entrant, setEntrant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', country: 'United States', consent: false, honeypot: '' });
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [resendMode, setResendMode] = useState(false);
  // Which field failed validation, so it can be marked and focused.
  const [invalidField, setInvalidField] = useState(null);
  const emailRef = useRef(null);
  const consentRef = useRef(null);
  const resendEmailRef = useRef(null);
  // Honor tasks are two steps: open the profile, then claim. Nothing is verified by the open itself.
  const [openedTasks, setOpenedTasks] = useState({});
  // Status refreshes can resolve out of order; only the newest request may update the dashboard.
  const statusGen = useRef(0);
  const refreshStatus = () => {
    const gen = ++statusGen.current;
    backend.status().then((s) => { if (s && gen === statusGen.current) setEntrant(s); }).catch(() => undefined);
  };
  // A write (entry, task, resume) makes every in-flight status refresh stale.
  const commitEntrant = (e) => {
    statusGen.current += 1;
    setEntrant(e);
  };

  useEffect(() => {
    if (unsubscribed === '1') setNotice('You are unsubscribed from giveaway and Eiger marketing emails. Your entry stays in the draw, and dashboard links you request are still sent.');
  }, [unsubscribed]);

  // A referrer who keeps the page open sees a friend's credit when they come back to the tab.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') refreshStatus();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    // An emailed dashboard link restores the entry on this device; otherwise
    // the session stored here is used.
    const restore = entryToken ? backend.resume(entryToken) : backend.status();
    restore
      .then((s) => {
        commitEntrant(s);
        if (entryToken && s) setNotice(s.activated ? 'Welcome back. This device now shows your dashboard.' : 'This device now shows your dashboard.');
      })
      .catch((err) => setError(err.message || 'That link is not valid.'))
      .finally(() => setLoading(false));
  }, [entryToken]);

  const tickets = ticketsFor(entrant?.progress);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInvalidField(null);
    if (!isValidEmail(form.email)) {
      setInvalidField('email');
      emailRef.current?.focus();
      return setError('Enter a valid email address.');
    }
    if (!form.consent) {
      setInvalidField('consent');
      consentRef.current?.focus();
      return setError('Please confirm you are 18 or older and agree to the rules.');
    }
    if (phase !== 'open') return setError(phase === 'upcoming' ? 'The giveaway opens on November 15. Come back then.' : 'Entries are closed.');
    setBusy(true);
    try {
      // The hidden field travels to the server too: a filled one is dropped there.
      const next = await backend.enter({ email: form.email.trim(), country: form.country, consent: true, ref, website: form.honeypot });
      if (next?.existing) {
        // A known email never gets its dashboard back from the form; the inbox link is the way in.
        const who = form.email.trim();
        setNotice(
          next.emailOutcome === 'sent'
            ? `That email already has an entry. We sent its dashboard link to ${who}.`
            : next.emailOutcome === 'throttled'
              ? `That email already has an entry. A dashboard link was requested in the last ten minutes; check your inbox and spam, or try again in ${Math.max(1, Math.ceil((next.retryAfterSeconds ?? 600) / 60))} minutes.`
              : `That email already has an entry, but we could not send its dashboard link just now. Please try again in a moment.`
        );
        return;
      }
      commitEntrant(next);
      clearReferral();
      if (ref && !next.referred) {
        setNotice(`Entry reserved. The referral link you used did not match an active entry, so no friend is credited, but your own tickets are unaffected.${next.emailOutcome === 'failed' ? '' : ` Open the link we emailed to ${form.email.trim()} to activate.`}`);
        return;
      }
      setNotice(next.emailOutcome === 'failed' ? 'Entry reserved, but we could not send your activation email just now. Use "Resend the activation link" below in a minute.' : `Entry reserved. Open the link we emailed to ${form.email.trim()} to activate it; that also lets you come back from any device.`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resendLink = async (e) => {
    e?.preventDefault?.();
    setError('');
    const target = entrant?.email || form.email.trim();
    if (!isValidEmail(target)) {
      setInvalidField('resend');
      resendEmailRef.current?.focus();
      return setError('Enter the email you entered with.');
    }
    setInvalidField(null);
    setBusy(true);
    try {
      await backend.resend(target);
      setNotice(`If ${target} entered the giveaway and a link can be sent right now, it is on its way. Links go out at most once every ten minutes.`);
      setResendMode(false);
    } catch (err) {
      setError(err.message || 'Could not send the link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const openTask = (task) => {
    window.open(GIVEAWAY.links[task.id], '_blank', 'noopener');
    setOpenedTasks((o) => ({ ...o, [task.id]: true }));
  };

  const doTask = async (task) => {
    if (phase !== 'open' && task.id !== 'referral') return setError(phase === 'upcoming' ? 'Tasks open on November 15.' : 'Entries are closed.');
    setBusy(true);
    try {
      if (task.id === 'referral') {
        await navigator.clipboard.writeText(referralLink(entrant.code));
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        // Review mode only: pretend a friend just signed up so the meter moves.
        if (backend.mode === 'local') commitEntrant(await backend.complete('referral'));
        return;
      }
      commitEntrant(await backend.complete(task.id));
    } catch (err) {
      setError(err.message || 'Could not record that. Please try again.');
    } finally {
      setBusy(false);
    }
  };


  // Notice and error each sit in a polite live region: they change only when
  // the form or a task changes state, never on a timer.
  const noticeRegion = (
    <div aria-live="polite" className="mt-4 empty:hidden">
      {notice ? <p className="text-small text-fg-muted">{notice}</p> : null}
    </div>
  );
  const errorRegion = (
    <div aria-live="polite" className="empty:hidden">
      <ErrorText>{error}</ErrorText>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />

      {/* Hero */}
      <section className="px-4 pb-section-sm pt-36 text-center sm:px-gutter lg:pt-44">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Thank you giveaway</Eyebrow>
          <PrizeValue value={GIVEAWAY.prize.valueUsd} />
          <h1 className="mt-10 text-balance text-display-md">Win the piece of gear you have been putting off.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-fg-muted">
            Our Kickstarter goes live October 1. This giveaway opens November 15 as our thank you to everyone who backed it, shared it, or simply showed up for day one. No pledge required.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-body-lg text-fg-muted">
            {GIVEAWAY.prize.line} Free to enter. Up to {GIVEAWAY.maxTickets} tickets from easy tasks, and every ticket is one more name in the hat.
          </p>
          <Countdown phase={realPhase} />
        </div>
      </section>

      {/* Prize */}
      <section className="px-4 pb-16 sm:px-gutter">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className={`${surface} p-6 sm:p-10`}>
            <Eyebrow>The prize</Eyebrow>
            <h2 className="mt-5 text-heading">{GIVEAWAY.prize.title}</h2>
            <div className="mt-5 inline-flex flex-wrap items-baseline gap-2 rounded-pill border border-line-strong bg-surface-2 px-4 py-2">
              <span className="font-mono text-eyebrow uppercase text-fg-subtle">Up to</span>
              <span className="font-mono text-2xl font-semibold tabular-nums">USD {GIVEAWAY.prize.valueUsd}</span>
              <span className="font-mono text-eyebrow uppercase text-fg-subtle">retail</span>
            </div>
            <ul className="mt-6 space-y-3 text-fg-muted">
              <li>One winner, drawn at random from every ticket.</li>
              <li>You choose the item. We buy it from a retailer in your country and ship it to you.</li>
              <li>Open worldwide where lawful. United States, Canada, the United Kingdom, France, and Switzerland are all in.</li>
            </ul>
          </div>
          <div className={`${surface} flex flex-col justify-between p-6 sm:p-10`}>
            <div>
              <Eyebrow>How it works</Eyebrow>
              <ol className="mt-6 space-y-4 text-fg-muted">
                <li className="flex gap-3"><span className="font-mono text-fg-subtle">1</span><span>Enter with your email. That alone puts you in the draw.</span></li>
                <li className="flex gap-3"><span className="font-mono text-fg-subtle">2</span><span>Do any of the tasks below for more tickets. All of them are free.</span></li>
                <li className="flex gap-3"><span className="font-mono text-fg-subtle">3</span><span>Share your link. Friends who join earn you tickets too.</span></li>
              </ol>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-small text-fg-muted">
              <Link to={rulesTo} className={textLink}>Official rules</Link>
              <a href="/terms.html" className={textLink}>Terms of Use</a>
              <a href="/privacy.html" className={textLink}>Privacy Policy</a>
            </div>
          </div>
        </div>
      </section>

      {/* Entry or dashboard */}
      <section className="px-4 pb-section-sm sm:px-gutter">
        <div className="mx-auto max-w-5xl">
          {loading ? null : backend.mode === 'disabled' ? (
            <div className={`${surface} mx-auto max-w-xl p-6 text-center sm:p-10`}>
              <Eyebrow>Enter the draw</Eyebrow>
              <p className="mt-6 text-fg-muted">Entries are not open on this site yet. Check back soon.</p>
            </div>
          ) : !entrant ? (
            <div className={`${surface} mx-auto max-w-xl p-6 sm:p-10`}>
              <Eyebrow as="h2">{resendMode ? 'Find my entry' : 'Enter the draw'}</Eyebrow>
              {noticeRegion}
              {resendMode ? (
                <form onSubmit={resendLink} className="mt-6 space-y-5" noValidate>
                  <p className="text-small text-fg-muted">Already entered on another device? Enter the same email and we will send your dashboard link again.</p>
                  <div className="space-y-2">
                    <Label htmlFor="giveaway-resend-email" className="text-small text-fg">Email</Label>
                    <Input
                      id="giveaway-resend-email"
                      ref={resendEmailRef}
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (invalidField === 'resend') setInvalidField(null);
                      }}
                      placeholder="you@example.com"
                      aria-invalid={invalidField === 'resend' || undefined}
                      className={fieldClass}
                    />
                  </div>
                  {errorRegion}
                  <button type="submit" disabled={busy} className={`${primaryBtn} h-12 w-full px-6 text-small`}>
                    {busy ? 'Sending' : 'Email me my link'}
                  </button>
                  <button type="button" onClick={() => { setResendMode(false); setError(''); setInvalidField(null); }} className={`${textLink} mx-auto block text-small text-fg-muted`}>
                    Back to entering
                  </button>
                </form>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="giveaway-email" className="text-small text-fg">Email</Label>
                    <Input
                      id="giveaway-email"
                      ref={emailRef}
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (invalidField === 'email') setInvalidField(null);
                      }}
                      placeholder="you@example.com"
                      aria-invalid={invalidField === 'email' || undefined}
                      className={fieldClass}
                      disabled={phase !== 'open'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="giveaway-country" className="text-small text-fg">Country</Label>
                    <Select value={form.country} onValueChange={(country) => setForm({ ...form, country })}>
                      <SelectTrigger id="giveaway-country" className={`${fieldClass} w-full data-[size=default]:h-12`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="border-line-strong bg-surface-2">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <input type="text" value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  <div className="flex items-start gap-3">
                    <input
                      id="giveaway-consent"
                      ref={consentRef}
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => {
                        setForm({ ...form, consent: e.target.checked });
                        if (invalidField === 'consent') setInvalidField(null);
                      }}
                      aria-invalid={invalidField === 'consent' || undefined}
                      className={`mt-1 size-4 shrink-0 accent-white ${focusRing} aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-fg`}
                    />
                    <label htmlFor="giveaway-consent" className="text-small text-fg-muted">
                      I am 18 or older, I live somewhere this giveaway is open, and I agree to the{' '}
                      <Link to={rulesTo} className={textLink}>official rules</Link>, the{' '}
                      <a href="/terms.html" className={textLink}>Terms of Use</a>, and the{' '}
                      <a href="/privacy.html" className={textLink}>Privacy Policy</a>. Eiger may email me about the giveaway and the app. I can unsubscribe any time.
                    </label>
                  </div>
                  {errorRegion}
                  <button type="submit" disabled={busy || phase !== 'open'} className={`${primaryBtn} h-12 w-full px-6 text-small`}>
                    {phase === 'closed' ? 'Entries closed' : phase === 'upcoming' ? 'Opens November 15' : busy ? 'Entering' : 'Enter the giveaway'}
                  </button>
                  {ref ? <p className="text-center text-small text-fg-muted">Referred by a friend. They get tickets once you create your Eiger account with this email and tap "I signed up" on your dashboard.</p> : null}
                  <p className="text-center text-small text-fg-subtle">No purchase necessary. One entry per person.</p>
                  <button type="button" onClick={() => { setResendMode(true); setError(''); setInvalidField(null); }} className={`${textLink} mx-auto block text-small text-fg-muted`}>
                    Already entered? Email me my dashboard link
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div aria-live="polite" className="empty:hidden">
                {notice ? <div className={`${surface} px-6 py-4 text-small text-fg-muted`}>{notice}</div> : null}
              </div>
              {entrant.activated ? null : (
                <div className={`${surface} border-line-strong px-6 py-5`} data-testid="pending-banner">
                  <Eyebrow>One step left</Eyebrow>
                  <div className="mt-2 font-semibold">Open the link we emailed to {entrant.email} to activate your entry.</div>
                  <div className="mt-1 text-small text-fg-muted">Until then your entry is reserved but not in the draw, and tasks stay locked. Once opened, that link is your way back in on any device. Nothing in the inbox? Check spam, or resend below.</div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                    <button type="button" onClick={resendLink} disabled={busy} className={`${primaryBtn} h-9 px-5 text-xs`}>
                      Resend the activation link
                    </button>
                    {backend.mode === 'local' ? (
                      <Link to={`/giveaway?entry=${entrant.magic}`} className={`${textLink} text-small text-fg-subtle`}>Review mode: open the emailed link</Link>
                    ) : null}
                  </div>
                </div>
              )}
              <TicketMeter tickets={tickets} />
              <ul className="space-y-3">
                {TASKS.map((task) => (
                  <TaskRow key={task.id} task={task} units={entrant.progress?.[task.id] ?? 0} onDo={doTask} onOpen={openTask} opened={!!openedTasks[task.id]} busy={busy} open={phase === 'open'} activated={!!entrant.activated} copied={copied} />
                ))}
              </ul>
              <div className={`${surface} p-6 sm:p-8`}>
                <div className="flex items-center justify-between">
                  <Eyebrow>Your referral link</Eyebrow>
                  <button type="button" onClick={refreshStatus} className={`${textLink} text-small text-fg-muted`}>
                    Refresh
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <code className="min-w-0 flex-1 truncate rounded-pill border border-line bg-surface-2 px-5 py-3 font-mono text-small text-fg-muted">{referralLink(entrant.code)}</code>
                  <button
                    type="button"
                    onClick={() => {
                      if (busy) return;
                      doTask(TASKS.find((t) => t.id === 'referral'));
                    }}
                    className={`${primaryBtn} h-11 min-w-28 px-5 text-xs`}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-3 text-small text-fg-muted">
                  Get the app:{' '}
                  {GIVEAWAY.links.appStore && GIVEAWAY.links.playStore ? (
                    <>
                      <a className={textLink} href={GIVEAWAY.links.appStore} target="_blank" rel="noreferrer">iPhone</a> or{' '}
                      <a className={textLink} href={GIVEAWAY.links.playStore} target="_blank" rel="noreferrer">Android</a>
                    </>
                  ) : (
                    'iPhone or Android (from October 1)'
                  )}
                  . Sign up with {entrant.email}.
                  A friend who uses your link counts once they enter, create an Eiger account with their email, and tap "I signed up" on their dashboard.
                </p>
                <button type="button" onClick={resendLink} disabled={busy} className={`${textLink} mt-3 text-small text-fg-muted disabled:opacity-50`}>
                  Resend my dashboard link
                </button>
                <div aria-live="polite" className="mt-3 empty:hidden">
                  <ErrorText>{error}</ErrorText>
                </div>
              </div>
              {backend.mode === 'local' ? (
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-small text-fg-subtle">
                  <button type="button" onClick={async () => { await backend.reset(); setEntrant(null); setNotice(''); }} className={textLink}>
                    Review mode: reset this browser's entry
                  </button>
                  <Link to={`/giveaway?entry=${entrant.magic}`} className={textLink}>
                    Review mode: open the emailed dashboard link
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* Fine print */}
      <section className="px-4 pb-section-sm sm:px-gutter">
        <p className="mx-auto max-w-3xl text-center text-small text-fg-subtle">
          No purchase necessary. Open to entrants 18 or older, or the age of majority where they live, in any country where such promotions are lawful, excluding {GIVEAWAY.excludedRegions}. Void where prohibited. Ends {new Date(GIVEAWAY.closesAt).toUTCString().slice(0, 16)}. One prize, approximate retail value USD {GIVEAWAY.prize.valueUsd}. Odds depend on the number of tickets received. Sponsor: {GIVEAWAY.sponsor.name}, {GIVEAWAY.sponsor.place}. This promotion is in no way sponsored, endorsed, administered by, or associated with TikTok, Instagram, Meta, Apple, Google, or Kickstarter. See the <Link to="/giveaway/rules" className={textLink}>official rules</Link>, the <a href="/terms.html" className={textLink}>Terms of Use</a>, and the <a href="/privacy.html" className={textLink}>Privacy Policy</a>.
        </p>
      </section>

      <Footer />
    </div>
  );
}

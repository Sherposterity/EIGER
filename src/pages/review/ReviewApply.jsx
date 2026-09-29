import { useState } from 'react';
import { Link } from 'react-router-dom';
import { checkRateLimit, isBot, recordSubmission, validateEmail } from '@/lib/supabase';
import { rpc } from '@/lib/reviewApi';
import { EYEBROW, btnGhost, btnPrimary, field, focusRing } from './reviewStyles';

// Public reviewer application (no sign in). Linked from the Verification
// page's "Are you a mountaineer?" card. Copy is user-facing: no dashes, no
// mention of payment.

const RANGES = ['Alps', 'Rockies', 'Cascades', 'Sierra Nevada', 'Mexican volcanoes'];
const BACKGROUND = [
  ['certified_guide', 'Certified guide (IFMGA/UIAGM or national)'],
  ['aspirant_guide', 'Aspirant guide or instructor'],
  ['experienced_amateur', 'Experienced amateur (10+ alpine summits)'],
  ['club_leader', 'Club leader or trip organizer'],
  ['other', 'Other'],
];
const WINTER = [
  ['regular', 'Regular glacier travel and winter ascents'],
  ['some', 'Some'],
  ['summer_only', 'Summer rock and hiking only'],
];
const HOURS = [
  ['1_2', '1 to 2'],
  ['3_5', '3 to 5'],
  ['5_plus', 'More than 5'],
];
const USES_APP = [
  ['ios', 'Yes, on iPhone'],
  ['android', 'Yes, on Android'],
  ['not_yet', 'Not yet'],
];

const EMPTY = {
  full_name: '',
  email: '',
  location: '',
  ranges: [],
  other_range: '',
  peaks: '',
  background: '',
  certifications: '',
  winter_experience: '',
  prior_reviews: '',
  first_check: '',
  hours_per_month: '',
  public_links: '',
  uses_app: '',
  extra: '',
};

const REQUIRED = {
  full_name: 'your name',
  email: 'your email',
  location: 'where you are based',
  peaks: 'the peaks you know best',
  background: 'your background',
  winter_experience: 'your winter and glacier experience',
  first_check: 'what you would check first',
  hours_per_month: 'how many hours a month',
  uses_app: 'whether you use the app',
};

function Q({ n, label, hint, required, htmlFor, children }) {
  const Tag = htmlFor ? 'label' : 'p';
  return (
    <div className="flex flex-col gap-2">
      <Tag htmlFor={htmlFor} className="text-body text-fg">
        <span className="mr-2 font-mono text-small text-fg-subtle">{n}</span>
        {label}
        {required ? null : <span className="ml-2 text-small text-fg-subtle">Optional</span>}
      </Tag>
      {hint ? <p className="-mt-1 text-small text-fg-subtle">{hint}</p> : null}
      {children}
    </div>
  );
}

function Choice({ name, options, value, onChange, type = 'radio' }) {
  const checked = (v) => (type === 'radio' ? value === v : value.includes(v));
  return (
    <div className="flex flex-col gap-1.5" role={type === 'radio' ? 'radiogroup' : 'group'}>
      {options.map(([v, label]) => (
        <label
          key={v}
          className={`flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-2.5 text-small transition-colors focus-within:border-fg/60 ${
            checked(v) ? 'border-fg/60 bg-surface-2 text-fg' : 'border-line text-fg-muted hover:border-line-strong'
          }`}
        >
          <input type={type} name={name} value={v} checked={checked(v)} onChange={() => onChange(v)} className="accent-[#FAFAFA]" />
          {label}
        </label>
      ))}
    </div>
  );
}

export default function ReviewApply() {
  const [f, setF] = useState(EMPTY);
  const [honeypot, setHoneypot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const pick = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));
  const toggleRange = (r) =>
    setF((prev) => ({ ...prev, ranges: prev.ranges.includes(r) ? prev.ranges.filter((x) => x !== r) : [...prev.ranges, r] }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (isBot(honeypot)) {
      setDone(true);
      return;
    }
    const missing = Object.entries(REQUIRED).filter(([k]) => !String(f[k]).trim());
    if (missing.length) {
      setError(`Please add ${missing.map(([, l]) => l).join(', ')}.`);
      return;
    }
    const emailCheck = validateEmail(f.email);
    if (!emailCheck.valid) {
      setError(emailCheck.error);
      return;
    }
    const rate = checkRateLimit();
    if (!rate.allowed) {
      setError('Too many attempts from this browser. Please try again in an hour.');
      return;
    }
    const ranges = f.ranges.filter((r) => r !== 'Other');
    if (f.ranges.includes('Other') && f.other_range.trim()) ranges.push(f.other_range.trim());
    const p = {
      email: f.email.trim().toLowerCase(),
      full_name: f.full_name.trim(),
      location: f.location.trim(),
      ranges,
      peaks: f.peaks.trim(),
      background: f.background,
      certifications: f.certifications.trim(),
      winter_experience: f.winter_experience,
      prior_reviews: f.prior_reviews.trim(),
      first_check: f.first_check.trim(),
      hours_per_month: f.hours_per_month,
      public_links: f.public_links.trim(),
      uses_app: f.uses_app,
      extra: f.extra.trim(),
    };
    setBusy(true);
    try {
      await rpc('submit_reviewer_application', { p });
      recordSubmission();
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 sm:py-28">
        <p className={EYEBROW}>Application sent</p>
        <h1 className="mt-3 font-display text-display-md font-semibold text-fg">Thank you.</h1>
        <p className="mt-4 text-body-lg text-fg-muted">We read every application and reply within a week from business@eiger014.com.</p>
        <Link to="/verification" className={`${btnGhost} mt-8`}>
          Back to how verification works
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-10 sm:pt-16">
      <p className={EYEBROW}>Apply to review</p>
      <h1 className="mt-3 font-display text-display-md font-semibold text-fg">Help us check gear lists</h1>
      <p className="mt-4 text-body-lg text-fg-muted">
        We build gear lists for specific mountains and have mountaineers check them before they reach the app. This form takes about five
        minutes. We read every application and reply within a week to set up a short video interview.
      </p>

      <form onSubmit={submit} noValidate className="mt-10 flex flex-col gap-8">
        <Q n="1" label="Full name" required htmlFor="ap-name">
          <input id="ap-name" autoComplete="name" maxLength={120} value={f.full_name} onChange={set('full_name')} className={field} />
        </Q>
        <Q n="2" label="Email" required htmlFor="ap-email">
          <input id="ap-email" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} className={field} />
        </Q>
        <Q n="3" label="Where are you based?" hint="City and country" required htmlFor="ap-loc">
          <input id="ap-loc" maxLength={120} value={f.location} onChange={set('location')} className={field} />
        </Q>
        <Q n="4" label="Which ranges do you know best?">
          <Choice type="checkbox" name="ranges" options={[...RANGES, 'Other'].map((r) => [r, r])} value={f.ranges} onChange={toggleRange} />
          {f.ranges.includes('Other') ? (
            <input aria-label="Other range" placeholder="Which range?" maxLength={80} value={f.other_range} onChange={set('other_range')} className={field} />
          ) : null}
        </Q>
        <Q n="5" label="Three peaks you know best, with the routes you climbed and roughly when" required htmlFor="ap-peaks">
          <textarea id="ap-peaks" rows={4} maxLength={2000} value={f.peaks} onChange={set('peaks')} className={`${field} resize-y`} />
        </Q>
        <Q n="6" label="Your background" required>
          <Choice name="background" options={BACKGROUND} value={f.background} onChange={pick('background')} />
        </Q>
        <Q n="7" label="Certifications, memberships or clubs, if any" hint="For example IFMGA, AMGA, SAC, DAV, mountain rescue" htmlFor="ap-certs">
          <input id="ap-certs" maxLength={500} value={f.certifications} onChange={set('certifications')} className={field} />
        </Q>
        <Q n="8" label="Winter and glacier experience" required>
          <Choice name="winter" options={WINTER} value={f.winter_experience} onChange={pick('winter_experience')} />
        </Q>
        <Q
          n="9"
          label="Have you reviewed or written gear lists before, for a club, a guiding company or publicly?"
          hint="Tell us where"
          htmlFor="ap-prior"
        >
          <textarea id="ap-prior" rows={2} maxLength={2000} value={f.prior_reviews} onChange={set('prior_reviews')} className={`${field} resize-y`} />
        </Q>
        <Q n="10" label="What would you check first when you read a gear list for a mountain you know?" hint="This is the question we care most about" required htmlFor="ap-first">
          <textarea id="ap-first" rows={4} maxLength={2000} value={f.first_check} onChange={set('first_check')} className={`${field} resize-y`} />
        </Q>
        <Q n="11" label="How many hours a month could you give?" required>
          <Choice name="hours" options={HOURS} value={f.hours_per_month} onChange={pick('hours_per_month')} />
        </Q>
        <Q n="12" label="Anything public we can look at?" hint="Instagram, TikTok, blog, SummitPost, club page" htmlFor="ap-links">
          <input id="ap-links" maxLength={500} value={f.public_links} onChange={set('public_links')} className={field} />
        </Q>
        <Q n="13" label="Do you use the Eiger app already?" required>
          <Choice name="uses_app" options={USES_APP} value={f.uses_app} onChange={pick('uses_app')} />
        </Q>
        <Q n="14" label="Anything else we should know" htmlFor="ap-extra">
          <textarea id="ap-extra" rows={3} maxLength={2000} value={f.extra} onChange={set('extra')} className={`${field} resize-y`} />
        </Q>

        {/* Honeypot: hidden from people, tempting to bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="ap-website">Website</label>
          <input id="ap-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        {error ? (
          <p role="alert" className="flex gap-2 text-small font-medium text-fg">
            <span aria-hidden="true" className="font-mono">!</span>
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Sending' : 'Send application'}
          </button>
          <Link to="/verification" className={`${btnGhost} ${focusRing}`}>
            How verification works
          </Link>
        </div>
      </form>
    </main>
  );
}

import { useEffect, useState } from 'react';
import { Check, Clock, Hash, Minus } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import GetTheApp from '../components/home/GetTheApp';
import EmailCapture from '../components/home/EmailCapture';
import { FadeIn } from '../components/home/motion';
import { focusRing, scrollToSection } from '../components/home/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import plans from '../data/plans.json';
import { annualMonthlyEquivalent, formatUsd, savingsPercent } from '../lib/plans';

// Pricing (/pricing). Shape follows ICEFALL's pricing page (Rishav 2026-09-30),
// prices unchanged. Every table row comes from src/data/plans.json, whose first
// seven rows mirror the app's paywall verbatim; copy is logged in docs/COPY.md.
// Static on purpose: no Supabase, no fetch.

const { prices } = plans;
const ANNUAL = formatUsd(prices.annual);
const WEEKLY = formatUsd(prices.weekly);
const MONTHLY_EQUIV = annualMonthlyEquivalent(prices.annual);
const SAVE = savingsPercent(prices.annual, prices.weekly);

const eyebrow = 'font-mono text-eyebrow font-semibold uppercase text-fg-subtle';

const primaryBtn = `inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-fg px-7 text-body font-semibold text-bg transition-opacity duration-300 hover:opacity-85 ${focusRing}`;

const secondaryBtn = `inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-line-strong px-7 text-body font-semibold text-fg transition-colors duration-300 hover:border-fg/40 ${focusRing}`;

const inlineLink = `rounded-sm text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`;

const TITLE = 'Pricing | EIGER';
const DESCRIPTION = `Every mountain's gear list on EIGER is free forever. EIGER Pro is ${ANNUAL} a year with a ${prices.trialDays}-day free trial, or ${WEEKLY} a week.`;

const FREE_LINES = ['Your objective, scored', "Every mountain's gear list", 'Join group trips by code'];
const PRO_LINES = [
  'Every mountain, scored against your kit',
  'Unlimited saved kits and mountains',
  'Create group trips',
  'Offline maps, 3D terrain, 16-day forecasts, GPS',
];

// Table groups in display order: the three app groups, then free for everyone, then coming.
const TABLE_GROUPS = [
  ...plans.groups.map((g) => ({ id: g.id, label: g.label, rows: plans.appRows.filter((r) => r.group === g.id) })),
  { id: 'free', label: plans.freeForEveryone.label, rows: plans.freeForEveryone.rows },
  { id: 'soon', label: plans.soon.label, rows: plans.soon.rows },
];

// Cell states carry a word as well as an icon, so none relies on the icon alone.
const STATES = {
  Included: { Icon: Check, word: 'Included', className: 'text-fg' },
  'Not included': { Icon: Minus, word: 'Not included', className: 'text-fg-subtle' },
  soon: { Icon: Clock, word: 'Soon', className: 'text-fg-muted' },
};

function Cell({ value }) {
  const state = STATES[value];
  if (!state) return <span className="text-fg">{value}</span>;
  const { Icon, word, className } = state;
  return (
    <span className={`inline-flex items-start gap-1.5 ${className}`}>
      <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>{word}</span>
    </span>
  );
}

const LEGEND = [
  { Icon: Check, term: 'Included', text: 'on that plan today' },
  { Icon: Minus, term: 'Not included', text: 'not on that plan' },
  { Icon: Clock, term: 'Soon', text: 'in progress, never counted as included' },
];

const QUESTIONS = [
  {
    id: 'cancel',
    q: 'Can I cancel?',
    a: (
      <p className="max-w-2xl">
        Yes. Cancel any time in your App Store or Google Play subscription settings. If you cancel before the{' '}
        {prices.trialDays}-day trial ends, the trial costs nothing.
      </p>
    ),
  },
  {
    id: 'both',
    q: 'Does Pro work on both my iPhone and Android phone?',
    a: (
      <p className="max-w-2xl">
        Yes. Pro belongs to your EIGER account, not to one phone. Sign in with the same account on the other phone and
        use Restore purchases.
      </p>
    ),
  },
  {
    id: 'web',
    q: 'Can I pay on the website?',
    a: (
      <p className="max-w-2xl">
        Not yet. Billing runs through the App Store and Google Play today, so your card stays with Apple or Google.
      </p>
    ),
  },
  {
    id: 'free',
    q: 'What stays free if I never pay?',
    a: (
      <div className="max-w-2xl">
        <p>{plans.footnote} On the free plan you always get:</p>
        <ul className="mt-3 space-y-2">
          {plans.freeForEveryone.rows.map((r) => (
            <li key={r.label} className="flex items-start gap-2.5">
              <Check className="mt-1.5 size-4 shrink-0 text-fg" strokeWidth={2} aria-hidden="true" />
              <span>{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

// In-page link to the Get the app section below; the plain anchor is the fallback.
function ToApp({ className, children }) {
  return (
    <a
      href="#get-the-app"
      onClick={(event) => {
        if (scrollToSection('get-the-app')) event.preventDefault();
      }}
      className={className}
    >
      {children}
    </a>
  );
}

function CheckList({ lines }) {
  return (
    <ul className="space-y-3 text-body text-fg-muted">
      {lines.map((line) => (
        <li key={line} className="flex items-start gap-2.5">
          <Check className="mt-1 size-4 shrink-0 text-fg" strokeWidth={2} aria-hidden="true" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState('yearly');
  const yearly = billing === 'yearly';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // No head manager on this site: set the title and description while the
  // page is mounted and put the previous ones back on the way out.
  useEffect(() => {
    const prevTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute('content');
    document.title = TITLE;
    meta?.setAttribute('content', DESCRIPTION);
    return () => {
      document.title = prevTitle;
      if (meta && prevDescription != null) meta.setAttribute('content', prevDescription);
    };
  }, []);

  const toggleBtn = (active) =>
    `inline-flex h-11 items-center gap-2 rounded-pill px-5 text-small font-semibold transition-colors duration-300 ${
      active ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg'
    } ${focusRing}`;

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />

      <main>
        {/* Heading, billing toggle, the two plan cards and the trial terms */}
        <section aria-labelledby="pricing-heading" className="pt-32 pb-section-sm sm:pt-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <p className={eyebrow}>Pricing</p>
              <h1 id="pricing-heading" className="mt-3 max-w-4xl text-balance font-display text-display-lg sm:mt-4">
                Two plans. One is free forever.
              </h1>
              <p className="mt-5 max-w-2xl text-body text-fg-muted sm:mt-6 sm:text-body-lg">
                Every mountain&apos;s gear list is free and stays free, reviewed by mountaineers. Pro adds the tools that
                take real work to build and keep up to date: scoring your own kit against every mountain, saved kits, kit
                comparison, offline maps.
              </p>
            </FadeIn>

            <div className="mt-10 flex flex-col items-start gap-3">
              <div
                role="group"
                aria-label="Billing period"
                className="inline-flex rounded-pill border border-line-strong bg-surface-1 p-1"
              >
                <button
                  type="button"
                  aria-pressed={!yearly}
                  onClick={() => setBilling('weekly')}
                  className={toggleBtn(!yearly)}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  aria-pressed={yearly}
                  onClick={() => setBilling('yearly')}
                  className={toggleBtn(yearly)}
                >
                  Yearly
                  <span
                    className={`rounded-pill px-2 py-0.5 font-mono text-eyebrow font-semibold ${
                      yearly ? 'bg-bg text-fg' : 'bg-surface-3 text-fg'
                    }`}
                  >
                    Save {SAVE}%
                  </span>
                </button>
              </div>
              <p className="font-mono text-small text-fg-subtle">
                Billed through the App Store or Google Play. We never see your card.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <article className="flex h-full flex-col rounded-lg border border-line bg-surface-1 p-6 sm:p-8">
                <h2 className="text-heading">Free</h2>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-5xl leading-none font-bold">{formatUsd(0)}</span>
                  <span className="text-body text-fg-muted">forever</span>
                </p>
                <div className="my-6 h-px bg-line" aria-hidden="true" />
                <CheckList lines={FREE_LINES} />
                <div className="mt-auto pt-8">
                  <ToApp className={secondaryBtn}>Get the app</ToApp>
                </div>
              </article>

              <article className="flex h-full flex-col rounded-lg border border-fg/40 bg-surface-2 p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-heading">EIGER Pro</h2>
                  <span className="rounded-pill bg-fg px-3 py-1 font-mono text-eyebrow font-semibold uppercase text-bg">
                    Recommended
                  </span>
                </div>
                <div aria-live="polite">
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="font-display text-5xl leading-none font-bold">{yearly ? ANNUAL : WEEKLY}</span>
                    <span className="text-body text-fg-muted">{yearly ? 'a year' : 'a week'}</span>
                  </p>
                  <p className="mt-3 text-small text-fg-muted">
                    {yearly
                      ? `That is $${MONTHLY_EQUIV} a month. ${prices.trialDays} days free first.`
                      : 'No trial on weekly. Cancel any time.'}
                  </p>
                </div>
                <div className="my-6 h-px bg-line-strong" aria-hidden="true" />
                <CheckList lines={PRO_LINES} />
                <div className="mt-auto pt-8">
                  <ToApp className={primaryBtn}>
                    {yearly ? `Start ${prices.trialDays}-day free trial` : 'Get EIGER Pro'}
                  </ToApp>
                </div>
              </article>
            </div>

            {/* Trial honesty */}
            <FadeIn className="mt-4 rounded-lg border border-line-strong p-6 sm:p-8">
              <h2 className="text-heading">How the trial works</h2>
              <ul className="mt-4 space-y-2 text-body text-fg-muted">
                <li>
                  {prices.trialDays} days free on the yearly plan, then {ANNUAL} a year.
                </li>
                <li>Cancel in one tap in your App Store or Google Play settings, any time, including during the trial.</li>
                <li>We remind you 48 and 24 hours before the trial ends.</li>
              </ul>
            </FadeIn>
          </div>
        </section>

        {/* Compare table */}
        <section id="compare" aria-labelledby="compare-heading" className="scroll-mt-16 border-t border-line py-section-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <p className={eyebrow}>Compare</p>
              <h2 id="compare-heading" className="mt-3 font-display text-display-md">
                Every feature, side by side.
              </h2>
              <p className="mt-4 text-body text-fg-muted sm:text-body-lg">The same list the app shows on its paywall.</p>
            </FadeIn>

            {/* Fixed layout fits 360 px; the wrapper scrolls on its own if a row ever outgrows it. */}
            <div className="mt-10 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[320px] table-fixed border-collapse text-left text-small sm:text-body">
                <caption className="sr-only">EIGER Free and EIGER Pro, feature by feature</caption>
                <colgroup>
                  <col className="w-[44%] sm:w-1/2" />
                  <col className="w-[28%] sm:w-1/4" />
                  <col className="w-[28%] sm:w-1/4" />
                </colgroup>
                <thead className="bg-surface-2">
                  <tr>
                    <th scope="col" className="px-3 py-3 font-mono text-eyebrow font-semibold uppercase text-fg-subtle sm:px-5">
                      Feature
                    </th>
                    <th scope="col" className="px-3 py-3 font-mono text-eyebrow font-semibold uppercase text-fg-subtle sm:px-5">
                      Free
                    </th>
                    <th scope="col" className="px-3 py-3 font-mono text-eyebrow font-semibold uppercase text-fg sm:px-5">
                      Pro
                    </th>
                  </tr>
                </thead>
                {TABLE_GROUPS.map((group) => (
                  <tbody key={group.id}>
                    <tr className="border-t border-line-strong bg-surface-1">
                      <th
                        scope="rowgroup"
                        colSpan={3}
                        className="px-3 pt-5 pb-2 font-mono text-eyebrow font-semibold uppercase text-fg-subtle sm:px-5"
                      >
                        {group.label}
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.label} className="border-t border-line align-top">
                        <th scope="row" className="px-3 py-4 font-normal break-words text-fg-muted sm:px-5">
                          {row.label}
                        </th>
                        <td className="px-3 py-4 break-words sm:px-5">
                          <Cell value={row.free} />
                        </td>
                        <td className="px-3 py-4 break-words sm:px-5">
                          <Cell value={row.pro} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>

            <ul aria-label="Legend" className="mt-6 grid gap-2 text-small text-fg-muted sm:grid-cols-2">
              {LEGEND.map((item) => {
                const { Icon, term, text } = item;
                return (
                  <li key={term} className="flex items-start gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-fg" strokeWidth={2} aria-hidden="true" />
                    <span>
                      <strong className="font-semibold text-fg">{term}:</strong> {text}
                    </span>
                  </li>
                );
              })}
              <li className="flex items-start gap-2">
                <Hash className="mt-0.5 size-4 shrink-0 text-fg" strokeWidth={2} aria-hidden="true" />
                <span>Numbers are the real limits the app enforces</span>
              </li>
            </ul>
            <p className="mt-6 text-small text-fg-subtle">{plans.footnote}</p>
          </div>
        </section>

        {/* FAQ: same accordion and classes as the home Questions section */}
        <section id="pricing-faq" aria-labelledby="pricing-faq-heading" className="scroll-mt-16 border-t border-line py-section-sm">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:px-8">
            <FadeIn>
              <h2 id="pricing-faq-heading" className="font-display text-display-md">
                Questions
              </h2>
            </FadeIn>
            <div>
              <Accordion type="single" collapsible className="border-t border-line">
                {QUESTIONS.map(({ id, q, a }) => (
                  <AccordionItem key={id} value={id} className="border-b border-line">
                    <AccordionTrigger className="items-center py-6 font-display text-heading text-fg hover:no-underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg **:data-[slot=accordion-trigger-icon]:size-5">
                      {q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 text-body-lg text-fg-muted">{a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <p className="mt-8 text-body text-fg-muted">
                Anything else? Write to{' '}
                <a href="mailto:support@eiger014.com" className={inlineLink}>
                  support@eiger014.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        <GetTheApp />
        <EmailCapture />
      </main>

      <Footer />
    </div>
  );
}

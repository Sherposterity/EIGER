import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import applyLinks from '@/data/apply-links.json';
import { focusRing } from '@/components/home/utils';
import { scrollToElement } from './scrollToElement';

// "Apply to verify" call to action at the foot of the Verification page.
// We need more mountaineers reviewing gear lists, so the page that explains
// the pipeline is also where people volunteer for it. The application itself
// is a Google Form (URL in src/data/apply-links.json); until that URL exists
// the button emails business@ instead, so the section is useful from day one.
// Copy is user-facing: no dashes.

const WHO = [
  'Guided, instructed or climbed seriously in the Alps, the Rockies, the Cascades or the Sierra.',
  'Comfortable saying "this list is wrong" and explaining why, in writing.',
  'A few hours a month, on an ongoing basis. New mountains and new gear keep arriving, so this is continuous work rather than a one off review. We are an early stage startup: reviewing starts as a credited volunteer role, and paid positions open as we grow.',
];

export default function ApplyToVerify() {
  const form = applyLinks.verifier_form;
  const email = applyLinks.verifier_email;
  const subject = encodeURIComponent('Verifier application');
  const body = encodeURIComponent(
    'Name:\nWhere you climb or guide:\nCertifications (if any):\nThree peaks you know best:\nWhy you want to review gear lists:\n',
  );
  const mailto = `mailto:${email}?subject=${subject}&body=${body}`;

  // mailto is dead on desktop webmail, so the address is always visible with a
  // copy button beside it (same pattern as the footer contact).
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable; the address is visible, so manual copy still works.
    }
  };

  // /verification?section=apply (linked from the home page) lands on this card.
  const { search } = useLocation();
  const sectionRef = useRef(null);
  useEffect(() => {
    if (new URLSearchParams(search).get('section') !== 'apply') return undefined;
    // The page scrolls to the top on mount first; wait a beat, then glide down.
    const t = setTimeout(() => scrollToElement(sectionRef.current), 120);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <section
      ref={sectionRef}
      id="apply"
      aria-labelledby="apply-heading"
      className="scroll-mt-16 border-t border-line bg-surface-2 py-section"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <div>
            <p className="font-mono text-eyebrow uppercase text-fg-subtle">Join the review</p>
            <h2 id="apply-heading" className="mt-4 text-display-md text-balance text-fg">
              Are you a mountaineer? Help us verify.
            </h2>
            <p className="mt-5 max-w-prose text-body-lg text-fg-muted">
              Every list above was checked by people who have stood on those summits. We are growing the catalog faster
              than our current reviewers can keep up with, so we are looking for more mountaineers and guides to join
              the verification step. Apply, and we will set up a short interview.
            </p>
            <ul className="mt-6 max-w-prose space-y-3 text-body text-fg-muted">
              {WHO.map((line) => (
                <li key={line} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-fg-subtle" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-4 rounded-lg border border-line bg-bg p-6 lg:p-8">
            <p className="text-heading text-fg">Apply to verify</p>
            <p className="text-body text-fg-muted">
              {form
                ? 'The application takes about five minutes. We read every one and reply within a week.'
                : 'Send us a short note about where you climb and which peaks you know best. We reply within a week.'}
            </p>
            {form ? (
              <a
                href={form}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-fg px-7 text-body font-semibold text-bg transition-colors hover:bg-fg/85 ${focusRing}`}
              >
                Open the application
                <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={2} />
              </a>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-small font-medium text-fg">Email your application to</p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={mailto}
                    className={`rounded-sm font-mono text-body text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`}
                  >
                    {email}
                  </a>
                  <button
                    type="button"
                    onClick={copyEmail}
                    aria-label="Copy email address"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-pill border border-line-strong px-3 font-mono text-small text-fg-muted transition-colors hover:border-fg/40 hover:text-fg ${focusRing}`}
                  >
                    {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="sr-only" aria-live="polite">
                  {copied ? 'Copied' : ''}
                </span>
              </div>
            )}
            <p className="font-mono text-small text-fg-subtle">
              We explain what the work involves in the interview before you commit to anything.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

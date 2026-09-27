import { ArrowUpRight, Mail } from 'lucide-react';
import applyLinks from '@/data/apply-links.json';
import { focusRing } from '@/components/home/utils';

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
  const href = form || `mailto:${email}?subject=${subject}&body=${body}`;

  return (
    <section
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
            <a
              href={href}
              target={form ? '_blank' : undefined}
              rel={form ? 'noopener noreferrer' : undefined}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-fg px-7 text-body font-semibold text-bg transition-colors hover:bg-fg/85 ${focusRing}`}
            >
              {form ? 'Open the application' : 'Email your application'}
              {form ? (
                <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={2} />
              ) : (
                <Mail aria-hidden="true" className="size-4" strokeWidth={2} />
              )}
            </a>
            <p className="font-mono text-small text-fg-subtle">
              We explain what the work involves in the interview before you commit to anything.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

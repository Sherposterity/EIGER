import { ArrowUpRight } from 'lucide-react';
import reviewerFile from '@/data/reviewers.json';
import { visibleReviewers } from '@/lib/reviewers';
import { focusRing } from '@/components/home/utils';
import { FadeIn } from '@/components/home/motion';

// "Verified by" strip: the named mountaineers who check every gear list, as
// pills that wrap at any width. Used on the home page (under the Brand Athlete
// section) and on /verification (above Apply to verify). Static: the list is
// src/data/reviewers.json, and a name shows only after that person consents.
// Copy in docs/COPY.md. No dashes in user-facing copy.

const REVIEWERS = visibleReviewers(reviewerFile.reviewers);

export default function VerifiedBy() {
  if (REVIEWERS.length === 0) return null;

  return (
    <section aria-labelledby="verified-by-heading" className="border-t border-line bg-bg px-4 py-12 sm:px-gutter">
      <FadeIn className="mx-auto max-w-6xl">
        <h2 id="verified-by-heading" className="font-mono text-eyebrow font-semibold uppercase text-fg-subtle">
          Verified by
        </h2>

        <ul className="mt-5 flex flex-wrap gap-3">
          {REVIEWERS.map((r) => (
            <li
              key={r.name}
              className="flex min-w-0 max-w-full flex-col gap-0.5 rounded-lg border border-line bg-surface-1 px-4 py-3"
            >
              <span className="text-body font-semibold text-fg">{r.name}</span>
              {r.role && <span className="text-small text-fg-muted">{r.role}</span>}
              {r.handle && r.handleUrl && (
                <a
                  href={r.handleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-1 inline-flex w-fit max-w-full items-center gap-1 break-all rounded-sm font-mono text-small text-fg-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg ${focusRing}`}
                >
                  {r.handle}
                  <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-prose text-body text-fg-muted">
          Every gear list in EIGER is checked by a mountaineer before it ships. Reviewers are credited on the
          mountains they verify.
        </p>
      </FadeIn>
    </section>
  );
}

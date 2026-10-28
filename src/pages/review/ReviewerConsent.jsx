import { useState } from 'react';
import { setReviewerConsent } from '@/lib/reviewApi';
import { CONSENT_OPTIONS, EYEBROW, focusRing, surface } from './reviewStyles';

// The signed-in reviewer's two opt-ins (Muad 2026-10-28, hike migration 180).
// Both start off. Climbers in the app see a reviewer's tier and review date
// either way; the name, ranges and certifications only after the first
// toggle. The email reaches other reviewers only after the second, never
// climbers.

function Switch({ id, on, busy, onToggle, labelledBy, describedBy }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={busy}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border transition-colors disabled:opacity-50 ${focusRing} ${
        on ? 'border-fg bg-fg' : 'border-line-strong bg-surface-2'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-4 rounded-full transition-transform ${on ? 'translate-x-6 bg-bg' : 'translate-x-1 bg-fg-subtle'}`}
      />
    </button>
  );
}

export default function ReviewerConsent({ me, updateMe, toast }) {
  const [busyKey, setBusyKey] = useState(null);
  const current = { show_credentials: me?.show_credentials === true, share_contact: me?.share_contact === true };

  const toggle = async (key) => {
    const next = { ...current, [key]: !current[key] };
    setBusyKey(key);
    try {
      await setReviewerConsent(next.show_credentials, next.share_contact);
      updateMe?.(next);
      toast?.(next[key] ? 'Saved. Thank you for sharing.' : 'Saved. It is private again.', 'success');
    } catch (e) {
      toast?.(e.message);
    }
    setBusyKey(null);
  };

  return (
    <section aria-labelledby="rv-consent-title" className={`${surface} mt-8 p-5`}>
      <p id="rv-consent-title" className={EYEBROW}>
        What others see
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {CONSENT_OPTIONS.map(({ key, label, hint }) => (
          <li key={key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p id={`rv-consent-${key}-label`} className="text-body text-fg">
                {label}
              </p>
              <p id={`rv-consent-${key}-hint`} className="mt-1 text-small text-fg-subtle">
                {hint}
              </p>
            </div>
            <Switch
              id={`rv-consent-${key}`}
              on={current[key]}
              busy={busyKey !== null}
              onToggle={() => toggle(key)}
              labelledBy={`rv-consent-${key}-label`}
              describedBy={`rv-consent-${key}-hint`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

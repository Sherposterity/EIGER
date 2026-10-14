import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { focusRing } from './utils';

// One-line note above the walkthrough screens (Rishav 2026-10-14): the app's
// UI got a cleaner look through the October updates and the screenshots on
// this page still show the previous version. Dismissal lasts for the browser
// session, like the store strip. Remove the note (and this file) once the
// Walkthrough images are replaced. Monochrome, nothing animates. No dashes.

const DISMISS_KEY = 'eiger_ui_refresh_note_dismissed';

const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const UiRefreshNote = () => {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode or blocked storage: the note just comes back next visit.
    }
    setDismissed(true);
  };

  return (
    <div
      role="note"
      className="mt-8 flex items-start gap-3 rounded-lg border border-line-strong bg-bg/50 py-3 pr-2 pl-4 text-sm text-fg-muted backdrop-blur-md sm:items-center"
    >
      <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg sm:mt-0" strokeWidth={1.75} />
      <p className="flex-1 text-pretty">
        <span className="font-semibold text-fg">The app just got a cleaner look.</span>{' '}
        These screens show the previous version, new ones are coming soon.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss this note"
        className={`-m-1 shrink-0 rounded-sm p-1 text-fg-subtle transition-colors hover:text-fg ${focusRing}`}
      >
        <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
};

export default UiRefreshNote;

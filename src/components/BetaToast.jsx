import { useEffect, useState } from 'react';

const STORAGE_KEY = 'eiger-beta-toast-dismissed';
const SHOW_DELAY_MS = 1200;

const scrollToPlatforms = () => {
  const section = document.getElementById('platforms');
  if (!section) return;
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// Small welcome toast shown once per browser session on the home page:
// tells first-time visitors the public beta is live and jumps them to the
// TestFlight / Play badges in the Platforms section.
const BetaToast = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      dismissed = false;
    }
    if (dismissed) return undefined;

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Private mode or storage disabled: just hide it for this page view.
    }
  };

  const handleCta = () => {
    dismiss();
    scrollToPlatforms();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4 pointer-events-none transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div
        className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/15 bg-[#0A0A0A]/90 px-4 py-3 shadow-2xl backdrop-blur-md sm:w-auto sm:max-w-none ${
          visible ? '' : 'invisible'
        }`}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>

        <p className="text-sm text-white/90 leading-snug">
          <span className="font-semibold text-white">Public beta is live.</span>{' '}
          <span className="text-white/60">Free on iOS and Android.</span>
        </p>

        <button
          type="button"
          onClick={handleCta}
          className="ml-1 shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90"
        >
          Get the app
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="ml-1 shrink-0 rounded-full p-1 text-white/50 transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BetaToast;

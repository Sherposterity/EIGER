import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const CONTACT_EMAIL = 'business@eiger014.com';

const Footer = () => {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the address is visible, so manual copy still works.
    }
  };

  return (
    <footer className="relative border-t border-white/5 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold tracking-tight text-white">
              EIGER<sup className="text-sm align-super opacity-60">&trade;</sup>
            </span>
            <span className="text-sm text-white/30">&copy; 2026</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-base text-white/30">
              Your mountain. Your gear. One app.
            </p>
            <div className="flex items-center gap-5 text-xs uppercase tracking-[0.24em] text-white/30">
              <Link to="/mission" className="transition-colors duration-300 hover:text-white/60">
                Mission
              </Link>
              <Link to="/about" className="transition-colors duration-300 hover:text-white/60">
                About Us
              </Link>
              {/* mailto works where a mail app exists (phones, configured
                  desktops); the copy button covers desktop webmail users. */}
              <span className="flex items-center gap-1.5 normal-case tracking-normal">
                <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors duration-300 hover:text-white/60">
                  {CONTACT_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={copyEmail}
                  aria-label="Copy email address"
                  className="transition-colors duration-300 hover:text-white/60"
                >
                  {copied ? (
                    <span className="text-emerald-400">Copied!</span>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="https://www.tiktok.com/@eiger_tech"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/5 p-2 text-white/40 transition-all duration-300 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.3z" />
              </svg>
            </a>

            <a
              href="https://www.instagram.com/eiger014"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/5 p-2 text-white/40 transition-all duration-300 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Legal */}
        <div className="mt-10 flex items-center justify-center gap-4 text-sm">
          <a href="/privacy.html" className="text-white/30 transition-colors duration-300 hover:text-white/60">Privacy Policy</a>
          <span className="text-white/20">&middot;</span>
          <a href="/terms.html" className="text-white/30 transition-colors duration-300 hover:text-white/60">Terms of Use</a>
          <span className="text-white/20">&middot;</span>
          <a href="/delete-account.html" className="text-white/30 transition-colors duration-300 hover:text-white/60">Delete Account</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

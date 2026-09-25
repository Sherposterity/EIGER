import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import lockup from '../assets/logo/lockup.svg';

const CONTACT_EMAIL = 'support@eiger014.com';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const linkClass = `rounded-sm text-small text-fg-muted transition-colors duration-300 hover:text-fg ${focusRing}`;

const legalLinkClass = `rounded-sm text-small text-fg-subtle transition-colors duration-300 hover:text-fg ${focusRing}`;

const SITE_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/verification', label: 'Verification process' },
  { to: '/giveaway', label: 'Giveaway' },
  { to: '/kickstarter', label: 'Kickstarter' },
];

const LEGAL_LINKS = [
  { href: '/privacy.html', label: 'Privacy Policy' },
  { href: '/terms.html', label: 'Terms of Use' },
  { href: '/delete-account.html', label: 'Delete Account' },
  { href: '/support.html', label: 'Support' },
];

const SOCIAL = [
  {
    href: 'https://www.tiktok.com/@eiger_tech',
    label: 'EIGER on TikTok',
    path: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.3z',
  },
  {
    href: 'https://www.instagram.com/eiger014',
    label: 'EIGER on Instagram',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  },
];

// Site footer: lockup and tagline, site links, contact and socials, legal row.
// The lockup SVG is drawn in currentColor (black when loaded through <img>),
// so it is inverted to white here; loading it as an image keeps its 42 KB out
// of the JavaScript bundle.
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
      // Clipboard API unavailable; the address is visible, so manual copy still works.
    }
  };

  return (
    <footer className="border-t border-line bg-bg pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="flex flex-col items-start gap-5">
            <Link to="/" aria-label="EIGER home" className={`rounded-sm ${focusRing}`}>
              <img src={lockup} alt="" width="118" height="80" loading="lazy" className="h-20 w-auto invert" />
            </Link>
            <p className="max-w-xs text-body text-fg-muted">Reduce your prep time from hours to minutes.</p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-col gap-3">
              {SITE_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4">
            {/* mailto works where a mail app exists; the copy button covers
                desktop webmail users. */}
            <div className="flex items-center gap-2">
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>
              <button
                type="button"
                onClick={copyEmail}
                aria-label="Copy email address"
                className={`inline-flex size-8 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:text-fg ${focusRing}`}
              >
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              </button>
              <span className="sr-only" aria-live="polite">
                {copied ? 'Copied!' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {SOCIAL.map(({ href, label, path }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`inline-flex size-10 items-center justify-center rounded-pill border border-line text-fg-muted transition-colors duration-300 hover:border-line-strong hover:text-fg ${focusRing}`}
                >
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-eyebrow text-fg-subtle">&copy; 2026</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a href={href} className={legalLinkClass}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { useEffect, useRef, useState } from 'react';
import mark from '../assets/logo/mark.svg';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// In-page sections live on Home only. From any other route the link goes to
// /?section=<id> and Home's ?section= handler does the scroll.
const scrollToHomeSection = (id) => {
  const section = document.getElementById(id);
  if (!section) return false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  return true;
};

// `section` marks an anchor on the home page; the rest are routes. "How it
// works" left the nav on 2026-09-25 (founder); the hero button and
// /?section=how-it-works still reach it.
const NAV_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/verification', label: 'Verification process' },
  { to: '/giveaway', label: 'Giveaway' },
  { to: '/kickstarter', label: 'Kickstarter' },
];

// Shared focus ring: every link and button in the nav shows it on keyboard focus.
const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const linkClass = `rounded-sm text-eyebrow font-semibold uppercase text-fg-muted transition-colors duration-300 hover:text-fg ${focusRing}`;

const ctaClass = `h-10 rounded-pill px-5 text-eyebrow font-semibold uppercase ${focusRing}`;

// Fixed top navigation: wordmark left, links and the store CTA right. Transparent
// over the hero video, gains a blurred backdrop once the page scrolls so the
// links stay readable. From lg (1024 px) all five items fit on one row (checked
// 2026-09-25, over 150 px to spare at 1024); below lg they move into a sheet.
const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Set when "Get the app" is tapped inside the sheet: the scroll waits until
  // the sheet has closed and released its scroll lock.
  const pendingGetApp = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll when the section is on this page, otherwise go home and let the
  // ?section= handler scroll there.
  const goToSection = (id) => {
    if (location.pathname === '/' && scrollToHomeSection(id)) return;
    navigate(`/?section=${id}`);
  };
  const getTheApp = () => goToSection('get-the-app');
  // A section link inside the sheet waits, like "Get the app", until the
  // sheet has closed and released its scroll lock.
  const pendingSection = useRef(null);

  const onSectionClick = (id) => (event) => {
    event.preventDefault();
    goToSection(id);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? 'border-line bg-bg/80 backdrop-blur-md' : 'border-transparent bg-transparent'
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
      >
        <Link to="/" aria-label="EIGER home" className={`flex items-center gap-2.5 rounded-sm ${focusRing}`}>
          {/* Mark (currentColor SVG, inverted to white as an <img> like the footer) beside the wordmark. */}
          <img src={mark} alt="" width="20" height="36" className="h-9 w-auto invert" />
          <span className="font-display text-2xl leading-none font-bold tracking-[0.08em] text-fg">EIGER</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map(({ to, section, label }) => (
            <Link
              key={to}
              to={to}
              onClick={section ? onSectionClick(section) : undefined}
              className={linkClass}
            >
              {label}
            </Link>
          ))}
          <Button type="button" onClick={getTheApp} className={ctaClass}>
            Get the app
          </Button>
        </div>

        {/* Phone */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className={`-mr-2 inline-flex size-11 items-center justify-center rounded-md text-fg lg:hidden ${focusRing}`}
            >
              <Menu className="size-6" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-xs border-line bg-surface-1 px-6 pt-20 pb-8 lg:hidden"
            onCloseAutoFocus={() => {
              if (pendingSection.current) {
                const id = pendingSection.current;
                pendingSection.current = null;
                goToSection(id);
                return;
              }
              if (!pendingGetApp.current) return;
              pendingGetApp.current = false;
              getTheApp();
            }}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
            <ul className="flex flex-col gap-2">
              {NAV_LINKS.map(({ to, section, label }) => (
                <li key={to}>
                  <SheetClose asChild>
                    <Link
                      to={to}
                      onClick={
                        section
                          ? (event) => {
                              // Radix skips its own close when the click is
                              // default-prevented, so close the sheet here.
                              event.preventDefault();
                              pendingSection.current = section;
                              setMenuOpen(false);
                            }
                          : undefined
                      }
                      className={`block py-3 ${linkClass}`}
                    >
                      {label}
                    </Link>
                  </SheetClose>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              onClick={() => {
                pendingGetApp.current = true;
                setMenuOpen(false);
              }}
              className={`mt-6 w-full ${ctaClass}`}
            >
              Get the app
            </Button>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
};

export default SiteNav;

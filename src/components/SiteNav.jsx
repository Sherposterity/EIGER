import { useEffect, useRef, useState } from 'react';
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

// Public beta is live: the nav CTA sends people to the store links, not the waitlist.
// The Platforms section only exists on the home page; from any other route the
// button goes home first and lets Home's ?section= handler do the scroll.
const scrollToPlatforms = () => {
  const section = document.getElementById('platforms');
  if (!section) return false;
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
};

const NAV_LINKS = [
  { to: '/mission', label: 'Our Mission' },
  { to: '/about', label: 'About Us' },
  { to: '/giveaway', label: 'Giveaway' },
];

// Shared focus ring: every link and button in the nav shows it on keyboard focus.
const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-line-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const linkClass = `rounded-sm text-eyebrow font-semibold uppercase text-fg-muted transition-colors duration-300 hover:text-fg ${focusRing}`;

const ctaClass = `h-10 rounded-pill px-5 text-eyebrow font-semibold uppercase ${focusRing}`;

// Fixed top navigation: wordmark left, links and the store CTA right. Transparent
// over the hero video, gains a blurred backdrop once the page scrolls so the
// links stay readable. Below md the links move into a sheet from the right.
const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Set when "Get the app" is tapped inside the sheet: the scroll waits until
  // the sheet has closed and released its scroll lock.
  const pendingGetApp = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getTheApp = () => {
    if (location.pathname === '/' && scrollToPlatforms()) return;
    navigate('/?section=platforms');
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
        <Link
          to="/"
          aria-label="EIGER home"
          className={`rounded-sm font-display text-2xl leading-none font-bold tracking-[0.08em] text-fg ${focusRing}`}
        >
          EIGER
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className={linkClass}>
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
              className={`-mr-2 inline-flex size-11 items-center justify-center rounded-md text-fg md:hidden ${focusRing}`}
            >
              <Menu className="size-6" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-xs border-line bg-surface-1 px-6 pt-20 pb-8 md:hidden"
            onCloseAutoFocus={() => {
              if (!pendingGetApp.current) return;
              pendingGetApp.current = false;
              getTheApp();
            }}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
            <ul className="flex flex-col gap-2">
              {NAV_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <SheetClose asChild>
                    <Link to={to} className={`block py-3 ${linkClass}`}>
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

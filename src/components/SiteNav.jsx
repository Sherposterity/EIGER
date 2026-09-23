import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Public beta is live: the nav CTA sends people to the store links, not the waitlist.
// The Platforms section only exists on the home page; from any other route the
// button goes home first and lets Home's ?section= handler do the scroll.
const scrollToPlatforms = () => {
  const section = document.getElementById('platforms');
  if (!section) return false;
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
};

// Fixed top navigation for the home page: keeps Our Mission / About Us
// discoverable without scrolling. Transparent over the hero video, gains a
// blurred backdrop once the page scrolls so the links stay readable.
const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);
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
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-end px-6 py-4 lg:px-8">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            to="/mission"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition-colors duration-300 hover:text-white"
          >
            Our Mission
          </Link>
          <Link
            to="/about"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition-colors duration-300 hover:text-white"
          >
            About Us
          </Link>
          <Link
            to="/giveaway"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition-colors duration-300 hover:text-white"
          >
            Giveaway
          </Link>
          <button
            type="button"
            onClick={getTheApp}
            className="hidden rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-white/40 hover:bg-white/10 sm:inline-block"
          >
            Get the app
          </button>
        </div>
      </nav>
    </header>
  );
};

export default SiteNav;

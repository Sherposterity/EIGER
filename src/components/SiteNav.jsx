import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EigerLogo from '../assets/EigerLogo.png';

const scrollToWaitlist = () => {
  const section = document.getElementById('waitlist');
  if (!section) return;
  // Aim for the email input so the form lands in view, not just the section heading.
  const target = section.querySelector('input[type="email"]') || section;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// Fixed top navigation for the home page: keeps Our Mission / About Us
// discoverable without scrolling. Transparent over the hero video, gains a
// blurred backdrop once the page scrolls so the links stay readable.
const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);

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
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link to="/" className="transition-opacity duration-300 hover:opacity-80" aria-label="EIGER home">
          <img src={EigerLogo} alt="EIGER" className="h-9 w-auto object-contain" />
        </Link>

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
          <button
            type="button"
            onClick={scrollToWaitlist}
            className="hidden rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-white/40 hover:bg-white/10 sm:inline-block"
          >
            Waitlist
          </button>
        </div>
      </nav>
    </header>
  );
};

export default SiteNav;

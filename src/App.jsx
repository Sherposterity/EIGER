import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Hero from './components/Hero';
import SiteNav from './components/SiteNav';
import LaunchBanner from './components/home/LaunchBanner';
import Walkthrough from './components/home/Walkthrough';
import TryIt from './components/home/TryIt';
import WhyEiger from './components/home/WhyEiger';
import Athlete from './components/Athlete';
import GetTheApp from './components/home/GetTheApp';
import EmailCapture from './components/home/EmailCapture';
import Faq from './components/home/Faq';
import Footer from './components/Footer';
import AscentLine from './components/AscentLine';
import { MISSION_REDIRECT } from './lib/routes';

// Mission and About are split out of the home bundle so the landing page
// ships less JavaScript; they load on first navigation.
const MissionPage = lazy(() => import('./pages/MissionPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const GiveawayPage = lazy(() => import('./pages/GiveawayPage'));
const GiveawayRulesPage = lazy(() => import('./pages/GiveawayRulesPage'));
const VerificationPage = lazy(() => import('./pages/VerificationPage'));

// Old home anchors that may still be linked from outside (bios, emails).
const LEGACY_SECTIONS = { platforms: 'get-the-app', waitlist: 'updates' };

function Home() {
  const location = useLocation();

  useEffect(() => {
    // /?section=get-the-app (from other routes) or a plain /#get-the-app link.
    const requested =
      new URLSearchParams(location.search).get('section') ||
      decodeURIComponent(location.hash.replace(/^#/, ''));
    const targetSection = LEGACY_SECTIONS[requested] || requested;

    if (!targetSection) {
      return;
    }

    // The hero video, lazy images and reveal animations keep shifting layout
    // for a moment after mount, so a single scrollIntoView lands short. Scroll
    // once, then re-check a few times and nudge if the target drifted.
    const timers = [];
    let first = true;
    const scrollToSection = () => {
      const node = document.getElementById(targetSection);
      if (!node) return;
      // Sections set scroll-margin-top to clear the fixed nav; measure against it.
      const margin = parseFloat(getComputedStyle(node).scrollMarginTop) || 0;
      const offset = node.getBoundingClientRect().top - margin;
      if (first || Math.abs(offset) > 40) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        node.scrollIntoView({ behavior: first && !reduce ? 'smooth' : 'auto', block: 'start' });
      }
      first = false;
    };

    const raf = requestAnimationFrame(scrollToSection);
    [400, 900, 1600, 2600].forEach((ms) => timers.push(setTimeout(scrollToSection, ms)));

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [location.search, location.hash]);

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <SiteNav />
      <LaunchBanner />
      {/* Signature motif: the Rainier DC route profile as the page's scroll progress. Home only, desktop only. */}
      <AscentLine />
      <main>
        <Hero />
        <Walkthrough />
        <TryIt />
        <WhyEiger />
        <Athlete />
        <GetTheApp />
        <EmailCapture />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}

// Unknown paths get a real not-found page instead of silently showing Home.
// Placeholder copy; the founder will replace it.
function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0A0A] px-6 text-center text-white">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-white/60">This page does not exist.</p>
      <Link to="/" className="underline underline-offset-4 hover:text-white/60">Go to the home page</Link>
    </div>
  );
}

// Used only when MISSION_REDIRECT is flipped on: keeps the query string.
function MissionRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/about', search }} replace />;
}

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mission" element={MISSION_REDIRECT ? <MissionRedirect /> : <MissionPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        <Route path="/giveaway" element={<GiveawayPage />} />
        <Route path="/giveaway/rules" element={<GiveawayRulesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;

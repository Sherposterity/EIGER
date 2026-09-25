import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Hero from './components/Hero';
import SiteNav from './components/SiteNav';
import Features from './components/Features';
import Athlete from './components/Athlete';
import MissionBanner from './components/MissionBanner';
import Platforms from './components/Platforms';
import BetaToast from './components/BetaToast';
import Waitlist from './components/Waitlist';
import Footer from './components/Footer';
import { MISSION_REDIRECT } from './lib/routes';

// Mission and About are split out of the home bundle so the landing page
// ships less JavaScript; they load on first navigation.
const MissionPage = lazy(() => import('./pages/MissionPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const GiveawayPage = lazy(() => import('./pages/GiveawayPage'));
const GiveawayRulesPage = lazy(() => import('./pages/GiveawayRulesPage'));

function Home() {
  const location = useLocation();

  useEffect(() => {
    const targetSection = new URLSearchParams(location.search).get('section');

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
      const offset = node.getBoundingClientRect().top;
      if (first || Math.abs(offset) > 40) {
        node.scrollIntoView({ behavior: first ? 'smooth' : 'auto', block: 'start' });
      }
      first = false;
    };

    const raf = requestAnimationFrame(scrollToSection);
    [400, 900, 1600, 2600].forEach((ms) => timers.push(setTimeout(scrollToSection, ms)));

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [location.search]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <SiteNav />
      <Hero />
      <Features />
      <Athlete />
      <MissionBanner />
      <Waitlist />
      <Platforms />
      <Footer />
      <BetaToast />
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
        <Route path="/giveaway" element={<GiveawayPage />} />
        <Route path="/giveaway/rules" element={<GiveawayRulesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;

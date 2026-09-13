import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Hero from './components/Hero';
import SiteNav from './components/SiteNav';
import Features from './components/Features';
import MissionBanner from './components/MissionBanner';
import Platforms from './components/Platforms';
import BetaToast from './components/BetaToast';
import Waitlist from './components/Waitlist';
import Footer from './components/Footer';

// Mission and About are split out of the home bundle so the landing page
// ships less JavaScript; they load on first navigation.
const MissionPage = lazy(() => import('./pages/MissionPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

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
      <MissionBanner />
      <Waitlist />
      <Platforms />
      <Footer />
      <BetaToast />
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mission" element={<MissionPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Suspense>
  );
}

export default App;

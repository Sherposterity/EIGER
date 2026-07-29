import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Hero from './components/Hero';
import Features from './components/Features';
import MissionBanner from './components/MissionBanner';
import Platforms from './components/Platforms';
import Waitlist from './components/Waitlist';
import Footer from './components/Footer';
import MissionPage from './pages/MissionPage';
import AboutPage from './pages/AboutPage';

function Home() {
  const location = useLocation();

  useEffect(() => {
    const targetSection = new URLSearchParams(location.search).get('section');

    if (!targetSection) {
      return;
    }

    const scrollToSection = () => {
      document.getElementById(targetSection)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    };

    requestAnimationFrame(scrollToSection);
  }, [location.search]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Hero />
      <Features />
      <MissionBanner />
      <Waitlist />
      <Platforms />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/mission" element={<MissionPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  );
}

export default App;

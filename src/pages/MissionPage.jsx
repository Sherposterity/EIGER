import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import Waitlist from '../components/Waitlist';
import useMouseParallax from '../lib/useMouseParallax';
import EigerLogo from '../assets/EigerLogo.png';

const scrollToWaitlist = () => {
  const section = document.getElementById('waitlist');
  if (!section) return;
  // Aim for the email input so the form lands in view, not just the section heading.
  const target = section.querySelector('input[type="email"]') || section;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const pillars = [
  {
    title: 'Climb Smarter',
    body: 'Topographic route planning, gear that matches the objective, and a single brief that turns ambition into a clear, repeatable plan.',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    title: 'Climb Safer',
    body: 'Mountain-specific weather, avalanche awareness, and route intel so you can read the mountain before you ever leave the trailhead.',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Climb Together',
    body: 'A community of climbers sharing beta, logging ascents, and pushing each other higher from first summit to fiftieth.',
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z" />
      </svg>
    ),
  },
];

const highlights = [
  {
    tag: 'Coverage',
    value: '97 peaks',
    body: 'From the Rockies and Cascades to the Alps, the Caucasus and Mexico’s volcanoes, each mountain mapped with its own gear profile, and more added every month.',
  },
  {
    tag: 'Gear Arsenal',
    value: '3,000+',
    body: 'Every piece of kit catalogued and scored, over 11,000 mountain-specific picks, with a cross-compatibility checker that confirms your boots, crampons and axes work as one system.',
  },
  {
    tag: 'Conditions',
    value: 'Forecast',
    body: 'Summit weather for your climb window, so you know what you are walking into before you leave the trailhead.',
  },
];

// Mission background. Deliberately minimal: black base, one soft summit glow,
// one slow-drifting orb, a thin ridgeline that draws itself in on load, and the
// site's two signature silhouettes with mouse parallax. Nothing else competes.
const MissionBackground = () => {
  const glowRef = useRef(null);
  const ridgeLineRef = useRef(null);
  const ridgeFarRef = useRef(null);
  const ridgeNearRef = useRef(null);

  // The hook writes transforms straight to the DOM so pointer moves and scroll
  // never re-render this tree. fx/fy = mouse travel. sway = horizontal sway
  // amplitude driven by scroll (sine of scrollY, so it never runs off-screen);
  // alternating signs make the layers cross past each other for depth.
  useMouseParallax(
    useMemo(
      () => [
        { ref: glowRef, sway: 36, swayPeriod: 2200 },
        { ref: ridgeLineRef, fx: 8, fy: 4, sway: -44, swayPeriod: 1800 },
        { ref: ridgeFarRef, fx: -14, fy: 0, sway: 20, swayPeriod: 1800 },
        { ref: ridgeNearRef, fx: 24, fy: 8, sway: -30, swayPeriod: 1800 },
      ],
      []
    )
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Pure black base + one soft summit glow high overhead */}
      <div className="absolute inset-0 bg-[#0A0A0A]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_50%_12%,rgba(255,255,255,0.06),transparent_70%)]" />

      {/* Single drifting orb. Radial gradient, not a blur filter, so the drift
          animation costs nothing on phones. The wrapper takes the scroll
          parallax so the inner drift keyframes keep their own transform. */}
      {/* Centered with a negative margin, not translate: the hook owns this
          element's transform, and an inline transform would override the class. */}
      <div ref={glowRef} className="absolute -top-40 left-1/2 -ml-[19rem] h-[38rem] w-[38rem]">
        <div
          className="about-glow-drift h-full w-full"
          style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.045), transparent 72%)' }}
        />
      </div>

      {/* Thin ridgeline that draws itself in once on load (pathLength trick:
          the dash is the whole path, and the offset animates from 1 to 0). */}
      {/* Every swaying layer overshoots the viewport by 5rem on each side so
          the sway + mouse travel never exposes a bare edge. */}
      <div ref={ridgeLineRef} className="absolute -inset-x-20 top-[38vh] h-[22vh]">
        <svg
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          className="h-full w-full opacity-[0.14]"
          aria-hidden="true"
        >
          <polyline
            className="mission-ridge-draw"
            points="0,150 140,104 300,128 470,60 640,112 820,36 980,96 1160,54 1320,100 1440,72"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength="1"
          />
        </svg>
      </div>

      {/* The two signature silhouettes. Wrapper carries the parallax; the near
          ridge's inner SVG keeps its slow float so the two motions compose. */}
      <svg
        ref={ridgeFarRef}
        viewBox="0 0 1440 300"
        className="absolute -inset-x-20 bottom-0 h-[34vh] w-auto opacity-[0.045]"
        preserveAspectRatio="xMidYMax slice"
      >
        <polygon points="0,300 300,120 500,200 750,80 950,180 1150,100 1350,160 1440,140 1440,300" fill="white" />
      </svg>
      <div ref={ridgeNearRef} className="absolute -inset-x-20 bottom-0 h-[50vh]">
        <svg
          viewBox="0 0 1440 500"
          className="about-ridge-float h-full w-full opacity-[0.065]"
          preserveAspectRatio="xMidYMax slice"
        >
          <polygon points="0,500 150,200 300,320 500,100 700,250 900,80 1100,200 1300,150 1440,250 1440,500" fill="white" />
        </svg>
      </div>

      {/* Edge vignette + bottom blend into the page */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_85%_at_50%_45%,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
    </div>
  );
};

const MissionPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#0A0A0A] text-white">
      <MissionBackground />

      <main className="relative z-10">
        {/* Top wordmark (links home) */}
        <div className="mx-auto flex max-w-7xl items-center px-6 pt-8 lg:px-8">
          <Link to="/" className="flex items-center gap-3 transition-opacity duration-300 hover:opacity-80">
            <img src={EigerLogo} alt="EIGER" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pb-16 pt-24 text-center sm:pt-28 lg:px-8">
          <Reveal>
            <span className="inline-block rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/50">
              Our Mission
            </span>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              The mountains belong to everyone{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                willing to climb them.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/50 md:text-xl">
              EIGER puts a whole expedition team in your pocket, so the next summit comes down to your
              drive and nothing else. Not the gear, not the guesswork, not the dozen scattered tools
              standing between you and the trailhead.
            </p>
          </Reveal>
        </section>

        {/* Story */}
        <section className="mx-auto max-w-3xl px-6 pb-24 lg:px-8">
          <Reveal className="space-y-6 border-l-2 border-white/10 pl-6 text-lg leading-relaxed text-white/60 md:pl-8">
            <p>
              EIGER started as a passion project between climbers who were sick of stitching together
              paper maps, three different weather apps, and half-remembered trip reports at 2am the
              night before an alpine start. We have all been there, headlamp on, second-guessing
              whether we packed for the right mountain.
            </p>
            <p>
              Here is what worries us. People get hurt up there because the information they needed
              was scattered, out of date, or buried under a paywall. The hardest part of any climb
              should be the climb itself, never the planning. So we are building one place to map your
              route, read the conditions, pack the right gear, and learn from the climbers who have
              already stood on that summit.
            </p>
            <p className="font-medium text-white">
              Whether it is your first peak or your fiftieth, EIGER is here to help you climb smarter,
              climb safer, and come home every single time.
            </p>
          </Reveal>
        </section>

        {/* Pillars */}
        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {pillars.map((pillar, index) => (
              <Reveal
                key={pillar.title}
                delay={index * 120}
                className="group rounded-2xl border border-white/10 bg-white/[0.05] p-8 transition-all hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors duration-300 group-hover:text-white">
                  {pillar.icon}
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">{pillar.title}</h3>
                <p className="mt-3 leading-relaxed text-white/50">{pillar.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Capability band */}
        <section className="mx-auto max-w-5xl px-6 pb-24 lg:px-8">
          <Reveal className="mb-10 text-center">
            <span className="inline-block rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/50">
              What&apos;s on the map
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
              One app for{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                every objective.
              </span>
            </h2>
          </Reveal>

          <Reveal delay={120} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02]">
            {/* Ridge-line accent — ties the band to the mountaineering theme */}
            <svg
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full opacity-[0.08]"
              aria-hidden="true"
            >
              <polyline
                points="0,96 160,58 320,80 480,26 640,68 800,18 960,60 1120,30 1280,66 1440,38"
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
            </svg>

            <div className="relative grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {highlights.map((item, index) => (
                <div key={item.value} className="px-8 py-12 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                    <span className="text-white/25">0{index + 1}</span>
                    <span className="mx-2 text-white/15">/</span>
                    {item.tag}
                  </p>
                  <p className="mt-5 bg-gradient-to-r from-white to-white/50 bg-clip-text text-4xl font-bold leading-none text-transparent md:text-5xl">
                    {item.value}
                  </p>
                  <p className="mx-auto mt-4 max-w-[15rem] text-sm leading-relaxed text-white/50">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Why EIGER vs trail apps — comparative positioning. Header names
            AllTrails (founder-approved); body copy speaks to "trail apps"
            generally to stay opinion, not product claims. */}
        <section className="mx-auto max-w-5xl px-6 pb-24 lg:px-8">
          <Reveal className="mb-10 text-center">
            <span className="inline-block rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/50">
              The Difference
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
              Why EIGER,{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                and not AllTrails?
              </span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Reveal
              delay={120}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                Trail apps
              </p>
              <p className="mt-4 leading-relaxed text-white/50">
                Crowd-sourced routes and star ratings flatten a glacier crossing
                and a gravel loop into the same scale. Great for a Sunday hike,
                silent on crevasse terrain, boot and crampon pairing, or what
                thin air does to a forecast.
              </p>
            </Reveal>
            <Reveal
              delay={240}
              className="rounded-2xl border border-white/20 bg-white/[0.07] p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                EIGER
              </p>
              <p className="mt-4 leading-relaxed text-white/70">
                Expedition-grade specificity for every experience level:
                altitude-zoned terrain data, route-specific gear checks, and a
                cross-compatibility engine that runs your kit like an expedition
                team would.
              </p>
            </Reveal>
          </div>

          <Reveal delay={360} className="mt-10 text-center">
            <p className="mx-auto max-w-2xl text-lg italic text-white/60">
              &ldquo;Everything a trail app does, with an expedition
              team&rsquo;s calculations behind every gear check and terrain
              read.&rdquo;
            </p>
          </Reveal>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-3xl px-6 pb-32 text-center lg:px-8">
          <Reveal>
            <h2 className="text-4xl font-bold md:text-5xl">
              Join the{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                first ascent.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/50">
              EIGER is live in public beta on iOS and Android. Get on the mountain with us, and leave
              your email below for release updates.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/?section=platforms"
              className="w-full rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-all duration-300 hover:scale-[1.02] hover:bg-white/90 sm:w-auto"
            >
              Get the app
            </Link>
            <Link
              to="/about"
              className="w-full rounded-full border border-white/10 bg-white/[0.05] px-8 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] sm:w-auto"
            >
              About EIGER
            </Link>
          </Reveal>
          <Reveal delay={200} className="mt-6">
            <button
              type="button"
              onClick={scrollToWaitlist}
              className="text-sm text-white/60 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
            >
              Or leave your email for release updates
            </button>
          </Reveal>
        </section>

        {/* Email updates (scrolled to by the link above) */}
        <Waitlist />
      </main>

      <Footer />
    </div>
  );
};

export default MissionPage;

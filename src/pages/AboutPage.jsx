import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import Waitlist from '../components/Waitlist';
import EigerLogo from '../assets/EigerLogo.png';

const scrollToWaitlist = () => {
  const section = document.getElementById('waitlist');
  if (!section) return;
  // Aim for the email input so the form lands in view, not just the section heading.
  const target = section.querySelector('input[type="email"]') || section;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const research = [
  {
    title: 'The right gear',
    body: 'What to carry for the objective, dialed in before you pack instead of guessed at the trailhead.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: 'The weather window',
    body: 'Mountain-specific forecasts so you know exactly when to go, and when to wait it out.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 1.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  {
    title: 'The trail conditions',
    body: 'Current route intel from people who were just up there, not a trip report from three seasons ago.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// The three climbers behind EIGER. Swap `photo` for an imported image when you have
// the headshots, and edit each name and blurb in place.
const founders = [
  {
    name: 'Founder One',
    role: 'Co-Founder',
    photo: null, // e.g. import a headshot up top and drop it in here
    body: 'A short line about this founder goes here. Where they climb, what they do on the team, why this matters to them. Edit me later.',
  },
  {
    name: 'Founder Two',
    role: 'Co-Founder',
    photo: null,
    body: 'A short line about this founder goes here. Where they climb, what they do on the team, why this matters to them. Edit me later.',
  },
  {
    name: 'Founder Three',
    role: 'Co-Founder',
    photo: null,
    body: 'A short line about this founder goes here. Where they climb, what they do on the team, why this matters to them. Edit me later.',
  },
];

// About background: the "route-planning" scene. Same #0A0A0A theme as the rest of
// the site, but instead of summit silhouettes it leans on the map side of climbing:
// topographic contour rings and a slowly turning compass rose.
const compassTicks = Array.from({ length: 12 }, (_, i) => (i * 30 * Math.PI) / 180);

const AboutBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const { x, y } = mousePosition;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Pure black base + off-center glow (mirrored vs the Mission page) */}
      <div className="absolute inset-0 bg-[#0A0A0A]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_72%_26%,rgba(255,255,255,0.05),transparent_70%)]" />

      {/* Drifting glow orbs */}
      <div className="about-glow-drift absolute -top-24 right-1/4 h-[26rem] w-[26rem] translate-x-1/2 rounded-full bg-white/[0.04] blur-[130px]" />
      <div className="about-glow-drift-reverse absolute bottom-1/4 left-0 h-96 w-96 rounded-full bg-white/[0.03] blur-[130px]" />

      {/* Faint topographic grid */}
      <div
        className="about-grid-drift absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      {/* Topographic contour clusters (the route-planning / map motif).
          Each wrapper carries the mouse parallax so the SVG keeps its drift animation. */}
      <div
        className="absolute -left-40 top-1/3 h-[70vh] w-[70vh] transition-transform duration-300 ease-out"
        style={{ transform: `translate(${x * 26}px, ${y * 14}px)` }}
      >
        <svg
          viewBox="0 0 600 600"
          className="about-contour-slow h-full w-full opacity-[0.07]"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse
              key={i}
              cx="300"
              cy="300"
              rx={40 + i * 32}
              ry={28 + i * 24}
              fill="none"
              stroke="white"
              strokeWidth="1.2"
            />
          ))}
          <circle cx="300" cy="300" r="5" fill="white" />
        </svg>
      </div>
      <div
        className="absolute -right-32 bottom-8 h-[55vh] w-[55vh] transition-transform duration-500 ease-out"
        style={{ transform: `translate(${x * -16}px, ${y * -10}px)` }}
      >
        <svg
          viewBox="0 0 500 500"
          className="about-contour-fast h-full w-full opacity-[0.05]"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse
              key={i}
              cx="250"
              cy="250"
              rx={30 + i * 30}
              ry={36 + i * 26}
              fill="none"
              stroke="white"
              strokeWidth="1.2"
            />
          ))}
          <circle cx="250" cy="250" r="4" fill="white" />
        </svg>
      </div>

      {/* Slowly turning compass rose (parallax on the SVG; spin stays on the inner group) */}
      <svg
        viewBox="0 0 200 200"
        className="absolute right-10 top-20 h-40 w-40 opacity-[0.06] transition-transform duration-300 ease-out"
        style={{ transform: `translate(${x * 30}px, ${y * 18}px)` }}
        aria-hidden="true"
      >
        <g className="about-compass-spin">
          <circle cx="100" cy="100" r="78" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="62" fill="none" stroke="white" strokeWidth="0.75" />
          <polygon points="100,24 112,100 100,90 88,100" fill="white" />
          <polygon points="100,176 112,100 100,110 88,100" fill="white" opacity="0.4" />
          {compassTicks.map((angle, i) => (
            <line
              key={i}
              x1={100 + Math.cos(angle) * 78}
              y1={100 + Math.sin(angle) * 78}
              x2={100 + Math.cos(angle) * 70}
              y2={100 + Math.sin(angle) * 70}
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </g>
      </svg>

      {/* Edge vignette + bottom blend into the page */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_85%_at_50%_45%,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
    </div>
  );
};

const AboutPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#0A0A0A] text-white">
      <AboutBackground />

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
              Our Story
            </span>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              It started on{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                Mt. Elbert.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/50 md:text-xl">
              Planning one climb meant hours of scattered research. We were certain there had to be a
              better way, so we set out to build it ourselves.
            </p>
          </Reveal>
        </section>

        {/* Origin story */}
        <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
          <Reveal className="space-y-6 border-l-2 border-white/10 pl-6 text-lg leading-relaxed text-white/60 md:pl-8">
            <p>
              A while back, we set our sights on Mt. Elbert, the highest peak in Colorado. We were
              fit, we were motivated, and we were ready to go. Then we actually started planning, and
              that is where the trouble began.
            </p>
            <p>
              Getting up it safely meant piecing everything together ourselves: the right gear to
              carry, how the weather would move across the peak, and what the trail conditions
              looked like that week. The information was out there somewhere, but it was buried across
              a dozen forums, old blog posts, and trip reports written three seasons ago. That is the
              kind of gap that gets people into real trouble on a mountain.
            </p>
            <p>
              Then we planned the next climb. And the one after that. Every single time it was the
              same scramble, hours hunched over a laptop before we ever laced up our boots.
            </p>
          </Reveal>
        </section>

        {/* The spark — pull quote */}
        <section className="mx-auto max-w-4xl px-6 pb-20 text-center lg:px-8">
          <Reveal>
            <p className="mx-auto max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
              So we kept asking the same question:{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                why isn&apos;t there an app for this?
              </span>
            </p>
          </Reveal>
        </section>

        {/* The answer */}
        <section className="mx-auto max-w-3xl px-6 pb-24 lg:px-8">
          <Reveal className="space-y-6 border-l-2 border-white/10 pl-6 text-lg leading-relaxed text-white/60 md:pl-8">
            <p>
              We could not find a good answer anywhere. So we decided to build one ourselves.
            </p>
            <p>
              No more living in a dozen open tabs. That is exactly what we had to do to feel ready for
              our first ascent, jumping between forums, weather sites, and gear lists just to trust
              that we had not missed something that could get us hurt. That part is over.
            </p>
            <p className="font-medium text-white">
              That is EIGER: every route, gear list, weather window, and trail condition in one
              place, so planning takes minutes and your focus goes back where it belongs, on the
              climb in front of you.
            </p>
          </Reveal>
        </section>

        {/* What we had to dig for, now in one app */}
        <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-8">
          <Reveal className="mb-12 text-center">
            <span className="inline-block rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/50">
              Why EIGER
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
              Everything we had to dig for,{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                now in one app.
              </span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {research.map((item, index) => (
              <Reveal
                key={item.title}
                delay={index * 120}
                className="group rounded-2xl border border-white/10 bg-white/[0.05] p-8 transition-all hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors duration-300 group-hover:text-white">
                  {item.icon}
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-white/50">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* The team */}
        <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-8">
          <Reveal className="mb-12 text-center">
            <span className="inline-block rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/50">
              The Cordée
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
              Three climbers,{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                one shared line.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/50">
              EIGER is built by the three of us, on the same rope, pulling in the same direction.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {founders.map((founder, index) => (
              <Reveal
                key={founder.name}
                delay={index * 120}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] transition-all hover:border-white/20 hover:bg-white/[0.08]"
              >
                {/* Photo (swap in a real headshot via the `photo` field) */}
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-white/[0.04]">
                  {founder.photo ? (
                    <img
                      src={founder.photo}
                      alt={founder.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/20">
                      <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name + small description */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl font-bold text-white">{founder.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                    {founder.role}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-white/50">{founder.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-6 pb-32 text-center lg:px-8">
          <Reveal>
            <h2 className="text-4xl font-bold md:text-5xl">
              Climb{' '}
              <span className="bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">with us.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/50">
              We are building EIGER for the days that matter most. Join the waitlist and help shape the
              app from the first pitch up.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={scrollToWaitlist}
              className="w-full rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-all duration-300 hover:scale-[1.02] hover:bg-white/90 sm:w-auto"
            >
              Join the Waitlist
            </button>
            <Link
              to="/mission"
              className="w-full rounded-full border border-white/10 bg-white/[0.05] px-8 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] sm:w-auto"
            >
              Our Mission
            </Link>
          </Reveal>
        </section>

        {/* Waitlist (scrolled to by the Join the Waitlist button above) */}
        <Waitlist />
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;

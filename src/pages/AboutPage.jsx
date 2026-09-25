import { useEffect, useLayoutEffect, useRef } from 'react';
import { animate, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight, Gauge, ShieldCheck } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import GetTheApp from '../components/home/GetTheApp';
import EmailCapture from '../components/home/EmailCapture';
import RishavPhoto from '../assets/founders/rishav.jpg';
import MuadPhoto from '../assets/founders/muad.jpg';
import CodyPhoto from '../assets/founders/cody.jpg';

// About (merged with the old Mission page). Every string on this page is from
// docs/COPY.md, section About (all three bios are the founders' own words,
// 2026-09-25). The shared "Get the app" and email blocks at the bottom are
// the Home components, so the wording lives in one place.

const HERO_STILL = '/images/about-alpine.jpg';
const STORY_STILL = '/videos/hero-poster.jpg';
const ATHLETE_STILL = '/videos/athlete-timoteo-poster.jpg';
const TIKTOK_URL = 'https://www.tiktok.com/@tomatosummit4';
const DISCORD_URL = 'https://discord.gg/x3Dfj32dAK';

const founders = [
  {
    name: 'Rishav Akilla',
    role: 'CEO',
    photo: RishavPhoto,
    body: 'My name is Rishav Akilla and I am currently studying Biochemistry at the University of Houston. I have heavy knowledge within the medical research field as several of my publications are on the National Institute of Health. Mountaineering is my passion and I integrate research capabilities into the development of safety and technical data.',
  },
  {
    name: 'Muad Shaikh',
    role: 'Chief Data Officer',
    photo: MuadPhoto,
    body: "My name is Muad Shaikh and I'm currently a senior at the University of Houston studying biochemistry with a minor in computer science, with multiple merit based scholarships for quantitative data analysis in human physiology. Climbing is my passion and I want to bring a medical perspective of safety and health in the hiking field that is often absent in these high impact sports.",
  },
  {
    name: 'Cody Luc',
    role: 'Chief Technology Officer',
    photo: CodyPhoto,
    body: 'My name is Cody Luc and I currently have experience at several S&P 500 companies as a software intern. I study computer science at the University of Houston and apply that knowledge to the main infrastructure of the app as the technical cofounder.',
  },
];

const beliefs = [
  {
    icon: ShieldCheck,
    body: "Our app is built on safety. If we don't know whether a gear list works, or isn't verified, you WILL know.",
  },
  {
    icon: Gauge,
    body: 'We want to balance this by putting out valuable information as quickly as possible, to mitigate potentially hazardous trips NOW.',
  },
];

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-line-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const eyebrow = 'font-mono text-eyebrow font-semibold uppercase text-fg-subtle';

// Fade and a 16px rise, once, for content that starts below the fold. Content
// is visible by default: nothing is hidden unless it is off screen when the
// page mounts, and reduced motion users never get the effect. The animation
// writes to the DOM node directly, so scrolling never re-renders React.
function Rise({ children, className, delay = 0 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || reduce || typeof IntersectionObserver === 'undefined') return undefined;
    if (node.getBoundingClientRect().top < window.innerHeight) return undefined;

    node.style.opacity = '0';
    node.style.transform = 'translateY(16px)';
    let controls;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        controls = animate(
          node,
          { opacity: 1, transform: 'translateY(0px)' },
          { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }
        );
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      controls?.stop();
      node.style.opacity = '';
      node.style.transform = '';
    };
  }, [reduce, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// The story photo settles from 1.05 to 1 as it scrolls into view. Scroll
// linked, no timer; static at 1 under reduced motion.
function StoryPhoto() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1]);

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-surface-2 lg:aspect-[4/5]"
    >
      <motion.img
        src={STORY_STILL}
        alt="Three hikers walking up a snowy forest trail"
        loading="lazy"
        className="h-full w-full object-cover"
        style={{ scale: reduce ? 1 : scale }}
      />
    </div>
  );
}

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />

      <main>
        {/* Statement hero over a full width alpine still, black scrim for legibility */}
        <section className="relative isolate flex min-h-[min(88svh,60rem)] items-end overflow-hidden">
          <img
            src={HERO_STILL}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-black/55" aria-hidden="true" />
          <div
            className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-bg to-transparent"
            aria-hidden="true"
          />
          <div className="mx-auto w-full max-w-7xl px-4 pb-section-sm pt-40 sm:px-6 lg:px-8">
            <h1 className="max-w-4xl text-balance text-display-lg">Unpreparedness and Misinformation Costs Lives.</h1>
            <p className="mt-8 max-w-2xl text-body-lg text-fg-muted">
              Hiking, mountaineering and long-term outdoor journeys with especially difficult terrain cannot be planned
              carelessly. Moreover, the process of amalgamation of all of the information you need for a specific hike
              is tedious; it simply takes too long. With our app, you know what you&apos;re lacking and you can
              confidently make decisions on what to buy (with our expert verification system) in minutes.
            </p>
          </div>
        </section>

        {/* The story */}
        <section className="py-section" aria-label="The story">
          <div className="mx-auto grid max-w-7xl px-4 sm:px-6 lg:px-8 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
            <Rise className="space-y-6 text-body-lg text-fg-muted">
              <p>
                Hello Climbers! We are EIGER, a startup led by three university students who want to make hiking and
                preparation of hiking a safer and less tedious experience. Last year, we took on the challenge of
                climbing Mount Elbert, a 4,400 m mountain, during the winter. With this came extensive, unorganized and
                non-coordinated planning around what gear to bring between 8 different people. We can recall multiple
                tabs open, cross checking between different forums, and being hours deep into a reddit thread. Even
                so, our hiking group ended up forgetting items as crucial as headlamps and microspikes.
              </p>
              <p>
                This app is the brainchild of what we wished we had to plan out complex expeditions, with tailored gear
                specific to mountain conditions and a multi-step expert verification pipeline before gear ever hits our
                recommended list. Beyond that, you can organize trips with your friends so each person knows what their
                individual responsibilities are to the group.
              </p>
            </Rise>
            <StoryPhoto />
          </div>
        </section>

        {/* What we believe */}
        <section className="border-t border-line py-section-sm" aria-labelledby="about-believe">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Rise>
              <h2 id="about-believe" className="text-display-md">
                What we believe
              </h2>
            </Rise>
            <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
              {beliefs.map((belief, i) => (
                <Rise key={belief.body} delay={i * 0.1}>
                  <div className="flex items-center gap-4">
                    <span className="flex size-11 items-center justify-center rounded-md border border-line-strong text-fg">
                      <belief.icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-small text-fg-subtle" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-6 text-body-lg text-fg">{belief.body}</p>
                </Rise>
              ))}
            </div>
            <Rise>
              <p className="mt-12 max-w-3xl border-t border-line pt-8 text-body-lg text-fg-muted">
                Both of these tenets are indisputably correlated and so we must find a balance between the two. With
                more users on our app, fine-tuning and the safety process will only get safer.
              </p>
            </Rise>
          </div>
        </section>

        {/* Who we are */}
        <section className="border-t border-line py-section-sm" aria-labelledby="about-team">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Rise>
              <h2 id="about-team" className="text-display-md">
                Who we are
              </h2>
            </Rise>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {founders.map((founder, i) => (
                <Rise key={founder.name} delay={i * 0.08} className="h-full">
                  <article className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface-1 transition-[translate,border-color] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-line-strong">
                    <div className="aspect-[4/5] w-full overflow-hidden bg-surface-2">
                      <img
                        src={founder.photo}
                        alt={founder.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-[50%_30%]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-heading">{founder.name}</h3>
                      <p className="mt-2 font-mono text-eyebrow uppercase text-fg-subtle">{founder.role}</p>
                      <p className="mt-4 text-small text-fg-muted">{founder.body}</p>
                    </div>
                  </article>
                </Rise>
              ))}
            </div>
          </div>
        </section>

        {/* Athlete, short version: still + TikTok, no video here */}
        <section className="border-t border-line py-section-sm" aria-labelledby="about-athlete">
          <Rise className="mx-auto grid max-w-7xl px-4 sm:px-6 lg:px-8 items-center gap-8 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-12">
            <div className="aspect-[4/5] w-full max-w-56 overflow-hidden rounded-lg border border-line bg-surface-2">
              <img
                src={ATHLETE_STILL}
                alt="Timoteo climbing a frozen waterfall at night, ice tools in both hands"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className={eyebrow}>Brand Athlete</p>
              <h2 id="about-athlete" className="mt-4 text-display-md">
                Timoteo Desantos
              </h2>
              <p className="mt-6 max-w-2xl text-body-lg text-fg-muted">
                With several years of climbing already under his belt, it is an understatement to say Timoteo is a
                seasoned climber. Every safety concerning feature is passed by him before implementation.
              </p>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-8 inline-flex h-11 items-center gap-2 rounded-pill border border-line-strong px-5 text-small font-semibold text-fg transition-colors duration-300 hover:bg-surface-3 ${focusRing}`}
              >
                tomatosummit4 (TikTok)
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </Rise>
        </section>

        {/* Community Partner */}
        <section className="pb-section-sm" aria-labelledby="about-partner">
          <Rise className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-8 rounded-lg border border-line bg-surface-1 p-6 sm:p-10 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h2 id="about-partner" className={eyebrow}>
                  Community Partner
                </h2>
                <p className="mt-5 text-body-lg text-fg">
                  We&apos;ve partnered with the Summit Society, a community of hikers who you can hit up for help
                  planning your next trip.
                </p>
              </div>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-pill bg-fg px-6 text-small font-semibold text-bg transition-opacity duration-300 hover:opacity-85 ${focusRing}`}
              >
                Join Their Discord
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </Rise>
        </section>

        <GetTheApp />
        <EmailCapture />
      </main>

      <Footer />
    </div>
  );
}

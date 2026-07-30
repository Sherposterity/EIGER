import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const MissionBanner = () => {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.35 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative border-y border-white/5 bg-[#0A0A0A] px-6 py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/6 to-transparent opacity-40" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <div
          className={`max-w-2xl transition-all duration-900 ease-out ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <span className="inline-block rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/50">
            Our Mission
          </span>

          <h2 className="mt-6 text-4xl font-bold text-white md:text-5xl">
            Why we&apos;re building EIGER
          </h2>

          <p className="mt-5 text-lg leading-8 text-white/60">
            A clear look at the product vision behind EIGER: better planning, stronger safety,
            and a simpler way to prepare for mountain days.
          </p>
        </div>

        <Link
          to="/mission"
          className={`group relative mt-10 inline-flex min-w-[16rem] items-center justify-between overflow-hidden rounded-full border border-white/10 bg-white/[0.05] px-6 py-4 text-white transition-all duration-700 hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
            isVisible ? 'translate-y-0 opacity-100 delay-150' : 'translate-y-8 opacity-0'
          }`}
        >
          <span className="pointer-events-none absolute inset-y-0 left-0 w-20 -translate-x-full bg-gradient-to-r from-transparent via-white/18 to-transparent transition-transform duration-700 group-hover:translate-x-[320%] group-focus-visible:translate-x-[320%]" />
          <span
            className={`pointer-events-none absolute inset-0 rounded-full border border-white/0 transition-all duration-1000 ${
              isVisible ? 'scale-100 border-white/10 opacity-100' : 'scale-[1.08] border-white/0 opacity-0'
            }`}
          />
          <span className="relative text-sm font-semibold uppercase tracking-[0.22em]">
            Read our mission
          </span>
          <span className="relative ml-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14m0 0-5-5m5 5-5 5" />
            </svg>
          </span>
        </Link>
      </div>
    </section>
  );
};

export default MissionBanner;

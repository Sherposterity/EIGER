import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';

// Homepage "Our Athlete" block: Timoteo's own ice climbing footage as a muted
// loop, with a short intro and his TikTok. The clip lives in public/videos
// (720p H.264, no audio, ~9 MB) and only starts loading once the section is
// near the viewport so it never competes with the hero playlist.
//
// TikTok's in-app browser renders <video> on a native surface that breaks
// stacking on SPA navigation (see Hero.jsx), so it gets the poster only.
// Reduced-motion users also get the poster.
const VIDEO_SRC = '/videos/athlete-timoteo.mp4';
const POSTER_SRC = '/videos/athlete-timoteo-poster.jpg';
const TIKTOK_URL = 'https://www.tiktok.com/@tomatosummit4';

const isTikTokBrowser = () =>
    /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Athlete = () => {
    const sectionRef = useRef(null);
    const videoRef = useRef(null);
    const [posterOnly] = useState(() => isTikTokBrowser() || prefersReducedMotion());
    const [shouldLoad, setShouldLoad] = useState(false);

    // Start fetching the clip when the section is within a screen of the
    // viewport, then play/pause it as it scrolls in and out of view.
    useEffect(() => {
        if (posterOnly) return undefined;
        const node = sectionRef.current;
        if (!node) return undefined;

        const loader = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldLoad(true);
                    loader.disconnect();
                }
            },
            { rootMargin: '100% 0px' }
        );
        loader.observe(node);

        const player = new IntersectionObserver(
            ([entry]) => {
                const video = videoRef.current;
                if (!video) return;
                if (entry.isIntersecting) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            },
            { threshold: 0.25 }
        );
        player.observe(node);

        return () => {
            loader.disconnect();
            player.disconnect();
        };
    }, [posterOnly]);

    return (
        <section
            id="athlete"
            ref={sectionRef}
            className="relative border-t border-white/5 bg-[#0A0A0A] px-6 py-24 lg:py-32"
        >
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />
            </div>

            <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-5 lg:gap-14">
                <Reveal className="lg:col-span-3">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
                        <div className="aspect-video w-full">
                            {posterOnly ? (
                                <img
                                    src={POSTER_SRC}
                                    alt="Timoteo climbing a frozen waterfall at night, ice tools in both hands"
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <video
                                    ref={videoRef}
                                    className="h-full w-full object-cover"
                                    src={shouldLoad ? VIDEO_SRC : undefined}
                                    poster={POSTER_SRC}
                                    muted
                                    loop
                                    playsInline
                                    preload={shouldLoad ? 'auto' : 'none'}
                                    aria-label="Timoteo climbing a frozen waterfall at night, ice tools in both hands"
                                />
                            )}
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/70">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500/90" />
                            Ice, first person
                        </div>
                    </div>
                </Reveal>

                <Reveal className="lg:col-span-2" delay={150}>
                    <span className="inline-block rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/50">
                        Our Athlete
                    </span>

                    <h2 className="mt-6 text-4xl font-bold text-white md:text-5xl">
                        Timoteo Desantos
                    </h2>

                    <p className="mt-5 text-lg leading-8 text-white/60">
                        Timoteo is the mountaineer behind EIGER&apos;s packing lists. Every
                        mountain in the catalog goes past him before it reaches the app, checked
                        against what he actually carries on the rope. When he isn&apos;t reviewing
                        gear, he is on the ice.
                    </p>

                    <a
                        href={TIKTOK_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.1c-1.5 0-2.9-.5-4-1.3v6.4a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3.2a2.6 2.6 0 1 0 1.7 2.4V3h3.1z" />
                        </svg>
                        @tomatosummit4
                        <span className="translate-x-0 transition-transform duration-300 group-hover:translate-x-1">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14m0 0-5-5m5 5-5 5" />
                            </svg>
                        </span>
                    </a>
                </Reveal>
            </div>
        </section>
    );
};

export default Athlete;

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

// Homepage "Brand Athlete" block (copy from docs/COPY.md, Home): Timoteo's own ice climbing footage as a muted
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
            className="border-t border-line bg-bg px-4 py-section-sm sm:px-gutter"
        >
            <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-5 lg:gap-14">
                <div className="lg:col-span-3">
                    <div className="relative overflow-hidden rounded-lg border border-line bg-black">
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
                        <span className="absolute bottom-4 left-4 rounded-sm border border-line-strong bg-black/60 px-2 py-1 font-mono text-eyebrow uppercase text-fg-muted">
                            Ice, first person
                        </span>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <p className="font-mono text-eyebrow font-semibold uppercase text-fg-subtle">Brand Athlete</p>

                    <h2 className="mt-5 text-display-md text-fg">Timoteo Desantos</h2>

                    <p className="mt-6 text-body-lg text-fg-muted">
                        Timoteo is the mountaineer that leads a team of human experts by tediously verifying the
                        gear lists provided by our fine tuned agents for every hike. Whenever he gets the chance,
                        you can bet he&apos;s climbing.
                    </p>

                    <a
                        href={TIKTOK_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 inline-flex h-11 items-center gap-2 rounded-pill border border-line-strong px-5 text-small font-semibold text-fg outline-none transition-colors duration-300 hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-line-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    >
                        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.1c-1.5 0-2.9-.5-4-1.3v6.4a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3.2a2.6 2.6 0 1 0 1.7 2.4V3h3.1z" />
                        </svg>
                        tomatosummit4 (TikTok)
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Athlete;

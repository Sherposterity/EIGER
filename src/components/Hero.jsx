import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import GiveawayPill from './GiveawayPill';
import { Magnetic } from './home/motion';
import { EASE_OUT_EXPO, focusRing, scrollToSection } from './home/utils';

// Background footage playlist (the founders' own climbing trips), rotated with
// a crossfade. Native-resolution (1080p; hero-11 1440p)/no-audio in public/videos; keep clips lean.
// This is the heaviest asset on the page: the poster paints first, the first
// clip streams with preload="metadata", and the second layer only starts
// buffering once the browser is idle.
const CLIP_IDS = [
    'hero-1',
    'hero-4',
    'hero-5',
    'hero-6',
    'hero-7',
    'hero-8',
    'hero-9',
    'hero-10',
    'hero-11',
    'hero-12',
];

// Portrait screens get 9:16 crops (hero-N-portrait.mp4, 720x1280, hand-picked
// crop window per clip) so subjects stay in frame and downloads stay small.
// Orientation is sampled once per page load; a mid-visit rotation keeps the
// current playlist until the next load.
const CLIP_SUFFIX = window.matchMedia('(orientation: portrait)').matches
    ? '-portrait'
    : '';

// Playlist order is shuffled once per page load, except hero-8 always plays
// second and hero-6 always plays third (founder request).
const FIXED_SECOND = 'hero-8';
const FIXED_THIRD = 'hero-6';

const buildPlaylist = () => {
    const pool = CLIP_IDS.filter(
        (id) => id !== FIXED_SECOND && id !== FIXED_THIRD,
    );
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.splice(1, 0, FIXED_SECOND, FIXED_THIRD);
    return pool.map((id) => `/videos/${id}${CLIP_SUFFIX}.mp4`);
};

const HERO_VIDEOS = buildPlaylist();
const POSTER = '/videos/hero-poster.jpg';

// TikTok's in-app browser renders <video> on a native surface that loses CSS
// stacking when the element is unmounted/remounted (SPA nav to /mission and
// back), leaving the raw clip playing on top of the page. No workaround holds
// there, so TikTok gets the static poster instead of the video playlist.
const isTikTokBrowser = () =>
    /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// requestIdleCallback is missing in Safari; a short timeout stands in.
const onIdle = (fn) => {
    if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(fn, { timeout: 2500 });
        return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(fn, 1200);
    return () => window.clearTimeout(id);
};

// Start the crossfade this long before the current clip ends, so the fade
// blends two moving pictures instead of fading through a frozen frame.
const CROSSFADE_LEAD_S = 0.8;

// Hero copy is staged in: every line rises 12 px and settles, all done by
// 600 ms. The H1 starts at 0.6 opacity so it is legible from the first frame.
const rise = (delay, fromOpacity = 0) => ({
    initial: { opacity: fromOpacity, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: EASE_OUT_EXPO, delay },
});

const Hero = () => {
    const reduceMotion = useReducedMotion();
    const heroRef = useRef(null);

    // Two stacked <video> layers crossfade between playlist clips. The swap
    // starts CROSSFADE_LEAD_S before the current clip ends, so both layers
    // are still in motion during the fade (no freeze-frame); the ended
    // handler is only a fallback for clips whose duration isn't readable.
    const videoARef = useRef(null);
    const videoBRef = useRef(null);
    const videoIndexRef = useRef(0);
    const preloadTimerRef = useRef(null);
    // Mirrors the activeLayer state so late events from the outgoing layer
    // (its final timeupdates + ended) can be told apart from the active one.
    const activeLayerRef = useRef(0);
    const [activeLayer, setActiveLayer] = useState(0);
    // TikTok and reduced-motion visitors get the still poster only.
    const [posterOnly] = useState(() => isTikTokBrowser() || prefersReducedMotion());

    useEffect(() => {
        if (posterOnly) return undefined;
        const first = videoARef.current;
        const second = videoBRef.current;
        if (!first) return undefined;
        // In-app browsers (Instagram, TikTok, etc.) decide inline-vs-native
        // playback from the HTML attributes, but React only sets the `muted`
        // JS property; mirror the attributes onto both layers before play().
        [first, second].forEach((el) => {
            if (!el) return;
            el.setAttribute('muted', '');
            el.setAttribute('playsinline', '');
            el.setAttribute('webkit-playsinline', '');
        });
        first.src = HERO_VIDEOS[0];
        first.play().catch(() => {});
        const cancelIdle = onIdle(() => {
            if (second && !second.getAttribute('src')) {
                second.preload = 'auto';
                second.src = HERO_VIDEOS[1];
            }
        });

        // Pause the footage while the hero is off screen or the tab is hidden.
        let heroInView = true;
        const sync = () => {
            const video =
                activeLayerRef.current === 0 ? videoARef.current : videoBRef.current;
            if (!video) return;
            if (heroInView && !document.hidden) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        };
        const observer = new IntersectionObserver(
            ([entry]) => {
                heroInView = entry.isIntersecting;
                sync();
            },
            { threshold: 0 },
        );
        if (heroRef.current) observer.observe(heroRef.current);
        document.addEventListener('visibilitychange', sync);

        return () => {
            cancelIdle();
            observer.disconnect();
            document.removeEventListener('visibilitychange', sync);
            clearTimeout(preloadTimerRef.current);
        };
    }, [posterOnly]);

    const advanceFrom = (layer) => {
        // Ignore late events (final timeupdates, ended) from a layer that
        // already handed off; otherwise one clip could trigger two swaps.
        if (layer !== activeLayerRef.current) return;
        const next = layer === 0 ? videoBRef.current : videoARef.current;
        const outgoing = layer === 0 ? videoARef.current : videoBRef.current;
        if (!next) return;
        videoIndexRef.current = (videoIndexRef.current + 1) % HERO_VIDEOS.length;
        // Normally the idle preload has already filled the incoming layer; if
        // the first clip ended before the browser went idle, load it now.
        if (!next.getAttribute('src')) next.src = HERO_VIDEOS[videoIndexRef.current];
        next.play().catch(() => {});
        activeLayerRef.current = layer === 0 ? 1 : 0;
        setActiveLayer(activeLayerRef.current);
        // Reuse the outgoing layer to buffer the clip after this one, but only
        // once the 1s crossfade has hidden it: assigning src clears the
        // displayed frame mid-fade.
        const followingClip =
            HERO_VIDEOS[(videoIndexRef.current + 1) % HERO_VIDEOS.length];
        clearTimeout(preloadTimerRef.current);
        preloadTimerRef.current = setTimeout(() => {
            if (!outgoing) return;
            outgoing.preload = 'auto';
            outgoing.src = followingClip;
        }, 1100);
    };

    const handleTimeUpdate = (layer) => {
        const el = layer === 0 ? videoARef.current : videoBRef.current;
        if (!el || !Number.isFinite(el.duration)) return;
        if (el.duration - el.currentTime <= CROSSFADE_LEAD_S) advanceFrom(layer);
    };

    const jump = (id) => (event) => {
        if (scrollToSection(id)) event.preventDefault();
    };

    // Motion props, or none at all under reduced motion.
    const stage = (delay, fromOpacity) => (reduceMotion ? {} : rise(delay, fromOpacity));

    return (
        <section
            ref={heroRef}
            aria-label="Introduction"
            className="relative flex min-h-svh w-full flex-col overflow-hidden bg-bg"
        >
            <div className="absolute inset-0 z-0">
                {posterOnly ? (
                    <img
                        src={POSTER}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : (
                    <>
                        <video
                            ref={videoARef}
                            muted
                            playsInline
                            preload="metadata"
                            disablePictureInPicture
                            disableRemotePlayback
                            poster={POSTER}
                            aria-hidden="true"
                            onTimeUpdate={() => handleTimeUpdate(0)}
                            onEnded={() => advanceFrom(0)}
                            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${activeLayer === 0 ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <video
                            ref={videoBRef}
                            muted
                            playsInline
                            preload="none"
                            disablePictureInPicture
                            disableRemotePlayback
                            aria-hidden="true"
                            onTimeUpdate={() => handleTimeUpdate(1)}
                            onEnded={() => advanceFrom(1)}
                            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${activeLayer === 1 ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </>
                )}

                {/* Black scrims only: an even dim, a fade into the page at the
                    bottom, and on desktop a heavier corner scrim behind the copy. */}
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-bg via-bg/60 to-transparent" />
                <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_80%_75%_at_0%_100%,rgb(0_0_0/0.65),transparent_70%)] md:block" />
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pt-[calc(7rem+var(--launch-banner-h,0px))] pb-8 sm:px-6 md:pb-16 lg:px-8">
                <div className="mx-auto flex max-w-3xl flex-col items-center text-center md:mx-0 md:items-start md:text-left">
                    <motion.div {...stage(0.25)} className="mb-6">
                        <GiveawayPill />
                    </motion.div>

                    <motion.h1
                        {...stage(0, 0.6)}
                        className="font-display text-display-xl text-balance text-fg"
                    >
                        You cannot afford a mistake on the mountain.
                    </motion.h1>

                    <motion.p
                        {...stage(0.08)}
                        className="mt-6 max-w-2xl text-body-lg text-pretty text-fg-muted"
                    >
                        Our mission is to mitigate that with expert verified gear recommendations mapped to every conceivable hike.
                    </motion.p>

                    <motion.div {...stage(0.12)} className="mt-3">
                        <Link
                            to="/verification"
                            className={`group inline-flex items-center gap-2 rounded-sm text-body font-medium text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`}
                        >
                            Take a look at our process
                            <ArrowRight
                                aria-hidden="true"
                                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                            />
                        </Link>
                    </motion.div>

                    <motion.div
                        {...stage(0.16)}
                        className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
                    >
                        <Magnetic className="w-full sm:w-auto">
                            <a
                                href="#get-the-app"
                                onClick={jump('get-the-app')}
                                className={`inline-flex h-12 w-full items-center justify-center rounded-pill bg-fg px-7 text-body font-semibold text-bg transition-colors hover:bg-fg/85 sm:w-auto ${focusRing}`}
                            >
                                Get the app
                            </a>
                        </Magnetic>
                        <a
                            href="#how-it-works"
                            onClick={jump('how-it-works')}
                            className={`inline-flex h-12 w-full items-center justify-center rounded-pill border border-line-strong bg-bg/30 px-7 text-body font-semibold text-fg backdrop-blur-sm transition-colors hover:border-fg/40 hover:bg-bg/50 sm:w-auto ${focusRing}`}
                        >
                            See how it works
                        </a>
                    </motion.div>

                    <motion.p
                        {...stage(0.2)}
                        className="mt-5 font-mono text-small text-fg-subtle"
                    >
                        October 1 on the App Store and Google Play.
                    </motion.p>
                </div>

                {/* Scroll cue: static, nothing loops. */}
                <a
                    href="#how-it-works"
                    onClick={jump('how-it-works')}
                    className={`mt-6 flex flex-col items-center gap-1 self-center rounded-sm text-fg-subtle transition-colors hover:text-fg md:absolute md:right-8 md:bottom-16 md:mt-0 md:gap-2 ${focusRing}`}
                >
                    <span className="font-mono text-eyebrow uppercase">Explore</span>
                    <ArrowDown aria-hidden="true" className="size-4" />
                </a>
            </div>
        </section>
    );
};

export default Hero;

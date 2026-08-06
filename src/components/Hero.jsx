import { useEffect, useState, useRef } from 'react';
import EigerLogo from '../assets/EigerLogo.png';

// Background footage playlist (the founders' own climbing trips), rotated with
// a crossfade. Native-resolution (1080p; hero-11 1440p)/no-audio in public/videos — keep clips lean;
// this is the heaviest asset on the page and loads only the current clip plus
// the next one (preloaded on the hidden layer so swaps are instant).
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

// TikTok's in-app browser renders <video> on a native surface that loses CSS
// stacking when the element is unmounted/remounted (SPA nav to /mission and
// back), leaving the raw clip playing on top of the page. No workaround holds
// there, so TikTok gets the static poster instead of the video playlist.
const isTikTokBrowser = () =>
    /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);

const Hero = () => {
    const [isVisible, setIsVisible] = useState(false);
    const heroRef = useRef(null);

    // Two stacked <video> layers crossfade between playlist clips. The swap
    // starts CROSSFADE_LEAD_S before the current clip ends, so both layers
    // are still in motion during the fade (no freeze-frame); the ended
    // handler is only a fallback for clips whose duration isn't readable.
    // Reduced-motion users keep the static poster.
    const videoARef = useRef(null);
    const videoBRef = useRef(null);
    const videoIndexRef = useRef(0);
    const preloadTimerRef = useRef(null);
    // Mirrors the activeLayer state so late events from the outgoing layer
    // (its final timeupdates + ended) can be told apart from the active one.
    const activeLayerRef = useRef(0);
    const [activeLayer, setActiveLayer] = useState(0);
    const [posterOnly] = useState(isTikTokBrowser);

    useEffect(() => {
        if (posterOnly) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const first = videoARef.current;
        if (!first) return;
        // In-app browsers (Instagram, TikTok, etc.) decide inline-vs-native
        // playback from the HTML attributes, but React only sets the `muted`
        // JS property — mirror the attributes onto both layers before play().
        [videoARef.current, videoBRef.current].forEach((el) => {
            if (!el) return;
            el.setAttribute('muted', '');
            el.setAttribute('playsinline', '');
            el.setAttribute('webkit-playsinline', '');
        });
        first.src = HERO_VIDEOS[0];
        first.play().catch(() => {});
        // Buffer the next clip on the hidden layer while the first one plays,
        // so the first swap needs no network round-trip.
        if (videoBRef.current) videoBRef.current.src = HERO_VIDEOS[1];
        return () => clearTimeout(preloadTimerRef.current);
    }, [posterOnly]);

    // Start the crossfade this long before the current clip ends, so the fade
    // blends two moving pictures instead of fading through a frozen frame.
    const CROSSFADE_LEAD_S = 0.8;

    const advanceFrom = (layer) => {
        // Ignore late events (final timeupdates, ended) from a layer that
        // already handed off — otherwise one clip could trigger two swaps.
        if (layer !== activeLayerRef.current) return;
        videoIndexRef.current = (videoIndexRef.current + 1) % HERO_VIDEOS.length;
        const next = layer === 0 ? videoBRef.current : videoARef.current;
        const outgoing = layer === 0 ? videoARef.current : videoBRef.current;
        if (!next) return;
        // The incoming layer was preloaded with this clip when the previous
        // swap happened (or on mount) — just start it and crossfade.
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
            if (outgoing) outgoing.src = followingClip;
        }, 1100);
    };

    const handleTimeUpdate = (layer) => {
        const el = layer === 0 ? videoARef.current : videoBRef.current;
        if (!el || !Number.isFinite(el.duration)) return;
        if (el.duration - el.currentTime <= CROSSFADE_LEAD_S) advanceFrom(layer);
    };

    const scrollToWaitlist = () => {
        const section = document.getElementById('waitlist');
        if (!section) return;
        // Aim for the email input so the form lands in view, not just the section heading.
        const target = section.querySelector('input[type="email"]') || section;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    useEffect(() => {
        const reveal = window.requestAnimationFrame(() => {
            setIsVisible(true);
        });
        return () => window.cancelAnimationFrame(reveal);
    }, []);

    return (
        <section
            ref={heroRef}
            className="relative h-screen w-full overflow-hidden"
        >
            {/* Full-Screen Video Background — rotating climbing footage.
                TikTok's in-app browser gets the static poster instead (see
                isTikTokBrowser above). */}
            <div className="absolute inset-0 z-0">
                {posterOnly ? (
                    <img
                        src="/videos/hero-poster.jpg"
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <>
                        <video
                            ref={videoARef}
                            muted
                            playsInline
                            preload="auto"
                            disablePictureInPicture
                            disableRemotePlayback
                            poster="/videos/hero-poster.jpg"
                            onTimeUpdate={() => handleTimeUpdate(0)}
                            onEnded={() => advanceFrom(0)}
                            className={`pointer-events-none absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${activeLayer === 0 ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <video
                            ref={videoBRef}
                            muted
                            playsInline
                            preload="auto"
                            disablePictureInPicture
                            disableRemotePlayback
                            onTimeUpdate={() => handleTimeUpdate(1)}
                            onEnded={() => advanceFrom(1)}
                            className={`pointer-events-none absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${activeLayer === 1 ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </>
                )}

                {/* Dark Overlay for text readability */}
                <div className="absolute inset-0 bg-black/45" />

                {/* Gradient overlay at bottom — blends the footage into the
                    page. The old mountain-silhouette SVGs were removed once
                    real climbing footage landed; they covered half the video. */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 h-full flex flex-col items-center px-6 text-center">
                {/* Main content - flex-1 centers and shrinks dynamically */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    <div className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                        {/* Pre-title Badge */}
                        <div className="mb-4 md:mb-8">
                            <span className="inline-block px-4 py-2 rounded-full border border-white/20 text-xs tracking-[0.3em] uppercase text-white/70 backdrop-blur-sm bg-white/5">
                                Alpine Precision
                            </span>
                        </div>

                        {/* Main Title - Logo - dynamically sized */}
                        <img
                            src={EigerLogo}
                            alt="EIGER"
                            className="mx-auto mb-4 md:mb-6 object-contain drop-shadow-2xl"
                            style={{ height: 'clamp(14rem, 40vh, 30rem)' }}
                        />

                        {/* Tagline with personality */}
                        <p className="text-lg md:text-2xl lg:text-3xl text-white/80 font-light max-w-3xl mx-auto leading-relaxed mb-2 md:mb-4">
                            Your mountain. Your gear. One app.
                        </p>

                        <p className="text-base md:text-xl text-white/60 font-light max-w-2xl mx-auto italic">
                            The summit waits for no one - but you'll be ready
                        </p>

                        {/* CTA Button */}
                        <div className="mt-6 md:mt-12">
                            <button
                                type="button"
                                onClick={scrollToWaitlist}
                                className="inline-block px-10 py-4 bg-white text-black font-semibold text-lg rounded-full hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-2xl"
                            >
                                Join the Waitlist
                            </button>
                        </div>

                    </div>
                </div>

                {/* Scroll Indicator - always visible, in-flow at bottom */}
                <div className="pb-6 pt-4 animate-bounce shrink-0">
                    <div className="flex flex-col items-center gap-2 text-white/50">
                        <span className="text-xs tracking-widest uppercase">Explore</span>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;

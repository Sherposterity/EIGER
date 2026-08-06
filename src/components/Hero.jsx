import { useEffect, useState, useRef } from 'react';
import EigerLogo from '../assets/EigerLogo.png';

// Background footage playlist (the founders' own climbing trips), rotated with
// a crossfade. Compressed 720p/no-audio in public/videos — keep clips lean;
// this is the heaviest asset on the page and loads one clip at a time.
const HERO_VIDEOS = [
    '/videos/hero-1.mp4',
    '/videos/hero-3.mp4',
    '/videos/hero-4.mp4',
    '/videos/hero-5.mp4',
    '/videos/hero-6.mp4',
];

// TikTok's in-app browser renders <video> on a native surface that loses CSS
// stacking when the element is unmounted/remounted (SPA nav to /mission and
// back), leaving the raw clip playing on top of the page. No workaround holds
// there, so TikTok gets the static poster instead of the video playlist.
const isTikTokBrowser = () =>
    /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);

const Hero = () => {
    const [isVisible, setIsVisible] = useState(false);
    const heroRef = useRef(null);

    // Two stacked <video> layers crossfade between playlist clips: the ended
    // layer holds its last frame while the other starts, so there is no black
    // flash. Reduced-motion users keep the static poster.
    const videoARef = useRef(null);
    const videoBRef = useRef(null);
    const videoIndexRef = useRef(0);
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
    }, [posterOnly]);

    const handleVideoEnded = (endedLayer) => {
        videoIndexRef.current = (videoIndexRef.current + 1) % HERO_VIDEOS.length;
        const next = endedLayer === 0 ? videoBRef.current : videoARef.current;
        if (!next) return;
        next.src = HERO_VIDEOS[videoIndexRef.current];
        next.play().catch(() => {});
        setActiveLayer(endedLayer === 0 ? 1 : 0);
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
                            onEnded={() => handleVideoEnded(0)}
                            className={`pointer-events-none absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${activeLayer === 0 ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <video
                            ref={videoBRef}
                            muted
                            playsInline
                            preload="auto"
                            disablePictureInPicture
                            disableRemotePlayback
                            onEnded={() => handleVideoEnded(1)}
                            className={`pointer-events-none absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${activeLayer === 1 ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </>
                )}

                {/* Dark Overlay for text readability */}
                <div className="absolute inset-0 bg-black/60" />

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

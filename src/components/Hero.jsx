import { useEffect, useState, useRef } from 'react';
import EigerLogo from '../assets/EigerLogo.png';

const Hero = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const heroRef = useRef(null);

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

        const handleMouseMove = (e) => {
            if (heroRef.current) {
                const rect = heroRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                setMousePosition({ x, y });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.cancelAnimationFrame(reveal);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <section
            ref={heroRef}
            className="relative h-screen w-full overflow-hidden"
        >
            {/* Full-Screen Video Background */}
            <div className="absolute inset-0 z-0">
                {/* Video Placeholder - Replace src with actual video */}
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%23111' width='1920' height='1080'/%3E%3C/svg%3E"
                >
                    {/* Add your video source here */}
                    {/* <source src="/your-video.mp4" type="video/mp4" /> */}
                </video>

                {/* Dark Overlay for text readability */}
                <div className="absolute inset-0 bg-black/60" />

                {/* Gradient overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />

                {/* Interactive Mountain Silhouettes - Move with cursor */}
                <svg
                    viewBox="0 0 1440 400"
                    className="absolute bottom-0 w-full h-auto transition-transform duration-200 ease-out"
                    style={{
                        transform: `translateX(${mousePosition.x * 30}px) translateY(${mousePosition.y * 10}px)`,
                    }}
                    preserveAspectRatio="xMidYMax slice"
                >
                    <polygon
                        points="0,400 200,150 400,250 600,100 800,200 1000,80 1200,180 1440,120 1440,400"
                        fill="#0A0A0A"
                    />
                </svg>

                {/* Secondary mountain layer - moves opposite direction for depth */}
                <svg
                    viewBox="0 0 1440 300"
                    className="absolute bottom-0 w-full h-auto opacity-40 transition-transform duration-300 ease-out"
                    style={{
                        transform: `translateX(${mousePosition.x * -20}px) translateY(${mousePosition.y * 5}px)`,
                    }}
                    preserveAspectRatio="xMidYMax slice"
                >
                    <polygon
                        points="0,300 300,120 500,200 750,80 950,180 1150,100 1350,160 1440,140 1440,300"
                        fill="#1a1a1a"
                    />
                </svg>

                {/* Distant mountain layer - subtle movement */}
                <svg
                    viewBox="0 0 1440 200"
                    className="absolute bottom-20 w-full h-auto opacity-20 transition-transform duration-500 ease-out"
                    style={{
                        transform: `translateX(${mousePosition.x * 15}px)`,
                    }}
                    preserveAspectRatio="xMidYMax slice"
                >
                    <polygon
                        points="0,200 180,80 350,130 520,50 700,110 880,60 1050,100 1220,70 1440,90 1440,200"
                        fill="#2a2a2a"
                    />
                </svg>
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

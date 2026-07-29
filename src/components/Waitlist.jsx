import { useEffect, useRef, useState } from 'react';
import { addToWaitlist, checkRateLimit } from '../lib/supabase';

const Waitlist = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [honeypot, setHoneypot] = useState(''); // Hidden field for bot detection
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const sectionRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.2 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        const handleMouseMove = (e) => {
            if (sectionRef.current) {
                const rect = sectionRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                setMousePosition({ x, y });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            observer.disconnect();
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        // Check rate limit before submission
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            setError(`Too many attempts. Please try again later.`);
            return;
        }

        setIsLoading(true);
        setError('');

        // Pass honeypot value to the function
        const result = await addToWaitlist(email, honeypot);

        setIsLoading(false);

        if (result.success) {
            setIsSubmitted(true);
            setEmail('');
            setHoneypot('');
        } else {
            setError(result.error || 'Something went wrong. Please try again.');
        }
    };

    return (
        <section id="waitlist" ref={sectionRef} className="relative py-32 lg:py-48 px-6 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Interactive Mountain Silhouette */}
                <svg
                    viewBox="0 0 1440 500"
                    className="absolute bottom-0 w-full h-auto opacity-[0.05] transition-transform duration-300 ease-out"
                    style={{
                        transform: `translateX(${mousePosition.x * 25}px) translateY(${mousePosition.y * 8}px)`,
                    }}
                    preserveAspectRatio="xMidYMax slice"
                >
                    <polygon
                        points="0,500 150,200 300,320 500,100 700,250 900,80 1100,200 1300,150 1440,250 1440,500"
                        fill="white"
                    />
                </svg>

                {/* Secondary mountain layer */}
                <svg
                    viewBox="0 0 1440 400"
                    className="absolute bottom-0 w-full h-auto opacity-[0.03] transition-transform duration-400 ease-out"
                    style={{
                        transform: `translateX(${mousePosition.x * -15}px)`,
                    }}
                    preserveAspectRatio="xMidYMax slice"
                >
                    <polygon
                        points="0,400 200,150 400,250 650,80 850,200 1050,120 1250,180 1440,100 1440,400"
                        fill="white"
                    />
                </svg>

                {/* Glow Effect */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[150px] transition-transform duration-500 ease-out"
                    style={{
                        transform: `translate(calc(-50% + ${mousePosition.x * 50}px), calc(-50% + ${mousePosition.y * 30}px))`,
                    }}
                />
            </div>

            <div className={`relative max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                {/* Pre-headline Badge - More personal touch */}
                <div className="mb-10">
                    <span className="inline-block px-5 py-2.5 rounded-full border border-white/10 text-xs tracking-[0.2em] uppercase text-white/50 backdrop-blur-sm">
                        Your Adventure Awaits
                    </span>
                </div>

                {/* Main Headline */}
                <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-[1.1] text-white">
                    The unstoppable is<br />
                    <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">approaching</span>
                </h2>

                {/* Subheadline - More human, conversational */}
                <p className="text-xl md:text-2xl text-white/40 mb-6 max-w-2xl mx-auto leading-relaxed">
                    Waitlist now! Be among the first to experience intelligent outdoor preparation.
                </p>

                {/* Personal touch - human element */}
                <p className="text-base text-white/30 mb-14 max-w-xl mx-auto italic">
                    "There is no better life purpose than to perish in attempting the great and the impossible"
                    <span className="block mt-2 text-white/20 not-italic text-sm">- Friedrich Nietzsche</span>
                </p>

                {/* Waitlist Form */}
                <div className={`max-w-xl mx-auto transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                            {/* Honeypot field - hidden from users, bots will fill this */}
                            <input
                                type="text"
                                name="website"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                                style={{
                                    position: 'absolute',
                                    left: '-9999px',
                                    opacity: 0,
                                    height: 0,
                                    width: 0,
                                    tabIndex: -1
                                }}
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                            />

                            <div className="flex-1 relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError(''); // Clear error when typing
                                    }}
                                    placeholder="Enter your email"
                                    required
                                    className={`w-full px-6 py-5 bg-white/[0.05] border rounded-2xl text-white text-lg placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-300 ${error ? 'border-red-500/50' : 'border-white/10'}`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="relative px-10 py-5 bg-white text-black font-bold text-lg rounded-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-white/10"
                            >
                                <span className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                    Join Waitlist
                                </span>

                                {isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    </div>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="px-10 py-8 rounded-2xl bg-white/[0.05] border border-emerald-500/30">
                            <div className="flex items-center justify-center gap-4 text-emerald-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-2xl font-semibold">You&apos;re on the list!</span>
                            </div>
                            <p className="mt-3 text-white/50 text-lg">We&apos;ll be in touch soon. The mountains are calling.</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <p className="mt-4 text-red-400 text-sm">{error}</p>
                    )}
                </div>

                {/* Privacy Note */}
                <p className="mt-8 text-sm text-white/30">
                    We respect your privacy. No spam, ever. Just good vibes and launch updates.
                </p>

                {/* Stats */}
                <div className="mt-24 pt-16 border-t border-white/5">
                    <div className="flex flex-wrap items-center justify-center gap-16 md:gap-24 text-white/40">
                        <div className="text-center">
                            <p className="text-4xl md:text-5xl font-bold text-white mb-2">10+</p>
                            <p className="text-sm uppercase tracking-widest">Peaks Mapped</p>
                            <p className="text-xs text-white/30 mt-1">Continuing to map more</p>
                        </div>
                        <div className="hidden sm:block w-px h-16 bg-white/10" />
                        <div className="text-center">
                            <p className="text-4xl md:text-5xl font-bold text-white mb-2">2026</p>
                            <p className="text-sm uppercase tracking-widest">Launch Year</p>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Waitlist;

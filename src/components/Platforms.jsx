import { useEffect, useRef, useState } from 'react';

const Platforms = () => {
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section ref={sectionRef} className="relative py-28 lg:py-36 px-6">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />

            <div className={`relative max-w-5xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                {/* Section Header */}
                <span className="inline-block px-4 py-2 rounded-full border border-white/10 text-xs tracking-[0.3em] uppercase text-white/50 mb-8">
                    Available Platforms
                </span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
                    Your Platform,{' '}
                    <span className="bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Your Choice</span>
                </h2>
                <p className="text-lg md:text-xl text-white/40 max-w-xl mx-auto mb-16">
                    Starting with iOS, expanding to Android soon
                </p>

                {/* Platform Badges */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 lg:gap-8">

                    {/* iOS Badge - Available */}
                    <div className="group relative w-full sm:w-auto">
                        <div className="relative flex items-center gap-5 px-8 py-6 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 cursor-pointer">
                            {/* Apple Icon */}
                            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>

                            <div className="text-left">
                                <p className="text-sm text-white/50">Download on the</p>
                                <p className="text-xl font-semibold text-white">App Store</p>
                            </div>

                            {/* Status Badge */}
                            <span className="absolute -top-3 -right-3 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full shadow-lg">
                                SOON
                            </span>
                        </div>
                    </div>

                    {/* Android Badge - Coming Soon */}
                    <div className="group relative w-full sm:w-auto">
                        <div className="relative flex items-center gap-5 px-8 py-6 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 cursor-pointer">
                            {/* Android Icon */}
                            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993s-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993s-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
                            </svg>

                            <div className="text-left">
                                <p className="text-sm text-white/50">Get it on</p>
                                <p className="text-xl font-semibold text-white">Google Play</p>
                            </div>

                            {/* Status Badge */}
                            <span className="absolute -top-3 -right-3 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full shadow-lg">
                                SOON
                            </span>
                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
};

export default Platforms;

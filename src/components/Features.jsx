import { useEffect, useRef, useState } from 'react';

// Import images
import EigerLogo from '../assets/EigerLogo.png';
import MissionControlImg from '../assets/E_MissionControl.png';
import IntelImg from '../assets/E_intel2.PNG';
import ClothesImg from '../assets/E_Clothes2.jpg';

const features = [
    {
        stage: '01',
        title: 'Base Camp',
        subtitle: 'Your Command Center',
        image: MissionControlImg,
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        stage: '02',
        title: 'Summit Intel',
        subtitle: 'Peak & Trail Data',
        image: IntelImg,
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        stage: '03',
        title: 'Gear Vault',
        subtitle: 'Your Equipment Arsenal',
        image: ClothesImg,
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        ),
    },
];

const FeatureCard = ({ feature, index, mousePosition }) => {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setIsVisible(true), index * 200);
                }
            },
            { threshold: 0.2 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, [index]);

    // Subtle card tilt based on mouse position
    const tiltX = mousePosition.y * 3;
    const tiltY = mousePosition.x * -3;

    return (
        <div
            ref={cardRef}
            className={`group relative rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 
        hover:border-white/20 hover:from-white/[0.12] hover:to-white/[0.04] 
        transition-all duration-700 ease-out overflow-hidden
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
            style={{
                transform: isVisible ? `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)` : 'translateY(64px)',
            }}
        >
            {/* Header Section */}
            <div className="p-6 pb-4">
                {/* Stage Badge & Icon Row - Left and Right */}
                <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-white text-black text-sm font-bold rounded-full shadow-lg">
                        {feature.stage}
                    </span>
                    <div className="text-white/40 group-hover:text-white/70 transition-colors duration-300">
                        {feature.icon}
                    </div>
                </div>

                {/* Title - Centered */}
                <h3 className="text-2xl font-bold text-white group-hover:text-white transition-colors text-center">
                    {feature.title}
                </h3>
                <p className="text-sm text-white/40 mt-1 tracking-wide uppercase text-center">
                    {feature.subtitle}
                </p>
            </div>

            {/* iPhone Frame Container */}
            <div className="relative px-4 pb-6 flex justify-center">
                {/* iPhone Device Frame */}
                <div className="relative">
                    {/* Outer iPhone Frame */}
                    <div className="relative bg-[#1a1a1a] rounded-[3rem] p-2 shadow-2xl shadow-black/50">
                        {/* Inner Screen Bezel */}
                        <div className="relative bg-black rounded-[2.5rem] overflow-hidden" style={{ width: '350px', height: '720px' }}>

                            {/* App Screenshot */}
                            <img
                                src={feature.image}
                                alt={feature.title}
                                className="absolute inset-0 w-full h-full object-cover object-top"
                                style={{ imageRendering: 'auto' }}
                            />

                            {/* Screen Glare Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30 pointer-events-none" />

                            {/* Hover Glare */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Side Button */}
                    <div className="absolute right-[-3px] top-28 w-1 h-12 bg-[#2a2a2a] rounded-r-sm" />
                    <div className="absolute left-[-3px] top-24 w-1 h-8 bg-[#2a2a2a] rounded-l-sm" />
                    <div className="absolute left-[-3px] top-36 w-1 h-16 bg-[#2a2a2a] rounded-l-sm" />
                </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.04), transparent 40%)'
                }}
            />
        </div>
    );
};

const Features = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const sectionRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
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

    return (
        <section ref={sectionRef} className="relative py-32 lg:py-40 px-6 lg:px-12">
            {/* Background Glow - Interactive */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[100px] transition-transform duration-700 ease-out"
                    style={{
                        transform: `translate(${mousePosition.x * 40}px, ${mousePosition.y * 20}px)`,
                    }}
                />
                <div
                    className="absolute bottom-1/3 -right-40 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] transition-transform duration-700 ease-out"
                    style={{
                        transform: `translate(${mousePosition.x * -30}px, ${mousePosition.y * -15}px)`,
                    }}
                />
            </div>

            <div className="relative max-w-7xl mx-auto">
                {/* Section Header */}
                <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <span className="inline-block px-4 py-2 rounded-full border border-white/10 text-xs tracking-[0.3em] uppercase text-white/50 mb-8">
                        App Preview
                    </span>
                    {/* Title */}
                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-white">
                        Your Trail{' '}
                        <span className="bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Companion</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-white/40 max-w-2xl mx-auto leading-relaxed">
                        Everything you need, right in your pocket.
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                    {features.map((feature, index) => (
                        <FeatureCard key={feature.stage} feature={feature} index={index} mousePosition={mousePosition} />
                    ))}
                </div>

                {/* Bottom tagline */}
                <div className={`text-center mt-16 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-white/30 text-lg max-w-xl mx-auto">
                        "We built this because we spent way too many hours researching gear, weather, and trail conditions before every trip. Now it's all in one place."
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Features;

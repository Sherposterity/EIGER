import { useEffect, useRef, useState } from 'react';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

// Scroll-reactive snow particles — always visible, move with scroll direction.
const makeParticle = (side) => {
  let x, dx;
  if (side === 'left') {
    x = 600 + Math.random() * 110;
    dx = -60 - Math.random() * 260;
  } else if (side === 'right') {
    x = 730 + Math.random() * 110;
    dx = 60 + Math.random() * 260;
  } else {
    x = 685 + Math.random() * 70;
    dx = (Math.random() - 0.5) * 120;
  }
  return {
    x,
    y: 180 + Math.random() * 340,
    dx,
    dy: 260 + Math.random() * 380,
    r: 1.2 + Math.random() * 2.8,
    alpha: 0.55 + Math.random() * 0.4,
    wobble: 0.6 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
  };
};

const ALL_PARTICLES = [
  ...Array.from({ length: 30 }, () => makeParticle('center')),
  ...Array.from({ length: 26 }, () => makeParticle('left')),
  ...Array.from({ length: 26 }, () => makeParticle('right')),
];

const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: (i * 163.7) % 1440,
  y: (i * 91.3) % 380,
  r: i % 7 === 0 ? 1.4 : 0.7,
  a: 0.2 + (i % 4) * 0.15,
}));

const MissionAvalancheCanvas = ({ progressTargetRef = null }) => {
  const [scroll, setScroll] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const rafRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = (e) => setReducedMotion(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', h);
      return () => mq.removeEventListener('change', h);
    }
    mq.addListener(h);
    return () => mq.removeListener(h);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const readScroll = () => {
      const target = progressTargetRef?.current;
      if (target) {
        const rect = target.getBoundingClientRect();
        const travel = Math.max(rect.height - window.innerHeight, 1);
        return clamp(-rect.top / travel, 0, 1);
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    };

    const update = () => {
      const next = readScroll();
      setScroll((p) => (Math.abs(p - next) < 0.001 ? p : next));
      rafRef.current = 0;
    };

    const tick = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(update);
    };

    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);

    return () => {
      window.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [progressTargetRef, reducedMotion]);

  const m = reducedMotion ? 0 : scroll;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">

      {/* Night sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#03080f] via-[#070b12] to-[#0A0A0A]" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <defs>
          <linearGradient id="g-mtn-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12182a" />
            <stop offset="100%" stopColor="#0A0A0A" />
          </linearGradient>
          <linearGradient id="g-mtn-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#161d30" />
            <stop offset="100%" stopColor="#0A0A0A" />
          </linearGradient>
          <linearGradient id="g-mtn-main" x1="0.35" y1="0" x2="0.65" y2="1">
            <stop offset="0%" stopColor="#20263a" />
            <stop offset="40%" stopColor="#141820" />
            <stop offset="100%" stopColor="#0A0A0A" />
          </linearGradient>
          <linearGradient id="g-snow-cap" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
            <stop offset="55%" stopColor="rgba(210,225,245,0.6)" />
            <stop offset="100%" stopColor="rgba(180,205,235,0)" />
          </linearGradient>
          <linearGradient id="g-snow-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
            <stop offset="100%" stopColor="rgba(200,218,240,0)" />
          </linearGradient>
          <linearGradient id="g-snow-right" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(215,228,248,0.55)" />
            <stop offset="100%" stopColor="rgba(160,182,215,0)" />
          </linearGradient>
          <filter id="f-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="f-particle-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stars */}
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.a} />
        ))}

        {/* Far background range */}
        <path
          d="M0 900 L0 730 L130 670 L280 720 L430 610 L560 660 L700 560 L830 600 L980 530 L1120 580 L1260 510 L1380 555 L1440 530 L1440 900 Z"
          fill="url(#g-mtn-far)"
          opacity="0.55"
        />

        {/* Mid range */}
        <path
          d="M0 900 L0 820 L160 770 L310 810 L440 720 L570 760 L700 660 L820 700 L950 630 L1080 670 L1210 600 L1320 645 L1440 620 L1440 900 Z"
          fill="url(#g-mtn-mid)"
          opacity="0.72"
        />

        {/* Main mountain body */}
        <path
          d="M0 900 L300 900 L390 850 L500 875 L575 760 L630 780 L672 610 L700 410 L720 130 L740 410 L768 610 L810 780 L865 760 L940 875 L1050 850 L1140 900 L1440 900 Z"
          fill="url(#g-mtn-main)"
        />

        {/* Left face shadow */}
        <path
          d="M575 760 L630 780 L672 610 L700 410 L720 130 L694 260 L668 380 L640 520 L610 660 L585 740 Z"
          fill="rgba(10,12,20,0.75)"
        />

        {/* Right face light */}
        <path
          d="M720 130 L740 410 L768 610 L810 780 L865 760 L840 640 L815 500 L788 370 L762 250 Z"
          fill="rgba(18,22,35,0.55)"
        />

        {/* Left shoulder */}
        <path
          d="M390 850 L440 820 L490 840 L545 800 L575 760 L545 780 L510 760 L470 775 L430 840 Z"
          fill="rgba(14,17,28,0.85)"
        />

        {/* Right shoulder */}
        <path
          d="M865 760 L895 800 L935 780 L970 800 L1000 820 L1050 850 L1000 835 L968 820 L940 840 L900 820 L865 760 Z"
          fill="rgba(14,17,28,0.85)"
        />

        {/* Snow cap */}
        <path
          d="M720 130 L703 192 L690 248 L678 302 L666 355 L678 348 L690 328 L704 346 L712 368 L720 380 L728 368 L736 346 L750 328 L762 348 L774 355 L762 302 L750 248 L737 192 Z"
          fill="url(#g-snow-cap)"
          filter="url(#f-glow)"
        />

        {/* Snow on left face */}
        <path
          d="M690 248 L666 355 L652 408 L662 388 L676 405 L682 432 L694 414 L698 442 L708 458 L710 430 L700 400 L696 360 L698 300 Z"
          fill="url(#g-snow-left)"
          opacity="0.72"
        />

        {/* Snow on right face */}
        <path
          d="M737 192 L750 248 L762 302 L774 355 L790 375 L778 400 L766 422 L762 448 L752 428 L744 454 L736 432 L728 408 L730 370 L740 340 Z"
          fill="url(#g-snow-right)"
          opacity="0.52"
        />

        {/* Snow ledge accents */}
        <path d="M642 510 L652 496 L666 508 L654 524 Z" fill="rgba(255,255,255,0.28)" />
        <path d="M620 600 L632 585 L648 597 L635 613 Z" fill="rgba(255,255,255,0.22)" />
        <path d="M660 462 L671 448 L685 461 L672 477 Z" fill="rgba(255,255,255,0.3)" />
        <path d="M798 510 L810 496 L824 508 L812 524 Z" fill="rgba(255,255,255,0.22)" />
        <path d="M778 462 L790 448 L804 461 L792 477 Z" fill="rgba(255,255,255,0.22)" />

        {/* Ridge highlights */}
        <path
          d="M720 130 L700 200 L685 265 L668 325 L648 395 L625 480 L600 575 L578 690 L558 780 L540 840"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1.5"
        />
        <path
          d="M720 130 L740 200 L755 265 L772 325 L792 395 L815 480 L840 575 L862 690 L882 780 L900 840"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1.5"
        />

        {/* Peak glow */}
        <path
          d="M720 130 L713 158 L720 148 L727 158 Z"
          fill="rgba(255,255,255,0.92)"
          filter="url(#f-glow)"
        />

        {/* === SCROLL-REACTIVE SNOW PARTICLES === */}
        {/* Always visible. Move outward/downward as user scrolls down; return as user scrolls up. */}
        {ALL_PARTICLES.map((p, i) => {
          const t = easeOutCubic(m);
          const px = p.x + t * p.dx + Math.sin(m * Math.PI * 2 * p.wobble + p.phase) * 14;
          const py = p.y + t * p.dy;
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={p.r}
              fill="rgba(240,250,255,0.95)"
              opacity={p.alpha}
              filter={p.r > 2.6 ? 'url(#f-particle-glow)' : undefined}
            />
          );
        })}

        {/* Subtle foreground terrain */}
        <path
          d="M0 900 L0 875 L120 885 L250 868 L380 882 L510 862 L640 878 L720 858 L800 878 L930 862 L1060 882 L1190 868 L1320 885 L1440 875 L1440 900 Z"
          fill="rgba(255,255,255,0.035)"
        />
      </svg>

      {/* Edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_50%,rgba(0,0,0,0.45)_100%)]" />

      {/* Bottom blend */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
    </div>
  );
};

export default MissionAvalancheCanvas;

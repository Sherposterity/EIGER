import { Link } from 'react-router-dom';
import { phaseFor } from '../lib/giveawayWindow';

// First thing on the home page: a slim glass pill above the hero logo that
// points at the launch giveaway. Copy follows the window (opens / ends) and
// the pill disappears once the giveaway has closed. Monochrome to match the
// site; the pulsing dot is the only motion.
const GiveawayPill = () => {
  const phase = phaseFor();
  if (phase === 'closed') return null;
  return (
    <Link
      to="/giveaway"
      className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 py-2 pl-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-white/50 hover:bg-white/15"
      aria-label="Launch giveaway: win the gear of your choice, up to USD 500. Open the giveaway page."
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      <span>Launch giveaway</span>
      <span className="hidden text-white/50 sm:inline">{phase === 'upcoming' ? 'Opens Oct 1' : 'Ends Nov 10'}</span>
      <span className="text-white/70">Win gear up to $500</span>
      <span className="text-white/50 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true">&rarr;</span>
    </Link>
  );
};

export default GiveawayPill;

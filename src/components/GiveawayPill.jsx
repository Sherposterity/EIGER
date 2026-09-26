import { Link } from 'react-router-dom';
import { ArrowRight, Ticket } from 'lucide-react';
import { phaseFor } from '../lib/giveawayWindow';

// Sits above the hero H1 and points at the launch giveaway. Copy follows the
// window (opens / ends) and the pill disappears once the giveaway has closed.
// Monochrome; a Lucide ticket glyph marks it, nothing pulses or loops.
const GiveawayPill = () => {
  const phase = phaseFor();
  if (phase === 'closed') return null;
  return (
    <Link
      to="/giveaway"
      className="group inline-flex max-w-full items-center gap-2.5 rounded-pill border border-line-strong bg-bg/50 py-2 pr-4 pl-3 text-eyebrow font-semibold uppercase text-fg backdrop-blur-md transition-colors duration-300 outline-none hover:border-fg/40 hover:bg-bg/70 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      aria-label={phase === 'upcoming' ? 'Giveaway coming soon. Open the giveaway page.' : 'Thank you giveaway: win the gear of your choice, up to USD 500. Open the giveaway page.'}
    >
      <Ticket aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="whitespace-nowrap">{phase === 'upcoming' ? 'Giveaway' : 'Thank you giveaway'}</span>
      <span className="hidden font-mono tracking-normal whitespace-nowrap text-fg-subtle normal-case sm:inline">
        {phase === 'upcoming' ? 'Coming soon' : 'Ends Dec 31'}
      </span>
      {phase === 'upcoming' ? null : (
        <span className="hidden whitespace-nowrap text-fg-muted min-[480px]:inline">Win gear up to $500</span>
      )}
      <ArrowRight
        aria-hidden="true"
        className="size-3.5 shrink-0 text-fg-subtle transition-transform duration-300 group-hover:translate-x-0.5"
      />
    </Link>
  );
};

export default GiveawayPill;

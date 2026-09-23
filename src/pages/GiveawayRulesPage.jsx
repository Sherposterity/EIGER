import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import { GIVEAWAY, TASKS } from '../lib/giveaway';

// Official rules for the launch giveaway. Drafted 2026-09-22 from the legal
// review (US sweepstakes law, Canada skill-testing question, UK CAP code,
// France post-2014, Swiss sales-promotion games, GDPR consent, platform
// releases). To be read by counsel before the page goes live. No dashes.

const fmt = (iso) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' UTC';

const Section = ({ n, title, children }) => (
  <section className="border-t border-white/10 py-8">
    <h2 className="text-lg font-semibold">
      <span className="mr-3 text-white/30">{n}.</span>
      {title}
    </h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/60">{children}</div>
  </section>
);

export default function GiveawayRulesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const s = GIVEAWAY.sponsor;
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-36 lg:pt-44">
        <span className="inline-block rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-white/50">Official rules</span>
        <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Eiger Launch Giveaway</h1>
        <p className="mt-4 text-white/60">
          NO PURCHASE, PAYMENT, OR PLEDGE OF ANY KIND IS NECESSARY TO ENTER OR WIN. A purchase, payment, or pledge will not increase your chances of winning. Void where prohibited.
        </p>
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/40">
          <Link to="/giveaway" className="underline underline-offset-4 hover:text-white">Back to the giveaway</Link>
          <a href="/terms.html" className="underline underline-offset-4 hover:text-white">Terms of Use</a>
          <a href="/privacy.html" className="underline underline-offset-4 hover:text-white">Privacy Policy</a>
        </p>

        <div className="mt-10">
          <Section n={1} title="Sponsor">
            <p>The Eiger Launch Giveaway (the "Giveaway") is sponsored by {s.name}, {s.place} (the "Sponsor"). Contact: {s.email}.</p>
            <p>This promotion is in no way sponsored, endorsed, administered by, or associated with TikTok, Instagram, Meta Platforms, Apple, Google, or Kickstarter. Any questions, comments, or complaints regarding the Giveaway must be directed to the Sponsor, not to those companies. By entering, you release each of them from any liability connected with the Giveaway.</p>
          </Section>

          <Section n={2} title="Giveaway period">
            <p>The Giveaway opens at {fmt(GIVEAWAY.opensAt)} and closes at {fmt(GIVEAWAY.closesAt)} (the "Giveaway Period"). Entries received outside the Giveaway Period are void. The Sponsor's clock is the official clock.</p>
          </Section>

          <Section n={3} title="Eligibility">
            <p>The Giveaway is open to natural persons who, at the time of entry, are 18 years of age or older or have reached the age of majority in their place of residence, whichever is greater, and who reside in a country where this kind of promotion is lawful.</p>
            <p>The Giveaway is not open to residents of {GIVEAWAY.excludedRegions}. It is also not open to employees, contractors, officers, and immediate family or household members of the Sponsor.</p>
            <p>Residents of Canada must correctly answer a time-limited mathematical skill-testing question before being declared a winner. Entrants in the European Union, the United Kingdom, and Switzerland have the data protection rights described in Section 10.</p>
          </Section>

          <Section n={4} title="How to enter">
            <p>Go to eiger014.com/giveaway during the Giveaway Period, enter your email address and country, confirm your eligibility and acceptance of these rules, and submit the form. This free entry earns one (1) ticket and is all that is required to be included in the draw. Limit one entry per person and per email address. Entries by agents, bots, or automated means are void.</p>
            <p>Free alternative method of entry: send an email with the subject "Giveaway entry" and your full name and country to {s.email} during the Giveaway Period. Mail-in style entries receive one (1) ticket and are treated identically to entries made on the website.</p>
          </Section>

          <Section n={5} title="Bonus tickets">
            <p>After entering, an entrant may earn additional tickets by completing any of the following optional and free actions, up to a maximum of {GIVEAWAY.maxTickets} tickets in total per entrant:</p>
            <ul className="list-disc space-y-1 pl-6">
              {TASKS.map((t) => (
                <li key={t.id}>
                  {t.label}: {t.tickets} ticket{t.tickets === 1 ? '' : 's'}
                  {t.perUnit ? ` per friend, up to ${t.maxUnits} friends` : ''}
                  {t.verifiable ? '' : ' (confirmed by the entrant on the page)'}
                </li>
              ))}
            </ul>
            <p>Referral tickets are credited only when the referred person enters the Giveaway and creates an Eiger account with the email they entered with. Self-referrals, duplicate accounts, and referrals of the same person more than once do not count. Following a social media account or visiting a page never requires any payment. Backing a crowdfunding campaign is never required and earns no tickets.</p>
            <p>The Sponsor may verify any action and may remove tickets that were not honestly earned. No action in this Giveaway asks for or rewards an app store rating or review.</p>
          </Section>

          <Section n={6} title="Prize">
            <p>One (1) prize: a piece of mountaineering gear of the winner's choice with a retail value of up to five hundred United States dollars (USD 500), purchased by the Sponsor and shipped to the winner. Approximate retail value: USD {GIVEAWAY.prize.valueUsd}. The Sponsor will make reasonable efforts to purchase the item from a retailer in the winner's country. If the chosen item is unavailable, the Sponsor may substitute an item of equal or greater value in consultation with the winner. No cash alternative and no transfer of the prize, except at the Sponsor's sole discretion.</p>
            <p>Any customs duties, import fees, or taxes on the prize are the winner's responsibility. The winner is responsible for any income tax due in their country. For winners in the United States, prizes of USD 600 or more in a calendar year are reported on IRS Form 1099.</p>
          </Section>

          <Section n={7} title="Winner selection and odds">
            <p>Within seven (7) days after the Giveaway Period closes, the Sponsor will select one potential winner by random drawing from all valid tickets. Each ticket has an equal chance. Odds of winning depend on the number of valid tickets received. The Sponsor will publish the drawing method and the total number of tickets on the giveaway page.</p>
          </Section>

          <Section n={8} title="Winner notification and verification">
            <p>The potential winner will be notified by email at the address used to enter. To claim the prize, the potential winner must respond within seven (7) days, confirm eligibility, provide a shipping address, and, if a resident of Canada, correctly answer the skill-testing question. If the potential winner does not respond in time, is ineligible, or declines, the prize is forfeited and an alternate winner may be drawn.</p>
            <p>The Sponsor may publish the winner's first name and country. Any further publicity is with the winner's consent. A list of the winner's first name and country is available on request to {s.email} for sixty (60) days after the draw.</p>
          </Section>

          <Section n={9} title="General conditions">
            <p>By entering you agree to these rules, to the Sponsor's <a href="/terms.html" className="underline underline-offset-4 hover:text-white">Terms of Use</a> and <a href="/privacy.html" className="underline underline-offset-4 hover:text-white">Privacy Policy</a>, and to the Sponsor's decisions, which are final. The Sponsor may disqualify anyone who tampers with the entry process, acts in bad faith, or breaches these rules, and may cancel, suspend, or modify the Giveaway if fraud, technical failure, or any cause beyond its control affects its integrity, in which case the prize will be awarded from the valid entries received before the action. The Sponsor is not responsible for lost, late, incomplete, or misdirected entries, or for technical failures of any kind.</p>
            <p>These rules are governed by the laws of the State of Texas, United States, without regard to conflict of law principles, except where the mandatory consumer law of the entrant's place of residence provides otherwise.</p>
          </Section>

          <Section n={10} title="Privacy">
            <p>Personal information collected for the Giveaway (email, country, referral relationships, task confirmations, and, for the winner, name and shipping address) is used to administer the Giveaway and, with the consent given at entry, to send email about the Giveaway and the Eiger app. You can unsubscribe at any time using the link in any email or by writing to {s.email}. The Sponsor's <a href="/privacy.html" className="underline underline-offset-4 hover:text-white">Privacy Policy</a> applies. Entrants in the European Union, the United Kingdom, and Switzerland may request access to, correction of, or deletion of their data at {s.email}. Shipping details are deleted after the prize is delivered.</p>
          </Section>

          <Section n={11} title="Platform notices">
            <p>Instagram and TikTok are not sponsors of this Giveaway and are released from all responsibility. Entrants who post about the Giveaway on any platform should disclose it as a giveaway, for example with the hashtag #giveaway or #sweepstakes. Apple and Google are not sponsors, and the Eiger app is available free of charge on the App Store and Google Play regardless of this Giveaway.</p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-white/30">Last updated 2026-09-22.</p>
      </main>
      <Footer />
    </div>
  );
}

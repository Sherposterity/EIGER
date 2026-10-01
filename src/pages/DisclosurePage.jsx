import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import usePageHead from '../components/usePageHead';
import { focusRing } from '../components/home/utils';
import { STATIC_HEADS } from '../lib/routeHeads';

// /disclosure: plain-language affiliate and product-link disclosure. Linked
// from the footer legal row and under the product lists on every mountain
// page. Copy logged in docs/COPY.md, "Mountain gear pages (2026-09-30)".

const inlineLink = `rounded-sm text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`;

export default function DisclosurePage() {
  usePageHead(STATIC_HEADS['/disclosure']);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pt-32 pb-section-sm sm:px-6 sm:pt-40 lg:px-8">
        <p className="font-mono text-eyebrow font-semibold uppercase text-fg-subtle">Disclosure</p>
        <h1 className="mt-3 text-balance font-display text-display-md">How product links work on EIGER</h1>
        <div className="mt-8 space-y-5 text-body text-fg-muted sm:text-body-lg">
          <p>
            Our mountain pages and the EIGER app link to products sold by brands and retailers. EIGER may earn a
            commission when you buy through some of those links. You pay the same price either way.
          </p>
          <p>
            A commission never changes which products we recommend. Recommendations come from each mountain&apos;s gear
            list: what the mountain calls for, and products in our catalogue that match it.
          </p>
          <p>We do not accept payment for placement. No brand can pay to be listed or to rank higher.</p>
          <p>
            Product links open the brand or retailer site in a new tab and are marked as sponsored links for search
            engines. We do not show product photos; names and brands only.
          </p>
          <p>
            Questions? Write to{' '}
            <a href="mailto:support@eiger014.com" className={inlineLink}>
              support@eiger014.com
            </a>
            . See also{' '}
            <Link to="/verification" className={inlineLink}>
              how we pick gear
            </Link>
            .
          </p>
          <p className="text-small text-fg-subtle">Eiger LLC. Last updated September 30, 2026.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

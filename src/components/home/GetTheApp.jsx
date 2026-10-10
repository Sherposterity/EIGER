import storeLinks from '@/data/store-links.json';

// A badge is live as soon as its store URL exists in store-links.json. Play
// production 1.4.0 went public on 2026-09-26, so the Android badge no longer
// waits for the campaign launch instant. iOS went live on the App Store on
// 2026-10-09; ios_beta (the TestFlight link) only shows while ios is null.
const linkFor = (key) => storeLinks[key] || null;
import { FadeIn } from './motion';
import { focusRing } from './utils';

// "Available on iOS and Android": the official store badges, unaltered, with
// their required clear space. Links come from src/data/store-links.json; while
// a link is null the badge renders disabled with a dated note. QR codes are
// generated at build time by scripts/qr.mjs, only for stores that have a link,
// and show beside the badge on desktop.
const STORES = [
  {
    key: 'ios',
    badge: '/badges/app-store.svg',
    alt: 'Download on the App Store',
    // Apple's badge carries no padding; clear space is a quarter of its height.
    imgClass: 'h-12 w-auto',
    padClass: 'p-3',
  },
  {
    key: 'android',
    badge: '/badges/google-play.png',
    alt: 'Get it on Google Play',
    // Google's PNG already includes its clear space; 70 px tall makes the
    // badge itself match Apple's 48 px.
    imgClass: 'h-[70px] w-auto',
    padClass: '',
  },
];

function StoreBadge({ store }) {
  const href = linkFor(store.key);
  const img = (
    <img
      src={store.badge}
      alt={store.alt}
      width={store.key === 'ios' ? 144 : 181}
      height={store.key === 'ios' ? 48 : 70}
      loading="lazy"
      className={store.imgClass}
    />
  );

  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2 md:items-start">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex rounded-md transition-transform duration-300 hover:-translate-y-0.5 ${store.padClass} ${focusRing}`}
          >
            {img}
          </a>
        ) : (
          <span
            role="link"
            aria-disabled="true"
            className={`inline-flex cursor-not-allowed opacity-60 ${store.padClass}`}
          >
            {img}
          </span>
        )}
        {store.key === 'ios' && !href && linkFor('ios_beta') ? (
          // App Store listing in Apple's review: the public TestFlight beta
          // stands in until the badge goes live (Rishav, 2026-10-01).
          <a
            href={linkFor('ios_beta')}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-small font-medium text-fg underline decoration-line underline-offset-4 hover:decoration-fg ${focusRing}`}
          >
            iPhone: join the TestFlight beta
          </a>
        ) : null}
      </div>
      {href ? (
        <img
          src={`/badges/qr-${store.key}.svg`}
          alt=""
          aria-hidden="true"
          width="96"
          height="96"
          loading="lazy"
          className="hidden size-24 rounded-sm md:block"
        />
      ) : null}
    </div>
  );
}

const GetTheApp = () => {
  const anyMissing = STORES.some((s) => !linkFor(s.key));

  return (
    <section
      id="get-the-app"
      aria-labelledby="get-the-app-heading"
      className="scroll-mt-16 border-t border-line bg-bg py-section"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 text-center sm:px-6 md:items-start md:text-left lg:px-8">
        <FadeIn>
          <h2 id="get-the-app-heading" className="font-display text-display-lg text-balance text-fg">
            Available on iOS and Android
          </h2>
        </FadeIn>
        <FadeIn delay={0.06}>
          <p className="mt-5 text-body-lg text-fg-muted">Download it today on iPhone and Android.</p>
        </FadeIn>

        <FadeIn delay={0.12} className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:gap-6 md:-ml-3">
          {STORES.map((store) => (
            <StoreBadge key={store.key} store={store} />
          ))}
        </FadeIn>

        {anyMissing ? (
          <p className="mt-4 font-mono text-small text-fg-subtle">App Store listing pending review</p>
        ) : null}
      </div>
    </section>
  );
};

export default GetTheApp;

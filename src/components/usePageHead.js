import { useEffect } from 'react';
import { SITE_URL } from '../lib/mountains';

// No head manager on this site (see PricingPage): set the title, meta
// description and canonical URL while a page is mounted, optionally add a
// JSON-LD block, and put everything back on the way out.
export default function usePageHead({ title, description, path, jsonLd }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : null;
  useEffect(() => {
    const prevTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute('content');
    const canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute('href');
    document.title = title;
    meta?.setAttribute('content', description);
    if (path) canonical?.setAttribute('href', `${SITE_URL}${path}`);
    let script = null;
    if (ld) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = ld;
      document.head.appendChild(script);
    }
    return () => {
      document.title = prevTitle;
      if (meta && prevDescription != null) meta.setAttribute('content', prevDescription);
      if (canonical && prevCanonical != null) canonical.setAttribute('href', prevCanonical);
      script?.remove();
    };
  }, [title, description, path, ld]);
}

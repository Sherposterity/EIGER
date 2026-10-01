// Title, meta description and canonical path for every prerendered route.
// One table, used twice: pages set it while mounted (usePageHead) and
// scripts/copy-routes.mjs writes it into each route folder's static HTML, so
// crawlers never see the home page's canonical on another page. Pure (no JSON
// imports) so node --test and the build script can load it.
export const SITE_URL = 'https://eiger014.com';

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Prerendered route folders get their own title, description, canonical and
// share tags in the static HTML, so crawlers that do not run JavaScript see
// the right page. Replaces the tags index.html already carries.
export function htmlWithHead(html, { title, description, path }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const url = `${SITE_URL}${path}`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${d}$2`);
}

export const pricingDescription = (prices) =>
  `Every mountain's gear list on EIGER is free forever. EIGER Pro is $${prices.annual} a year with a ${prices.trialDays}-day free trial, or $${prices.weekly} a week.`;

const ABOUT = {
  path: '/about',
  title: 'About | EIGER',
  description: 'About EIGER: who we are, and why we build an app that tells you what gear to bring for the mountain you are climbing.',
};

// Static heads. /pricing is added by routeHeads() because its description
// carries the live prices from src/data/plans.json.
export const STATIC_HEADS = {
  '/about': ABOUT,
  // /mission redirects to /about (MISSION_REDIRECT), so its canonical is /about.
  '/mission': ABOUT,
  '/verification': {
    path: '/verification',
    title: 'Verification process | EIGER',
    description:
      'How EIGER builds each gear list, from manufacturer specs and guide sources to mountaineer review, and how to apply to verify.',
  },
  '/giveaway': {
    path: '/giveaway',
    title: 'Giveaway | EIGER',
    description:
      'The EIGER Thank You Giveaway opens November 15: win a piece of mountaineering gear of your choice. Nothing to buy or back to enter.',
  },
  '/giveaway/rules': {
    path: '/giveaway/rules',
    title: 'Giveaway official rules | EIGER',
    description: 'Official rules for the Eiger Thank You Giveaway. No purchase, payment or pledge is necessary to enter or win.',
  },
  '/kickstarter': {
    path: '/kickstarter',
    title: 'Kickstarter | EIGER',
    description: 'Back EIGER on Kickstarter and help fund app development, research and the safety work behind every gear list.',
  },
  '/request': {
    path: '/request',
    title: 'Request a mountain | EIGER',
    description: 'Pick from over 48,000 named peaks and ask for the mountain you want in EIGER next. Your requests decide which mountains we verify next.',
  },
  '/disclosure': {
    path: '/disclosure',
    title: 'Product link disclosure | EIGER',
    description:
      'How product links on EIGER work: we may earn a commission on some links, and it never changes which products we recommend.',
  },
};

export function routeHeads(prices) {
  return {
    ...STATIC_HEADS,
    '/pricing': { path: '/pricing', title: 'Pricing | EIGER', description: pricingDescription(prices) },
  };
}

// Every prerendered folder: [{ route, head, html }]. route is the folder path
// ('/giveaway/rules'); head.path is the canonical path (differs only for /mission).
export function prerenderPages(shell, { prices }) {
  return Object.entries(routeHeads(prices)).map(([route, head]) => ({ route, head, html: htmlWithHead(shell, head) }));
}

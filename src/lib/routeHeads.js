// Title, meta description and canonical path for every prerendered route.
// One table, used twice: pages set it while mounted (usePageHead) and
// scripts/copy-routes.mjs writes it into each route folder's static HTML, so
// crawlers never see the home page's canonical on another page. Pure (no JSON
// imports) so node --test and the build script can load it.
import {
  DISCLOSURE_DESCRIPTION,
  DISCLOSURE_TITLE,
  INDEX_DESCRIPTION,
  INDEX_TITLE,
  htmlWithHead,
  mountainDescription,
  mountainPath,
  mountainTitle,
} from './mountains.js';

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
  '/mountains': { path: '/mountains', title: INDEX_TITLE, description: INDEX_DESCRIPTION },
  '/disclosure': { path: '/disclosure', title: DISCLOSURE_TITLE, description: DISCLOSURE_DESCRIPTION },
};

export function routeHeads(prices) {
  return {
    ...STATIC_HEADS,
    '/pricing': { path: '/pricing', title: 'Pricing | EIGER', description: pricingDescription(prices) },
  };
}

// Every prerendered folder: [{ route, head, html }]. route is the folder path
// ('/giveaway/rules'); head.path is the canonical path (differs only for /mission).
export function prerenderPages(shell, { prices, mountains }) {
  const heads = routeHeads(prices);
  const pages = Object.entries(heads).map(([route, head]) => ({ route, head }));
  for (const m of mountains) {
    const path = mountainPath(m.slug);
    pages.push({ route: path, head: { path, title: mountainTitle(m.name), description: mountainDescription(m) } });
  }
  return pages.map((p) => ({ ...p, html: htmlWithHead(shell, p.head) }));
}

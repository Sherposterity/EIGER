# EIGER website

Marketing site for the EIGER app, live at https://eiger014.com. React 19 + Vite 7 + Tailwind 4,
hosted on GitHub Pages.

## Develop

```
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY for the email form
npm run dev
```

## Deploy

Push to `main` on `Sherposterity/EIGER`. The `Deploy static content to Pages` workflow
(`.github/workflows/static.yml`) builds with the Supabase values from the repo's Actions
variables and publishes `dist/`. Nothing else deploys; do not publish a local build.

## Routes

The app uses hash routes (`/#/mission`, `/#/about`). `public/404.html` forwards bare `/mission`
and `/about` to the hash route so shared links without the `#` still land.

## Static pages

`public/support.html`, `privacy.html`, `terms.html`, `delete-account.html` are plain HTML and
are linked from the footer. Keep copy free of em and en dashes (founder rule).

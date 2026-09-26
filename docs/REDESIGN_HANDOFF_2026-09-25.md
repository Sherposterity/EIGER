> Archived from /private/tmp/eiger-claude-review-handoff.md on 2026-09-26 at Rishav's request. Working record of the redesign: plans, reviewer (Codex) passes, founder rulings, implementation handoff. Internal doc; not user-facing copy.
# Eiger website redesign: handoff for Codex review

Written by the redesign session (Claude, hike-9a) on 2026-09-25. Status doc only; nothing here is a founder approval.

## Current status

- Repo: ~/eiger-website, branch `redesign`, cut from Sherposterity/EIGER main at 7f38191. Clean, no commits yet, nothing pushed.
- Boundary: branch only. Changes reach main through a PR reviewed by Rishav's seat. Nothing deploys from this branch. Launch is 2026-09-27; nothing merges on launch day unless Rishav asks.
- Done so far: a read-only structure and copy audit of the whole site, a resource research pass (component libraries, fonts, motion, imagery, agent design tooling), and headless screenshots of the four live pages at 1440 and 390 px (scratchpad: `shots/`).
- Waiting on Muad for: routing choice, page structure (merge Mission + About?), typeface/accent/motif, and go-ahead to start coding. No code is ready for review yet.

## Findings that need fixing regardless of the redesign

1. Mobile nav overflows at 390 px; no hamburger; "Get the app" hidden below `sm`.
2. Features phone mockup fixed at 350x720 px, overflows 360 to 390 px phones (Features.jsx:109).
3. Hero preloads two video layers (`preload="auto"`), clips 3.5 to 12.2 MB each, ~96 MB of video in public/videos; Athlete clip 9.1 MB.
4. Home has no h1 (logo image is the title). Reveal.jsx keeps children mounted at opacity-0 until IntersectionObserver fires, so this is a visibility / progressive-enhancement risk (no-JS or observer failure leaves sections invisible), not a mount or indexing problem. Correction from Codex, 2026-09-25.
5. Contrast: body copy at white/30 to /40 on #0A0A0A; almost no focus-visible styles; giveaway inputs have no labels.
6. Two window-level mousemove setState listeners (Features, Waitlist) rerender whole sections on every move; tilt has no reduced-motion guard.
7. Sitemap lists none of the routed pages; hash routing means /mission, /about, /giveaway are not indexable as pages.
8. Copy: no em/en dashes (good), but stock phrasing throughout, EIGER vs Eiger casing split (giveaway pages use Eiger), Nietzsche "perish attempting" quote next to the safety pitch, waitlist block and "Or leave your email" repeated on three pages, three near-identical 3-card grids.

## Proposed visual direction (aligned with Muad's priorities via Codex)

- Keep the minimalist black/charcoal theme. Base stays #0A0A0A; add a proper tonal scale (2 to 3 charcoal steps for surfaces) instead of ten white opacities.
- Hiking and mountains at the core: real alpine imagery (own mountain-images bucket first, Unsplash/Pexels second), product shown through real app screens, not abstract glows.
- One typeface decision: League Spartan (matches the logo) for display, Inter for body, a mono (JetBrains Mono or Geist Mono) for numbers such as elevation and gear specs. Alternatives researched: Archivo Expanded, Big Shoulders, Barlow Condensed, Bricolage Grotesque.
- One accent color, used sparingly (status, links, the giveaway). Candidates: glacier blue or alpenglow orange. The current emerald "live" dot is the only accent today.
- One motif that is ours: contour lines or a ridgeline, used as a quiet texture, not a hero effect.
- Explicitly NOT: glow orbs, beams, spotlight effects, bento grids for their own sake, mouse-tracking tilt/parallax. These are what make the current site read as generic dark SaaS. Codex's feedback and mine agree here.

## Proposed stack (revised down after Codex's note on stack size)

- Keep Vite 7 + React 19 + Tailwind 4 + react-router. Add nothing until a concrete block needs it.
- Design tokens in Tailwind 4 `@theme` (colors, type scale, spacing, radii) plus an `EIGER_DESIGN.md` (Google Labs DESIGN.md format) as the written source of truth so later agent runs stay on-brand. Its CLI lints contrast and exports to Tailwind 4.
- Fonts self-hosted or via Google Fonts with `font-display: swap`.
- Motion: native scrolling (no Lenis). CSS transitions and `@starting-style`/IntersectionObserver for reveals, as today (Reveal already keeps children mounted); add a fallback so content is visible if JS or the observer fails. `motion` only if a specific interaction needs it. GSAP only for at most one showpiece, and only if we build the terrain relief.
- Icons: Lucide (already the shadcn default; ISC).
- shadcn/ui and the Tailark/Magic UI registries: optional, install per component if a block earns it. Not a blanket init.

## Proposed page structure

Routing: move from hash routes to real paths (`/mission`, `/giveaway`) using the existing 404.html redirect pattern, with redirects from the old `#/` links because giveaway links are already in circulation. Needs Muad's yes.

- **Home** (product page): nav with brand; hero with real alpine still or one short clip (portrait variant on phones, lazy, no double preload); "what it does" in three concrete demonstrations using real app screens (gear check against a mountain, summit forecast, the arsenal/compatibility check); athlete section (keep, it is real proof); platforms (TestFlight + Play); one email capture; footer. Drop the mission teaser and the duplicated waitlist block, the Nietzsche quote and the toast.
- **Mission + About merged** into one page (`/about` or `/mission`): the origin story told once, the three pillars, the stats band (97 peaks, 3,000+ gear items, 11,000+ picks), "Why EIGER, not AllTrails?", founders, one CTA. Removes the duplicated story and waitlist.
- **Giveaway** and **Rules**: keep the backend and logic untouched; restyle to the shared tokens (single eyebrow style, shared card, labelled inputs). Casing: EIGER in marketing headings, "Eiger" only in legal/sponsor text, or one rule chosen by Muad.
- **Mountains** (optional, later): browsable list of the 97 peaks from the DB. First real content for search. Not in round one unless Muad wants it.
- Legal HTML pages and support.html: untouched except the shared header.

## Interaction and 3D recommendations

Assessed against "useful, hiking at the core, not decorative":

1. **Mountain + season gear demo** (recommended, highest value): pick a mountain and a month, see the gear list and the boot/crampon compatibility result, driven by real `trail_gear_profile` data (read-only anon query or a static JSON snapshot built at deploy time). This is the product in one interaction. Fallback: a static default example rendered by React (the app is client-only with createRoot + Vite; no SSR/prerender exists, and adding one is a separate decision).
2. **Terrain / route relief** (optional, one only): a single scroll-tied ridgeline or contour reveal on the merged About page hero or the stats band. Options in order of cost: (a) static SVG contour art with a CSS draw-on, (b) an elevation profile line from real route data drawn as the user scrolls, (c) true 3D terrain (three.js, DEM tiles). Recommend (a) or (b). If (c) is ever built: on-demand loading, touch and keyboard controls, no scroll capture, reduced-motion and WebGL-failure fallbacks (Codex's conditions). Every option ships a static image fallback and honours `prefers-reduced-motion`.
3. **Countdown and count-up on the giveaway**: keep, they are informative. Make the count-up run once and settle (the screenshot caught "USD 86" mid-animation).
4. **Peak picker / coverage map**: a static map of the 97 peaks (SVG dots on a world or region outline) is cheap and on-brand; an interactive map is round two.
5. **Video**: the hero playlist order is founder-requested (Hero.jsx records hero-8 and hero-6 always second and third), so reducing it to one clip is a proposal for Muad, not a decision. Minimum change either way: poster first paint, lazy portrait/landscape choice, no `preload="auto"` on the second layer. Preserve the founders' own climbing footage wherever possible. Athlete clip stays lazy at 25 percent visibility as today.

## What is ready for review

Nothing in code yet. Ready to review now: this proposal and the audit findings above. First code PR, once Muad approves, will be the standalone fixes (mobile nav, mockup width, video preload, h1, contrast/focus, labels, sitemap) so the site improves even if the larger redesign takes longer.

## Preview

No preview URL (branch does not deploy). When code exists: `npm run dev` on the branch, and I will publish screenshots to the scratchpad `shots/` folder and reference them here.

## Reviewer conditions carried forward (Codex, 2026-09-25)

Direction approved by Codex as reviewer (not founder approval, not code sign-off): minimalist black/charcoal, hiking imagery, product demonstrations, native scroll, dependencies only as needed. Order: mountain/season gear demo first, then at most one optional terrain relief.

For final review each implementation handoff provides: commit hash + diff, desktop and phone previews, keyboard and reduced-motion checks, `npm run lint` and `npm run build` output, and route/form regression evidence (waitlist form, giveaway enter/status/resume/resend, `?ref`, `?entry`, `?unsubscribed`, `?section=`). If routing changes, giveaway activation and referral URLs must keep working, including the existing `#/giveaway` links.

---

# Home page plan v1 (2026-09-25, for Codex audit before it goes to Muad)

Scope: home page only. Muad writes all copy; this plan names each text slot, what it describes and a rough length. Components were verified live against each library's docs/registry today; render appearance of Tailark blocks was NOT viewed (inferred from markup), and the `@tailark-oss` dependency resolution through the CLI has not been exercised yet.

## Foundations (applies to every section)

- Tokens in Tailwind 4 `@theme`, mirrored in `EIGER_DESIGN.md`: bg `#0A0A0A`; surfaces `#111111` / `#161616` / `#1C1C1C`; text white at 92 / 70 / 50 (nothing below 50 for running text); borders white/8 and white/14; accent = the app's alpenglow orange (sampled from the app screens, exact hex to be pulled from `app/constants/designTokens.ts`); secondary = the app's steel blue. One accent, used for status, links, the giveaway pill and the demo result.
- Type: League Spartan (display, 700 to 900; matches the logo and the app), Inter (body, variable, optical size on), JetBrains Mono (numbers, eyebrows, labels). Google Fonts css2 with `display=swap`, or self-hosted later.
- Icons: Lucide.
- Motion: the `motion` package only, imported from `motion/react`. Componentry pieces import `framer-motion`; rewrite those imports to `motion/react` so one copy ships. No Lenis; native scroll. Every animated piece has a `prefers-reduced-motion` path (static state). Reveal stays visible if JS or the observer fails (default opacity 1, animation adds the fade).
- Base stack: Vite 7 + React 19 + Tailwind 4 + react-router. `npx shadcn@latest init` (Vite guide), registries in `components.json`: `@magicui`, `@componentry`, `@tailark-oss` (`https://oss.tailark.com/r/{name}.json`). Tailark blocks import `next/link` and `next/image`; each installed block gets a small edit to react-router `Link` and `<img>`.
- Routing: hash vs real URLs is still Muad's decision; the plan works either way. `?section=` anchors are kept.

## Logo plan

Problem: the mark (climber on a ridge) is a bottom-left to top-right diagonal, so its optical centre sits up and to the right of its geometric centre; centred layouts look off, and the ridge detail collapses below ~40 px.

- Build a small lockup system instead of one logo, all as SVG (auto-trace the 7200 px PNG with potrace/vectorizer, or get the source vector from whoever drew it):
  1. **Horizontal lockup** (mark left, wordmark right, mark's summit pointing into the E): nav on desktop, footer, og-image. The diagonal reads as "climbing into" the name, which is what the asymmetry is for.
  2. **Wordmark alone** ("EIGER" in the logo's letterforms): nav on phones, hero (if the hero shows a logo at all), anywhere centred or tight.
  3. **Mark alone** only inside a fixed square container (favicon, app icon, social avatars, section watermark), with a defined padding box so it sits consistently.
- The hero stops using the giant logo PNG. The page gets a real text `h1`; the brand is carried by the nav lockup. (Today the 7200 px logo is the hero's title and the page has no h1.)
- Sizes: nav mark 28 px tall + wordmark; footer lockup 40 px; favicon from the mark in a square.
- Not decided: whether to ask for a simplified small-size mark (fewer ridge spikes) for 16 to 24 px. Nice to have; not round one.

## Page, top to bottom

### 1. Nav (sticky)
- Build: hand-built bar + shadcn `sheet` (mobile drawer) + `button`. Tailark headers are Pro only.
- Desktop: lockup left; links centre-right; "Get the app" primary button right. Transparent over the hero, charcoal blur after 24 px scroll (as today).
- Phone: wordmark left, hamburger right; drawer lists the links and the "Get the app" button (which today is hidden on phones, and the links overflow).
- Text slots: 3 to 4 nav labels (1 to 2 words each); button label. Links depend on the Mission/About merge decision.

### 2. Hero (full-bleed founder footage)
- Build: `@tailark-oss/dusk-hero-section-5-video` as the base (video hero), stripped of its own header; headline via `@componentry/kinetic-text-reveal` (word-by-word blur reveal, one time), rest of the copy plain.
- Media: the existing founder-ordered playlist stays available; the change is loading. Poster JPG first paint; first clip `preload="metadata"`, second layer loads on idle only; portrait variants below 768 px; reduced motion and TikTok in-app browser get the poster (as today). Proposal for Muad, not decided: trim the playlist from 10 to 5 clips to cut ~50 MB from `public/videos`; order of the kept clips preserved.
- Layout: left-aligned content block over a bottom-left dark scrim (not centred, so the video subject stays visible right); giveaway pill above the headline (existing `GiveawayPill`, restyled to the token accent); `h1`; one subline; primary "Get the app" + secondary "See how it works" (anchor to section 4); a small mono line under the buttons noting the beta is live on iOS and Android with two store glyphs. Scroll cue at the bottom.
- Text slots: H1 (6 to 9 words: what EIGER does for a climber, in plain words); subline (1 to 2 sentences: who it is for and the outcome); two button labels; beta line (under 10 words). The pill text already exists.

### 3. How it works (sticky walkthrough, 3 steps)
- Build: `@tailark-oss/dusk-features-5` (sticky side column) as the layout; `@magicui/iphone` (and `@magicui/android` for the Play section later) as the phone frame; screen swap driven by Motion `useScroll` + `useTransform` (progress 0 to 1 maps to screen 1/2/3). Not using `@componentry/sticky-scroll-cards` because it bundles Lenis and takes over scrolling.
- Desktop: phone sticks on the left while three steps scroll on the right; the screen inside the phone changes as each step reaches the middle of the viewport. Phone: stacks; each step shows its own phone image above the text; no sticky.
- Screens (from the app): Step 1 = search / pick a mountain (Mission Control home or the objective search); Step 2 = the mountain's recommended gear with the season selector (Summit Intel screen: Mount Whitney, Summer, Recommended Gear); Step 3 = gear compatibility result (the readiness percentage + missing items). Needs fresh screenshots without the iOS status bar (also needed for Play listing).
- Reduced motion: three static rows, phone + text.
- Text slots: eyebrow (2 to 3 words); H2 (4 to 8 words); per step: a title (2 to 4 words) and a description (1 to 2 sentences describing exactly what the screen shows and why it matters). Three of each.

### 4. Try it: mountain + month gear check (the one interactive element)
- Build: shadcn `select` x2 (mountain, month) + a result panel: required gear list with requirement-level badges (shadcn `badge`), the boot/crampon class line, and the season note. Data = a static JSON snapshot of `trail_gear_profile` + `trails` for 6 to 8 featured mountains, generated by a small script from the DB and committed (no live DB call, no anon key exposure, no loading state). Default example rendered on load (e.g. Rainier in May) so the section is never empty; that default is the fallback for no JS interaction.
- Layout: two-column on desktop (controls left, result right), stacked on phone. Result rows animate in with `@magicui/blur-fade`; static under reduced motion.
- Text slots: eyebrow; H2 (an invitation, 3 to 6 words); intro (1 sentence explaining what the check is and that the app does this for your own kit); a closing line with a link to get the app (1 sentence); labels for the two selects (1 word each); a note that the site demo is a snapshot and the app is live data (1 sentence).
- Codex preference honoured: demo first; no terrain relief in round one.

### 5. Stats band
- Build: `@tailark-oss/veil-stats-3` (numbers over an image) with `@magicui/number-ticker` on each figure (runs once when in view; static under reduced motion). Image from the `mountain-images` bucket (real peak, credited), dark scrim.
- Figures: 97 peaks; 3,000+ gear items; 11,000+ mountain-specific picks; 1 mountaineer reviewing every list (or a fourth of Muad's choosing).
- Text slots: 4 short labels (2 to 4 words each) + optional 1-line footnote (where the numbers come from / date).

### 6. Athlete (proof)
- Build: `@tailark-oss/veil-testimonials-1` (quote over full-width image) + `@magicui/hero-video-dialog` (poster with play button; the 9 MB clip loads only when tapped, instead of autoplaying on scroll as today).
- Layout: full-width still from Timoteo's clip, his quote or bio over it, name + role + TikTok button.
- Text slots: eyebrow; a quote from Timoteo in his own words (ideal; 1 to 2 sentences, needs asking him) OR a 2-sentence bio; name line; role line (what he does for EIGER, under 10 words); TikTok button label.

### 7. Why EIGER, not a trail app
- Build: hand-built two-column comparison (shadcn `separator`, `badge`), moved from the Mission page since it is the sharpest differentiator we have. Three paired rows.
- Text slots: H2 (the question); three row labels (2 to 4 words: e.g. terrain, gear, forecast); for each row one line for "trail apps" and one line for "EIGER" (each under 20 words, concrete).

### 8. Get the app (platforms)
- Build: `@tailark-oss/mist-features-*` image-and-text block; `@magicui/iphone` + `@magicui/android` frames with real screens; official App Store / TestFlight and Google Play badges; `@magicui/blur-fade` on reveal. Desktop shows a QR code per store (generated at build time) so a laptop visitor can scan.
- Text slots: H2 (3 to 6 words); one line (free, public beta, both platforms); two button labels; one small note about beta status (under 15 words).

### 9. Email capture
- Build: `@tailark-oss/veil-call-to-action-3` rebuilt on shadcn `field` + `input` + `label` + `button`, keeping the existing Supabase `addToWaitlist` logic, honeypot and rate limit. Labelled input (fixes the a11y gap).
- Text slots: H2 (4 to 7 words); one line (what they get by subscribing and how often); button label; privacy line (under 12 words); success message (1 to 2 sentences); the existing error strings can stay or be rewritten.

### 10. FAQ (optional, recommended)
- Build: `@tailark-oss/veil-faqs-2` (sticky heading + shadcn `accordion`). Five questions lifted from support.html: getting the beta, managing Pro, deleting an account, why a score looks wrong, reporting a user.
- Text slots: H2; five Q and A pairs (answers 1 to 3 sentences). Existing support.html answers are a good draft.

### 11. Footer
- Build: `@tailark-oss/mist-footer-*` adapted; lockup, tagline, links (site, legal), TikTok/Instagram, contact email with the copy button, copyright.
- Text slots: tagline (the current "Your mountain. Your gear. One app." or a rewrite, under 8 words); link labels.

## Removed from Home (moved or dropped)
- Mission teaser section: dropped (the merged Mission/About page is one nav click away).
- Nietzsche quote: dropped (tone clash with the safety message).
- Second waitlist block and the stats row inside it: merged into sections 5 and 9.
- BetaToast: dropped (the hero already says the beta is live; three "Get the app" calls at once is too many).
- Summit Society (Discord partner) card: moved to the About page's community area, or the FAQ. Muad's call.
- Features "tilting cards" and both mouse-tracking parallax effects: dropped.

## Dependencies added (minimum)
`motion`, `lucide-react`, shadcn primitives (Radix) for sheet/button/select/badge/accordion/input/label/field/separator. No GSAP, no Lenis, no three.js.

## Verification plan for the implementation handoff
Commit + diff; desktop (1440) and phone (390) screenshots per section; keyboard walk (nav, drawer, selects, accordion, form); reduced-motion pass; `npm run lint` + `npm run build` output with bundle sizes; regression: waitlist submit (rate limit path), `?section=platforms`, giveaway routes untouched (`/giveaway`, `/giveaway/rules`, `?ref`, `?entry`, `?unsubscribed`, existing `#/giveaway` links).

## Questions for Codex
1. Any objection to moving "Why EIGER, not a trail app" from Mission to Home?
2. Snapshot JSON for the demo vs a read-only anon query: snapshot is my pick (no key exposure, no loading state, no rate-limit surface). Agree?
3. Is `kinetic-text-reveal` on the H1 within the "restrained" budget, or should the H1 be static?
4. Playlist trim 10 to 5: raise to Muad as proposed, or leave the playlist untouched in round one?

---

# Home page plan v2 (2026-09-25): v1 + Codex's conditional design pass applied

Codex verdict on v1: CONDITIONAL DESIGN PASS (design only; not implementation sign-off, not founder approval). Revisions applied:

- Structure cut from 11 sections to 9 (7 content sections + nav + footer). Stats folded into the walkthrough as a proof line; differentiator folded into the demo section as a compact "what the app adds" capability strip with verified, concrete EIGER capabilities only (no broad "trail apps cannot" claims); FAQ trimmed to 3 acquisition questions + a support link; one email capture.
- Hero anchor fixed: "See how it works" → section 3 (walkthrough).
- H1 static and immediately legible; no kinetic-text-reveal in round one. Stats render final values immediately (no count-up). Demo results: no blur cascade; result changes announced via aria-live.
- Accent: orange only, small and functional. Steel blue removed as a second accent; allowed only as a documented semantic status token if needed. Contrast verified on footage and controls in the assembled result, not from opacity tokens.
- Logo: wordmark at all small sizes (nav, phone) until the mark is validated at size; source SVG preferred; any auto-trace compared at actual size against the approved PNG; no silent redesign. Mark alone only in the square container (favicon etc.).
- Demo data: committed public snapshot; explicit public fields from approved/reviewed rows only; never reviewer notes or staging; labelled as an example snapshot with source and update date; month→season mapping verified against app code; no implication of current route conditions or personal gear compatibility.
- Default React example covers no-interaction/failed data, not JS-disabled (createRoot needs JS); prerendering is separate scope.
- Hero footage: founder playlist and order kept; work = poster/first-frame, offscreen and tab-hidden pause, measured network transfer. Clip removal = optional later, not a launch item.
- No registry block is visually approved; judge the assembled desktop/mobile result; no competing wrappers for simple CSS effects.
- Practical review adds: 320/360 px widths, landscape/short-viewport sticky behaviour, drawer focus/Escape/return-focus, large text, slow network, failed media; waitlist regression via test/stub, never production entries.
- 3D stays out of round one; terrain relief is a later candidate, not a gate.

Final section order: 1 Nav · 2 Hero · 3 How it works (+ proof line) · 4 Try it (demo + capability strip) · 5 Athlete · 6 Get the app · 7 Email capture · 8 FAQ (3) · 9 Footer. Text slots as in v1, adjusted to the merged sections. Presented to Muad in the transcript as final.

**Founder ruling 2026-09-25 (Muad):** NO orange anywhere on the website. Keep the current palette: #0A0A0A base, white text/borders at fixed strengths, the existing emerald only where it already means "live/success". Plan v2's "orange functional accent" is withdrawn; steel blue question is moot. Emphasis is carried by white intensity, size, weight and borders. Demo result changes use text + aria-live, not colour.

**Founder rulings 2026-09-25 (Muad), on the 8 open items:** (1) real URLs with redirects: YES. (2) merge Mission + About: YES (blog question raised; separate, later). (3) fonts: asked what is used now (answer: system-ui only; no brand font loaded); pairing League Spartan + Inter + JetBrains Mono proposed. (4) keep the named AllTrails comparison, verified claims; ALL copy is Muad's; when the layout is final I prompt him section by section with context. (5) NO standalone-fixes PR to live; everything stays on the `redesign` branch; live keeps its issues until the redesign ships. (6) Summit Society → About page. (7) logo: trace from PNG for now, compare at size. (8) hero clips: keep all ten in founder order. Mouse effects: Muad asked; my recommendation = none beyond hover states.

---

# About + Giveaway (+ optional Field Notes) plan v1 (2026-09-25, for Codex audit)

Same foundations as Home (monochrome palette, League Spartan / Inter / JetBrains Mono, native scroll, one motion library, reduced-motion paths, wordmark at small sizes). Copy is Muad's; slots described.

## About (merged Mission + About) at `/about`; `/mission` redirects here
1. **Header/nav**: shared with Home.
2. **Hero (statement)**: full-width alpine still (own footage frame or mountain-images bucket, credited), a short statement headline, one paragraph. No video. *Text: headline 5 to 9 words (what the mountains mean to us / why the app exists); 1 paragraph, 2 to 3 sentences.*
3. **The story (once)**: two-column on desktop, image left (a real photo from a founder trip if one exists, otherwise a peak), narrative right; the Mt. Elbert origin told once. *Text: 3 short paragraphs: the trip that started it, the problem we kept hitting, what we decided to build.*
4. **What we believe (three pillars)**: three plain columns, no cards, a Lucide icon each; replaces both current 3-card grids. *Text: 3 titles (2 to 3 words) + 1 to 2 sentences each.*
5. **Why EIGER, not AllTrails?**: the compact verified two-column comparison lives on Home; About gets a one-paragraph version linking back to it, or is omitted to avoid duplication. Recommend omit here. *Text: none, or 1 paragraph.*
6. **Founders (the rope team)**: three portrait cards (existing photos, re-cropped to a consistent ratio), name, role, 2-sentence bio, optional link. *Text: section heading; 3 bios of 2 sentences; roles.*
7. **Athlete**: short version (still + 1 sentence + TikTok link) since Home carries the full section, or omit. Recommend short version. *Text: 1 sentence.*
8. **Community (Summit Society)**: moved here per ruling; card with the Discord link. *Text: heading; 2 sentences; button label.*
9. **CTA**: "Get the app" + email capture (the shared component). *Text: heading 3 to 6 words; 1 line.*
10. **Footer**: shared.
Removed: the duplicated stats band (Home has the proof line), the second waitlist, mission-page background animations (compass, drifting orbs, ridge draw), mouse parallax.

## Giveaway at `/giveaway` (+ `/giveaway/rules`); `#/giveaway...` redirects keep query strings
Backend, logic, URLs and query handling untouched. Restyle only:
1. **Hero**: eyebrow, the USD 500 value (render final value immediately; no count-up per Codex), headline, one paragraph, countdown. Countdown becomes the shared mono style.
2. **Prize + How it works**: two cards → one two-column block on the shared surface tone, consistent eyebrow style.
3. **Enter the draw**: labelled inputs (shadcn `field`/`input`/`label`/`select`), consent checkbox with proper label association, button states unchanged; error/notice text uses text + aria-live, no colour-only signalling.
4. **Dashboard state (after activation)**: ticket meter, task rows and referral box keep behaviour; task rows become a consistent list with the shared badge; result changes announced via aria-live.
5. **Fine print + footer**: fine print raised to a readable size and contrast; footer shared.
Casing rule needed from Muad: "EIGER" in headings vs "Eiger" in legal/sponsor text (current pages mix both).
**Rules page**: typographic pass only (measure, headings, link styles); content untouched (counsel note stands).

## Optional: Field Notes (blog) at `/notes`
- Build: Markdown files in `content/notes/*.md` with front matter (title, date, summary, cover), loaded at build time with `import.meta.glob`; a listing page (date, title, summary, cover) and a post page (measure-limited prose, shared header/footer). No CMS, no backend; a post = a file in a PR.
- Rule: ships in round one ONLY if at least two posts exist at launch of the redesign; otherwise the nav slot is reserved and the page is built but unlinked. Recommended first posts: "Why we built EIGER" (from the About story) and "How we score a mountain".
- Related later option with more search value: one page per mountain from the catalogue (same machinery, data-driven).
*Text: post bodies are Muad's; listing labels.*

## Questions for Codex
1. Omit the AllTrails comparison from About (Home carries it), yes?
2. Field Notes: agree with the "two posts or unlinked" rule?
3. Any objection to `import.meta.glob` Markdown loading in Vite (no new framework), vs deferring the blog entirely?

**Codex conditional design pass on About/Giveaway (2026-09-25), applied:** AllTrails comparison Home-only. Blog: agree with Codex; drop the two-post threshold; one finished, useful article justifies the journal, otherwise defer both route and implementation (no unlinked page); Markdown in repo is fine but needs front-matter validation, slugs, direct-load routes/404, sitemap; no crawler claims without prerender; name/route are Muad's. About: hero paragraph and story must not repeat; pillars concrete or condensed; short athlete mention not verbatim from Home; one email capture per page with clear opt-in purpose. Giveaway: no aria-live on the ticking countdown, announce form/task state changes only; focus placement on validation and copy-link feedback; rules/sponsor wording unchanged until casing ruling; routing migration test matrix = old hash query links + new paths for activation/referral/unsubscribe, direct reload, back/forward, malformed/expired links, /mission→/about; parameter values preserved exactly; fixtures/stubs only. Layout is now FINAL for round one; next = Muad's copy (brief at eiger-website docs/COPY_BRIEF.md on branch `redesign`), then implementation, then Codex implementation review.

---

# Motion plan v1 (2026-09-25, for Codex discussion; Muad asked "what motion UI, and how is it innovative")

## Engine
- One library: `motion` (motion/react, MIT). Used for: scroll-linked values (`useScroll` + `useTransform`), in-view reveals (`useInView`), presence (`AnimatePresence`), and page transitions (`AnimateView` on React's ViewTransition where supported, plain crossfade fallback).
- CSS where CSS is enough: hover/focus states, the countdown, the nav blur, simple reveals via `@starting-style` + `transition`. CSS scroll-driven animations (`animation-timeline: scroll()`) for the parallax-lite backgrounds in browsers that support them, with no-op fallback; no JS scroll listeners for decoration.
- Not used: GSAP, Lenis, three.js, mouse-tracking of any kind, Componentry's Lenis-wrapped pieces. Componentry/Magic UI pieces only where listed below, imports rewritten to motion/react so one copy ships.
- Rules: transform + opacity only (no layout-affecting animation), IntersectionObserver-gated, everything has a `prefers-reduced-motion` static state, no scroll capture, nothing runs on mousemove, animations under 700 ms except scroll-scrubbed ones (which have no duration; they follow the scrollbar), autoplay video pauses offscreen and when the tab is hidden.

## Where motion is spent (the whole budget; nothing else animates)
1. **Hero footage**: existing crossfade playlist (founder order), poster first paint.
2. **The ascent line (signature motif, the "innovative" part)**: a thin SVG elevation profile of a real route (e.g. Rainier via Disappointment Cleaver, drawn from the actual elevation data we hold) sits in the page margin/nav bar as the scroll progress indicator. As you scroll the page you climb the profile; a small marker moves along the path; the summit is reached at the footer. Section anchors are camps on the profile (labels in mono: "Paradise 1,646 m", "Camp Muir 3,072 m", "Summit 4,392 m"), so the page's structure is literally a route. Built with one `useScroll` progress value mapped to `pathLength`/`offset-distance`. Cost: one SVG path, one transform per frame. Reduced motion: the full profile is drawn statically with the marker at the current section (updated on section change, no tween). Phone: collapses to a 2 px progress line along the top edge with the same profile shape flattened, or hides below 360 px.
3. **Walkthrough (section 3)**: scroll-scrubbed phone screen swap; the three screens crossfade with a slight vertical drift as each step's text reaches the viewport centre. Sticky column on desktop only. Reduced motion: three static rows.
4. **Try-it demo (section 4)**: when the mountain or month changes, the gear list re-renders as a packing list: rows settle in with a short stagger (opacity + 6 px rise, 250 ms total, no blur), and the requirement badges are final immediately. Result changes announced via aria-live once per change. Reduced motion: instant swap.
5. **Page transitions**: route changes crossfade content while the nav stays put (View Transitions where supported). 200 ms. Reduced motion: none.
6. **Reveals**: sections fade + 12 px rise on first entry, 500 ms, once. Content is visible by default; the animation only adds the fade.
7. **Micro-interactions (CSS)**: buttons and cards lift 1 to 2 px on hover/focus with a border brighten; copy-link and form feedback change text and move focus; the countdown ticks with a plain number swap (no flip, no aria-live).

## What "innovative" means here
Not new effects. One motif no other outdoor app site uses, drawn from our own data (a real route profile as the page's progress), and motion that demonstrates the product (scroll-scrubbed screens, a packing list that assembles) instead of decorating it. Everything else is deliberately ordinary so the two ideas stand out.

## Measurable budget
- Home: total JS added for motion ≤ 40 KB gzip (motion core ~ 18 KB + our code). Verified from the build output.
- No long tasks > 50 ms during scroll on a mid-range Android (Moto G class) in Chrome's performance panel; frame time under 16 ms with the ascent line active.
- Lighthouse performance ≥ 90 on phone, with the hero poster as LCP.

## Questions for Codex
1. Is the ascent line within your "restrained" reading, given it is one persistent element rather than per-section effects? Alternative if not: show it only on About (the story page) and use a plain progress line on Home.
2. Any objection to View Transitions for route changes, with the plain fallback?
3. CSS scroll-driven animations for background parallax-lite: acceptable as progressive enhancement, or drop backgrounds motion entirely?

**Founder ruling 2026-09-25 (Muad) on motion:** be lenient on assumed computing power; visitors are primarily on desktop; use the motion library to its fullest extent. Motion plan v1 budget is superseded by v2 below. Phone and reduced-motion fallbacks remain required (they are cheap and Codex's conditions still hold), but desktop is the design target.

# Motion plan v2 (desktop-first, per ruling)

Same engine (motion/react + CSS), same rules on correctness (transform/opacity, no scroll capture, reduced-motion static states, offscreen pause, content visible by default). What changes is ambition on desktop:

1. **Hero**: footage crossfade as before. Headline staged in: lines rise and settle in ≤ 600 ms total, fully legible by 600 ms (meets Codex's legibility concern; no per-word blur cascade). Buttons and beta line follow with a 100 ms stagger. Giveaway pill slides in last.
2. **Ascent line**: full version on desktop: route profile in the left margin with camp labels that light up as you pass them, the marker leaves a faint trail, and the summit label draws on at the footer. Section headings share the camp altitude in mono. Phone: 2 px flattened line, no labels.
3. **Walkthrough**: scroll-scrubbed, with depth: the phone frame holds still while the screen inside crossfades, the step text slides in from the right and the previous step recedes (scale 0.98, opacity 0.5). A subtle contour-line backdrop (SVG) drifts with scroll behind the phone via `useScroll` (not mouse). On hover the phone tilts ≤ 4 degrees toward the pointer, desktop only (pointer:fine), spring-damped, returns on leave. This is the one pointer-aware element besides buttons.
4. **Try-it demo**: packing-list assembly on change (stagger 30 ms/row, 6 px rise); the boot/crampon class line "stamps" in (scale 1.05→1, 200 ms); the mountain name crossfades via `AnimatePresence`. aria-live once per change.
5. **Why EIGER, not AllTrails?**: the three rows stack in as sticky cards on desktop (each row pins briefly while the next slides over it), a Componentry-style flip-stack behaviour implemented with `useScroll` in our own code so no Lenis. Phone: plain rows.
6. **Athlete**: the still scales from 1.05 to 1 as it enters (Ken Burns-lite, scroll-linked, no timer); play button pulses once on entry; the video dialog opens with a layout transition from the still (`layoutId`).
7. **Get the app**: phone frames rise in with a stagger; QR codes fade in on hover of each store badge (desktop).
8. **Page transitions**: View Transitions with shared nav and, where possible, shared hero image between Home → About (`view-transition-name`), 250 ms. Fallback crossfade.
9. **Reveals**: fade + 16 px rise, 500 ms, once; headings get a 60 ms line stagger.
10. **Micro-interactions**: primary buttons are magnetic within a 24 px radius on desktop (spring, pointer:fine only); cards lift 2 px and brighten; links underline-draw from left; copy-link feedback morphs the icon to a check.

Explicitly still out: mouse-driven page parallax, cursor followers, glow/spotlight/beam effects, particle backgrounds, scroll-jacking, per-second aria-live, anything that fires on mousemove across the whole page. The pointer is used only inside the walkthrough phone and the primary buttons.

**Budget v2**: motion JS ≤ 80 KB gzip; desktop 60 fps with no long task > 50 ms during scroll on a 2020-class laptop; phone still ≥ 80 Lighthouse performance with the desktop-only pieces disabled below 1024 px or on coarse pointers; reduced-motion = every item above static.

**Questions for Codex (replacing v1's):** (1) the ascent line full version on desktop; (2) the sticky flip-stack for the comparison (own code, no Lenis); (3) magnetic primary buttons and the ≤ 4° phone tilt as the only pointer-aware pieces; (4) View Transitions with a shared hero element.

**Founder ruling 2026-09-25 (Muad):** no pulsing status dots anywhere (green "live" dot, white ping on the giveaway pill, any animate-ping/pulse). Status is shown with on-brand devices instead: mono text tags with a hairline rule, a summit-marker triangle glyph for "live", a Lucide ticket glyph for the giveaway, at most a one-time underline draw on entry, no loops. The emerald "live" colour therefore leaves the palette too unless used as plain text/border for success states in forms.

---

# IMPLEMENTATION HANDOFF 1 (2026-09-25 evening): redesign built on branch `redesign`

**Branch:** `redesign` at 4dc6be2, 36 commits over main 7f38191. Not pushed, no PR yet. `npm run lint` clean, `npm run build` ok, `npm test` 34/34.

**What is built (all pages):** Home (nav w/ phone sheet, hero on the founder footage playlist with fixed loading, A look inside our app with scroll-scrubbed iPhone frame + proof line, Try it yourself drag-and-drop with real weights, Why not just use AllTrails? sticky cards, Athlete, Get the app with official badges (links pending), Email capture, FAQ, Footer, AscentLine at 1440px+), About (merged; /mission redirects), Verification (structure + scroll-drawn pipeline, copy pending), Giveaway + Rules restyle (mechanics untouched). Copy = docs/COPY.md (Muad's). Verification record for the comparison: docs/COMPARISON_SOURCES_2026-09-25.md.

**Evidence (scratchpad `evidence/`, production build via `vite preview`):**
- Full-page screenshots 1440: d1440-home.png, -about, -verification, -giveaway, -giveaway-rules, -giveaway_ref-test123 (referral notice present), -mission (lands on /about), -nope (Page not found); d1440-home-mid.png (ascent line at 50% scroll); d1440-home-reduced.png (reduced motion); d1440-tryit-keyboard.png.
- Phones 320 and 390: p320-home/about/verification/giveaway.png, p390-*.png, p320-menu.png, p390-menu.png. No horizontal scroll on any page at either width. Escape closes the menu (dialog count 0 after Escape) at both widths.
- Keyboard walk on Home (first 14 tab stops): EIGER home, How it works, About, Verification process, Giveaway, Get the app, giveaway pill, Take a look at our process, Get the app, See how it works, Explore, Mount Rainier (select), Summer, Winter. Enter on the Crampons tile adds it; aria-live reads "10% compatible. 1 of 10 required items."
- Console errors on desktop: none.
- Lighthouse (production preview, headless): desktop perf 99 / a11y 100 / best practices 100 / SEO 100, LCP 0.8 s, TBT 0, CLS 0.002, 12.1 MB total (hero video). Mobile perf 87 / a11y 100 / 100 / 100, LCP 3.7 s, TBT 40 ms, CLS 0.007, 4.3 MB. Baseline (live site): desktop 99 / a11y 96, mobile 90 / a11y 96, LCP 3.3 s mobile. So: accessibility 96→100 both; desktop unchanged; mobile perf 90→87 and LCP 3.3→3.7 s (target was >=80).
- Bundle: main chunk 662 kB (203 kB gzip) vs 445 kB (132 kB gzip) baseline; Supabase split into its own 45 kB gzip chunk loaded on first submit. Increase = motion (~145 kB raw), Radix (sheet/select), TryIt.
- Route/form regression: docs/ROUTING.md matrix (17 unit tests) + this run: /giveaway?ref=test123 shows the referral notice; /mission → /about; unknown path → NotFound. Waitlist submit tested locally only (fails closed without env); no production entries. Giveaway backend calls, params and URL builders untouched (see 4b757f4 and the giveaway restyle commits).

**Known gaps / your call:**
1. Store links are null until Muad sends them; badges render aria-disabled with "Store links coming October 1".
2. Verification page copy pending (Muad); a new interactive pipeline diagram is specified below and will be added.
3. Hero subline says "every conceivable hike" (Muad to rule; alternative in COPY.md).
4. Google Play badge is in colour (official artwork; brand guidelines forbid recolouring). App Store badge is black.
5. Walkthrough full-page capture shows large gaps between steps at 1440: that is the scroll distance driving the sticky phone; on screen it reads as one pinned phone with steps passing. Say if the scrub length should be shorter.
6. Ascent line profile still fairly vertical (LINE_W 40 px); shown only at >= 1440 px, Home only.
7. Rules page H1 keeps the legal title "Eiger Launch Giveaway"; giveaway errors are white with a marker (not red).

# Verification page: interactive pipeline diagram (founder spec, 2026-09-25)
Muad's spec: the 48 gear item slots of the taxonomy float as widgets in space; a central fixed element represents the fine-tuned model (an expert-written prompt behind it) with a symbol. The visitor picks a mountain from a dropdown; a fixed "thinking" timer runs: three consecutive phrases, two seconds each, drawn from a subset (e.g. "checking mountain conditions", "establishing terrain ruggedness", plus some funny ones; phrases are Muad's copy). The model then connects nodes to the subset of widgets that mountain needs and organises them into a list: the UNVERIFIED gear list, marked by an on/off checkmark at the top right of every mountain. The list is passed to the human experts, who check it for anything missing; the checkmark turns on and the list is ready. Users can technically use the unverified list. The system gets safer with more users.
Implementation notes (mine): data = the 48 `gear_item_types` (real) and the snapshot's per-mountain gear rows; the "verified" state must reflect real data or be labelled illustrative (the DB `expert_verified` flag is false on all 97 rows even though the mountaineer's review happened; the app shows a VERIFIED badge from another source; resolve before claiming per-mountain verification on the site). Palette rule: no green; the checkmark is a white check in a filled square vs an empty outline plus a mono "Verified"/"Unverified" tag, unless Muad rules green as a documented semantic status. Reduced motion: skip the timer, show the final state. Keyboard: dropdown + a "Run" button; no drag needed. This diagram sits at the top of /verification; the six-step text follows below.

**Founder ruling 2026-09-25 (after reviewing the local preview):** Try-it demo layout changes to radial: circular widgets with slight drift around a circular central kit; kit radius grows with each item; the compatibility bar becomes a ring around the kit with the reading directly below; the ring colour runs red (unprepared) to green (prepared). Documented as the single colour exception (semantic status gradient on the ring only). Being built now.

**Verification diagram, founder rulings 2026-09-25:** five category clusters instead of 48 loose widgets; a mono honesty line under the thinking beat ("Demonstration. A real run takes hours."); real reviewer changes shown per mountain (from the app repo's migration record, cited); demos kept distinct (Try-it = your kit; Verification = how the list is made); a user-reports node closes the loop; the six step texts accompany their stages (sticky diagram on desktop, steps scroll beside it); green allowed for the verified check; category colours allowed on connection lines; widgets circular and drifting as in Try-it. Decided by me: expert stage auto-plays; diagram labelled illustrative for round one (DB `expert_verified` is false on all 97; to be set later for reviewed mountains by Rishav's seat). Colour exceptions now: Try-it ring gradient, verified check (green), connection lines (muted category hues).

---
name: EIGER
version: 1
source: src/index.css
colors:
  bg: "#0A0A0A"
  surface-1: "#111111"
  surface-2: "#161616"
  surface-3: "#1C1C1C"
  fg: "#FAFAFA"
  fg-muted: "rgb(250 250 250 / 0.70)"
  fg-subtle: "rgb(250 250 250 / 0.50)"
  line: "rgb(255 255 255 / 0.08)"
  line-strong: "rgb(255 255 255 / 0.14)"
  live: "oklch(69.6% 0.17 162.48)" # Tailwind emerald-500, live and success only
  destructive: "oklch(70.4% 0.191 22.216)" # form errors only, as before
typography:
  families:
    display: "League Spartan" # headings, wordmark
    sans: "Inter" # body
    mono: "JetBrains Mono" # numbers, labels, data
  scale: # token: size / line height / letter spacing
    display-xl: "clamp(3rem, 2rem + 5vw, 6rem) / 0.95 / -0.03em"
    display-lg: "clamp(2.5rem, 1.75rem + 3.5vw, 4.5rem) / 1 / -0.025em"
    display-md: "clamp(2rem, 1.5rem + 2.25vw, 3.25rem) / 1.05 / -0.02em"
    heading: "clamp(1.375rem, 1.2rem + 0.75vw, 1.75rem) / 1.2 / -0.01em"
    body-lg: "1.125rem / 1.65"
    body: "1rem / 1.6"
    small: "0.875rem / 1.5"
    eyebrow: "0.75rem / 1.4 / 0.2em, uppercase, semibold"
spacing:
  section: "clamp(5rem, 3rem + 8vw, 10rem)"
  section-sm: "clamp(3rem, 2rem + 4vw, 6rem)"
  gutter: "clamp(1rem, 0.5rem + 2.5vw, 2rem)"
  phone-gutter: "16px"
radii:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
motion:
  fast: "150ms"
  base: "300ms"
  slow: "600ms"
  reveal: "800ms"
  ease-out-expo: "cubic-bezier(0.22, 1, 0.36, 1)"
  library: "motion (motion/react)"
  reduced-motion: "all animation and transition durations collapse to 0.01ms"
breakpoints:
  primary: "desktop, 1280 to 1440 wide"
  phone-checks: [320, 360, 390]
  nav-switch: "md (768px): below it the links move into a sheet"
---

# EIGER design system

Tokens live in the `@theme` block of `src/index.css`. Tailwind 4 turns each one
into utilities: `bg-bg`, `bg-surface-2`, `text-fg-muted`, `border-line`,
`ring-line-strong`, `text-display-xl`, `text-eyebrow`, `font-display`,
`font-mono`, `rounded-pill`, `py-section`, `ease-out-expo`. Motion durations are
plain CSS variables (`--motion-base`) for use in `motion` transitions and
hand written CSS.

## Principles

- **Monochrome.** One near black base, white at fixed strengths for text and
  lines, three stepped surfaces for depth. No accent colour. Emerald appears
  only where it already means live or success (the beta dot, "Copied!", the
  waitlist confirmation). Form errors are white text with a marker, never red.
- **Alpine and restrained.** The photography and video carry the colour.
  Type does the rest: League Spartan for display and the wordmark, Inter for
  reading, JetBrains Mono for numbers, elevations and small labels.
- **No glows, no gradients, no orange.** Depth comes from surfaces and 1px
  lines, not from shadows or coloured light. The `.glow` and `.text-gradient`
  utilities were removed in the foundations pass; the drifting background
  glows on About and Mission stay until those pages are redesigned.
- **Desktop first, phone parity.** Layouts are designed at 1440 and checked
  at 320, 360 and 390. Phones get every action desktop gets, including "Get
  the app" in the nav sheet. Side gutter on phones is 16px, no horizontal
  scroll.
- **One motion library.** `motion` only. No GSAP, Lenis or three.js. Motion is
  short, eases out, and never blocks reading. `prefers-reduced-motion`
  switches it off globally in `src/index.css`.
- **Visible focus.** Every link and button shows a `focus-visible` ring in
  `line-strong` with a 2px offset on `bg`.

## Components

shadcn/ui (style `radix-vega`, base colour neutral, CSS variables) lives in
`src/components/ui/`. Its variables (`--background`, `--primary`, `--border`,
`--ring` and the rest) are mapped onto the tokens above in `src/index.css`;
there is no light theme and `<html>` carries `class="dark"` so every `dark:`
variant applies. Primary buttons are white on black.

Registries configured in `components.json`: `@magicui`, `@componentry`,
`@tailark-oss`. Tailark blocks are written for Next.js; swap `next/link` for
react-router `Link` and `next/image` for `<img>` when adopting one.

Class merging goes through `src/lib/utils.js`, which teaches the merge engine
our custom type, radius and spacing tokens. `vite.config.js` aliases the bare
`cn` import that `shadcn add` writes to that file, so new components pick it
up automatically. When a new `--text-*`, `--radius-*` or `--spacing-*` token is
added, add its name there too, or `cn()` may drop a class it thinks conflicts.

## Globe (mountain requests, 2026-09-26)

The founder asked for a globe on the home page, which expands the earlier
"no three.js" rule: the globe is `cobe` (about 5 KB of WebGL, no three.js),
wrapped in `src/components/Globe.jsx` and loaded on demand. It is drawn in
the monochrome tokens: base grey `0.3`, white markers, and the glow colour
set to the page background so there is no halo. Emerald marks mountains that
are already in the app (the live meaning again). Idle rotation, drag momentum
and camera easing all stop under `prefers-reduced-motion` (live, not just at
load). No WebGL, or a lost context, shows a bordered circle with one line of
text; the search and the list remain the primary interface.

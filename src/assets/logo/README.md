# EIGER logo SVGs

Traced (not redesigned) from the founder-approved raster logo. Shapes, spikes,
and letterforms are preserved as-is; nothing was simplified, smoothed, or
re-lettered.

## Files

- `mark.svg` — the climber-on-mountain-spikes mark alone. viewBox `0 0 805 1419.92`.
- `wordmark.svg` — "EIGER" + TM alone. viewBox `0 0 1176.06 296.56`.
- `lockup.svg` — mark + wordmark together, traced directly from the combined
  lockup PNG so the mark-to-wordmark spacing/scale is exactly the founder's
  original, not reconstructed by hand. viewBox `0 0 5033.09 3401.3`.

All three: single `<path>` (or a couple of `<path>`s where the source has
disjoint shapes) per file, `fill="currentColor"` so color is set by the
consumer, no embedded raster, tight viewBox cropped to the inked pixels
(no padding baked in).

## Sources

- `mark.svg` ← `/Users/muadshaikh/hike/assets/images/eiger_logo.png` (1155×1431, white on transparent)
- `wordmark.svg` ← `/Users/muadshaikh/hike/assets/images/eiger_text.png` (1193×313, white on transparent, includes TM)
- `lockup.svg` ← `/Users/muadshaikh/eiger-website/src/assets/EigerLogo.png` (7200×4241, white on transparent, mark + wordmark + TM at the founder's spacing)
- `eiger_logo_black_square.png` was reference-only (mark on black square, grayscale) and was not traced.

## Tool and settings

Potrace and vtracer (the Rust CLI) are not installed as system binaries.
Tool actually used, in order tried:

0. **Tried first, abandoned**: `pip3 install vtracer` (the PyPI wheel
   wrapping visioncortex/vtracer) under the system Python 3.14
   (`/opt/homebrew/.../python3.14`). The `cp314` wheel **segfaults on every
   call**, even on a trivial 100×100 test image (confirmed with
   `faulthandler`, reproducible, not a fluke; a macOS crash report was
   generated). A same-session workaround (Python 3.12 via
   `/Users/muadshaikh/miniforge3/bin/python3.12` in its own venv) did trace
   correctly, but per instruction this path was dropped in favor of the
   npm option below rather than shipped from.
1. **Tool used**: `npx -y @neplex/vectorizer` — an npm package that installs
   a prebuilt native (napi-rs) binary with no compilation step (confirmed:
   `node_modules/@neplex/vectorizer-darwin-arm64/vectorizer.darwin-arm64.node`
   downloaded pre-built, `npm install` finished in ~2s, no native toolchain
   invoked). It is itself a binding to the same visioncortex/vtracer engine,
   just via a different native-binding layer (napi-rs/Node instead of
   pyo3/Python) — it does not depend on the crashing Python wheel, ran
   without a single failure, and its output was checked byte-for-byte
   identical to the (abandoned) Python-3.12 vtracer run on the same inputs
   and settings, so switching tools cost nothing in trace quality.
   Invocation (its CLI, `vectorizer` in `@neplex/vectorizer`'s package):
   ```
   node cli/index.mjs <input_bw.png> <out.svg> \
     --color-mode binary --hierarchical stacked --mode spline \
     --filter-speckle 2 --color-precision 1 --layer-difference 0 \
     --corner-threshold 55 --length-threshold 1.5 --max-iterations 12 \
     --splice-threshold 45 --path-precision 6
   ```
2. **Preprocessing**: each source PNG was thresholded on alpha ≥ 128 with
   Pillow into a flat black-shape-on-white-background PNG (`L` mode, no
   anti-aliased edge pixels), matching the task's alpha threshold and giving
   the tracer's `binary` color mode a clean bilevel input instead of raw
   RGBA.
3. **Trace settings** (same for all three sources), chosen so the mark's
   jagged mountain-spike points and the wordmark's sharp serifless corners
   survive instead of getting smoothed into curves:
   ```
   colormode=binary, hierarchical=stacked, mode=spline,
   filter_speckle=2, color_precision=1, layer_difference=0,
   corner_threshold=55, length_threshold=1.5, max_iterations=12,
   splice_threshold=45, path_precision=6
   ```
   Low `filter_speckle`/`length_threshold` and a moderate `corner_threshold`
   were chosen specifically so the mark's jagged mountain-spike points and
   the wordmark's sharp serifless corners survive instead of getting
   smoothed into curves.
4. **Finalize** (`finalize.py`, hand-written): bakes each output path's
   `transform="translate(x,y)"` into its `d` coordinates, computes the true
   coordinate-space bounding box across all paths, shifts everything so the
   box starts at `(0,0)`, and emits a minimal `<svg viewBox="0 0 w h">` with
   `fill="currentColor"` paths. Paths were kept separate rather than merged
   into one `evenodd` path, so each shape's own nonzero-winding hole (the
   counters in G/R/E, etc.) stays correct — merging into one path under
   `evenodd` was tried first and risked breaking counter holes where
   unrelated shapes' bounding boxes overlap; separate `nonzero` paths avoid
   that risk entirely.
5. **Optimize**: `npx -y svgo@4.1.0 --multipass` on each finalized SVG.
   Verified by re-rendering before/after — svgo's path merging did not
   corrupt any letterform holes. Size reduction: mark 36.9 KiB → 17.4 KiB
   (−52.7%), wordmark 15.2 KiB → 6.1 KiB (−60.1%), lockup 99.8 KiB → 41.3 KiB
   (−58.6%).

## Comparison results

Rendered each SVG (inlined, `color:#fff`) next to its source PNG (`<img>`) on
`#0A0A0A`, at 28px/40px/64px/160px/600px tall, via headless Chrome
(`--headless=new --disable-gpu --allow-file-access-from-files --screenshot`).
Screenshots (session scratch, not part of this commit):
`/private/tmp/claude-501/-Users-muadshaikh-hike/d5da10dc-b841-491d-812e-d26aee7045a6/scratchpad/logo/prep/compare_{mark,wordmark,lockup}.png`
(28–600px in one page each; the 600px row is cropped by window width in
these), plus dedicated full-width 600px captures
`row600_{mark,wordmark,lockup}.png`, plus 4×-device-scale closeups of just
28/40/64px (`closeup_{mark,wordmark,lockup}.png`) for pixel-level inspection.

**Verdict: the trace holds up at every tested size.**

- **Mark at 28px and 40px**: survives. The standing figure's silhouette, the
  three mountain-spike points, and the small triangular flag/pennant shape
  all stay legible and distinct from the PNG at the same height — no
  spike collapsed into a blob, no limb fused to the body. At 4× supersampling
  the two are essentially indistinguishable.
- **Ridge/spike detail**: the finest points (the three descending spikes
  under the figure's feet, and the separate small triangle to their right)
  are the first thing to thin out, but they don't disappear until well below
  28px — they're still there, just hairline, at 28px in both PNG and SVG
  equally (it's a PNG-downsampling limit as much as a trace limit, not
  something the trace introduced).
- **Wordmark, letter-for-letter**: checked at 600px full-width
  (`row600_wordmark.png`) — E, I, G, E, R and the TM superscript match the
  PNG stroke-for-stroke, including the G's spur and the R's leg/counter
  shape. At 28px the TM is still legible in both.
- **Lockup**: the traced spacing between mark and wordmark matches the PNG
  exactly at 600px (`row600_lockup.png`) because it was traced from the
  combined PNG directly rather than composited from the separate mark/wordmark
  assets.

## File sizes and path counts (final, after svgo)

| file | size | `<path>` count | viewBox |
|---|---|---|---|
| `mark.svg` | 17.4 KB | 2 | `0 0 805 1419.92` |
| `wordmark.svg` | 6.1 KB | 1 | `0 0 1176.06 296.56` |
| `lockup.svg` | 42.3 KB | 2 | `0 0 5033.09 3401.3` |

No `data:image` / embedded raster in any file (checked).

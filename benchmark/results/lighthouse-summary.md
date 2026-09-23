# Lighthouse performance audit (O4)

Target (per project proposal §4.3): Performance score ≥90, Time to Interactive <3s, simulated mid-range mobile device profile, Core Web Vitals guidance.

Method: `npx lighthouse <url> --only-categories=performance --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --chrome-flags="--headless=new --no-sandbox"` against a production build (`npm run build` + `vite preview`).

## Current results — all 5 routes (2026-08-11 full-site pass)

The first audit pass (below, under "History") only covered `/` and `/notes/:id`. This pass extended coverage to all five primary routes to get a complete picture, and found one page — Progress — failing both proposal targets.

| Page | Performance score | FCP | LCP | TTI | Speed Index | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` (home) | **97** | 2.0s | 2.1s | 2.1s | 2.0s | 0ms | 0.048 |
| `/notes/:id` (note editor) | **91** | 2.6s | 2.9s | 2.9s | 2.6s | 0ms | 0.005 |
| `/study` | **93** | 2.5s | 2.7s | 2.7s | 2.5s | 0ms | 0.022 |
| `/map` | **91** | 2.6s | 2.9s | 2.9s | 2.6s | 0ms | 0.064 |
| `/progress` — before fix | 85 ❌ | 2.9s | 3.6s | **3.6s** ❌ | 2.9s | 20ms | 0.027 |
| `/progress` — after fix | **92** ✅ | 2.6s | 2.8s | **2.8s** ✅ | 2.6s | 0ms | 0.032 |

**All 5 pages now meet both proposal targets** (score ≥90, TTI <3s). Reports: `lighthouse-{home,note-editor,study,map,progress}.report.{json,html}` (baseline) and `lighthouse-{home,progress}-v2.report.{json,html}` (post-fix).

## Progress page fix: replaced `recharts` with a hand-rolled SVG chart component

**Root cause, found via the `unused-javascript` and `script-treemap-data` audits**: `ProgressPage.tsx` only used `BarChart`/`Bar`/`LineChart`/`Line`/`CartesianGrid`/`Tooltip`/`XAxis`/`YAxis` — a small slice of `recharts`' surface — but `recharts` bundles a large rendering core shared by *every* chart type (`generateCategoricalChart`, `Surface`, `Layer`, `Curve`, `Legend`, `Brush`, animation via `react-smooth`, several internal `d3-*` sub-packages), and that core doesn't tree-shake away just because only two chart types are imported. Lighthouse measured **52.6% of `ProgressPage`'s own JS chunk as unused** on initial load (57.8 KiB wasted out of 109.9 KiB), on top of the chunk being ~110 KiB gzipped in the first place — the single largest asset penalty of any page in the app. The `lcp-breakdown-insight` audit confirmed the actual LCP element was just a one-line `<p>` subtitle with only 140ms of render delay once painted — meaning the 2.7s+ gap before that was almost entirely script download/parse/execute time, not rendering work. Shrinking the payload was the correct lever, not deferring rendering.

**Fix**: built `src/components/MiniChart.tsx` — a dependency-free SVG bar/line chart (`ResizeObserver` for responsive sizing, plain scaling math instead of d3, hover tooltips matching the existing visual style) — and swapped it in for both charts in `ProgressPage.tsx`. `recharts` (and its 16 transitive dependencies) was then `npm uninstall`ed entirely, since `ProgressPage.tsx` was its only consumer in the codebase.

**Result**: `ProgressPage-*.js` dropped from **382.25 KB / 109.78 KB gzip → 7.07 KB / 2.48 KB gzip** (a ~97.7% reduction in that chunk's transferred size). Score 85→92, LCP/TTI 3.6s→2.8s — both proposal targets now met. Verified live in-browser (not just the Lighthouse number): both charts render pixel-equivalent to the recharts originals, hover tooltips work, and dark mode colors adapt correctly (checked by toggling the `dark` class directly via `javascript_tool` rather than only trusting a screenshot).

This is a case where a general-purpose charting library was serving two very simple charts (≤30 bars, ≤20 line points, one series each, a single hover tooltip) — well within what a small amount of hand-written SVG covers, and consistent with this project's established pattern of avoiding a heavy dependency where a scoped, hand-rolled solution is straightforward and easy to reason about (see also: the contentEditable rich-text editor instead of Tiptap, and the CSS-only `DropletLoader` instead of an animation library).

---

## History — first audit pass (2026-08-03, `/` and `/notes/:id` only)

| Page | Performance score | FCP | LCP | TTI | Speed Index | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` (home, original) | 90 | 2.9s | 2.9s | 2.9s | 2.9s | 0ms | 0.049 |
| `/` (home, after all fixes) | 95 | 2.3s | 2.4s | 2.4s | — | — | — |
| `/notes/:id` (before route-level code splitting) | 83 | 2.9s | 3.9s | 3.9s | 2.9s | 0ms | 0.004 |
| `/notes/:id` (after route-level code splitting only) | 83 | 3.4s | 3.5s | 3.5s | 3.4s | 0ms | 0.004 |
| `/notes/:id` (after font self-hosting + deferred SW register) | 91 | 2.6s | 2.9s | 2.9s | 2.6s | 0ms | 0.004 |

Both proposal targets (Performance ≥90, TTI <3s) were met on both audited pages at the time. Raw reports: `lighthouse-home.report.{json,html}`, `lighthouse-note-editor.report.{json,html}`.

### Findings and fixes applied, in order

**1. Route-level code splitting** (partial fix). Root cause: `main.tsx` statically imported all four page components, so visiting any single route downloaded/parsed/executed `recharts` (ProgressPage) and `d3` (MapPage) even though neither is used on that route. Fix: converted all four page imports in `main.tsx` to `React.lazy()` + `Suspense` (confirmed in build output: `ProgressPage-*.js` ~382KB and `MapPage-*.js` ~60KB now split into their own on-demand chunks). Result: TTI improved 3.9s→3.5s, but the score stayed at 83 and both FCP/LCP were still red/orange — this fix alone wasn't enough.

**2. Self-hosted the Google Fonts, deferred the service worker registration script** (the fix that closed the gap at the time). Lighthouse's own render-blocking diagnostic named the exact remaining culprits on `/notes/:id`: the Google Fonts stylesheet (787ms wasted — a third-party round-trip to `fonts.googleapis.com` blocking first paint), the PWA's `registerSW.js` (302ms, loaded as a plain blocking `<script>` tag), and the app's own CSS (151ms, left alone as a small cost).
   - Downloaded the three actual font files Distill uses (Inter, Lora, JetBrains Mono — latin subset only, since the UI is English-only) to `public/fonts/*.woff2` and declared them via local `@font-face` rules in `src/index.css`, removing the Google Fonts `<link>` tags (and now-unneeded `preconnect` hints) from `index.html` entirely.
   - Added `.woff2` to the service worker's precache `globPatterns` (`vite.config.ts`) so the self-hosted fonts are actually cached for offline use — they weren't covered by the existing glob and would have silently fallen back to system fonts offline otherwise.
   - Set `injectRegister: 'script-defer'` on the PWA plugin so `registerSW.js` gets a `defer` attribute instead of blocking render (confirmed in the built `index.html`).
   - Result: `/notes/:id` went from score 83 (TTI 3.5s) to score 91 (TTI 2.9s). The home page also improved as a side effect (90→95, TTI 2.9s→2.4s), since it depends on the same fonts/SW script.
   - Verified live in the browser after rebuilding: fonts render correctly (no fallback-font flash observed), no console errors, no 404s for the new font files, and the app's existing functionality (tags, cards, AI summary display) confirmed still working on a real seeded note.

A few Lighthouse re-runs during this work (both sessions) hit a Windows-specific `chrome-launcher` `EPERM` temp-directory cleanup bug (unrelated to the app) — the report files are written successfully just before that error fires, so it's cosmetic; retried until confirming the report file itself was intact rather than treating the transient stderr as a real failure.

### Bonus: desktop comparison (pre-font-fix baseline)

One desktop-profile (`--preset=desktop`, no throttling) run of `/notes/:id` did complete, before the font/SW fixes: score 99, FCP/LCP/TTI all 0.8s. This confirms the ~3.5s mobile number wasn't fundamental app bloat — on real, unthrottled hardware the same page is near-instant; the gap is specifically the simulated mobile CPU/network throttling combined with the render-blocking resources described above. Report: `lighthouse-note-editor-desktop.report.json`.

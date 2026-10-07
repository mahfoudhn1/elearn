# Spike — Arabic/French text with LaTeX (Phase A8, step 1)

Status: **implemented as a component + manual test surface; device runs pending.**
Owner: mobile. Related: `components/assessment/MathText.tsx`,
`app/assessment/math-spike.tsx`, `components/assessment/QuestionBody.tsx`.

## Question

How do we render bilingual (Arabic RTL / French LTR) question prompt text that
also contains inline and display LaTeX math, on both Android and iOS, inside the
existing Expo app?

## Options considered

| Option | Verdict |
|---|---|
| **KaTeX in a `react-native-webview`** (text + `$...$` → HTML) | **Chosen.** `react-native-webview@13.16.1` is already a dependency; KaTeX is the reference web renderer and handles the maths the curriculum needs. |
| `react-native-math-view` / `react-native-katex` | Adds a native dependency, lags RN/Expo SDK 57, and has weak RTL support. Rejected. |
| Custom JS math layout | Reinventing KaTeX; unacceptable quality/scope. Rejected. |
| Plain Unicode only (no LaTeX) | Cannot render fractions, roots, exponents cleanly. Rejected as the primary path, but is the **fast path** for text with no `$`. |

## Design

`MathText` splits a string on `$...$` (inline) and `$$...$$` (display):

* **No math segments → plain `AppText`.** No WebView, no cost. This is the common
  case for most prompts.
* **Math present → one transparent, non-interactive `WebView`** whose HTML loads
  KaTeX from jsDelivr, renders each `[data-tex]` node, then posts
  `document.body.scrollHeight` back via `postMessage`; the component sizes itself
  to that height (reported every ~50ms until KaTeX loads, then on resize).
* **RTL**: the document is `dir="auto"` with `unicode-bidi: plaintext`, so Arabic
  runs flow RTL while math stays LTR (KaTeX's default, which is correct for
  mathematics). The WebView inherits the theme's ink colour and font size.

## Manual test procedure (device)

Open **Assessment → math spike** (`/assessment/math-spike`). For Android and iOS,
in light and dark themes, Arabic and French:

1. Arabic inline: the sentence reads right-to-left, `x^2 + 2x + 1 = 0` stays LTR
   and on the baseline.
2. Arabic display: the area formula centres on its own line and does not overflow.
3. French inline/display: normal LTR; `f'(x) = 3x^2` renders.
4. Fraction: `\frac{3}{4} + \frac{1}{2}` is legible at body size.
5. No-math line renders **without** a WebView (no flicker, instant).
6. Height: no clipped descenders and no dead whitespace; rotating the device
   re-measures.

## Known limits (documented, not hidden)

* **Connectivity for first render.** KaTeX is loaded from a CDN in the spike. In
  production KaTeX must be **bundled into the app assets** and inlined into the
  HTML string, so math also renders offline. Tracked in `docs/TO_VERIFY.md` §A8.
* **Height handshake latency.** On first paint a WebView reports `0` height; we
  clamp to `minHeight` and grow after KaTeX loads, so there can be a brief
  reflow. Long prompts re-measure once.
* **Cost per bubble.** Each math prompt is a WebView. Quiz screens show one
  question at a time (one WebView), but long lists should avoid many
  simultaneous math WebViews. The fast path keeps non-math text cheap.
* **Selection/accessibility.** The WebView is `pointerEvents="none"`; text inside
  it is not selectable and may be announced as a single block by screen readers.
  Math accessibility (alt text per formula) is not solved here.
* **Fonts.** The WebView uses system fallbacks; the app's IBM Plex Sans Arabic is
  not automatically available inside the WebView, so Arabic metrics can differ
  slightly from the surrounding `AppText`. Acceptable for a spike; a later pass
  can inline the font as a `@font-face` data URI.
* **Zoom.** Viewport is fixed (`maximum-scale=1`) to avoid double-tap zoom inside
  cards.

## Decision

Proceed with `MathText` as the **single** math renderer; screens never embed a
WebView themselves. Bundle KaTeX before shipping (the only hard follow-up).

## Verification status in this repo

`tsc --noEmit` and `expo lint` pass. Device runs (Android + iOS, RTL) have **not**
been executed in this environment; the test surface above is the script to run
them.

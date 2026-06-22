---
version: alpha
name: Clay design system
description: A clay-inspired website system for The Art of Tuning: warm paper canvas, near-black ink, compact editorial layout, saturated accent tiles, and soft dimensional illustration.
---

# Clay Design Notes

This project uses `clay` as a reference style rather than a literal clone. The goal is a polished handbook site that feels tactile and editorial while staying readable for a technical audience.

## Scope

- Build the actual handbook reading surface, not a marketing landing page.
- Use the first viewport to make the project identity clear: The Art of Tuning, nuisance hyperparameters, coordinate search, noise awareness, and the scaling-ladder boundary.
- Keep the page static and GitHub Pages friendly: `index.html`, `styles.css`, `script.js`, and local assets only.
- Prefer durable text, internal anchors, and readable cards over animation-heavy effects.

## Color Tokens

- `canvas`: `#fffaf0` for the main page floor.
- `surface-soft`: `#faf5e8` for warm section bands.
- `surface-card`: `#f5f0e0` for quiet repeated cards.
- `ink`: `#0a0a0a` for headlines and primary text.
- `body`: `#3a3a3a` for running text.
- `muted`: `#6a6a6a` for secondary labels.
- `hairline`: `#e5e0d2` for borders.
- `accent-pink`: `#ff4d8b` for high-energy highlights.
- `accent-teal`: `#1a3a3a` for dark featured panels.
- `accent-lavender`: `#b8a4ed` for research/context panels.
- `accent-peach`: `#ffb084` for warm workflow panels.
- `accent-ochre`: `#e8b94a` for notes and cautions.
- `accent-mint`: `#a4d4c5` for success or synthesis states.

## Typography

- Display: rounded, friendly sans fallback using `Inter`, system UI, and `sans-serif`.
- Body: `Inter`, system UI, `sans-serif`.
- Avoid viewport-scaled font sizes. Use fixed responsive steps via media queries.
- Use `letter-spacing: 0` in implementation. The Clay reference uses negative display spacing, but this repo keeps type stable and readable across browsers.
- Headings should be strong but not oversized inside compact panels.

## Shape And Spacing

- Page max width: around 1180px.
- Section rhythm: generous vertical padding, roughly 72px desktop and 48px mobile.
- Buttons: 12px radius, 44px minimum target height.
- Cards: 8px radius in the actual site to stay aligned with the repo UI guidance.
- Avoid cards inside cards. Use repeated cards only for chapter summaries, principles, notes, and compact repeated items.
- Keep layout stable with explicit grid tracks, min heights, and responsive constraints.

## Visual Language

- Use a tactile clay illustration as the primary visual asset.
- Keep assets inspectable and local. The current hero uses `assets/hero-clay.svg` so the site remains lightweight and pushable.
- Avoid decorative gradient blobs, dark stock imagery, or generic abstract bokeh.
- Use color blocks sparingly: they should organize ideas, not drown the page in one hue.

## Components

### Header

- Sticky top navigation on a warm translucent canvas.
- Left side: project wordmark.
- Desktop: inline section links.
- Mobile: icon menu button with a collapsed navigation panel.

### Hero

- Full-width first section, not a card.
- The headline names the project directly.
- Supporting copy explains the scope: nuisance tuning, not scientific scaling coordinates.
- Include primary links to the handbook source and the scope section.

### Cards

- Chapter cards summarize handbook sections and link to source anchors.
- Principle cards highlight operational guidance such as parallel recipes, acceptance thresholds, noise floors, and compute-limited sweeps.
- Use small labels and concise prose; no instructional filler inside the app.

### Ledger

- A compact text area contains a reusable project summary.
- The copy button writes the summary to the clipboard and reports a short state change.

## Content Principles

- Scope statement: this handbook cares about nuisance hyperparameters.
- Scientific coordinates belong primarily in a separate scaling ladder handbook, `the-art-of-scaling`.
- Coordinate descent guidance should mention that excessive coordinate-level parallelism is often wasteful when multiple recipes or runs can be parallelized instead.
- Termination still requires every coordinate to fall below the improvement threshold.
- Compute-limited regimes may fit a local quadratic per coordinate and evaluate near the estimated minimum when the coordinate response is approximately convex.
- Randomness is real. Multiple runs, averaging, and noise-floor awareness help, but the handbook should not imply that agents must fully multi-run every candidate.
- Track-specific seed noise can be large. For example, nanoGPT speedrun track-3 can show about `1e-3` variation from seed changes in a single-run comparison.

## Responsive Behavior

- Desktop: two-column hero, dense navigation, multi-column card grids.
- Tablet: reduced spacing and two-column card grids.
- Mobile: stacked hero, collapsed navigation, single-column cards, shorter section padding.

## Do

- Keep the first screen usable as the site, not a landing-page wrapper.
- Make the handbook's stance visible immediately.
- Use warm canvas, near-black text, and a few saturated accents.
- Keep all links local or repo-relative.
- Preserve GitHub Pages compatibility with no build step.

## Do Not

- Do not turn the site into a SaaS marketing page.
- Do not overuse purple, beige-only, or dark-blue palettes.
- Do not add floating decorative orbs.
- Do not make button text wrap awkwardly.
- Do not claim exhaustive experimental validation; keep noise discussion lightweight and practical.

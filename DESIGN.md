---
version: alpha
name: The Art of Tuning handbook design
description: A quiet documentation system for a technical handbook: readable prose, persistent table of contents, rendered chapter pages, and minimal ornament.
---

# Handbook Design Notes

This repository is a handbook, not a product landing page. The website should behave like a readable technical document: stable navigation, low visual noise, visible chapter structure, and formatted prose.

## Goals

- Make the first screen identify the handbook and its scope.
- Keep the visual system quiet enough for long reading sessions.
- Render every chapter through the same site chrome instead of linking readers to raw markdown.
- Preserve GitHub Pages compatibility with no build step.
- Prefer document structure over decorative illustration.

## Layout

- Use a two-column documentation shell on desktop: persistent table of contents on the left, reading column on the right.
- Keep the reading column around 760-800px wide.
- Use a sticky top bar for the handbook title and global links.
- Collapse to a single-column layout on mobile, with the table of contents above the document.

## Color

- Background: warm off-white, but close to neutral.
- Reading surface: white.
- Text: near-black for headings, dark gray for body.
- Secondary text: muted gray.
- Accent: charcoal gray for active navigation, links, and scope callouts.
- Avoid bright multi-color cards, gradients, hero illustrations, and marketing-style visual blocks.

## Typography

- Use system sans-serif fonts.
- Use fixed responsive type sizes, not viewport-scaled type.
- Keep letter spacing at `0`.
- Headings should be clear but compact; this is a handbook reading surface.
- Code uses a monospace font with quiet gray background.

## Components

### Top Bar

- Sticky on desktop.
- Contains the handbook title and global navigation.
- No large logo mark is required.

### Sidebar

- Shows the handbook sections and all chapters.
- Highlights the current chapter on `chapter.html`.
- Uses text links only.

### Landing Page

- Brief overview of scope.
- Chapter list as clean document rows, not colorful cards.
- Working principles and minimal ledger template.

### Chapter Page

- Loads the requested markdown file from the `doc` query parameter.
- Renders headings, paragraphs, lists, blockquotes, inline code, fenced code blocks, bold text, emphasis, and links.
- Includes previous and next chapter links.

## Content Rules

- The scope is nuisance hyperparameter tuning.
- Scientific coordinates belong mainly in scaling-ladder work.
- Coordinate descent chapter links and navigation should point to rendered chapter pages.
- README can still link to raw markdown because it is the source document.

## Do Not

- Do not make a colorful landing page.
- Do not use decorative generated assets as the primary experience.
- Do not link the site reader directly into raw markdown for chapter reading.
- Do not use cards inside cards or marketing-style hero sections.
- Do not overexplain the interface inside the page.

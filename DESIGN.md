---
version: alpha
name: Nimbang
description: A calm, dense instrument panel for weighing decisions. Ledger-like, not dashboard-slop.
colors:
  primary: "#1a1a17"
  ink: "#1a1a17"
  ink-soft: "#5f5e56"
  ink-faint: "#75736b"
  paper: "#faf9f5"
  surface: "#ffffff"
  surface-sunken: "#f2f0e9"
  line: "#e2dfd5"
  line-strong: "#c9c5b8"
  accent: "#2f5d50"
  accent-soft: "#e6efe9"
  caution: "#8a5a1e"
  caution-soft: "#f7eddd"
  danger: "#8a3b2e"
  danger-soft: "#f8e7e3"
typography:
  display:
    fontFamily: Newsreader
    fontSize: 2rem
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: Newsreader
    fontSize: 1.25rem
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.06em"
  numeric:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
rounded:
  sm: 4px
  md: 6px
  lg: 10px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 10px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 10px
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 10px
  button-quiet-hover:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 10px
  row-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 8px
  row-idle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 8px
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 16px
  panel-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-faint}"
    typography: "{typography.label}"
    padding: 8px
  divider:
    backgroundColor: "{colors.line}"
    size: 1px
  divider-strong:
    backgroundColor: "{colors.line-strong}"
    size: 1px
  score:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.numeric}"
  title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
  display:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  badge-excluded:
    backgroundColor: "{colors.caution-soft}"
    textColor: "{colors.caution}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 4px
  badge-fatal:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 4px
---

## Overview

Nimbang is an instrument, not a product page. The interface should read like a
ledger a careful person keeps: dense, quiet, and legible at a glance. It sits on
warm paper rather than clinical white, because a decision about your own life is
not a spreadsheet.

The composition is a **Monitor** surface with an **Operate** secondary: a list of
decisions on the left, the working decision on the right. No hero, no feature
cards, no marketing framing.

## Colors

- **Ink (#1a1a17):** body and headings. Warm near-black, never pure `#000`.
- **Paper (#faf9f5):** the page. Warm, low-glare, works in daylight.
- **Accent (#2f5d50):** deep green. One accent only, used for the primary action
  and the active row. Not indigo — that is the default every model reaches for.
- **Caution (#8a5a1e):** reserved for the sunk-cost badge, where the point is
  that the number is visible but excluded.
- **Danger (#8a3b2e):** fatal risk only. If it appears twice on a screen, the
  screen is wrong.

## Typography

Two families, chosen rather than defaulted. **Newsreader** for display and
decision titles: a text serif that makes a decision read as a subject, not a
record. **Inter** for interface text. **JetBrains Mono** for scores only, so
numbers align in a column and read as measurements rather than prose.

Numbers are always tabular. A column of scores that does not align is unreadable.

## Components

`button-primary` is the only high-emphasis action per screen. `row-active` marks
the decision being worked on. The two badges carry the two claims the engine
insists on: a sunk cost is *excluded*, a fatal risk *blocks*.

---
version: alpha
name: Nimbang
description: A calm, dense instrument panel for weighing decisions. Ledger-like, not dashboard-slop.
colors:
  primary: "#1a1a17"
  ink: "#1a1a17"
  ink-soft: "#5f5e56"
  ink-faint: "#75736b"
  ink-gloss: "#6b6960"
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
  button-print:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 10px
  button-print-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 10px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 10px
  button-danger-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
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
  gloss:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-gloss}"
    typography: "{typography.label}"
---

## Overview

Nimbang is an instrument, not a product page. The interface should read like a
ledger a careful person keeps: dense, quiet, and legible at a glance. It sits on
warm paper rather than clinical white, because a decision about your own life is
not a spreadsheet.

The composition is a **Monitor** surface with an **Operate** secondary: a list of
decisions on the left, the working decision on the right. No hero, no feature
cards, no marketing framing.

### Dials

Set once, held from the first panel to the last:

**ENERGY 1 / RHYTHM 2 / MOTION 1**

- **ENERGY 1.** No hero, no greeting, no illustration. The loudest thing on the
  screen is the verdict, and only once there is one.
- **RHYTHM 2.** The panels are a consistent stack, broken in exactly one place:
  the verdict sits above the inputs instead of after them, because the answer has
  to stay visible while the numbers change.
- **MOTION 1.** Hover and focus states only. No entrance animation: a form that
  moves while it is being filled is a form that has to be re-read.

### Design read

> Reading this as a decision instrument for one person weighing their own life
> choices, in a ledger language (warm paper, hairline rules, one green accent),
> dial ENERGY 1 / RHYTHM 2 / MOTION 1.

## Colors

- **Ink (#1a1a17):** body and headings. Warm near-black, never pure `#000`.
- **Paper (#faf9f5):** the page. Warm, low-glare, works in daylight.
- **Accent (#2f5d50):** deep green. One accent only, used for the primary action
  and the active row. Not indigo — that is the default every model reaches for.
- **Caution (#8a5a1e):** reserved for the sunk-cost badge, where the point is
  that the number is visible but excluded.
- **Danger (#8a3b2e):** fatal risk and the one action that destroys work. It
  appears as a badge when an option carries fatal risk, and as the fill of the
  delete button, and those are the only two places. A badge and a button side by
  side is fine — the badge makes a claim, the button is a control, and no reader
  confuses the two. A third use means the colour is being spent on something that
  is not dangerous, and the screen is wrong.

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

The corner actions **Cetak** and **Hapus** are filled and coloured — accent and
danger respectively — because the reader arrives at that corner looking for one of
them and should not have to read two words to find it. They are not
`button-primary`: that slot belongs to the action the user must take next, and
filling these the same way would make the corner of the page louder than the
verdict inside it. Neither depends on its colour to be understood. Each carries a
mark, so the printer and the bin identify the buttons for a reader who cannot
separate green from red, and the labels are unchanged.

### The hint in the section corner

Every section head carries its hint at the **right edge**, set as a
**right-aligned paragraph**: both lines end on the same edge, the English gloss
under the Indonesian included. A right-edge block of prose whose lines start flush
left inside its own box reads as a fragment that lost its column.

Below 56rem the head stacks and the same hint becomes a paragraph under the title,
so the alignment goes back to the left edge. Right-alignment is earned by being in
the corner, not by being a hint.

### The docked elicitation panel

The AI trigger that opens the elicitation panel sits in the **panel head, top
right** — beside the hint, not under the fields. The button belongs to the
section, and the section is what the panel splits.

Opening it turns the section *body* into a **50/50 split**: the form keeps the
left column, the conversation takes the right. The head stays full width, so
`title | hint | ✦ AI` reads as one line and the button is at the top-right corner
in the literal sense, not merely the last thing in the panel.

Four rules make the split read as one section rather than two:

- **Equal columns.** A narrower chat column would make the proposal list the
  cramped one, and the proposals are the part that gets read carefully.
- **The split exists only while the panel is open.** It is a class the open state
  adds, not a permanent grid with a gap in it. A closed panel must not leave an
  empty half column, and the form must not be permanently narrowed by a feature
  nobody opened.
- **Width-gated at 72rem**, which is also the work column's cap: at that width
  each column is still ~22rem, which is a form. Below it the chat stacks under
  the option rows — where the trigger used to live — because two 11rem columns
  are worse than one 22rem column above a scrolled conversation.
- **The trigger hides while the panel is open.** The panel's own `Tutup` is the
  way back; two controls for one state is one too many.

The panel is only docked in the **Options** stage. The bias panel keeps its
trigger at the foot of its fields, where it is a footer under the thing it
explains.

### The colophon at the foot of the rail

The rail is a full-height column, so a short list of decisions leaves a fixed void
under the *Keputusan baru* button — on every screen, not only the empty one. That
void is not space waiting to be filled with content; it is a column whose foot has
nothing to rest on, which reads as unfinished rather than as generous.

So the foot carries a **colophon**: the version and the licence, pinned with
`margin-top: auto` and closed by the same hairline the new-decision button uses.
The slack above it reads as a margin.

Two reasons this and not something else:

- **It cannot go stale.** A tip, a checklist or a quote is content that ages. The
  version is injected from `package.json` rather than written into the markup, so
  it cannot drift from the manifest.
- **It is not decoration.** The `Overview` above says this is an instrument, and
  bans the product-page moves. An illustration or a tip card in that corner is
  exactly what it bans.

The colophon says **where the app keeps its data only by not claiming otherwise**.
A sentence stating that decisions stay in the browser was tried and removed: the
app never sends one anywhere, so the line promised the absence of a feature and
took the corner of every screen to do it. A statement of a non-event is not
information.

It is **not** pinned below 56rem: the rail is a horizontal band there, not a tall
column, so the colophon follows the button in normal flow and drops the hairline.

**The contrast was measured, not inherited.** The rail sits on `surface-sunken`
(#f2f0e9), darker than paper, and the 5.23:1 figure recorded for `ink-gloss` was
measured *against paper*. Against the rail, `ink-faint` (#75736b) measures
**4.17:1 — below AA**. The colophon therefore uses `ink-soft` (#5f5e56), which
measures 5.72:1 there. A token that passes on one background is not a token that
passes on the next.

### The workspace head

The head is the decision's title block on the left and *Cetak* / *Hapus* on the
right. Two alignments are deliberate:

- **The actions are centred against the title block, not top-aligned.** The
  buttons are 44px and the block is taller, so top alignment left 24px above them
  and 46.6px below. Centring splits the difference equally (37.3px each) at any
  title length, without pinning either edge to a magic number.
- **The kicker sits 8px above the title, against 24px above itself.** A label
  belongs to the thing under it. At 4px the label was tighter to the title than
  the title was to its own box, which read as a collision rather than a pairing.

Stacked below 56rem the head is `flex-start`, so the actions share the left edge
with the title and every panel under it.

## Language

Indonesian is the interface. English appears underneath as a reading aid, at
smaller size in `ink-gloss` (#6b6960, 5.23:1 on paper).

The second line is **not** everywhere:

- **Bilingual:** panel titles, panel hints, field labels, and the bias questions.
  These are the places a reader can get stuck, and where the exact wording
  carries the method.
- **Indonesian only:** buttons, inline errors, the chat transcript, numbered row
  labels (`Opsi 2`), and the dense score-matrix cells. A button is an action, not
  a sentence; a second line under every action doubles the vertical space and
  makes a calm form feel like a manual.

Two rules that are not stylistic:

- The gloss is `aria-hidden`. Inside a `<label>` it would join the accessible
  name — the field would announce "Opsi Option 2" — and a screen-reader user does
  not need every label twice.
- The quieter look comes from **colour, not opacity**. Opacity blends toward the
  background: `ink-faint` at 0.75 measures 2.96:1 and fails AA. `ink-gloss` is a
  real token that measures 5.23:1.

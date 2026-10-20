# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Colophon at the foot of the rail.** Where the data is kept, plus the version
  and the licence, pinned to the bottom of the rail. The rail is a full-height
  column, so a short list of decisions left a fixed void under the new-decision
  button; the colophon closes the column, so the slack reads as a margin instead
  of as a column that ran out of content. It also gives the privacy line a single
  home: it previously sat in the empty state, which is unreachable once a decision
  exists, so a user with decisions was never told where their work was stored.
  Version and licence are injected from `package.json`, so the colophon cannot
  claim a version the manifest does not carry.
- **`package.json` gains `"license": "MIT"`**, so that licence line has a source
  instead of being a literal in the markup.
- **`src/vite-env.d.ts`** — declares the injected `__APP_VERSION__` and
  `__APP_LICENSE__` globals. Without it `tsc --noEmit` fails; they are ambient
  because `define` replaces them at build time.
- **`PrintMark` and `TrashMark`** (`src/ui/icons.tsx`) — the printer and the bin on
  the workspace's two corner actions. Both are drawn through one wrapper in that
  module so their stroke weight cannot drift from `AiMark`'s: a printer drawn
  heavier than the sparkle below it reads as a different product. Decorative, so
  the button's label stays the whole accessible name.
- **Bilingual interface, Indonesian first.** Every heading, field label and hint
  shows Indonesian with an English gloss underneath in a quieter colour. The app
  was already Indonesian (`index.html` sets `lang="id"`), but the panels were in
  English, so a reader met two languages in one form. Buttons, errors, the chat
  transcript and anything the user typed stay Indonesian only: a button is an
  action, not a sentence to translate, and doubling every action's height would
  turn a calm form into a manual. The gloss is `aria-hidden`, because inside a
  `<label>` it would become part of the accessible name and announce every field
  twice.
- **AI button in the bias checks, with the same sparkle as the options one.**
  The bias panel existed as tools and prompts but had no way in. Both entry
  points now share one `AiTrigger` component, so they cannot drift, and both
  carry the same mark so they read as one feature.
- **Bias answers land in the right field.** `record_answers` used to be flattened
  to a list of strings, which made five answers indistinguishable; the parser now
  keeps the field each answer belongs to, and accepting writes each into its own
  gate field. An answer for a check that does not exist is rejected rather than
  filed under a guess.
- **Elicitation panel** (`src/ui/ChatPanel.tsx`). In the Options stage, a person
  can open a bounded conversation and be asked questions until what they already
  know has been articulated. The result is a checklist of proposals, never a
  silent overwrite. Off-topic input is re-framed rather than rejected, because an
  off-topic remark usually means an objective the person had not written down.
- **Provider-neutral gateway layer** (`server/llm/`). Three env vars configure
  any OpenAI-compatible gateway; nothing in the code names a provider. Model
  discovery probes `/v1/models` because the response shape differs between
  gateways, and fails with a message telling you to set `LLM_MODEL`.
- **Streaming.** Reasoning streams as a "thinking…" indicator, so a 5–15 second
  wait is not a blank screen. Question text cannot stream: it lives inside tool
  arguments that are not valid JSON until the final chunk.
- **`docs/llm-providers.md`** — settings for Kenari, OpenAI, Groq, Together,
  OpenRouter, DeepSeek, Mistral, Azure, Ollama and LM Studio, and why tool
  calling is required rather than optional.
- **Dashboard shell.** The app was one vertical run of seven sections. It is now
  a rail of decisions beside a workspace for the open one, with the verdict
  above the inputs so the answer stays visible while they change.
- **`DESIGN.md`** — the visual identity as a token spec (Google's DESIGN.md
  format), linted with `@google/design.md`: 0 errors, 0 warnings, WCAG AA
  contrast passing. Warm paper and ink, one deep-green accent, Newsreader for
  display, Inter for interface, JetBrains Mono for numbers only.
- **Score matrix.** Options down the side, objectives across the top. Comparing
  options is the task, and a list forces the reader to hold the others in
  memory. Probability, reference class and the fatal flag sit behind a
  `<details>` disclosure so the matrix stays scannable.
- **Decisions library.** One storage key per decision plus an index, and a
  migration of the old single-draft key so existing work survives the change.
- **M4: the app reaches every stage.** Previously the form could only express a
  benefit with probability 1 and no fatal risk, which made four of the engine's
  five distinguishing features unreachable. Now:
  - `ItemEditor` — per item: value, benefit/cost, probability, reference class,
    and a fatal flag that blocks the recommendation.
  - `GatePanel` — the six required bias fields, with sunk cost labelled
    **excluded from the arithmetic**.
  - `CommitPanel` — predictions, outcomes, and a Brier score that is absent
    rather than zero until something is resolved.
  - `ShareBar` — a share link and a JSON export. The payload goes in the URL
    **fragment**, so a decision is never sent to a server.
  - Add and remove objectives and options. The last objective and the baseline
    cannot be removed; removing either takes its items and swing weight with it.
  - `persistence.ts` — the draft saves on every edit and reloads on the next
    visit. Storage is injected, not reached for through the global.
  - The first stylesheet: light and dark schemes, plus a print rule.
- **Core engine** (`src/core/`), pure functions with no React, DOM, or storage
  imports, one module per stage of the pipeline:
  - `frame.ts` — objective gate: no scoring until an objective exists.
  - `diverge.ts` — option floor: at least three options, exactly one baseline,
    and no unnamed options. The last rule matters because three rows of which
    one is blank would otherwise pass a two-option decision.
  - `tag.ts` — fact/preference tagging. A fact must name its source, a
    preference its owner; every failure is reported, not just the first.
  - `weigh.ts` — swing weighting, normalised to 1. Throws on a missing, negative,
    or zero-total point rather than inventing a weight.
  - `score.ts` — additive value function, min-max normalised per objective
    across the option set. Returns the anchors it normalised against, because
    re-normalising after a perturbation would make every score scale-invariant
    and no input could ever flip the ranking. Fatal risk blocks the
    recommendation and keeps the ranking.
  - `probabilify.ts` — every probability must name a reference class.
  - `stress.ts` — break-even sensitivity in closed form, in raw 1–5 units.
    A flip is the winner changing, not only the top two swapping; each item is
    searched only in the direction that hurts its option; a change must be
    strictly greater than the break-even, because reaching it only ties.
  - `gate.ts` — the bias checks, each one required field. `null` and zero sunk
    cost are different states: only "asked and answered" passes.
  - `commit.ts` — Brier score, and resolution of recorded outcomes. Throws on an
    empty list instead of returning `NaN`; unresolved predictions are excluded
    rather than counted as misses.
  - `serialize.ts` — URL round-trip. The base64url codec is written out because
    `btoa` is Latin-1 only (it cannot carry Indonesian text) and `Buffer` does
    not exist in a browser.
- **UI** (`src/ui/`) — one form for objective, options, swing weights and
  scores, and a result view that reports the ranking, the recommendation, the
  break-even, and what moves the answer most.
- **Tests** — 71 across 13 files, split into `core` (node) and `ui` (jsdom)
  vitest projects, plus an integration test that runs one decision through every
  stage and checks the stages agree with each other.
- `.github/workflows/ci.yml` — install, test, typecheck, build.

### Changed

- **The hint in every section head is right-aligned.** It sits in the corner of
  its section, and a two-line block whose lines started flush left inside the
  right-hand corner read as a fragment that had lost its column. Both lines now
  end on the same edge, the English gloss included. Below 56rem the head stacks
  and the same hint is a paragraph under the title, so it goes back to the left
  edge: the alignment is earned by the corner, not by being a hint.
- **`Cetak` and `Hapus` are coloured buttons, and both carry a mark.** They were
  two quiet grey words in the corner of the workspace, which made the only
  irreversible action in the app look exactly like the harmless one beside it.
  `Cetak` is the accent green, `Hapus` the danger red, and each carries a printer
  or a bin. Colour is the second cue and never the only one: the labels are
  unchanged, so a reader who cannot separate green from red still has two named
  buttons. `DESIGN.md`'s danger rule said fatal risk only and so read as a
  contradiction the moment a destructive button used it; the rule now names both
  uses and keeps the limit honest.
- **The options AI trigger moved to the top-right of the section head, and the
  panel it opens is docked beside the fields.** The button was at the foot of the
  option rows, which put the control on the far side of the panel it opened; the
  panel then pushed the rows off the top of the screen. The section body now
  splits 50/50 while the panel is open — form left, conversation right — and the
  head stays full width with the trigger in its corner. The split is a class the
  open state adds, so a closed panel leaves no empty half column, and it is
  width-gated at 72rem, below which the chat stacks under the rows where it used
  to be. The trigger hides while the panel is open, because `Tutup` already
  closes it. Same section, so the rows stay visible while you answer questions
  about them.
- **The options hint states the task instead of the rule.** It read "Minimal
  tiga, satu di antaranya tidak melakukan apa-apa", which told the reader the
  method before they had a chance to look at the form — and the form enforces
  both clauses structurally, so the sentence could only be read as a requirement
  to satisfy. It now asks "Dari posisimu sekarang, opsi apa saja yang tersedia?".
  The locked baseline row explains itself underneath instead: it cannot be
  removed, so the reader is owed the reason next to it rather than in a hint about
  the section.

- The share and export section is removed. It had no effect on the decision, and
  the URL-import path stays so a link that was already shared still opens.
- **System One is replaced by the elicitation panel.** The model helps users
  articulate options; the engine computes.
- The panel is written in Indonesian, matching `index.html`'s `lang="id"`. It
  previously opened in English and the model answered in Indonesian, which read
  as two different products.
- `docs/framework.md` — the Stress procedure was "vary each value by ±0.5 and
  record the delta". That is not a break-even and cannot flip the plan's own
  worked example, so the section now specifies the closed-form break-even and
  states the tie, direction, and division-by-zero rules the arithmetic depends
  on. `probability.basis` remains out of scope, with the reason it
  cannot hold an honest value in v1.
- `src/setupTests.ts` removed: it imported `@testing-library/jest-dom`, which was
  not a dependency, and nothing referenced it after the vitest split.

### Fixed

- **The workspace head is balanced.** *Cetak* and *Hapus* sat 24px below the top
  of the page and 46.6px above the first panel, because the row was top-aligned
  against a taller title block. It is centred now, so both gaps measure 37.3px.
  The `KEPUTUSAN` kicker was 25px from the top and only 4px from the title; it is
  8px from the title now, which is where a label belongs.
- **The rail no longer states where the data is kept.** The sentence promised the
  absence of a feature the app never had, and took the corner of every screen.
- **The review date is stored, not discarded.** `Tinjau pada` was an unbound
  `<input type="date">`: typing a date left the document unchanged, so the one
  field that schedules a review did nothing. It is now bound to `reviewAt` and
  survives a reload. The value stays `YYYY-MM-DD` rather than an ISO timestamp,
  because round-tripping through `Date` shifts the day across a timezone.
- **A failed save is reported.** `saveDecision` returns a boolean and all three
  call sites dropped it, so a full quota or private mode looked like a successful
  save. The workspace now raises an `alert` naming the failure. Everything in this
  app lives in one browser, so a silent write failure is total data loss.
- **Escape closes the elicitation panel**, so it is no longer mouse-only.
- **The date field has a visible focus ring.** Chromium does not paint
  `:focus-visible` on a date input while its inner editor holds focus; the ring is
  drawn from `:focus-within` instead.
- **Every interactive control is at least 44px tall.** The matrix cells were 34px,
  the corner actions 36px, and `Tutup` 32px. Density comes from type size and
  spacing, not from shrinking the box a finger has to hit.
- **The rail's empty-state line passes AA.** It was `ink-faint` on
  `surface-sunken`, which measures 4.17:1.
- **Two em dashes removed from user-facing copy** (the rail lede and the Brier
  sentence), per the antislop rule against them.
- **`pnpm dev` now serves on port 5199, the port the docs have always named.**
  `README.md` and `docs/how-to-use.md` both document `http://localhost:5199/`, and
  the how-to hands the reader a share link to paste at that origin, but the port
  was never configured: `pnpm dev` silently served 5173 instead. Because
  `localStorage` is origin-scoped, a draft saved at one origin was invisible at the
  other, and the documented link could not find it. The port is set for `server`
  and `preview` with `strictPort`, so a port already in use fails loudly rather
  than drifting to one the docs do not point at.
- **The rail's privacy line was set in a colour that fails AA there.** The rail
  sits on `surface-sunken`, and the 5.23:1 figure recorded for `ink-faint` was
  measured against paper; on the rail it measures 4.17:1. The colophon uses
  `ink-soft` (5.72:1). Measured, not inherited — see `DESIGN.md`.
- Accepting several suggested options gave them all the same id, which React
  reported as duplicate keys and which would have made an edit land on the wrong
  row. Found in a browser run, not by a test.
- `grid-template-columns` used `repeat(var(--cols), …)`, which is invalid CSS:
  `repeat()` needs an integer, so the declaration was dropped and the score
  matrix never formed. Every cell stacked full width.
- The workspace passed `null` as storage, which the library correctly read as
  "no storage available" and no-op'd — nothing saved.
- An inline `grid-template-columns` overrode the mobile media query, so the
  matrix scrolled sideways on a phone.
- User-facing copy exposed internal field names (`sunkCost`,
  `hastyGeneralisation`) and printed "6 bias check(s)".
- `DecisionSchema` carried no `swingPoints`, so a shared URL restored the
  options and items but silently lost the weights: the recipient would open a
  decision that scores differently from the one shared. Review Focus 5 asks for
  a round-trip without loss, and this was the loss. `outcomes` joined it for the
  same reason.
- Testing Library was not cleaning up between tests. It only auto-cleans when
  its own globals are enabled, which this suite does not, so renders leaked and
  `getByLabelText` could resolve to a previous test's element.
- `pnpm-workspace.yaml` contained pnpm's own generated placeholder
  (`esbuild: set this to true or false`) as the value of `allowBuilds`, so
  `pnpm install` failed with `ERR_PNPM_IGNORED_BUILDS`. Set to `true`.
- A type error in `weigh.test.ts` where object literals widened `kind` to
  `string`. The suite was green while `tsc` was not, because vitest's esbuild
  transform strips types without checking them.

### Added (research phase, before the engine)

- Source extraction: 91 photographs of the book's spreads read with
  `deepseek-v4-1-flash`, 0 failures. Verbatim OCR is kept **out of git**
  (`docs/sources/raw-text/`); only our own per-chapter notes are tracked.
- `docs/sources/notes/` — one note per chapter: what it establishes, which
  primary source it rests on, what must not be copied, and how much of it
  reaches the engine.
- `docs/core-engine-scope.md` — the filtering decision: ten engine components
  that ship, eight items explicitly excluded with reasons, and the decision
  shapes deferred to v2/v3.
- `tools/vision/batch_ocr.py` — resumable batch extraction ordered by capture
  timestamp.
- `tools/vision/kenari_vision.py` — reasoning-model guards: `reasoning_effort:
  none` and a doubled-budget retry. Without them `deepseek-v4-1-flash` spends
  the whole completion budget on reasoning and returns empty content while
  `finish_reason` still reads `stop`.
- `.gitignore` — `docs/sources/notes/` is now un-ignored (our notes are ours);
  `raw/` and `raw-text/` are explicitly ignored.
- `.githooks/pre-commit` — refuses to commit any image or document under
  `docs/sources/` (except `.md` notes) and any image staged anywhere in the
  repo, so source photographs stay local even against `git add -f`. Verified:
  a force-added `.jpg` and a `.png` outside `docs/sources/` were both refused,
  while a `.md` note committed normally.
- `tools/vision/` — reads a page photograph with a vision model on Kenari.id.
  Default model verified against a rotated, compressed test page: text and table
  structure both correct.
- `README.md`, `AGENTS.md` — project framing, pipeline outline, and the rules
  coding agents must follow (no transcription, no credentials, pure engine).

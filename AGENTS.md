# Working in this repository

Instructions for coding agents. Read this before touching anything.

## What this project is

**Nimbang** — a decision-making framework implemented as software. The
framework is derived from primary decision-science literature (Keeney, MAVT,
Kahneman, Klein, Flyvbjerg), not from any single popular book. A popular
Indonesian book is a secondary source and a prompt for the project; its prose,
examples, tables, and illustrations are **not** inputs.

Read [`README.md`](README.md) for the pipeline and design constraints.

## Current state

Research phase. **No application code exists yet, and none should be written
until the spec is approved.** The order is fixed:

```
source extraction -> docs/framework.md -> design doc -> implementation plan -> code
```

If asked to build something before the spec exists, say so rather than
scaffolding.

## Hard rules

- **Do not transcribe the book.** Source notes record page numbers, the concept
  a page establishes, and how it maps to a stage of our framework. Never copy
  prose, example cases, tables, or illustrations. Never use the book's title,
  its coined terms, or its cover as a name, feature name, or branding.
- **Page photographs never enter git.** `docs/sources/*.jpg` is ignored. Only
  `.md` notes are tracked. Do not add an exception to `.gitignore`.
- **Never commit credentials.** The Kenari API key is read at runtime from
  `~/.hermes/.env` via the `kenari-key` helper. It must not appear in code,
  logs, docs, commits, or output.
- **The engine stays pure.** `src/core/` must not import React, DOM, or any
  storage API. It takes plain data and returns plain data.
- **Cite or don't claim.** Any formula or method added to
  `docs/framework.md` needs a real source. If a stage has weak academic
  grounding, say so in the document instead of inventing authority for it.

## Tooling

- `tools/vision/kenari_vision.py <image>` — read a page photo. Free model by
  default; see that directory's README before escalating.
- Package manager: **pnpm**. Node 26 is installed.
- Never invoke bare `python3` — it is macOS 3.9.6. The vision helper is
  stdlib-only and runs on it fine, but any real Python work needs `uv run`.

## Conventions once code starts

- TypeScript strict. No `any` without a comment justifying it.
- Tests before implementation, in `src/core/` especially.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
- One commit per logical change; no drive-by reformatting.

## Before claiming anything is done

Run it. Paste the real output. A test that was not executed is not a passing
test, and a build that was not run is not a working build.

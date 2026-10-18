# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

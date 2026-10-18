# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Repository scaffold: ignore rules that keep source-page photographs out of
  git, notes directory, spec and plan directories, pure-engine directory.
- `tools/vision/` — reads a page photograph with a vision model on Kenari.id.
  Default model verified against a rotated, compressed test page: text and table
  structure both correct.
- `README.md`, `AGENTS.md` — project framing, pipeline outline, and the rules
  coding agents must follow (no transcription, no credentials, pure engine).

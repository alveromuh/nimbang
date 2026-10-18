# Vision tooling

Project tooling for the research phase: turn photographs of source material
into text. Not part of the shipped app, not built, not tested in CI.

## Why this exists

The framework behind this project has primary sources (Keeney, Boardman,
von Winterfeldt & Edwards, Kahneman, Klein). The secondary source is a physical
book with no digital edition. Reading it means photographing pages and
extracting them.

## Usage

```bash
./kenari_vision.py page-042.jpg                    # free model, default
./kenari_vision.py page-042.jpg --model claude-sonnet-5   # dense tables
./kenari_vision.py page-042.jpg --prompt "Which cells are empty?"
```

Model choice, measured on a 6°-rotated, 60%-quality JPEG of a page with a table:

| Model | Prompt tokens | Result |
|---|---|---|
| `agnes-3-0-flash:free` | 1,102 | all text correct, table structure intact |
| `claude-sonnet-5` | 4,943 | same text, cleaner table rules |

Start free. Escalate per page, not per batch.

## Photographing pages

- One page per frame, upright, flat, even light. No shadows across the text.
- If a page has a small table or formula, take a second close-up. A single wide
  frame reads the prose but mangles the digits.
- JPEG, not HEIC. On iPhone: Settings → Camera → Formats → Most Compatible.

## What lands where

```
docs/sources/*.jpg     ignored by git, never committed
docs/sources/*.md      extracted notes, committed
```

Only the notes are tracked: page numbers, what the page establishes, and how it
maps to a stage of our framework. Never a transcription of the prose.

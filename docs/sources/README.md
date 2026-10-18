# Source material

Photographs of source pages live here and are **never committed** (see
`.gitignore`). Only the markdown notes extracted from them are tracked.

## Photographs

Naming: `<topic>-<page>.jpg`, e.g. `cba-p142.jpg`. JPEG, not HEIC.

## Extracted notes

One file per topic, named `<topic>.md`. Each note records:

- **Pages** — where in the source it came from
- **What it establishes** — the concept in our own words
- **Maps to** — which stage of the framework in `docs/framework.md` it feeds
- **Primary source** — the academic work this idea actually originates from,
  where identifiable
- **Do not copy** — anything specific to the book's expression (its examples,
  tables, coined terms) that must stay out of our implementation

The point of a note is to let someone write the framework without re-reading the
book, while making sure nothing from the book's *expression* leaks into the
project.

# Nimbang

A decision-making framework, implemented as software.

Nimbang takes the machinery of structured decision-making — objectives before
options, explicit value trade-offs, probability-weighted outcomes, sensitivity
analysis, and a record of what you predicted so you can learn from it — and puts
it in one guided pipeline instead of eight disconnected worksheets.

> **Status: research.** No application code yet. The framework is being derived
> from primary sources first; the spec follows from that. See
> [`docs/`](docs/) and the roadmap below.

## Why not just a pros/cons calculator

Any list can rank options. Two things make this different:

- **It tells you when the answer is fragile.** A ranking built on subjective
  scores is only as good as its inputs. Nimbang reports which input, if wrong,
  flips the decision — so the output is "go find out X" rather than a false
  precision.
- **It closes the loop.** Decisions are recorded with their predicted
  probabilities and reviewed later, producing a calibration score. The point is
  not one good decision; it is getting better at judging.

## The pipeline

Derived from the decision-analysis literature, not from any single popular book.

| Stage | What happens | Grounded in |
|---|---|---|
| Frame | State objectives before listing options | Keeney, *Value-Focused Thinking* |
| Weigh | Weight objectives by swing, not by "importance" | MAVT / swing weighting |
| Diverge | Require at least three options, including "do nothing" | against false dichotomy |
| Tag | Mark every claim as fact or preference | Hume's is–ought gap |
| Score | Value each option against each objective, normalized 0–1 | additive value function |
| Probabilify | Attach probabilities and reference classes | expected value |
| Stress | Tornado, break-even, Monte Carlo | sensitivity analysis |
| Gate | Bias checks that target specific biases with specific techniques | Klein, Flyvbjerg, Arkes |
| Commit | Lock the decision and its predictions; review on schedule | Brier score |

The framework document, with formal definitions and citations, is
[`docs/framework.md`](docs/framework.md) *(written after source extraction)*.

## Roadmap

- [ ] **M0 — Sources.** Photograph and extract the secondary source; verify the
      primary sources it rests on.
- [ ] **M1 — Framework.** `docs/framework.md`: formal stages, formulas,
      citations.
- [ ] **M2 — Spec.** Design document, approved before any code.
- [ ] **M3 — Core engine.** Pure functions, test-first: scoring, sensitivity,
      calibration.
- [ ] **M4 — App.** Guided pipeline, end to end, with print and share.
- [ ] **M5 — Release.** Public repo, live demo, docs.

## Design constraints

- **Client-only.** No backend, no accounts, no database. State lives in the
  browser; sharing is a compressed URL or a file. Nothing to operate, nothing to
  breach.
- **The engine is pure.** `src/core/` holds functions with no framework imports,
  so the mathematics is testable on its own and reusable outside the UI.
- **Every number is traceable.** The app must always be able to say where a
  score came from and what would change it.

## Repository layout

```
docs/
  framework.md            the framework itself: stages, formulas, citations
  sources/                extracted notes (page photos are never committed)
  superpowers/specs/      design documents
  superpowers/plans/      implementation plans
src/core/                 pure decision engine, no UI imports
tools/vision/             research tooling: page photo -> text
```

## Local setup

```bash
git config core.hooksPath .githooks   # one time per clone; blocks page photos
```

## License

MIT. See [`LICENSE`](LICENSE).

## Acknowledgements

Built on published decision science. Full citations in
[`docs/framework.md`](docs/framework.md).

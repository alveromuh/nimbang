# Nimbang

A decision-making framework, implemented as software.

Nimbang takes the machinery of structured decision-making — objectives before
options, explicit value trade-offs, probability-weighted outcomes, sensitivity
analysis, and a record of what you predicted so you can learn from it — and puts
it in one guided pipeline instead of eight disconnected worksheets.

> **Status: v1 engine and app working.** The core engine (`src/core/`) is
> implemented test-first and covers all nine stages; a minimal React form in
> `src/ui/` runs the pipeline end to end. See the roadmap below for what is
> still missing before release.

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
Every citation behind the pipeline is in [`docs/references.md`](docs/references.md).

## Design constraints

- **Deterministic core, thin optional backend.** All scoring, sensitivity, and
  calibration run in the browser on plain data — `src/core/` is pure and needs
  no server. A backend exists for exactly one reason: a model API key cannot
  live in a browser. That backend is one endpoint, not a service.
- **The engine is pure.** `src/core/` holds functions with no framework imports,
  so the mathematics is testable on its own and reusable outside the UI.
- **Every number is traceable.** The app must always be able to say where a
  score came from and what would change it. A model-derived number is labelled
  with its source and confidence, and is overridable.

## Structured input

Turning a messy human description into the fields the engine needs is handled by
a **decision model**, not a chatbot: `POST /v1/systemone` on Kenari.id returns
typed answers with probabilities, keyed by question id — no free text, no output
to parse.

The dividing line is absolute: **the model fills fields, the engine computes.**
No model output ever becomes a ranking or a winner. Assessed against 20 cases
with ground truth — see
[`docs/systemone-integration.md`](docs/systemone-integration.md) for the contract
and [`docs/eval-systemone.md`](docs/eval-systemone.md) for the measurements.

## Roadmap

- [x] **M0 — Sources.** Photograph and extract the secondary source; verify the
      primary sources it rests on.
- [x] **M1 — Framework.** `docs/framework.md`: formal stages, formulas,
      citations.
- [x] **M2 — Spec.** Design document, approved before any code.
- [x] **M3 — Core engine.** Pure functions, test-first: scoring, sensitivity,
      calibration. 68 tests across 13 files.
- [ ] **M4 — App.** Guided pipeline, end to end, with print and share. *The form
      and the result view exist; localStorage persistence, print, and the gate /
      commit screens do not.*
- [ ] **M5 — Release.** Public repo, live demo, docs.
- [ ] **M6 — Structured input.** System One endpoint, question set under version
      control, 100-case regression suite in CI.

## Repository layout

```
docs/
  framework.md              the framework itself: stages, formulas, citations
  references.md             verified sources for every method the engine uses
  core-engine-scope.md      what ships, what is excluded, and why
  systemone-integration.md  contract for the model-backed input layer
  eval-systemone.md         measurements behind that decision
  sources/                  extracted notes (page photos are never committed)
  superpowers/specs/        design documents
  superpowers/plans/        implementation plans
src/core/                   pure decision engine, no UI imports
src/ui/                     React form and result view
tools/vision/               research tooling: page photo -> text
tools/eval/                 System One eval cases, runner, raw results
```

## Local setup

```bash
pnpm install
pnpm test        # 71 tests: core engine, UI, integration
pnpm build       # tsc --noEmit, then a production bundle
pnpm dev         # the form, in a browser
git config core.hooksPath .githooks   # one time per clone; blocks page photos
```

## License

MIT. See [`LICENSE`](LICENSE).

## Acknowledgements

Built on published decision science. Full citations in
[`docs/framework.md`](docs/framework.md).

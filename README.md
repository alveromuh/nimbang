# Nimbang

A decision-making framework, implemented as software.

Nimbang takes the machinery of structured decision-making — objectives before
options, explicit value trade-offs, probability-weighted outcomes, sensitivity
analysis, and a record of what you predicted so you can learn from it — and puts
it in one guided pipeline instead of eight disconnected worksheets.

> **Status: v1 engine and app working.** The core engine (`src/core/`) is
> implemented test-first and covers all nine stages; a minimal React form in
> `src/ui/` runs the pipeline end to end.

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

Turning a messy human description into the fields the engine needs is handled by a
bounded **elicitation panel**, not a chatbot that runs the decision: it asks what
you are already considering, and proposes options for you to accept. Off-topic
remarks are re-framed rather than rejected, because they usually reveal an
objective you had not written down.

The dividing line is absolute: **the model fills fields, the engine computes.**
The panel never sees a score, a weight, or a probability, so no model output can
become a ranking or a winner. It works with any OpenAI-compatible gateway —
see [`docs/llm-providers.md`](docs/llm-providers.md).

## Repository layout

```
docs/
  framework.md              the framework itself: stages, formulas, citations
  references.md             verified sources for every method the engine uses
  core-engine-scope.md      what ships, what is excluded, and why
  llm-providers.md          configuring the panel for any OpenAI-compatible gateway
  sources/                  extracted notes (page photos are never committed)
  superpowers/specs/        design documents
  superpowers/plans/        implementation plans
DESIGN.md                   design tokens and rationale (Google DESIGN.md spec)
src/core/                   pure decision engine, no UI imports
src/ui/                     dashboard, workspace, panels, stylesheet
tools/vision/               research tooling: page photo -> text
```

## Local setup

```bash
pnpm install
pnpm test        # core engine, UI, and integration tests
pnpm build       # tsc --noEmit, then a production bundle
pnpm dev         # the app, at http://localhost:5199
git config core.hooksPath .githooks   # one time per clone; blocks page photos
```

New to it? [`docs/how-to-use.md`](docs/how-to-use.md) walks through a worked
example with a share link you can paste in.

### AI suggestions (optional)

The app works fully without this. The panel that helps you articulate options
needs a chat model with tool calling, and any OpenAI-compatible gateway will do.

```bash
cp .env.example .env    # then fill in LLM_API_KEY
pnpm dev
```

```bash
LLM_BASE_URL=https://kenari.id/v1
LLM_API_KEY=...
LLM_MODEL=            # optional; discovered when blank
```

Without a key the endpoint returns `503 not_configured` and the panel says so —
it does not silently do nothing. Settings for Kenari, OpenAI, Groq, OpenRouter,
Ollama and others: [`docs/llm-providers.md`](docs/llm-providers.md).

## License

MIT. See [`LICENSE`](LICENSE).

## Acknowledgements

Built on published decision science. Full citations in
[`docs/framework.md`](docs/framework.md).

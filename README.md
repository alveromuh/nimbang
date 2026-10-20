# Nimbang

A decision-making framework, implemented as software.

Nimbang guides a decision through objectives, options, trade-offs, uncertainty,
sensitivity analysis, and a record of predictions for later review.

> **Status: v0.1.0 released.** The core engine (`src/core/`) implements all
> nine stages, with a React interface in `src/ui/`.

## Why not just a pros/cons calculator

Nimbang adds two things to a basic option list:

- **It tells you when the answer is fragile.** A ranking built on subjective
  scores is only as good as its inputs. Nimbang reports which input, if wrong,
  flips the decision, helping show which uncertainty is worth investigating.
- **It closes the loop.** Decisions are recorded with their predicted
  probabilities and reviewed later with a calibration score.

## The pipeline

Based on decision-analysis literature.

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

The optional **elicitation panel** helps turn a description into structured
fields. It asks what you are considering and proposes options for you to accept.
It does not make the decision.

**The model fills fields; the engine computes.** The panel does not receive
scores, weights, or probabilities. It works with any OpenAI-compatible gateway —
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

The app works without a model. To enable suggestions, configure a chat model with
tool calling through any OpenAI-compatible gateway:

```bash
cp .env.example .env    # set LLM_BASE_URL and LLM_API_KEY for your gateway
pnpm dev
```

`LLM_BASE_URL` is the gateway's API base URL, including its version path (for
example, `https://api.openai.com/v1` or `https://api.groq.com/openai/v1`). It
does not have to be Kenari. Set `LLM_API_KEY` to the matching key; leave
`LLM_MODEL` blank to try model discovery. The Kenari-specific
`KENARI_API_KEY` is an optional fallback that uses Kenari's URL when the explicit
`LLM_BASE_URL`/`LLM_API_KEY` pair is not configured.

Without a key the endpoint returns `503 not_configured` and the panel says so —
the panel does not silently do nothing. Provider examples and gateway-specific
settings: [`docs/llm-providers.md`](docs/llm-providers.md).

## License

MIT. See [`LICENSE`](LICENSE).

## Acknowledgements

Built on published decision science. Full citations in
[`docs/framework.md`](docs/framework.md).

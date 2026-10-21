# Nimbang

A simple way to think through a decision, built as software.

Nimbang helps you decide what matters, compare your choices, see what could
change your mind, and check later whether your expectations were right.

> **Status: v0.1.0 released.** The core engine (`src/core/`) implements all
> nine stages, with a React interface in `src/ui/`.

## How it works, in one picture

First, say what you want and list the choices you have now. Next, compare them
and choose one. Finally, check what could change your choice and write down
what you expect to happen, so you can learn from it later.

![Nimbang pipeline: Frame, Diverge, Tag, Weigh, Score, Probability, Stress, Gate, Commit](docs/images/pipeline.svg)

**Why follow this order?** It is easier to compare choices when you know what
you want. Writing down what you know and what you are unsure about helps make a
fair comparison. A final check can show whether a small change would lead you
to choose something else.

| # | Step | In simple terms |
|---|---|---|
| 01 | **Frame** | Say what you want to achieve |
| 02 | **Diverge** | List the choices you have now |
| 03 | **Tag** | Tell facts apart from opinions |
| 04 | **Weigh** | Decide what matters most |
| 05 | **Score** | Rate each choice on what matters |
| 06 | **Probability** | Say how likely important events are |
| 07 | **Stress** | Check what could change your choice |
| 08 | **Gate** | Pause and think it over |
| 09 | **Commit** | Record your choice and check back later |

## Why not just a pros/cons calculator

A pros-and-cons list counts points, but does not show which points matter more
or how sure you are about them.

![A pros/cons list beside a Nimbang result: the list shows 2 versus 1, Nimbang shows a 0.04 margin and names the input that would reverse it](docs/images/why-nimbang.svg)

Nimbang helps in three ways:

- **Focus on what matters.** Compare how much each choice changes the things
  you care about, instead of treating every item as equally important.
- **See what could change your choice.** Nimbang points out which estimate, if
  different, would make another choice look better.
- **Learn from past choices.** Write down what you expect, then check later what
  happened. This helps you make better estimates next time.

## The pipeline in detail

Here is what happens at each step. The detailed rules and research behind them
are in [`docs/framework.md`](docs/framework.md) and
[`docs/references.md`](docs/references.md).

| Step | What you do | Based on |
|---|---|---|
| Frame | Name what you want to achieve | Keeney, *Value-Focused Thinking* |
| Diverge | List the choices you have now | Avoiding false either-or choices |
| Tag | Mark what is a fact and what is an opinion | Hume's is–ought gap |
| Weigh | Decide which goals matter most | MAVT / swing weighting |
| Score | Rate each choice against each goal | Additive value function |
| Probability | Estimate how likely things are, using similar past cases | Expected value |
| Stress | See how changes to your estimates affect the result | Sensitivity analysis |
| Gate | Pause to ask questions that may change your view | Klein, Flyvbjerg, Arkes |
| Commit | Record your choice and what you expect to happen | Brier score |

A recommendation appears only when the comparison is filled in: facts and
opinions are marked, estimates explain what they are based on, and every choice
has been rated against every goal. A blank rating means “not rated,” not zero.

## Design constraints

- **Deterministic core, thin optional backend.** All scoring, sensitivity, and
  calibration run in the browser on plain data. `src/core/` is pure and needs
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
scores, weights, or probabilities. It works with any OpenAI-compatible gateway;
see [`docs/llm-providers.md`](docs/llm-providers.md).

## Repository layout

```
docs/
  framework.md              the framework itself: stages, formulas, citations
  references.md             verified sources for every method the engine uses
  core-engine-scope.md      what ships, what is excluded, and why
  llm-providers.md          configuring the panel for any OpenAI-compatible gateway
  how-to-use.md             a worked example with a share link
  images/                   the diagrams in this README, as SVG
  sources/                  extracted notes (page photos are never committed)
  superpowers/specs/        design documents
  superpowers/plans/        implementation plans
DESIGN.md                   design tokens and rationale (Google DESIGN.md spec)
examples/                   two complete decisions, runnable as share links
src/core/                   pure decision engine, no UI imports
src/ui/                     dashboard, workspace, panels, stylesheet
tools/vision/               research tooling: page photo -> text
tools/eval/                 browser checks for the built app (not in CI)
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

Without a key the endpoint returns `503 not_configured` and the panel says so.
The panel does not silently do nothing. Provider examples and gateway-specific
settings: [`docs/llm-providers.md`](docs/llm-providers.md).

## License

MIT. See [`LICENSE`](LICENSE).

## Acknowledgements

Built on published decision science. Full citations in
[`docs/framework.md`](docs/framework.md).

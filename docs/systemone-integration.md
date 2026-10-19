# System One integration

`POST /v1/systemone` on Kenari.id is the intended structured-input layer for
Nimbang. This document is the contract a coding agent must follow when building
against it.

Status: **superseded** by the elicitation panel. Kept because its measurements and
its dividing line still apply, and because it records why System One was chosen
first. The panel now uses a chat model with tool calling instead — see
[`superpowers/specs/2026-10-19-elicitation-chat.md`](superpowers/specs/2026-10-19-elicitation-chat.md)
and [`llm-providers.md`](llm-providers.md).

The rule below is unchanged and still binding: **the model fills fields, the
engine computes.** The panel honours it by never sending a score, weight, or
probability to the model at all.

## What is built

`server/suggest.ts` is the only server-side code in the project. It exists for
one reason: the key cannot live in a browser. It relays a `state` and a question
set to System One, passes 429 through so the client retries, and never returns
the upstream body or the key.

`src/suggestions/` is the client side:

| File | Role |
|---|---|
| `catalog.ts` | every word a suggestion can show — the model never writes text |
| `questions.ts` | the versioned question set (`suggest-v1`) |
| `client.ts` | one fetch to `/api/suggest`, retry on 429, distinct failures |
| `map.ts` | model answer → labelled, overridable suggestions |

Two features use it: an option archetype the user has not written down, and the
bias checks most likely to matter here.

`choice` returns a class label and a probability, not prose, so the catalog is
the only source of user-facing text. An unknown label is dropped rather than
rendered — there is no code path in which model-authored text reaches the UI.

Bias suggestions are `noul` questions ("how likely is this bias to matter"), and
the result is a *prompt* the user can insert, never a filled answer.

## What it is

A decision model, not a chat model. You send a `state` and a set of typed
`questions`; you get back one typed answer per question. No free-form
generation, therefore **no output to parse and no JSON to repair**.

```
POST https://kenari.id/v1/systemone
Authorization: Bearer <key>
```

Request:

| Field | Required | Notes |
|---|---|---|
| `model` | yes | `jev-1-13-free`, `clef:free`, `clef-flash:free` |
| `state` | yes | the situation: string, object, or array |
| `questions` | yes | max 128, each keyed by an id you choose |
| `assets` / `images` | no | for the multimodal variants |

Question types:

| Type | Returns | Use for |
|---|---|---|
| `choice` | `choice`, `confidence`, `probabilities{}` | picking a class |
| `score` | `score` (expected value), `probabilities{}`, `legend{}` | ordered rubrics |
| `noul` | `noul` = P(true) | yes/no, probabilistic claims |
| `box` | bounding box + confidence | locating something in an image |

Answers come back keyed by **your** question id. `clef` reports
`output_tokens: 0` — the cost is input tokens only.

## The dividing line — do not cross it

**The model fills fields. The engine computes.**

Permitted:

- classify the shape of the decision
- extract named options, constraints, and stated numbers
- assign scores against a rubric **the app defines**
- estimate a probability, labelled as an estimate
- infer an implicit objective

Forbidden:

- producing a ranking, a winner, or a recommendation
- any number that reaches the final result without a source label
- silent fallback: if a model field is missing, the app asks the user rather
  than defaulting

Rationale: the product's claim is that every number is auditable. A number the
model invented is not auditable, so it can never sit in the same place as a
number the user gave. Model output enters as a separate, labelled, overridable
layer.

## Model choice, measured

20 Indonesian cases with ground truth, 142 API calls, retry-on-429:

| Model | Classification | Readiness score | Determinism | Order-stable |
|---|---|---|---|---|
| `jev-1-13-free` | **20/20** | **5/20 violations** | 4/4 | 4/4 |
| `clef:free` | **20/20** | **0/20 violations** | 4/4 | 4/4 |
| `clef-flash:free` | 18/20 | 4/20 violations | 4/4 | 4/4 |

- **Classification → `jev-1-13-free`.** Most decisive probabilities, ~320 input
  tokens per case.
- **Rubric scoring → `clef:free`.** `jev` is overconfident and wrong on every
  allocation and priority case; do not use it for `score` questions.
- Two-model consensus is affordable (~640 tokens) and lets the app surface
  disagreement instead of guessing. Use it where being wrong is expensive.

## Question phrasing is an artefact, not a string literal

Measured: rephrasing one question moved accuracy by 50 percentage points
(4/8 → 7/8 on goal detection).

- Question text lives in version control as data, not inline in a fetch call.
- Every question set carries a version. Changing wording requires re-running the
  eval suite and committing the new results.
- Prefer **inference-framed** wording for anything about user intent. Literal
  wording ("does the text *state* a goal") fails on input where the goal is
  implied by the options and numbers, which is most real input.

```ts
// yes
const GOAL_INFERRED = {
  type: 'noul',
  instructions: 'Can a desired outcome be inferred from this text, even if the person never states it as a goal?',
  criteria: {
    true: 'An aim is identifiable, stated or implied by the options and numbers given',
    false: 'Nothing suggests what the person wants to achieve',
  },
};

// no — asks the model to find an explicit statement, misses implicit goals
const GOAL_LITERAL = { /* "Does the text state a concrete objective?" */ };
```

## Reliability rules

- **Retry on 429 with backoff.** Free tier rate-limits: 10 retries across 142
  calls, all recoverable. Never let a 429 become a wrong answer or a silent
  skip — that is exactly the bug that produced a false 50% instability reading
  in the first assessment.
- **Never swallow an exception in an eval loop.** A failed call is not a
  disagreement. Record it separately.
- **A timeout is not an answer.** If the call fails, show the user the form
  unfilled, not a guessed value.
- **Verify the model id exists** via `GET /v1/models?modality=systemone`. A
  plain `GET /v1/models` does **not** list these models — that omission cost
  real time once already.

## Where the key lives

The key is read at runtime from `~/.hermes/.env` via the `kenari-key` helper
during development, and must come from an environment variable in any deployed
service. It never enters the repository.

Consequence for architecture: **a browser cannot hold this key.** Any feature
that calls System One needs either a server-side endpoint or a user-supplied
key stored locally by the user. This is the only reason Nimbang needs a backend.

## Known limits

- Assessed on 20 cases, one author, Indonesian only, one run per case.
- Classification was easy because the six classes are distinct. Real input
  carries multiple decisions in one message and mixes languages.
- Nothing tested on images; `box` questions and the multimodal variants are
  unmeasured.
- Before shipping: build the 100-case regression suite and run it in CI against
  the versioned question set.

## Tooling in this repo

```bash
tools/eval/eval_cases.py     # 20 cases + question set
tools/eval/eval_clean.py     # runner: accuracy, determinism, calibration
tools/eval/test_phrasing.py  # phrasing A/B test
tools/eval/eval_results.json # raw results from the assessment run
```

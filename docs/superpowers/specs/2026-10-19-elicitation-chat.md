# Spec: v1.1 — Elicitation panel

> **For agentic workers:** This spec is the input to the implementation plan. It
> records a deliberate revision of a stated design rule, so the reasoning is on
> the record before the code exists.

**Goal:** In the Options and Bias-checks stages, a person can open a bounded panel
and be asked questions until what they already know has been articulated. The
result is proposed, never applied silently.

## What this changes

`docs/framework.md` previously said, without qualification:

> **No chatbot.** The pipeline is a form, not a conversation.

That rule was about the surface, and it was right. A conversational interface
would make the provenance of every number fuzzy, which destroys the product's
only claim. This spec keeps the surface rule and adds one bounded exception:

> The conversation is never the way you *operate* the decision. It is one way to
> *articulate* an input to it.

The line that does not move: **the model fills fields, the engine computes.**

## Why this is not a violation

| Rule | Status |
|---|---|
| No model-generated numbers | Held. The panel never sees scores, weights, or probabilities. |
| Every number traceable to an input | Held. Options are the user's own words, echoed back. |
| No silent fallback | Held. Every failure is stated, and nothing applies without a click. |
| No chatbot as the interface | Held. The panel is scoped to one stage and closable. |

## Scope

**In:** an options elicitation panel; a bias-check elicitation panel.

**Out:** scores, weights, probabilities, the verdict. A model never touches them.

## The three behaviours that make it usable

### 1. The model speaks first, naming the objectives

The panel opens only when at least one objective is non-empty, because otherwise
there is nothing to ask about. The first line names the objectives:

> What options are you currently considering for reaching *Penghasilan naik* and
> *Jam kerja tidak bertambah*?

### 2. Out-of-scope input is re-framed, not rejected

A user may say something unrelated to the stated objective. Rejecting it would be
wrong, and this is the important part: the framework's own premise is that people
routinely state a hygiene goal as if it were an aim. So off-topic input is
usually evidence of an **unstated objective**, which is the most valuable thing
elicitation can find.

| Input | Response |
|---|---|
| A relevant option | Recorded |
| On-topic but vague | One clarifying question |
| Off-topic, implies a missing objective | `flag_scope(missing_objective)` → the UI offers to add it |
| Off-topic, unrelated | One sentence acknowledging it, then the original question again |

Three rules:

- Never silently drop what the user typed. It stays in the transcript.
- Never dismissive. Not "that's out of scope" but "that's about hours rather than
  income — add it as an objective, or set it aside?"
- The user decides. The model proposes a re-frame; it never edits objectives.

### 3. Streaming, within the tool-call constraint

Tool-call arguments are not valid JSON until the final chunk, so question text
cannot be streamed safely. What streams is the **reasoning**, shown as a
collapsed "thinking…" line, which is what makes a 5–15 second wait bearable.
The question then appears complete.

## Shape

One turn = one request = one forced tool call (`tool_choice: "required"`, then
validate exactly one of the permitted tools returned).

| Scope | Tools |
|---|---|
| options | `ask_clarification(question)` · `record_options(options[])` · `flag_scope(kind, text)` |
| bias | `ask_question(field, question)` · `record_answers(answers[])` · `flag_scope(kind, text)` |

Why `"required"` rather than a named function: a named `tool_choice` forces one
specific function, so "ask OR record" cannot be expressed that way. `"required"`
forces *some* call; the server then validates which one came back.

## Limits

- **6 turns per conversation**, then `record_*` is forced. A conversation that
  never ends is a conversation that never decides.
- The panel shows turns used. It does not show a daily budget, because the API
  does not expose one; inventing a number would be the failure this project bans.
- A 429 is reported as a 429, with a retry.

## Provider neutrality

The chat is not written against any one gateway. Everything it needs —
`POST {base}/chat/completions`, `tools`, `tool_choice`, `stream` — is the
OpenAI-compatible contract that Groq, Together, OpenRouter, DeepSeek, Mistral,
vLLM, LM Studio and Ollama's `/v1` mode all implement.

Configuration is three env vars plus two optional ones. Kenari remains the
default only because its key helper already exists; nothing in the code names it.

Tool calling is **required**, not optional. A model without it cannot reliably
signal that the conversation is finished, and a JSON-in-text fallback doubles the
parsing surface while adding the failure mode that produces unparseable output.
The panel says so plainly if the configured model lacks the capability.

## Acceptance criteria

1. The panel opens only when an objective is non-empty.
2. The first message names the objectives.
3. Every turn produces exactly one valid tool call, or a stated error.
4. Off-topic input produces a re-frame offer, never a rejection and never a
   silent drop.
5. Nothing is written to the decision until the user accepts a proposal.
6. Existing options are never duplicated; the user chooses add or replace.
7. Closing the panel changes nothing.
8. The conversation ends at `record_*`, at the Done button, or at 6 turns.
9. Every failure (no key, wrong model, no tool support, 429, mid-stream error) is
   a distinct, stated message.
10. No provider name appears in any code path.

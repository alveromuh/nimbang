# Nimbang Framework

A pipeline for personal decision-making, formalised for implementation.

This document is the specification for `src/core/`. It defines the stages, the
types, and the arithmetic. If a stage cannot be computed, it does not belong
here.

Every stage is derived from a primary source in [`references.md`](references.md),
not from the secondary source that prompted the project.

## Pipeline

```
Frame → Diverge → Tag → Weigh → Score → Probabilify → Stress → Gate → Commit
```

Each stage is a pure function. Inputs and outputs are plain data.

## Stage definitions

### Frame

Input: a decision situation (free text).

Output: an objective statement.

```
objective: {
  id: string,
  statement: string,           // "Pindah kerja ke media fashion"
  kind: 'hygiene' | 'motivation', // Herzberg: remove a pain, or reach a good
}
```

Gate: no scoring proceeds until at least one objective exists.

### Diverge

Input: objective, any known options.

Output: a set of at least 3 options, one of which is "do nothing" (the baseline).

```
option: {
  id: string,
  label: string,
  isBaseline: boolean,
}
```

Rule: `options.length >= 3` and exactly one `isBaseline = true`.

### Tag

Input: every claim attached to the decision (facts, estimates, preferences).

Output: each claim tagged with its domain.

```
claim: {
  id: string,
  text: string,
  domain: 'fact' | 'preference',
  source?: string,       // required if domain = 'fact'
  owner?: string,        // required if domain = 'preference'
}
```

Rule: a fact must name its source or check; a preference must name whose
preference it is.

### Weigh

Input: objectives.

Output: normalised weights, one per objective.

Procedure: **swing weighting**. Present the worst-case option across all
objectives. Ask which objective you would first move to its best level. Assign
that 100 points. Then the next, and so on. Normalise.

```
weight_i = swing_points_i / Σ_j swing_points_j
Σ w_i = 1, w_i >= 0
```

### Score

Input: objectives, options, claims tagged as benefit or cost.

Output: per option, per objective, a normalised score.

```
item: {
  id: string,
  optionId: string,
  objectiveId: string,
  kind: 'benefit' | 'cost',
  value: 1..5,           // subjective magnitude
  probability: 0..1,     // how likely it happens
  risk: 'ordinary' | 'fatal',  // fatal = blocks recommendation
}

// normalise per objective across the option set
v_i = (value_i - min) / (max - min)   // min-max to [0, 1]
// if max == min, all options tie on this objective: v_i = 0 for all

// weighted sum
net(option) = Σ_objectives w_o * ( Σ_benefit (v * p) − Σ_cost (v * p) )_o
```

Fatal risk is not priced. If any `risk = 'fatal'` exists in the winning option,
the engine does not produce a recommendation. It produces the ranking and a
flag.

### Probabilify

Input: items from Score.

Output: every probability must name a reference class.

```
probability: {
  value: 0..1,
  referenceClass: string,   // "How do similar cases usually turn out?"
  basis: 'data' | 'judgement' | 'model',
}
```

Rule: no probability is accepted without a reference class.

### Stress

Input: the scored decision.

Output: fragility report.

```
fragile: boolean
flipsAt: { itemId: string, delta: number }   // smallest change that flips top-2
tornado: [ { itemId: string, influence: number } ]   // ranked
```

Procedure: for each item, vary its value by ±0.5 on the 1–5 scale while holding
everything else constant. If the top two options swap, mark fragile and record
the delta.

### Gate

Input: the scored decision.

Output: bias checks, each a required field.

| Bias | Required input |
|---|---|
| Sunk cost | `sunkCost: { amount: number, note: string }` — excluded from all arithmetic, shown with badge |
| Survivorship | "Who tried this and failed? Why haven't you heard from them?" |
| Ostrich | "What evidence are you avoiding?" |
| Hasty generalisation | "How many cases does this rest on?" |
| Causation | "Is this a cause, or a coincidence in time?" |
| False comparison | "What differs between your case and the comparison case?" |
| False dichotomy | enforced by Diverge (≥3 options) |
| Miscalibrated P | enforced by Probabilify (reference class) |

### Commit

Input: the decision after Gate.

Output: a locked decision with predictions and a review date.

```
decision: {
  ...,
  predictions: [ { claimId: string, probability: number } ],
  reviewAt: ISO8601,
}

outcome: {
  decisionId: string,
  resolved: [ { claimId: string, happened: boolean } ],
}

brierScore = mean( (p - o)^2 )   // over resolved predictions
```

## What this framework deliberately does not do

- **No chatbot.** The pipeline is a form, not a conversation.
- **No model-generated numbers.** A model may fill a field, but the engine
  computes. Model-derived numbers are labelled and overridable.
- **No ranking of people.** The framework decides options, not people.

## Sources

See [`references.md`](references.md). The pipeline maps to:

| Stage | Source |
|---|---|
| Frame | Keeney 1992 |
| Weigh | von Winterfeldt & Edwards 1986 |
| Score | von Winterfeldt & Edwards 1986 (additive value) |
| Probabilify | Kahneman & Lovallo 1993; Flyvbjerg 2006 |
| Stress | Saltelli et al. (sensitivity analysis) |
| Gate | Arkes & Blumer 1985; Klein 2007; Kahneman & Tversky 1979 |
| Commit | Brier 1950 |

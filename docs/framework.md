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
  attributes?: { id: string, name: string }[], // named dimensions; see Score
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

Gate: Tag validation is required before a recommendation can be shown. Every
claim present on the decision must meet its domain-specific requirement. An
empty claim list is valid; this rule does not require inventing claims. A claim
row that has been added but not written into is not yet a claim, so it does not
block the recommendation.

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

Output: per option, per objective, a normalised score built from named attributes.

```
item: {
  id: string,
  optionId: string,
  objectiveId: string,
  attributeId: string,    // same attribute compared across options
  kind: 'benefit' | 'cost',
  value: 1..5,           // subjective magnitude
  probability: 0..1,     // how likely it happens
  risk: 'ordinary' | 'fatal',  // fatal = blocks recommendation
}

// For each objective and attribute, normalise across options that have that
// attribute. If max == min, all compared options tie: v = 0.
v_{o,a,x} = (value_{o,a,x} - min_x) / (max_x - min_x)

// Each distinct attribute shares its objective's weight equally.
net(option) = Σ_objectives w_o / |A_o| *
              Σ_attributes ( Σ_benefit (v * p) − Σ_cost (v * p) )_{o,a}
```

`A_o` is the set of distinct attribute IDs defined for objective `o`; every
option compares the same named attribute. Attributes are not additional
objectives: adding one divides that objective's weight across more attributes.
An absent assessment is not an assessed zero; completeness and its effect on a
result must be made visible by the product.

Each `(option, attribute)` pair takes exactly one assessment. This is what makes
the normalisation neutral to how many items were written down: an option cannot
gain by splitting one judgement into two rows.

The anchors `min_a`, `max_a` are **computed once per attribute, over the option
set, and carried in the result**. Stress needs them to solve for a break-even
without re-normalising, and re-normalising per perturbation would make every
score scale-invariant — no change to a single value could ever flip the ranking.

Attribute IDs must be unique across the whole decision, not merely within an
objective: the anchor table is keyed by attribute ID, so two objectives sharing
one would silently normalise against each other's range. The engine treats that
as a data error and refuses to score.

Output:

```
ScoreResult: {
  net: Record<optionId, number>,
  ranking: optionId[],              // best first, ties broken by array order
  anchors: Record<attributeId, { min: number, max: number }>,
  fatal: optionId[],                // options carrying any risk = 'fatal'
  recommendation: optionId | null,  // null if the leader is in `fatal`
}
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
}
```

Rule: no probability is accepted without a reference class. A recommendation is
withheld until every scored item has a non-empty reference class.

`basis` is **not** in `ItemSchema`: probabilities are typed by the user, so the
only honest value would be `'judgement'`, and a field that can only hold one
value would overstate what the engine knows. Model-derived probabilities are
outside the current scope.

### Stress

Input: the scored decision, with the per-objective anchors frozen at scoring time.

Output: fragility report.

```
fragile: boolean
flipsAt: { itemId: string, delta: number } | null   // smallest change that reverses the ranking
tornado: [ { itemId: string, influence: number } ]  // ranked, largest first
```

Procedure: **break-even, computed in closed form.** For each item, hold
everything else constant and ask how far its raw `value` would have to move for
the ranking to change. Do not step the value in fixed increments: the weighted
sum is affine in each item's value, so the break-even is exact.

```
// anchors frozen per objective over the option set, at scoring time
range_o = max_o - min_o

// net(option) is affine in each item's value, with slope
B(item) = ± w_o · p / range_o        // + for benefit, − for cost, 0 if range_o = 0

// margin between the current winner and the best other option
margin  = net(winner) - net(runner-up)

// distance to indifference, in raw 1–5 units
delta   = margin / |B(item)|
v*      = v_0 ∓ delta                // the value at which the ranking ties

// a flip requires moving STRICTLY past v*, and v* must lie in [1, 5]
fragile = ∃ item whose v* is reachable and whose change reverses the ranking
```

Rules that the arithmetic depends on:

- **`delta` is in raw 1–5 units.** It is what the user typed, so it is the only
  form in which "your score for this would have to fall by 1.5" is actionable.
- **A flip is the winner changing, not only the top two swapping.** An item
  belonging to a third option can overtake the leader; ignoring it would report
  a fragile decision as robust.
- **Strictly past `v*`.** Moving the value by exactly `delta` produces a tie, and
  a tie is not a reversal, so a flip requires a change strictly greater than
  `delta`. This is why a break-even that lands exactly on the edge of the 1–5
  scale is reported as no flip: the value can only reach the tie, never pass it.
- **A leader that is already tied is reported as `delta = 0`, and `fragile` is
  true.** The ranking is undetermined before any input moves, which is the
  strongest fragility there is, and it is the honest answer when an option with
  no items nets the same as the leader. Reporting it as robust would be a lie
  told by a division.
- **Only the direction that hurts counts.** A cost is searched upward and a
  benefit downward when the item belongs to the winner, and the reverse when it
  belongs to a challenger. Searching the harmless direction would always find
  nothing and would make every decision look robust.
- **An item on an objective where all options tie (`range_o = 0`) has `B = 0`.**
  It cannot move the ranking, so it contributes no flip and no influence. This is
  the division-by-zero guard; there is no special case in the code path.
- **`flipsAt = null`** when no single reachable change reverses the ranking.
  A report of "nothing flips it within 1–5" is a real answer, not a failure.
- **Tie-breaks are by array order** — options and items in the order given. The
  engine never sorts on a hidden key.

`tornado` influence is the change in the top-two margin at the item's most
influential reachable value, so the ranking of inputs is on the same scale as
the flip: `influence = |B(item)| · reachable_change`.

The procedure is one-at-a-time, and that is exact here rather than a shortcut:
the aggregation is an additive value function with no interaction terms, so
one-at-a-time and variance-based decomposition agree. If a later version adds a
non-additive term, this justification collapses and the method must change with
it.

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

- **No chatbot as the interface.** The pipeline is a form, not a conversation.
  A model may be invited into one bounded panel to help a person articulate what
  they already know — the options they have not written down, the evidence they
  are avoiding. It never sees the scores, never produces a number, and never
  replaces the form. The panel is scoped to one stage at a time and can be
  closed without changing anything.

  This is a revision. Earlier versions of this document said "no chatbot" without
  qualification. That was a rule about the *surface*, and it still holds: the
  conversation is never the way you operate the decision. The rule that does not
  move is the next one, and it is why a bounded panel is acceptable while a
  conversational interface is not.
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

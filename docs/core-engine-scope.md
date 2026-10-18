# What goes into the core engine

Filtered from the source extraction in [`sources/notes/`](sources/notes/).
This is the decision record: what the engine implements, what it deliberately
does not, and why.

Status: **proposal, awaiting approval.** Nothing here is built yet.

## The test each item had to pass

1. Does it change the output, or is it advice?
2. Is it easier in software than on paper?
3. Can it be checked — is there a right and a wrong?
4. Does it avoid asking the app to be an authority on the user's life?

Anything failing 1 or 2 was dropped regardless of how good it reads.

## IN — the engine

### E1. Objective gate (Bab 1 + 4)

A decision cannot be scored until an objective is stated. This is the book's
objective-oriented principle and Keeney's value-focused thinking arriving at the
same rule.

```
input:  decision draft
rule:   objectives.length >= 1  before scoring is enabled
```

One sub-classification worth keeping: **hygiene vs motivation** (Herzberg).
Users routinely state a hygiene goal ("stop hating my boss") as if it were an
aim. Asking which one it is changes what counts as a benefit later.

### E2. Claim tagging: fact vs preference (Bab 2)

Every claim attached to a decision carries a domain tag.

| Tag | Requirement before the decision can be committed |
|---|---|
| `fact` | a source or a stated check |
| `preference` | whose preference it is |

This is the highest value-per-line-of-code item in the whole project. No
computation, no model, and it dissolves a class of confused decisions.

### E3. Threshold filter (Bab 4)

Two threshold kinds:

- `must_have` — the option must have this quality
- `deal_breaker` — the option must not have this quality

Options failing any threshold are excluded from scoring, and the exclusion is
shown, not silent. Each surviving variable is tagged:

- `monotone` — still matters after the threshold (price, commute distance)
- `threshold_only` — cleared once, then irrelevant (distance to a rail line)

Only `monotone` variables enter scoring.

### E4. Option floor (Bab 6, false dichotomy)

Scoring is refused with fewer than three options, and one of them must be
"do nothing" (or its equivalent). This is the false-dichotomy check made
mechanical rather than rhetorical.

### E5. Value scoring (Bab 4)

Per option, per objective, per item:

```
item: { label, kind: benefit|cost, value: 1..5, probability: 0..1, risk: fatal|ordinary }
```

The book sums raw 1–5 values. **We do not.** Two corrections, both required:

1. **Normalise per objective** across the option set (0–1), so an option with
   more listed items does not win by item count. This is the standard additive
   value function.
2. **One rule, not two.** The book divides cost by benefit in one example and
   subtracts in the rest. We use one: subtract, after normalisation.

```
net(option) = Σ_objectives w_o * ( Σ_benefit v·p − Σ_cost v·p )_o
```

### E6. Objective weights (Bab 4 + MAVT)

Objectives are not equally important, and the book has no mechanism for
expressing that — it scores items, not objectives.

Use **swing weighting**: for each objective, ask how much it matters that the
option set moves from worst to best on it. Not "how important is this" — that
question has no anchor and everyone answers 5.

### E7. Fatal vs ordinary risk (Bab 4)

The book's one genuinely non-expected-value idea, and it should survive:

```
risk: 'fatal' | 'ordinary'
```

A fatal cost with P = 0.05 must not be treated as equivalent to an ordinary cost
with P = 0.05. In v1 this is a **flag that blocks automatic recommendation**, not
a utility function — we do not have a defensible way to price a catastrophic
outcome, and inventing one would be worse than flagging it.

### E8. Sensitivity (not in the book)

The reason the software exists. For each scored item, compute the break-even:
how far would this number have to move before the ranking changes?

```
output:
  fragile:    boolean
  flips_at:   { item, delta }   // smallest change that reverses the top two
  tornado:    ranked influence per input
```

If the winner's margin is inside the noise of the user's own uncertainty, the
correct output is **"go find out X"**, not a winner.

### E9. Bias mechanisms (Bab 6)

Each bias becomes one required input, not one paragraph:

| Bias | Mechanism |
|---|---|
| False dichotomy | E4 option floor |
| Sunk cost | `sunk_cost: {amount, note}` — recorded, displayed, **excluded from all arithmetic**, shown with an "excluded" badge |
| Survivorship | required field: "who tried this and failed?" |
| Ostrich | required field: "what evidence are you avoiding?" |
| Hasty generalisation | required field: "how many cases does this rest on?" |
| Causation | required field: "cause, or coincidence in time?" |
| False comparison | required field: "what differs between your case and the comparison?" |
| Miscalibrated P | every probability must name a reference class |

Only E4 and sunk cost are structural. The rest are required text fields whose
value is that they cannot be skipped.

### E10. Commit and calibrate (not in the book)

```
decision: { ..., predictions: [{ claim, probability }], review_at: date }
outcome:  { resolved: [{ claim, happened }] }
score:    Brier = mean((p - o)^2)
```

This is what turns the tool into practice. Without it the app is a calculator
that gets used once.

## OUT — and why

| Item | Source | Why not |
|---|---|---|
| Pola pikir ilmiah as a stage | Bab 3 | A disposition, not a tool. Reduces to one field: "what would change your mind?" Fold into E9's Ostrich mechanism. |
| Eisenhower quadrant | Bab 7 | Better on paper. The software-shaped part is subset selection under capacity — a different decision *shape*, deferred. |
| "Automate" lever | Bab 7 | Useful advice, zero computable content. |
| Cipolla matrix | Bab 8 | Satire. Cannot be scored honestly and should not be. |
| Integrated CBA (benefit to others) | Bab 8 | Would require the app to price other people's welfare and then pronounce. Different product, different burden. |
| Raw sum of 1–5 values | Bab 4 | Wins by item count. Replaced by E5 normalisation. |
| Cost-per-benefit ratio | Bab 4 | Contradicts the subtraction used everywhere else. One rule only. |
| Herzberg as a scoring model | Bab 1 | Kept only as the hygiene/motivation question in E1; the two-factor theory is not a measurement model. |

## Decision shapes, not chapters

The book is organised as chapters; the engine is organised as shapes. One shape
ships in v1:

| Shape | Status | Input |
|---|---|---|
| `pilih_opsi` — choose one of several | **v1** | objectives, options, items, V, P |
| `ya_tidak` — one proposal vs baseline | v2 | same, with the baseline implied |
| `prioritas` — subset under capacity | v2 | items + capacity, no scoring |
| `alokasi` — divide a fixed resource | v3 | shares, not choices |
| `beli_info` — is more information worth it? | v3 | value of information |

The `beli_info` shape is the most interesting thing this framework could do that
nothing else does, and it is also the one that answers "I don't know where to
start". Deferred, not dropped.

## What this leaves out of v1

Only three of the source's chapters contribute to v1: **2, 4–5, 6**. Bab 1
supplies one gate and one question. That is deliberate — a smaller v1 that is
coherent beats a complete one that is eight disconnected tools.

# Bab 4–5 — Cost-benefit, threshold, value, probabilitas

**Photo files:** p033–p061
**Printed pages seen:** 97–156

This is the engine. Everything else in the product is scaffolding around it.

## The definition set *(p036)*

| Term | Definition |
|---|---|
| Utility | usefulness |
| Resource | anything with utility — not just money: time, energy, attention, love, satisfaction |
| Benefit | a resource you need or want, or that moves you toward the goal |
| Cost | a resource you give up to take the option |
| Good decision | benefit > cost |
| Bad decision | benefit < cost |
| Best decision | largest benefit at smallest cost |

Note what this definition buys: **benefit is defined relative to the goal, not to
money.** That is what makes the same option good for one person and bad for
another, and it is why an objective has to exist before scoring can start.

## Objective-oriented principle *(p033–p034)*

People describe problems without first defining the measure that makes
something a problem. The same situation is a problem for one person and not
another, because goals differ. Consequence for the app: **a decision cannot be
scored until an objective is stated.** The book's own example is two people and
a broken train line.

## Stage A — Threshold (preliminary selection) *(p038–p040)*

Not every option belongs in the table. Thresholds are the filter:

- **must-have** — a quality the option has to have
- **deal-breaker** — a quality the option must not have

Options failing a threshold are excluded before any scoring. Two subtleties the
book gets right:

1. A threshold variable can also be **relevant later** (price, distance to
   office: monotonically better/worse) or **threshold-only** (distance to an
   active rail line: once you clear it, more distance adds nothing). *(p040)*
2. Only the variables that still matter after the threshold enter scoring.

## Stage B — Value (V), scale 1–5 *(p042–p045)*

Value is **relative to the person**, not intrinsic. The book's illustration is
water: priceless in a desert, unremarkable beside a river. Two determinants:
scarcity of access (supply) and need/desire (demand).

Procedure as the book does it:

1. List each option's benefit items and cost items.
2. Assign each item a value 1–5 by **how much impact it has on your life**.
3. Sum the values within benefit and within cost.
4. Subtract: `benefit total − cost total`.

Worked case (buying a house, options A/B/D): A = 9 − 8 = **+1**, B = 8 − 8 = 0,
D = 7 − 8 = **−1**. Best = A. *(p045)*

## Stage C — Probability (P), scale 0–1 *(p046–p050)*

The earlier stages assume the benefit and cost actually happen. Many real
decisions don't. P quantifies how likely each identified benefit or cost is.

The book's scale anchors: 0 = impossible, 0.2 = small chance, 0.5 = even, 0.8 =
likely, 1 = certain. *(p050)*

**Two risk types, introduced before P is applied** *(p047)*:

| Type | Definition |
|---|---|
| Fatal risk | permanent, and if it fails you lack the capacity or resources to recover |
| Ordinary risk | not permanent; you can recover if it fails |

What counts as fatal differs per person. The book's point: you should not spend
your caution on ordinary risks while gambling on fatal ones.

This is the only place the book introduces something that is *not* expected
value — a tail-risk distinction that a plain V×P model cannot express. A fatal
risk with P = 0.05 is not equivalent to an ordinary cost with P = 0.05, but the
arithmetic treats them identically.

## Stage D — CBA 2.0: V × P *(p051–p061)*

Each benefit and cost item gets `value × probability`. Then:

```
benefit_total = Σ (V_i × P_i)   over benefit items
cost_total    = Σ (V_j × P_j)   over cost items
net           = benefit_total − cost_total
```

Worked case 1 (Abi, policy tweet, 3 options): option 1 = 4.4 − 10.5 = **−6.1**,
option 2 = 3 − 1.5 = **+1.5**, option 3 = 4.7 − 7.8 = **−3.1**. *(p052–p053)*

Worked case 2 (Dwita, first job after graduation, 5 options → 3 after threshold):
option 3 = 10.5 − 10.2 = **+0.3**, option 4 = 7 − 9.6 = **−2.6**,
option 5 = 12 − 10.3 = **+1.7**. Best = option 5, by 1.4 over option 3.
*(p057–p060)*

The book then notes the winner is close, and suggests a sequencing strategy
(run the family business first, pursue the passion later). *(p060)*

**Caveat the book states plainly:** the scoring is subjective and personal; the
same table built by someone else would differ. *(p061)*

## Where the book stops

It stops at `net = benefit − cost` and a ranking. Three things it does not do,
which is where our software earns its place:

1. **No sensitivity.** It cannot say whether a 1.4-point win survives a small
   change in one value. Dwita's case is exactly the kind that flips.
2. **No normalization.** Values are raw sums of 1–5 items, so an option with more
   listed benefit items wins mechanically. Options with more benefit *items* are
   not necessarily better options.
3. **No cost-per-benefit comparison.** One early example divides cost by benefit
   (shoes, p036) and the rest use subtraction. Two incompatible rules in one
   chapter; a user cannot tell which applies.

## Maps to our framework

- Stage **Diverge** — options, including "do nothing"
- Stage **Score** — V, with normalization fixed
- Stage **Probabilify** — P, plus the fatal/ordinary risk flag
- Stage **Stress** — the missing piece; see above

## Primary source

Boardman et al., *Cost-Benefit Analysis: Concepts and Practice*.
von Winterfeldt & Edwards (1986) — additive value functions, swing weighting.
von Neumann & Morgenstern (1944) — expected utility.

## Do not copy

The shoe/warranty table, the house A/B/D table, Abi's tweet case, Dwita's case,
the parachute example, the water-in-the-desert illustration.

## Engine relevance

**Highest.** This is `src/core/`. Take the definitions and the V×P structure;
replace the raw-sum scoring with a normalized additive value function, and add
sensitivity — neither is in the book.

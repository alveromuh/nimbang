# Bab 6 — Sesat pikir dan bias

**Photo files:** p062–p071
**Printed pages seen:** 168–182

Seven biases, each with a definition and one or two examples. The book's framing
is that bias corrupts either the reality map or the decision built on it.

| Bias | What it is | Page |
|---|---|---|
| **Survivorship bias** | concluding something cannot happen because you are in the sample it did not happen to; the dropout-billionaire case | p063 |
| **Ostrich bias** | avoiding information that is negative or unwelcome; not testing because you fear the result | p064 |
| **Hasty generalisation** | generalising from too few cases | p065 |
| **Causation fallacy** | mistaking correlation or sequence for cause | p066 |
| **False dichotomy** | treating two options as exhaustive ("if not this, then that") | p067 |
| **False comparison** | comparing cases whose relevant variables differ; the minimum-wage-vs-Germany case | p068 |
| **Sunk cost fallacy** | refusing to abandon an investment because of what was already spent; driven by loss aversion | p070–p071 |
| **Miscalibrated probability** | over- or under-estimating your own capability, so you skip options you could have won or chase ones you cannot | p069 |

That is eight entries; the book groups the last one under "kesalahan menakar
peluang" rather than as a single named bias.

## The design problem this chapter creates

A bias list invites a quiz — "are you biased?" — and a quiz changes nothing. The
only version worth building maps **each bias to one input the user is forced to
produce**, so the bias is checked mechanically rather than confessed.

| Bias | Mechanism, not text |
|---|---|
| False dichotomy | require ≥3 options, including "do nothing" |
| Survivorship | field: "who tried this and failed? why haven't you heard from them?" |
| Ostrich | field: "what is the evidence you are avoiding?" |
| Hasty generalisation | field: "how many cases does this rest on?" |
| Causation | field: "is this a cause, or just a coincidence in time?" |
| False comparison | field: "what differs between your case and the comparison case?" |
| Sunk cost | locked field: already-spent amount, excluded from the calculation |
| Miscalibrated probability | require a reference class for every P, not a gut number |

If a bias cannot be turned into a mechanism, drop it rather than printing
paragraphs about it.

## Two that deserve first-class treatment

**Sunk cost** is the cleanest to mechanise and the most common in real decisions.
The app should ask what has already been spent, record it, and then show
explicitly that it is not in the arithmetic — with a visible "excluded" badge.

**False dichotomy** is cheap and immediately visible: refuse to score a decision
with fewer than three options.

## Maps to our framework

- Stage **Gate**, before the decision is committed.

## Primary source

Kahneman & Tversky — heuristics and biases, loss aversion (1979).
Arkes & Blumer (1985) — sunk cost.
Wald (1943) — survivorship, the aircraft-armour study.
Klein (2007) — pre-mortem, a debiasing technique the book does not cover.

## Do not copy

Every example: the angkot robbery, Bill Gates/Zuckerberg, the K-pop gift, the
Germany wage comparison, the chicken farm, the tryout-score case.

## Engine relevance

**High, but only as mechanisms.** No computation; this is a set of required
inputs and validations sitting in front of the commit step.

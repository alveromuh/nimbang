# References

Every formula or method the engine implements needs a source that can be
checked. This file is that list, and it is the reason the project does not
depend on any single popular book.

All citations below were verified against publisher, DOI, or journal records on
2026-10-18. Where a claim rests on a specific part of a work, the part is named.

## The finding that shapes this file

The source book's own bibliography (21 entries) contains **no cost-benefit,
MCDA, MAVT, or decision-analysis text**. It is entirely flow theory
(Csikszentmihalyi ×9), wellbeing/happiness (Waldinger, the World Happiness
Report, Healey), and popular management (Covey, Koch, Christensen, Goleman).

That is not a criticism of the book — it is a general-audience book. But it has
a direct consequence for us: **the CBA method in chapters 4–5 is not sourced in
the book's bibliography**, so we cannot cite the book for it, and we cannot
assume the book's presentation is the canonical one. We source it from the
primary literature instead.

The only entries in that bibliography relevant to anything we build:

| Entry | Where it reaches us |
|---|---|
| Covey (1999), *7 Habits* | bab 7 — the Eisenhower quadrant's popularisation |
| Koch (1997), *80/20 Principle* | bab 7 — the Pareto question in the "significant" test |
| Christensen et al. (2012), *How Will You Measure Your Life?* | bab 1 — goals before strategy; general framing only |
| Goleman (1996), *Social Intelligence* | bab 8 — out of scope |

None of them support the engine.

## Core engine

### Cost-benefit analysis

Boardman, A. E., Greenberg, D. H., Vining, A. R., & Weimer, D. L. (2018).
*Cost-benefit analysis: Concepts and practice* (5th ed.). Cambridge University
Press. https://doi.org/10.1017/9781108235594 — ISBN 978-1-108-41599-6

Supports: the benefit/cost framing, the distinction between the efficiency
question and the distributional one, and the discipline of stating whose costs
and benefits are being counted. We use it for the *structure* of the analysis,
not for its public-policy specifics (discount rates, shadow prices), which do
not apply to personal decisions.

### Objectives before alternatives

Keeney, R. L. (1992). *Value-focused thinking: A path to creative
decisionmaking*. Harvard University Press.
https://doi.org/10.2307/j.ctv322v4g7 — ISBN 0-674-93197-1

Supports: engine component **E1** (objective gate). Keeney's central claim is
that the standard approach is backwards — people fixate on alternatives before
articulating values, and the fix is to structure objectives first, then generate
alternatives from them. This is the same rule the source book states as its
"objective-oriented principle", which is why we can cite the primary source
rather than the popularisation.

### Additive value functions and swing weighting

von Winterfeldt, D., & Edwards, W. (1986). *Decision analysis and behavioral
research*. Cambridge University Press. 604 pp.

Supports: engine components **E5** (normalisation) and **E6** (objective
weights).

The additive form, with weights summing to 1:

```
V(a) = Σ_i w_i · v_i(a_i),    w_i ≥ 0,  Σ w_i = 1
```

where `v_i` is a marginal value function normalised to [0, 1] over the range the
alternatives actually span, and `w_i` is the weight of objective `i` *given that
range*.

**Swing weighting** is the elicitation procedure: present the worst-case
alternative, ask which objective you would first move to its best level, assign
that 100 points, then the next, and so on; normalise the points to weights. The
reason this matters: "how important is this objective" has no anchor and
everyone answers 5. "How much does it matter that this objective moves from
worst to best" has an anchor — the actual option set in front of you.

This is also the justification for **normalising instead of summing raw 1–5
scores**: a raw sum lets an option win by having more items listed, which is an
artefact of the user's typing, not a property of the option.

### Expected value and the value of information

Howard, R. A. (1966). Information value theory. *IEEE Transactions on Systems
Science and Cybernetics*, 2(1), 22–26.

Supports: **E7** (probability weighting) and the deferred `beli_info` decision
shape. Expected value of perfect information is the upper bound on what it is
worth paying to resolve an uncertainty — which is the honest way to answer "do I
need to research this first?"

### Sensitivity analysis

Saltelli, A., et al. — variance-based (Sobol) global sensitivity analysis, and
the standard critique of one-at-a-time (OAT) methods.

Supports: **E8**. The critique of OAT is that it does not capture interactions
between inputs. That critique **does not apply to us**, and the reason is worth
recording: our aggregation is an additive value function, which by construction
has no interaction terms. Under additivity, one-at-a-time and variance-based
decomposition agree, so the tornado diagram is not a shortcut — it is exact.

If a future version introduces non-additive terms (multiplicative interactions,
thresholds inside the value function), that justification collapses and the
sensitivity method must change with it.

### Fatal versus ordinary risk

Kahneman, D., & Tversky, A. (1979). Prospect theory: An analysis of decision
under risk. *Econometrica*, 47(2), 263–291.

Supports: **E7's risk flag**, and the reason it is a flag rather than a number.
Prospect theory establishes that losses weigh more than equivalent gains, and
that people are risk-seeking over losses — so a decision model that prices a
catastrophic outcome with plain expected value will systematically understate
it. We do not have a defensible utility function for "ruined", so the engine
flags the risk and blocks an automatic recommendation instead of inventing a
number.

## Bias mechanisms

Arkes, H. R., & Blumer, C. (1985). The psychology of sunk cost.
*Organizational Behavior and Human Decision Processes*, 35(1), 124–140.
https://doi.org/10.1016/0749-5978(85)90049-4

Supports: **E9**, the sunk-cost mechanism (recorded, displayed, excluded from
arithmetic). The paper's finding that people who incurred a sunk cost inflate
their estimate of a project's success is the direct justification for excluding
the amount from the calculation rather than merely mentioning it.

Klein, G. (2007). Performing a project premortem. *Harvard Business Review*,
85(9), 18–19.

Supports: **E9**, the pre-mortem field. Note the honest caveat: a 2021 SJDM
poster (Gandhi et al.) reports that the premortem reduces overconfidence but
*increases* self-serving attribution — people blame external factors. The
mechanism should therefore ask for failure reasons that are within the user's
control, not just any failure reason.

Kahneman, D., & Lovallo, D. (1993). Timid choices and bold forecasts: A
cognitive perspective on risk taking. *Management Science*, 39(1), 17–31.

Supports: **E9**, the reference-class requirement on probabilities. The
inside/outside view distinction is the reason every probability in the app must
name a reference class: an inside-view number is an optimism artefact.

Flyvbjerg, B. (2006). From Nobel Prize to project management: Getting risks
right. *Project Management Journal*, 37(3), 5–15.

Supports: the operational procedure behind the reference-class field —
identify a class, establish the distribution, place this case in it.

## Calibration

Brier, G. W. (1950). Verification of forecasts expressed in terms of
probability. *Monthly Weather Review*, 78(1), 1–3.

Supports: **E10**. Mean squared error over probabilistic predictions:

```
Brier = (1/n) · Σ (p_i − o_i)²
```

Lower is better. A forecaster who says 70% and is right 70% of the time scores
better than one who says 95% and is right 70% of the time — which is the whole
point: it rewards knowing how much you know.

## Goal framing

Herzberg, F., Mausner, B., & Snyderman, B. (1959). *The motivation to work*.
Wiley.

Supports: the hygiene/motivation question in **E1**. Removing a source of
dissatisfaction and pursuing a source of satisfaction are different operations,
and users routinely present the first as if it were the second.

Note the standing criticism: the two-factor theory rests on a
self-report methodology with replication problems, and it is **not** a
measurement model. We use it as one question ("is this goal removing a pain or
reaching a good?"), not as a scoring instrument.

## Philosophy

Hume, D. (1739–40). *A treatise of human nature*, Book 3, Part 1, Section 1.

Supports: **E2** (fact/preference tagging). The is–ought passage: descriptive
premises do not entail normative conclusions without an added normative premise.
Practical consequence for the app: a claim tagged `fact` and a claim tagged
`preference` cannot be weighed on the same scale, so the app refuses to mix them
silently.

## What we cite the source book for

Nothing in the engine. The book is cited in the README as the prompt for the
project, and its chapter structure informed which *topics* we considered. Every
formula, every threshold rule, and every bias mechanism is sourced above.

This is deliberate: it keeps the project's claims checkable, and it keeps the
project from being a derivative of a copyrighted work.

## A note on the bibliography page itself

The page was read by OCR, and several entries came back visibly corrupted —
for example entry 6 ("Ephly, N., & Schroeder, J. (2022). Undergraduate
Miscellaneous social cognition…") does not resolve to a real paper, and entries
13 and 15 share an identical YouTube URL. **Do not cite anything from that page
without re-reading the printed page by eye.** Nothing in this file depends on
it.

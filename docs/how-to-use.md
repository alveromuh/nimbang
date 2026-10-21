# How to use Nimbang

A worked example, followed by the order the app asks for inputs and why.

Run the app with `pnpm dev`, then open <http://localhost:5199/>.

## Load the complete example

Two examples ship with the repo. Both include four options, a scored cell for
every option-and-attribute pair, a reference class on every probability,
fact/preference claims, all bias checks, and predictions with a review date.
Their inputs are illustrative, not advice; replace them with your own evidence
before using the result.

| Example | What it demonstrates |
|---|---|
| [`keputusan-pindah-kota.ts`](../examples/keputusan-pindah-kota.ts) | Two named attributes on one objective — salary and cost of living — so the matrix shows which of the two moves the answer. A non-zero sunk cost that the arithmetic ignores. |
| [`keputusan-karier-keluarga.ts`](../examples/keputusan-karier-keluarga.ts) | One attribute per objective, the simplest shape a complete decision can take. |

Generate the full local link:

```bash
node --experimental-strip-types examples/keputusan-pindah-kota.ts
```

Copy the printed URL into the browser where the app is running. The app imports
the decision into its local library and shows the computed result above the
filled sections.

The source records are
[`examples/keputusan-pindah-kota.ts`](../examples/keputusan-pindah-kota.ts) and
[`examples/keputusan-karier-keluarga.ts`](../examples/keputusan-karier-keluarga.ts).
Both are covered by `examples/keputusan-karier-keluarga.test.ts`, which runs them
through the same gates and arithmetic as any user document — an example that no
longer produces a recommendation fails the suite.

## The order the app asks for things

**1. Objective, before options.** State what you are trying to achieve before
listing choices. Starting from options alone makes it easy to overlook a better
course of action.

**2. At least three options, including the baseline.** The baseline records
what happens if you do nothing different. Additional options help avoid a false
dichotomy.

**3. Swing weights.** Ask how much the difference between the worst and best
outcomes matters for each objective, rather than rating abstract importance.

**4. Scores and probabilities.** For each option/objective pair, enter a value
from 1–5 and whether it is a benefit or cost. Add a probability and reference
class where the outcome is uncertain.

**5. Bias checks.** Record sunk costs, explicitly excluded from the arithmetic,
and answer each required check: survivorship, avoided evidence, sample size,
causation, and comparability.

**6. Commit.** Record predictions and a review date. When a prediction is later
resolved, the app can compute a Brier score; unresolved predictions are not
treated as failures.

## Common mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Every item is a benefit | Costs add instead of subtracting | Mark hours, money spent, or risk as **Cost** where appropriate |
| Every probability is 1 | Uncertainty disappears from the result | Use a probability only when you have a defensible estimate |
| No reference class | Probability is an unsupported decimal | Record comparable cases or a checkable basis |
| Scores are all 4s and 5s | Small differences get exaggerated by normalisation | Score the difference between options, not absolute quality |
| Ignoring fragility | The result may turn on a weak input | Investigate the input that flips the ranking |
# System One as a decision-extraction layer: assessment

**Question:** can `POST /v1/systemone` (Kenari.id) be the structured-input layer
of Nimbang — reading a user's messy situation and producing the fields the
deterministic engine needs?

**Verdict:** yes for classification, no for scoring, and one field needs a
rephrased question before it is usable.

Measured 2026-10-18. 142 API calls across 3 models, 20 cases, 10 retries on
rate limits, 0 exhausted calls.

## Method

20 hand-written Indonesian decision situations with defensible ground truth
across six classes: `pilih_opsi`, `ya_tidak`, `prioritas`, `alokasi`,
`beli_info`, `belum_jelas`. Each case also carries a ground truth for
"is an objective stated" and a floor for "how ready is this to be scored".

Four things measured:

1. **Accuracy** — does the predicted decision type match ground truth.
2. **Determinism** — same input 3×, and options reordered 3×, on 4 cases.
3. **Calibration** — is stated confidence proportional to correctness.
4. **Cost** — input tokens per case, and latency.

### A measurement bug worth recording

The first run reported self-agreement 83% / 50% and permute stability 50% for
`jev`. That was **my bug**, not the model's: the agreement loop used
`except Exception: pass`, so rate-limit failures were counted as disagreements.
Re-running with retry-on-429 and failed calls recorded separately gives 4/4 and
4/4. Any instability number produced by a script that swallows exceptions is
not a measurement.

## Results

| Model | Accuracy | Mean conf | Goal ρ | Goal acc@0.5 | Identical | Permuted | Tokens |
|---|---|---|---|---|---|---|---|
| `jev-1-13-free` | **100%** | 0.96 | 0.37 | 80% | 4/4 | 4/4 | 6,438 |
| `clef:free` | **100%** | 0.76 | 0.23 | 50% | 4/4 | 4/4 | 6,418 |
| `clef-flash:free` | 90% | 0.58 | 0.34 | 50% | 4/4 | 4/4 | 6,447 |

All three are free. Latency 570–890 ms p50. `clef` reports `output_tokens: 0`
— there is no generation, so there is no output to parse or repair.

**Decision-type classification works.** `jev` got 20/20. `clef-flash` missed
only `c03` ("Apakah aku harus resign bulan depan?") and `c12`, both classified
as `belum_jelas` instead of `ya_tidak` — defensible readings of deliberately
terse input, and both at low confidence (0.29, 0.27), which is the behaviour you
want.

**No order sensitivity.** Reversing the option list never changed an answer in
any model. That matters because it is the cheapest available sanity check
against a model latching onto option position.

## What does not work: the readiness score

The `kejelasan` score (0–4, "how ready is this to be scored") was tested against
a ground-truth floor per case. Violations, scoring more than 0.5 below the floor:

| Model | Violations |
|---|---|
| `clef:free` | **0/20** |
| `clef-flash:free` | 4/20 |
| `jev-1-13-free` | **5/20** |

`jev` is the most confident and the worst calibrated on this field. It scored
`c05` (six projects, pick two), `c07` (salary split), `c08` (budget split) and
`c18` (team split) all around 1.2 — despite each naming options, a constraint
and a number. `clef` got all four right.

**Conclusion:** do not ship a readiness score from `jev`. Either use `clef` for
that field specifically, or drop the field and derive readiness from what the
user has actually filled in the form — which is deterministic and free.

## What nearly works: goal detection

`jev` got 80% at a 0.5 threshold, missing four cases — all of them where the
goal is *implicit* (a list of options and numbers with no stated aim): `c07`,
`c14`, `c16`, `c19`. ρ = 0.37 is weak.

The question was the problem, not the model. Three phrasings on the four misses
plus four controls:

| Phrasing | `jev` correct | `clef` correct |
|---|---|---|
| A. "Does the text state a concrete objective?" | 4/8 | 4/8 |
| B. "Can a desired outcome be **inferred**, even if never stated as a goal?" | **7/8** | 6/8 |
| C. "Could you name at least one **criterion** for judging these options?" | 7/8 | 5/8 |

Phrasing B fixed all four misses for `jev`. Its single error is `c03`
("haruskah aku resign?") at 0.65 — arguably correct, since resigning implies an
aim.

**Conclusion:** goal detection is viable, but only with an inference-framed
question. The literal phrasing asks the model to find an explicit statement,
which is not what the framework needs.

## Architecture consequences

1. **`jev-1-13-free` for classification.** 20/20, decisive probabilities,
   order-stable, ~320 tokens per case. Nothing to parse.
2. **`clef:free` as the second opinion** on fields where `jev` is overconfident.
   Running both costs ~640 tokens per case and lets the app detect disagreement
   instead of guessing.
3. **The model never produces a ranking.** It fills fields; the engine computes.
   Every model-derived number enters the document labelled with its source and
   confidence, and is overridable.
4. **Free-tier rate limits are real.** 10 retries across 142 calls, all
   recoverable with backoff. Any production use needs a queue or a paid tier.
5. **Question phrasing is a first-class artefact.** It changed accuracy by 50
   percentage points on goal detection. Question text belongs in version control
   and in tests, not inline in a fetch call.

## Limits of this assessment

- 20 cases, one author, Indonesian only. Ground truth is a judgement, not a
  gold-standard dataset.
- Classification was easy here because the six classes are distinct. Real input
  is messier — multi-part situations, two decisions in one message.
- Nothing was tested on images, which is where `box` questions and the
  multimodal variants would matter.
- One run per case. Determinism was spot-checked on 4 cases, not all 20.

Next step if this goes forward: 100 cases including multi-decision input and
code-switched text, run as a regression suite in CI against the versioned
question set.

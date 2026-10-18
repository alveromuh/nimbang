# Spec: v1 — Pilih Opsi (Choose One of Several)

> **For agentic workers:** This spec is the input to `superpowers:writing-plans`.
> It defines the shape, the arithmetic, and the acceptance criteria. The plan
> derived from it lives in `docs/superpowers/plans/`.

**Goal:** A user can state a decision, add options, score them against
objectives, and get a fragility report — all in the browser, without an account.

**Architecture:** Pure functions in `src/core/`, no framework imports. A React
UI in `src/ui/` that renders and collects input. State is a single JSON document
stored in localStorage and shareable as a URL.

**Tech stack:** TypeScript strict, Vite, React, Vitest, Testing Library.

**Global constraints:**
- `src/core/` must not import React, DOM, or any storage API.
- All numeric outputs must be traceable to an input.
- No `any` without a comment justifying it.
- Conventional commits.

## Scope

Only the `pilih_opsi` decision shape. Other shapes (`ya_tidak`, `prioritas`,
`alokasi`, `beli_info`) are out of scope for v1.

## Stages to implement

Frame → Diverge → Tag → Weigh → Score → Probabilify → Stress → Gate → Commit

See [`../../framework.md`](../../framework.md) for stage definitions and formulas.

## Acceptance criteria

1. A decision document can be created, saved, loaded, and exported as JSON.
2. A decision with fewer than 3 options cannot be scored.
3. A decision with no objective cannot be scored.
4. Scores are normalised per objective across the option set.
5. Sensitivity report shows which input, if changed, flips the top two options.
6. Fatal risk blocks the recommendation and shows a flag instead.
7. Sunk cost is recorded but excluded from the arithmetic.
8. Brier score is computed from resolved predictions.

## Non-goals

- No backend.
- No accounts.
- No chat.
- No mobile app.
- No model integration in v1 (System One is M6).

## Open questions

None. The three scope decisions were taken 2026-10-18: normalisation replaces
raw sums; fatal risk is a flag; `prioritas` is v2.

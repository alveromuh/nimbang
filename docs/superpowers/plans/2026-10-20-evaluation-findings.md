# Evaluation findings — implementation plan

**Status:** implemented. Tasks 1–5 below are in the tree; each one has tests in
`src/core/` or `src/ui/`, and `pnpm test`, `pnpm build`, and `git diff --check`
pass. Two additions beyond the original plan are recorded at the end.

## Decisions recorded

1. Storage failure: preserve shared-link data and keep failed new decisions
   editable in memory, with an explicit warning.
2. Scoring: items are named attributes; compare matching attribute IDs across
   options and divide each objective's weight equally among its attributes.
3. Tag and reference classes are required before a recommendation; an empty
   claim list is valid.
4. Every option must be assessed for every attribute before a recommendation;
   show matrix coverage.
5. Display precision and bias-gate wording should communicate uncertainty and
   reflection limits, not imply certainty or bias detection.

## Tasks

### 1. Storage reliability

- Keep a shared URL fragment until its decision is successfully written.
- Preserve failed imports and new decisions in in-memory workspace state and
  show the existing persistence warning.
- Test throwing storage writes for both paths; verify successful retry clears
  the warning and removes the fragment after persistence.

### 2. Attribute data and scoring

- Add a stable `attributeId` to scored items and migration/default handling for
  existing local/shared decision documents.
- Add UI to define named attributes per objective and assess each option against
  each attribute.
- Normalize values across options per attribute; apply objective weight divided
  by the count of its distinct attributes, then sum benefit less cost times
  probability.
- Update sensitivity slopes and boundaries to use the same per-attribute
  normalization and divided objective weight.
- Add invariants covering weight split, adding an attribute without increasing
  objective weight, missing option/attribute references, and stress agreement.

### 3. Tag and probability policy

- Add claim editing and validation in the workspace.
- Require Tag and reference-class validation for recommendations, with actionable
  field-level messages; keep an empty claim list valid.
- Add UI and core tests for each rejection and successful completion.

### 4. Matrix completeness

- Compute coverage as assessed required cells / total required cells.
- Withhold result and stress analysis until coverage is complete; make the
  missing assessments discoverable in the matrix.
- Test fully empty, partial, and complete matrices.

### 5. Interpretation and copy

- Reduce displayed decimal precision and label scores as comparative outputs
  based on subjective inputs; state relevant normalization assumptions nearby.
- Describe Gate as required reflection prompts, not bias detection/removal.
- Test essential accessibility text and verify copy matches the implemented
  rules.

## Verification

Run focused core and UI tests after each task, then `pnpm test`, `pnpm build`, and
`git diff --check`. Do not change the scoring implementation until the schema,
UI, formula, and sensitivity tests can be updated together.

## Added during implementation

1. **Attribute ids are unique across the decision.** The anchor table is keyed by
   attribute id, so two objectives sharing one would normalise against each
   other's range. `scoreDecision` now throws on a duplicate instead of silently
   overwriting the anchor.
2. **One assessment per cell.** Two items on the same option-and-attribute pair
   used to add together, so an option could gain by being recorded twice — the
   exact item-count advantage the normalisation exists to remove. Measured:
   duplicating one item moved a 0.5 into 1.0 and flipped the winner. The engine
   now throws; the UI never produced this, but a shared link could.
3. **A blank claim row is not a claim.** The workspace validates only claims that
   have text, so opening the claim form cannot block the recommendation. A claim
   that has been written but not tagged still does.
4. **The result states its own scale.** The verdict panel now says that a net
   score is a comparison rather than a measurement, that normalisation is
   relative to the options present, and that adding an option can move every
   other score. Precision without that sentence reads as certainty.
5. **The shipped example is under test.** `examples/keputusan-karier-keluarga.ts`
   is the decision a reader copies, so a test now runs it through the same gates
   and arithmetic as any user document.

Two defects found while verifying the above, both fixed:

- The matrix coverage counter compared completed *attributes* against a *cell*
  total, so with three options it could never exceed 1/3 and the recommendation
  never appeared. It now counts option-by-attribute pairs.
- The coverage sentence said "the recommendation waits" at 100% coverage. It now
  switches to "every cell is assessed".
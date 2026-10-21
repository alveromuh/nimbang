import { describe, it, expect } from 'vitest';
import {
  scoreDecision,
  stressTest,
  swingWeights,
  validateDiverge,
  validateFrame,
  validateGate,
  validateProbabilities,
  validateTag,
  type Decision,
} from '../src/core';
import { decision as career } from './keputusan-karier-keluarga.ts';
import { decision as smallerCity } from './keputusan-pindah-kota.ts';

/**
 * The worked examples are the only decisions in the repo written by hand rather
 * than by the form, and they are what a reader copies. They therefore have to
 * satisfy every rule the engine enforces — including the ones added after they
 * were written, such as one assessment per option-and-attribute cell.
 *
 * They live here rather than in `src/` because the examples are deliberately
 * outside the TypeScript project: `docs/how-to-use.md` runs them with
 * `node --experimental-strip-types`, which needs the explicit `.ts` extension.
 */
const examples: { name: string; decision: Decision }[] = [
  { name: 'keputusan-karier-keluarga', decision: career },
  { name: 'keputusan-pindah-kota', decision: smallerCity },
];

describe.each(examples)('the shipped example: $name', ({ decision }) => {
  it('passes every gate the product enforces', () => {
    expect(validateFrame(decision).ok).toBe(true);
    expect(validateDiverge(decision).ok).toBe(true);
    expect(validateTag(decision).ok).toBe(true);
    expect(validateGate(decision.gate ?? emptyGate()).ok).toBe(true);
    expect(validateProbabilities(decision.items).ok).toBe(true);
  });

  it('scores without throwing, so no cell is duplicated or dangling', () => {
    const weights = swingWeights(decision.objectives, decision.swingPoints ?? {});
    const score = scoreDecision(decision, weights);

    expect(score.ranking).toHaveLength(decision.options.length);
    expect(score.recommendation).toBe(score.ranking[0]);
    expect(stressTest(decision, weights).tornado).toHaveLength(decision.items.length);
  });

  it('assesses every option on every attribute, so the matrix is complete', () => {
    const required = decision.objectives.reduce(
      (sum, objective) =>
        sum + (objective.attributes?.length ?? 1) * decision.options.length,
      0,
    );
    expect(decision.items).toHaveLength(required);
  });
});

describe('the new example', () => {
  it('splits the money objective into two attributes that move independently', () => {
    const attributes = smallerCity.objectives.find((objective) => objective.id === 'money')?.attributes;
    expect(attributes?.map((attribute) => attribute.name)).toEqual(['Gaji bersih', 'Biaya hidup']);
  });

  it('records the sunk cost without letting it reach the arithmetic', () => {
    // The gate records it; no scoring input is shaped like it.
    expect(smallerCity.gate?.sunkCost?.amount).toBeGreaterThan(0);
    const weights = swingWeights(smallerCity.objectives, smallerCity.swingPoints ?? {});
    const withSunk = scoreDecision(smallerCity, weights);
    const withoutSunk = scoreDecision(
      { ...smallerCity, gate: { ...smallerCity.gate!, sunkCost: { amount: 0, note: '' } } },
      weights,
    );
    expect(withSunk.net).toEqual(withoutSunk.net);
  });
});

function emptyGate() {
  return {
    sunkCost: null,
    survivorship: '',
    ostrich: '',
    hastyGeneralisation: '',
    causation: '',
    falseComparison: '',
  };
}


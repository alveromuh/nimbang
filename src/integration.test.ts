import { describe, it, expect } from 'vitest';
import {
  brierScore,
  deserializeDecision,
  resolvePredictions,
  scoreDecision,
  serializeDecision,
  stressTest,
  swingWeights,
  validateDiverge,
  validateFrame,
  validateGate,
  validateProbabilities,
  validateTag,
  type Decision,
} from './core';

/**
 * One decision, run through every stage in pipeline order.
 *
 * The unit tests check each stage in isolation. This one checks that the stages
 * agree with each other — that the anchors Score produces are the ones Stress
 * consumes, that the weights Weigh produces are the ones Score consumes, and
 * that a decision survives the URL round-trip without losing anything the
 * arithmetic depends on.
 */
describe('integration', () => {
  const decision: Decision = {
    id: 'd1',
    title: 'Pindah kerja ke media fashion',
    objectives: [
      { id: 'o1', statement: 'Penghasilan', kind: 'motivation' },
      { id: 'o2', statement: 'Jam kerja', kind: 'hygiene' },
    ],
    options: [
      { id: 'a', label: 'Tetap di tempat sekarang', isBaseline: true },
      { id: 'b', label: 'Pindah ke media fashion', isBaseline: false },
      { id: 'c', label: 'Negosiasi ulang di tempat sekarang', isBaseline: false },
    ],
    items: [
      { id: 'a-o1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 2, probability: 1, risk: 'ordinary' },
      { id: 'b-o1', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 0.8, risk: 'ordinary' },
      { id: 'c-o1', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      { id: 'a-o2', optionId: 'a', objectiveId: 'o2', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary' },
      { id: 'b-o2', optionId: 'b', objectiveId: 'o2', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
      { id: 'c-o2', optionId: 'c', objectiveId: 'o2', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
    ],
    claims: [],
  };

  it('runs the full pipeline', () => {
    // Frame and Diverge: the gates that must pass before any arithmetic.
    expect(validateFrame(decision).ok).toBe(true);
    expect(validateDiverge(decision).ok).toBe(true);
    expect(validateTag(decision).ok).toBe(true);
    expect(
      validateProbabilities(decision.items.map((item) => ({ ...item, referenceClass: 'x' }))).ok,
    ).toBe(true);

    // Weigh: 100 to income, 40 to hours.
    const weights = swingWeights(decision.objectives, { o1: 100, o2: 40 });
    expect(weights.o1).toBeCloseTo(100 / 140);
    expect(weights.o2).toBeCloseTo(40 / 140);

    // Score.
    const score = scoreDecision(decision, weights);
    expect(score.ranking).toHaveLength(3);
    expect(score.fatal).toEqual([]);
    expect(score.recommendation).toBe(score.ranking[0]);
    expect(score.anchors.o1).toEqual({ min: 2, max: 5 });

    // Stress: consumes the anchors Score produced.
    const stress = stressTest(decision, weights);
    expect(stress.tornado).toHaveLength(decision.items.length);
    if (stress.flipsAt) {
      expect(decision.items.map((item) => item.id)).toContain(stress.flipsAt.itemId);
      expect(stress.flipsAt.delta).toBeGreaterThanOrEqual(0);
    }

    // Gate.
    expect(
      validateGate({
        sunkCost: { amount: 0, note: 'none' },
        survivorship: 'x',
        ostrich: 'x',
        hastyGeneralisation: 'x',
        causation: 'x',
        falseComparison: 'x',
      }).ok,
    ).toBe(true);
  });

  it('round-trips the decision through a URL and scores it identically', () => {
    const weights = swingWeights(decision.objectives, { o1: 100, o2: 40 });
    const before = scoreDecision(decision, weights);

    const restored = deserializeDecision(serializeDecision(decision));
    expect(restored).toEqual(decision);

    const after = scoreDecision(restored, weights);
    expect(after.net).toEqual(before.net);
    expect(after.ranking).toEqual(before.ranking);
    expect(stressTest(restored, weights)).toEqual(stressTest(decision, weights));
  });

  it('closes the loop: predictions resolve and produce a Brier score', () => {
    const withPredictions: Decision = {
      ...decision,
      predictions: [
        { claimId: 'c1', probability: 0.8 },
        { claimId: 'c2', probability: 0.3 },
      ],
    };
    const restored = deserializeDecision(serializeDecision(withPredictions));

    const resolved = resolvePredictions(restored.predictions ?? [], { c1: true, c2: false });
    expect(resolved).toHaveLength(2);
    // (0.8-1)^2 = 0.04 and (0.3-0)^2 = 0.09, mean 0.065.
    expect(brierScore(resolved)).toBeCloseTo(0.065);
  });

  it('still refuses to score a decision that fails a gate', () => {
    const twoOptions: Decision = { ...decision, options: decision.options.slice(0, 2) };
    expect(validateDiverge(twoOptions).ok).toBe(false);

    const noObjective: Decision = { ...decision, objectives: [] };
    expect(validateFrame(noObjective).ok).toBe(false);
  });
});

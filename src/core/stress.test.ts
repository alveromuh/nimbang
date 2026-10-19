import { describe, it, expect } from 'vitest';
import { stressTest } from './stress';

const objectives = [{ id: 'o1', statement: 'Money', kind: 'motivation' as const }];

const options = [
  { id: 'a', label: 'A', isBaseline: true },
  { id: 'b', label: 'B', isBaseline: false },
  { id: 'c', label: 'C', isBaseline: false },
];

function decisionWith(
  items: {
    id: string;
    optionId: string;
    objectiveId: string;
    kind: 'benefit' | 'cost';
    value: number;
    probability: number;
    risk: 'ordinary' | 'fatal';
  }[],
) {
  return { id: 'd1', title: 'Test', objectives, options, items, claims: [] };
}

describe('sensitivity', () => {
  it('detects a fragile winner', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
    ]);
    const result = stressTest(decision, { o1: 1 });
    expect(result.fragile).toBe(true);
    expect(result.flipsAt).not.toBeNull();
    // a=4, b=3 normalises to net 1 vs 0, so the margin is 1 and the slope is
    // 1/1 = 1. The break-even is one full raw point, not a 0.5 step.
    expect(result.flipsAt).toEqual({ itemId: 'i1', delta: 1 });
  });

  it('reports no flip when the margin is wider than the scale', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = stressTest(decision, { o1: 1 });
    // range 4, so the slope is 0.25 and the break-even is 4 raw points: a would
    // have to fall from 5 to 1, which ties b and therefore does not reverse.
    expect(result.flipsAt).toBeNull();
    expect(result.fragile).toBe(false);
  });

  it('does not divide by zero when an objective has no spread', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
    ]);
    const result = stressTest(decision, { o1: 1 });
    expect(result.fragile).toBe(false);
    expect(result.tornado.every((entry) => entry.influence === 0)).toBe(true);
  });

  it('reports a zero break-even when the top two are already tied', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = stressTest(decision, { o1: 1 });
    expect(result.fragile).toBe(true);
    expect(result.flipsAt).toEqual({ itemId: 'i1', delta: 0 });
  });

  it('counts a third option overtaking the leader as a flip', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 0.05, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 0.05, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = stressTest(decision, { o1: 1 });
    // range 4, so net is a = 0.05, b = 0.025, c = 0. c is not the runner-up, but
    // its item has the steepest slope (0.25 against 0.0125), so it is the
    // cheapest thing that reverses the ranking: 0.2 raw points, against 2.0 for
    // a's own item. An implementation that only tested the top two would answer
    // 2.0 and send the user to check the wrong number.
    expect(result.fragile).toBe(true);
    expect(result.flipsAt?.itemId).toBe('i3');
    expect(result.flipsAt?.delta).toBeCloseTo(0.2);
  });

  it('measures a cost in the direction that actually hurts its option', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'cost', value: 1, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'cost', value: 2, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'cost', value: 5, probability: 1, risk: 'ordinary' },
    ]);
    const result = stressTest(decision, { o1: 1 });
    // a is cheapest, so it leads: net a = 0, b = -0.25, c = -1. Only an increase
    // in cost can hurt a. Treating a cost as a benefit would search downward,
    // find nothing, and call the decision robust.
    expect(result.flipsAt?.itemId).toBe('i1');
    expect(result.flipsAt?.delta).toBe(1);
  });

  it('finds no flip when the only reachable move is the harmless direction', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'cost', value: 1, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'cost', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'cost', value: 5, probability: 1, risk: 'ordinary' },
    ]);
    const result = stressTest(decision, { o1: 1 });
    // range 4, so a's break-even is 4 raw points from a value of 1: exactly the
    // edge of the scale, which ties and therefore does not reverse. The other
    // two are already at the maximum cost and cannot move.
    expect(result.flipsAt).toBeNull();
    expect(result.fragile).toBe(false);
  });

  it('treats an option with no items as netting zero, which can already tie the leader', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'cost', value: 1, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'cost', value: 2, probability: 1, risk: 'ordinary' },
    ]);
    const result = stressTest(decision, { o1: 1 });
    // c has no items, so it contributes nothing and nets 0 — an unstated cost is
    // not an incurred one. a's minimum cost normalises to 0 as well, so c ties
    // the leader on this objective. Reported as a zero break-even, which is the
    // same answer the already-tied test expects, not as "robust".
    expect(result.fragile).toBe(true);
    expect(result.flipsAt?.delta).toBe(0);
  });
});

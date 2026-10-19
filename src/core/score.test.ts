import { describe, it, expect } from 'vitest';
import { scoreDecision } from './score';

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

describe('scoring', () => {
  it('normalises per objective across options', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = scoreDecision(decision, { o1: 1 });
    expect(result.net.a).toBe(1); // (5-1)/(5-1) = 1
    expect(result.net.b).toBe(0.5); // (3-1)/(5-1) = 0.5
    expect(result.net.c).toBe(0); // (1-1)/(5-1) = 0
  });

  it('subtracts cost from benefit rather than dividing', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'cost', value: 1, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'cost', value: 3, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'cost', value: 5, probability: 1, risk: 'ordinary' },
    ]);
    const result = scoreDecision(decision, { o1: 1 });
    expect(result.net.a).toBe(0);
    expect(result.net.b).toBe(-0.5);
    expect(result.net.c).toBe(-1);
    expect(result.ranking).toEqual(['a', 'b', 'c']);
  });

  it('scales a contribution by its probability', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 0.5, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = scoreDecision(decision, { o1: 1 });
    expect(result.net.a).toBe(1);
    expect(result.net.b).toBe(0.5);
  });

  it('does not divide by zero when every option ties on an objective', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
    ]);
    const result = scoreDecision(decision, { o1: 1 });
    expect(result.net).toEqual({ a: 0, b: 0, c: 0 });
    expect(result.anchors.o1).toEqual({ min: 3, max: 3 });
  });

  it('reports the anchors it normalised against', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 2, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = scoreDecision(decision, { o1: 1 });
    expect(result.anchors.o1).toEqual({ min: 1, max: 5 });
  });

  it('blocks the recommendation but keeps the ranking when the leader is fatal', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'fatal' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = scoreDecision(decision, { o1: 1 });
    expect(result.ranking).toEqual(['a', 'b', 'c']);
    expect(result.fatal).toEqual(['a']);
    expect(result.recommendation).toBeNull();
  });

  it('recommends the leader when nothing fatal is attached to it', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'fatal' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = scoreDecision(decision, { o1: 1 });
    expect(result.recommendation).toBe('a');
    expect(result.fatal).toEqual(['b']);
  });

  it('breaks ties by option array order', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    const result = scoreDecision(decision, { o1: 1 });
    expect(result.ranking).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty ranking rather than crashing when there are no options', () => {
    const result = scoreDecision(
      { id: 'd1', title: 'Test', objectives, options: [], items: [], claims: [] },
      { o1: 1 },
    );
    expect(result.ranking).toEqual([]);
    expect(result.net).toEqual({});
    expect(result.recommendation).toBeNull();
  });

  it('scores everything at zero when there are no objectives', () => {
    const result = scoreDecision(
      { id: 'd1', title: 'Test', objectives: [], options, items: [], claims: [] },
      {},
    );
    expect(result.net).toEqual({ a: 0, b: 0, c: 0 });
    expect(result.recommendation).toBe('a');
  });

  it('throws when an objective has no weight, instead of dropping it', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
    ]);
    expect(() => scoreDecision(decision, {})).toThrow(/weight/i);
  });

  it('throws on an item that points at an objective that does not exist', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'ghost', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
    ]);
    expect(() => scoreDecision(decision, { o1: 1 })).toThrow(/ghost/);
  });
});

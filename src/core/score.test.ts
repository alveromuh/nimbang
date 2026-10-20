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

  it('throws on an item that points at an option that does not exist', () => {
    const decision = decisionWith([
      { id: 'i1', optionId: 'ghost', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
    ]);
    expect(() => scoreDecision(decision, { o1: 1 })).toThrow(/ghost/);
  });
});

describe('scoring with attributes', () => {
  const split = [
    {
      id: 'o1',
      statement: 'Money',
      kind: 'motivation' as const,
      attributes: [
        { id: 'o1-pay', name: 'Pay' },
        { id: 'o1-hours', name: 'Hours' },
      ],
    },
  ];

  function decisionWithAttributes(
    items: {
      id: string;
      optionId: string;
      objectiveId: string;
      attributeId?: string;
      kind: 'benefit' | 'cost';
      value: number;
      probability: number;
      risk: 'ordinary' | 'fatal';
    }[],
  ) {
    return { id: 'd1', title: 'Test', objectives: split, options, items, claims: [] };
  }

  it('normalises each attribute across options, not across the whole objective', () => {
    // Pay and hours are on different scales of meaning. Normalising them
    // together would let the attribute with the wider spread decide both.
    const decision = decisionWithAttributes([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', attributeId: 'o1-pay', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', attributeId: 'o1-pay', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'a', objectiveId: 'o1', attributeId: 'o1-hours', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
      { id: 'i4', optionId: 'b', objectiveId: 'o1', attributeId: 'o1-hours', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
    ]);

    const result = scoreDecision(decision, { o1: 1 });
    expect(result.anchors['o1-pay']).toEqual({ min: 1, max: 5 });
    expect(result.anchors['o1-hours']).toEqual({ min: 1, max: 5 });
    // Pay and hours pull in opposite directions, so each option scores exactly
    // half the objective: the two attributes cancel rather than compounding.
    expect(result.net.a).toBeCloseTo(0.5, 10);
    expect(result.net.b).toBeCloseTo(0.5, 10);
    expect(result.net.c).toBe(0);
    expect(result.ranking[0]).toBe('a');
  });

  it('divides an objective weight evenly across its attributes', () => {
    const decision = decisionWithAttributes([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', attributeId: 'o1-pay', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', attributeId: 'o1-pay', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'a', objectiveId: 'o1', attributeId: 'o1-hours', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      { id: 'i4', optionId: 'b', objectiveId: 'o1', attributeId: 'o1-hours', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
    ]);

    const result = scoreDecision(decision, { o1: 10 });
    // Pay is a full 1-vs-0 spread, so it carries half of the weight of 10.
    expect(result.net.a).toBeCloseTo(5, 10);
    expect(result.net.b).toBeCloseTo(0, 10);
  });

  it('falls back to the objective id for items written before attributes existed', () => {
    // A document saved by an earlier version has no attributeId. Reading it as
    // the objective's own dimension keeps old decisions scorable.
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);

    const result = scoreDecision(decision, { o1: 1 });
    expect(result.net.a).toBe(1);
    expect(result.net.b).toBe(0);
  });

  it('throws on an item that points at an attribute that does not exist', () => {
    const decision = decisionWithAttributes([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', attributeId: 'ghost', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
    ]);
    expect(() => scoreDecision(decision, { o1: 1 })).toThrow(/ghost/);
  });

  it('throws when two items score the same option on the same attribute', () => {
    // Adding a second item to one cell must not add to that option's score: that
    // is the item-count advantage the normalisation exists to remove.
    const decision = decisionWith([
      { id: 'i1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i2', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'i3', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
    ]);
    expect(() => scoreDecision(decision, { o1: 1 })).toThrow(/one assessment/i);
  });

  it('throws when two objectives share an attribute id', () => {
    // Anchors are keyed by attribute id, so a shared id would make one dimension
    // normalise against the other's range without saying so.
    const decision = {
      id: 'd1',
      title: 'Test',
      objectives: [
        { id: 'o1', statement: 'Money', kind: 'motivation' as const, attributes: [{ id: 'shared', name: 'Pay' }] },
        { id: 'o2', statement: 'Family', kind: 'motivation' as const, attributes: [{ id: 'shared', name: 'Time' }] },
      ],
      options,
      items: [
        { id: 'i1', optionId: 'a', objectiveId: 'o1', attributeId: 'shared', kind: 'benefit' as const, value: 5, probability: 1, risk: 'ordinary' as const },
      ],
      claims: [],
    };
    expect(() => scoreDecision(decision, { o1: 1, o2: 1 })).toThrow(/more than once/i);
  });
});

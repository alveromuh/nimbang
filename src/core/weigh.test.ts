import { describe, it, expect } from 'vitest';
import { swingWeights } from './weigh';

describe('swing weighting', () => {
  it('normalises swing points to weights summing to 1', () => {
    const objectives = [
      { id: 'o1', statement: 'Money', kind: 'motivation' },
      { id: 'o2', statement: 'Time', kind: 'motivation' },
    ];
    const points = { o1: 100, o2: 50 };
    const weights = swingWeights(objectives, points);
    expect(weights.o1 + weights.o2).toBeCloseTo(1);
    expect(weights.o1).toBeGreaterThan(weights.o2);
  });
  it('rejects if an objective has no points', () => {
    const objectives = [{ id: 'o1', statement: 'Money', kind: 'motivation' }];
    expect(() => swingWeights(objectives, {})).toThrow();
  });
  it('rejects a total of zero instead of dividing by it', () => {
    const objectives = [
      { id: 'o1', statement: 'Money', kind: 'motivation' },
      { id: 'o2', statement: 'Time', kind: 'motivation' },
    ];
    expect(() => swingWeights(objectives, { o1: 0, o2: 0 })).toThrow(/zero/i);
  });
  it('rejects negative points', () => {
    const objectives = [{ id: 'o1', statement: 'Money', kind: 'motivation' }];
    expect(() => swingWeights(objectives, { o1: -10 })).toThrow(/negative/i);
  });
  it('gives every objective a weight, including a zero-point one', () => {
    const objectives = [
      { id: 'o1', statement: 'Money', kind: 'motivation' },
      { id: 'o2', statement: 'Time', kind: 'motivation' },
    ];
    const weights = swingWeights(objectives, { o1: 100, o2: 0 });
    expect(weights).toEqual({ o1: 1, o2: 0 });
  });
});

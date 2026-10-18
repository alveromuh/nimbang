import { describe, it, expect } from 'vitest';
import { validateProbabilities } from './probabilify';

describe('probability with reference class', () => {
  it('rejects an item with no reference class', () => {
    const result = validateProbabilities([
      { id: 'i1', probability: 0.8, referenceClass: '' },
    ]);
    expect(result.ok).toBe(false);
  });
  it('accepts an item with a reference class', () => {
    const result = validateProbabilities([
      { id: 'i1', probability: 0.8, referenceClass: 'similar projects' },
    ]);
    expect(result.ok).toBe(true);
  });
  it('treats a whitespace-only reference class as missing', () => {
    const result = validateProbabilities([
      { id: 'i1', probability: 0.8, referenceClass: '  ' },
    ]);
    expect(result.ok).toBe(false);
  });
  it('reports every item that fails, not just the first', () => {
    const result = validateProbabilities([
      { id: 'i1', probability: 0.8, referenceClass: 'similar projects' },
      { id: 'i2', probability: 0.5 },
      { id: 'i3', probability: 0.2, referenceClass: '' },
    ]);
    expect(result.problems.map((problem) => problem.itemId)).toEqual(['i2', 'i3']);
  });
  it('accepts an empty list', () => {
    expect(validateProbabilities([]).ok).toBe(true);
  });
});

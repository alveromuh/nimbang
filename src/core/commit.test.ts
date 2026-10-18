import { describe, it, expect } from 'vitest';
import { brierScore, resolvePredictions } from './commit';

describe('Brier score', () => {
  it('scores a perfect forecast as 0', () => {
    const score = brierScore([
      { p: 1, o: true },
      { p: 1, o: true },
    ]);
    expect(score).toBe(0);
  });
  it('scores a random guess as 0.25', () => {
    const score = brierScore([
      { p: 0.5, o: true },
      { p: 0.5, o: false },
    ]);
    expect(score).toBe(0.25);
  });
  it('scores a confident forecast that was wrong as 1', () => {
    expect(brierScore([{ p: 0, o: true }])).toBe(1);
  });
  it('throws on no resolved predictions instead of returning NaN', () => {
    expect(() => brierScore([])).toThrow(/no resolved predictions/i);
  });
  it('throws on a probability outside 0..1', () => {
    expect(() => brierScore([{ p: 1.5, o: true }])).toThrow(/outside/i);
  });
  it('drops predictions that have not been resolved', () => {
    const resolved = resolvePredictions(
      [
        { claimId: 'c1', probability: 0.9 },
        { claimId: 'c2', probability: 0.2 },
      ],
      { c1: true },
    );
    expect(resolved).toEqual([{ p: 0.9, o: true }]);
    expect(brierScore(resolved)).toBeCloseTo(0.01);
  });
  it('treats a resolved false as a zero, not as missing', () => {
    const resolved = resolvePredictions([{ claimId: 'c1', probability: 0.8 }], { c1: false });
    expect(resolved).toEqual([{ p: 0.8, o: false }]);
  });
});

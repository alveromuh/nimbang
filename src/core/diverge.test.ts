import { describe, it, expect } from 'vitest';
import { validateDiverge } from './diverge';

describe('option floor', () => {
  it('rejects fewer than 3 options', () => {
    const result = validateDiverge({
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
      ],
    });
    expect(result.ok).toBe(false);
  });
  it('rejects if no baseline', () => {
    const result = validateDiverge({
      options: [
        { id: 'a', label: 'A', isBaseline: false },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
    });
    expect(result.ok).toBe(false);
  });
  it('accepts 3 options with one baseline', () => {
    const result = validateDiverge({
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
    });
    expect(result.ok).toBe(true);
  });
  it('rejects two baselines', () => {
    const result = validateDiverge({
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: true },
        { id: 'c', label: 'C', isBaseline: false },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/baseline/i);
  });
});

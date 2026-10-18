import { describe, it, expect } from 'vitest';
import { validateFrame } from './frame';

describe('objective gate', () => {
  it('rejects a decision with no objectives', () => {
    const result = validateFrame({ objectives: [] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/objective/i);
  });
  it('accepts a decision with one objective', () => {
    const result = validateFrame({
      objectives: [{ id: 'o1', statement: 'X', kind: 'motivation' }],
    });
    expect(result.ok).toBe(true);
  });
});

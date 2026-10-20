import { describe, it, expect } from 'vitest';
import { DecisionSchema } from './types';

describe('Decision schema', () => {
  it('validates a minimal decision', () => {
    const d = {
      id: 'd1',
      title: 'Test',
      objectives: [{ id: 'o1', statement: 'Be happy', kind: 'motivation' }],
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
      items: [],
      claims: [],
    };
    expect(() => DecisionSchema.parse(d)).not.toThrow();
  });

  it('accepts incomplete gate form state so draft answers remain loadable', () => {
    const d = {
      id: 'd1',
      title: 'Test',
      objectives: [{ id: 'o1', statement: 'Be happy', kind: 'motivation' }],
      options: [
        { id: 'a', label: 'A', isBaseline: true },
        { id: 'b', label: 'B', isBaseline: false },
        { id: 'c', label: 'C', isBaseline: false },
      ],
      items: [],
      claims: [],
      gate: {
        sunkCost: null,
        survivorship: 'Someone failed',
        ostrich: '',
        hastyGeneralisation: '',
        causation: '',
        falseComparison: '',
      },
    };
    expect(DecisionSchema.safeParse(d).success).toBe(true);
  });
});

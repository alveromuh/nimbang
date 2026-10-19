import { describe, it, expect } from 'vitest';
import { validateGate } from './gate';

const filled = {
  sunkCost: { amount: 0, note: 'none' },
  survivorship: 'x',
  ostrich: 'x',
  hastyGeneralisation: 'x',
  causation: 'x',
  falseComparison: 'x',
};

describe('bias gate', () => {
  it('rejects if sunk cost is missing', () => {
    const result = validateGate({
      sunkCost: null,
      survivorship: '',
      ostrich: '',
      hastyGeneralisation: '',
      causation: '',
      falseComparison: '',
    });
    expect(result.ok).toBe(false);
  });
  it('rejects if survivorship is empty', () => {
    const result = validateGate({
      sunkCost: { amount: 0, note: '' },
      survivorship: '',
      ostrich: '',
      hastyGeneralisation: '',
      causation: '',
      falseComparison: '',
    });
    expect(result.ok).toBe(false);
  });
  it('accepts if all fields are filled', () => {
    expect(validateGate(filled).ok).toBe(true);
  });
  it('lists every unanswered field, so the user is not sent back one at a time', () => {
    const result = validateGate({
      sunkCost: { amount: 0, note: 'none' },
      survivorship: '',
      ostrich: 'x',
      hastyGeneralisation: '',
      causation: 'x',
      falseComparison: 'x',
    });
    expect(result.missing).toEqual(['survivorship', 'hastyGeneralisation']);
  });
  it('treats whitespace as unanswered', () => {
    const result = validateGate({ ...filled, ostrich: '   ' });
    expect(result.missing).toEqual(['ostrich']);
  });
  it('rejects a sunk cost whose amount is not a number', () => {
    const result = validateGate({
      ...filled,
      sunkCost: { amount: Number.NaN, note: 'x' },
    });
    expect(result.missing).toEqual(['sunkCost']);
  });
  it('accepts a zero sunk cost with an empty note, because zero is an answer', () => {
    expect(validateGate({ ...filled, sunkCost: { amount: 0, note: '' } }).ok).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { validateTag } from './tag';

describe('claim tagging', () => {
  it('rejects a fact with no source', () => {
    const result = validateTag({
      claims: [{ id: 'c1', text: 'Salary is 12jt', domain: 'fact' }],
    });
    expect(result.ok).toBe(false);
  });
  it('accepts a fact with a source', () => {
    const result = validateTag({
      claims: [{ id: 'c1', text: 'Salary is 12jt', domain: 'fact', source: 'contract' }],
    });
    expect(result.ok).toBe(true);
  });
  it('rejects a preference with no owner', () => {
    const result = validateTag({
      claims: [{ id: 'c1', text: 'I hate commuting', domain: 'preference' }],
    });
    expect(result.ok).toBe(false);
  });
  it('accepts a preference with an owner', () => {
    const result = validateTag({
      claims: [{ id: 'c1', text: 'I hate commuting', domain: 'preference', owner: 'me' }],
    });
    expect(result.ok).toBe(true);
  });
  it('treats whitespace as missing', () => {
    const result = validateTag({
      claims: [{ id: 'c1', text: 'Salary is 12jt', domain: 'fact', source: '   ' }],
    });
    expect(result.ok).toBe(false);
  });
  it('reports every problem, not just the first', () => {
    const result = validateTag({
      claims: [
        { id: 'c1', text: 'A', domain: 'fact' },
        { id: 'c2', text: 'B', domain: 'preference' },
      ],
    });
    expect(result.problems.map((p) => p.claimId)).toEqual(['c1', 'c2']);
  });
});

import { describe, it, expect } from 'vitest';
import { fillOptionSlots } from './fillOptions';
import type { Option } from '../core';

const template = (): Option[] => [
  { id: 'a', label: 'Do nothing', isBaseline: true },
  { id: 'b', label: '', isBaseline: false },
  { id: 'c', label: '', isBaseline: false },
];

describe('filling option slots', () => {
  it('fills the blank slots instead of appending new ones', () => {
    // The complaint this fixes: accepting two options produced five rows.
    const result = fillOptionSlots(template(), ['Stay', 'Move']);

    expect(result.map((option) => option.label)).toEqual(['Do nothing', 'Stay', 'Move']);
    expect(result).toHaveLength(3);
  });

  it('removes a surplus blank slot when there are fewer options than slots', () => {
    const result = fillOptionSlots(template(), ['Stay']);

    // One blank is filled, the other is dropped rather than left empty.
    expect(result.map((option) => option.label)).toEqual(['Do nothing', 'Stay']);
  });

  it('adds slots when there are more options than the template holds', () => {
    const result = fillOptionSlots(template(), ['Stay', 'Move', 'Negotiate', 'Go freelance']);

    expect(result).toHaveLength(5);
    expect(result.map((option) => option.label)).toEqual([
      'Do nothing',
      'Stay',
      'Move',
      'Negotiate',
      'Go freelance',
    ]);
  });

  it('gives every filled option a distinct id', () => {
    const result = fillOptionSlots(template(), ['Stay', 'Move', 'Negotiate', 'Go freelance']);
    const ids = result.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps exactly one baseline', () => {
    const result = fillOptionSlots(template(), ['Stay', 'Move']);
    expect(result.filter((option) => option.isBaseline)).toHaveLength(1);
  });

  it('never writes into a slot the user has already filled by hand', () => {
    const typed: Option[] = [
      { id: 'a', label: 'Do nothing', isBaseline: true },
      { id: 'b', label: 'My own option', isBaseline: false },
      { id: 'c', label: '', isBaseline: false },
    ];

    const result = fillOptionSlots(typed, ['Stay']);

    expect(result.map((option) => option.label)).toEqual([
      'Do nothing',
      'My own option',
      'Stay',
    ]);
  });

  it('does not duplicate an option that is already in the list', () => {
    const typed: Option[] = [
      { id: 'a', label: 'Do nothing', isBaseline: true },
      { id: 'b', label: 'Stay', isBaseline: false },
      { id: 'c', label: '', isBaseline: false },
    ];

    const result = fillOptionSlots(typed, ['stay']);

    // Case-insensitive: "stay" and "Stay" are the same option.
    expect(result.map((option) => option.label)).toEqual(['Do nothing', 'Stay']);
  });

  it('drops the scores of options it removed', () => {
    // Not this function's job, but the caller needs to know which ids survived.
    const result = fillOptionSlots(template(), ['Stay']);
    expect(result.map((option) => option.id)).toEqual(['a', 'b']);
  });

  it('keeps the baseline when the accepted options do not include one', () => {
    // A decision with no baseline cannot be scored, so it is preserved even
    // though it was not among the accepted items.
    const result = fillOptionSlots(template(), ['Stay', 'Move']);
    expect(result[0].isBaseline).toBe(true);
    expect(result[0].label).toBe('Do nothing');
  });

  it('promotes an accepted do-nothing option to baseline', () => {
    const result = fillOptionSlots(template(), ['Do nothing', 'Stay']);

    expect(result.filter((option) => option.isBaseline)).toHaveLength(1);
    expect(result.filter((option) => option.label === 'Do nothing')).toHaveLength(1);
  });

  it('leaves the list alone when there is nothing to fill', () => {
    const before = template();
    const result = fillOptionSlots(before, []);
    expect(result).toEqual(before);
  });
});

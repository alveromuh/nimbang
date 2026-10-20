import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Result } from './Result';
import { scoreDecision, stressTest, swingWeights, type Decision } from '../core';

function decision(): Decision {
  return {
    id: 'd1',
    title: 'Pindah kerja',
    objectives: [{ id: 'o1', statement: 'Penghasilan naik', kind: 'motivation' }],
    options: [
      { id: 'a', label: 'Tidak melakukan apa-apa', isBaseline: true },
      { id: 'b', label: 'Tetap', isBaseline: false },
      { id: 'c', label: 'Pindah', isBaseline: false },
    ],
    items: [
      { id: 'a--o1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 2, probability: 1, risk: 'ordinary' },
      { id: 'b--o1', optionId: 'b', objectiveId: 'o1', kind: 'benefit', value: 5, probability: 1, risk: 'ordinary' },
      { id: 'c--o1', optionId: 'c', objectiveId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
    ],
    claims: [],
    swingPoints: { o1: 100 },
  };
}

function fixture() {
  const d = decision();
  const weights = swingWeights(d.objectives, d.swingPoints ?? {});
  return { decision: d, score: scoreDecision(d, weights), stress: stressTest(d, weights) };
}

describe('Result', () => {
  it('shows the leader and its margin', () => {
    const { decision: d, score, stress } = fixture();
    render(<Result decision={d} score={score} stress={stress} />);

    const verdict = screen.getByText('Tetap', { selector: '.verdict__value' });
    expect(verdict).toBeInTheDocument();
    // Two decimals, not three: the inputs are subjective 1–5 values, and a third
    // digit claims a precision the method does not have.
    expect(screen.getByText(/unggul/i).closest('p')).toHaveTextContent('Unggul 0.67 dari Pindah');
  });

  it('says what the net number means, next to the number', () => {
    const { decision: d, score, stress } = fixture();
    render(<Result decision={d} score={score} stress={stress} />);

    // Finding 5 of the review: precision must not read as certainty. The scale
    // and the dependence on the option set have to be stated where the score is.
    const panel = screen.getByRole('heading', { name: /hasil/i }).closest('section');
    expect(panel).toHaveTextContent(/perbandingan, bukan ukuran/i);
    expect(panel).toHaveTextContent(/menambah atau menghapus opsi/i);
  });

  it('names the attribute, not just the objective, when it reports the flip point', () => {
    // Two inputs under one objective would otherwise produce the same sentence
    // twice, and the reader could not tell which one to change.
    const d: Decision = {
      ...decision(),
      objectives: [
        {
          id: 'o1',
          statement: 'Penghasilan naik',
          kind: 'motivation',
          attributes: [
            { id: 'o1', name: 'Gaji' },
            { id: 'o1-a2', name: 'Jam kerja' },
          ],
        },
      ],
      items: [
        { id: 'a--o1', optionId: 'a', objectiveId: 'o1', attributeId: 'o1', kind: 'benefit', value: 4, probability: 1, risk: 'ordinary' },
        { id: 'b--o1', optionId: 'b', objectiveId: 'o1', attributeId: 'o1', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
        { id: 'c--o1', optionId: 'c', objectiveId: 'o1', attributeId: 'o1', kind: 'benefit', value: 1, probability: 1, risk: 'ordinary' },
        { id: 'a--o1-a2', optionId: 'a', objectiveId: 'o1', attributeId: 'o1-a2', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
        { id: 'b--o1-a2', optionId: 'b', objectiveId: 'o1', attributeId: 'o1-a2', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
        { id: 'c--o1-a2', optionId: 'c', objectiveId: 'o1', attributeId: 'o1-a2', kind: 'benefit', value: 3, probability: 1, risk: 'ordinary' },
      ],
    };
    const weights = swingWeights(d.objectives, { o1: 100 });
    render(<Result decision={d} score={scoreDecision(d, weights)} stress={stressTest(d, weights)} />);

    expect(screen.getAllByText(/untuk Gaji/i).length).toBeGreaterThan(0);
    // The attribute, not the objective, is what the sentence names.
    expect(screen.queryByText(/untuk Penghasilan naik/i)).not.toBeInTheDocument();
  });

  it('states that a fatal leader blocks the recommendation, rather than ranking it first', () => {
    const base = decision();
    const d: Decision = {
      ...base,
      items: base.items.map((item) =>
        item.optionId === 'b' ? { ...item, risk: 'fatal' as const } : item,
      ),
    };
    const weights = swingWeights(d.objectives, { o1: 100 });
    render(<Result decision={d} score={scoreDecision(d, weights)} stress={stressTest(d, weights)} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/tidak ada rekomendasi/i);
  });
});
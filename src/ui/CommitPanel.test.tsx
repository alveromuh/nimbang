import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommitPanel } from './CommitPanel';
import type { Prediction } from '../core';

function Harness({
  predictions,
  outcomes,
}: {
  predictions: Prediction[];
  outcomes: Record<string, boolean>;
}) {
  const [p, setP] = useState(predictions);
  const [o, setO] = useState(outcomes);
  return (
    <CommitPanel
      predictions={p}
      outcomes={o}
      onChangePredictions={setP}
      onChangeOutcomes={setO}
    />
  );
}

describe('CommitPanel', () => {
  it('asks for a prediction and a review date', () => {
    render(<Harness predictions={[]} outcomes={{}} />);
    expect(screen.getByLabelText(/prediction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/review/i)).toBeInTheDocument();
  });

  it('records a prediction with a probability', async () => {
    const user = userEvent.setup();
    render(<Harness predictions={[]} outcomes={{}} />);
    await user.type(screen.getByLabelText(/prediction/i), 'Gaji naik dalam 6 bulan');
    await user.type(screen.getByLabelText(/^probability/i), '0.7');
    expect(screen.getByDisplayValue('Gaji naik dalam 6 bulan')).toBeInTheDocument();
  });

  it('says there is no calibration score until an outcome is resolved', () => {
    render(<Harness predictions={[{ claimId: 'c1', probability: 0.7 }]} outcomes={{}} />);
    // A Brier score from nothing is the absence of a score, not a good one.
    expect(screen.getByText(/no resolved predictions/i)).toBeInTheDocument();
  });

  it('computes a Brier score once an outcome is recorded', async () => {
    const user = userEvent.setup();
    render(<Harness predictions={[{ claimId: 'c1', probability: 0.8 }]} outcomes={{}} />);
    await user.click(screen.getByLabelText(/happened/i));
    // (0.8 - 1)^2 = 0.04
    expect(screen.getByText(/0\.04/)).toBeInTheDocument();
  });
});

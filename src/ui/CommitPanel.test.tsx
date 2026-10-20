import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommitPanel } from './CommitPanel';
import type { Prediction } from '../core';

function Harness({
  predictions,
  outcomes,
  initialReviewAt = '',
}: {
  predictions: Prediction[];
  outcomes: Record<string, boolean>;
  initialReviewAt?: string;
}) {
  const [p, setP] = useState(predictions);
  const [o, setO] = useState(outcomes);
  const [reviewAt, setReviewAt] = useState(initialReviewAt);
  return (
    <CommitPanel
      predictions={p}
      outcomes={o}
      reviewAt={reviewAt}
      onChangePredictions={setP}
      onChangeOutcomes={setO}
      onChangeReviewAt={setReviewAt}
    />
  );
}

describe('CommitPanel', () => {
  it('asks for a prediction and a review date', () => {
    render(<Harness predictions={[]} outcomes={{}} />);
    expect(screen.getByLabelText(/prediksi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tinjau pada/i)).toBeInTheDocument();
  });

  it('keeps the review date the user typed, instead of discarding it', async () => {
    const user = userEvent.setup();
    render(<Harness predictions={[]} outcomes={{}} />);

    // This input shipped unbound: typing a date left the document unchanged, so
    // the one field that schedules the review did nothing.
    const field = screen.getByLabelText(/tinjau pada/i);
    await user.type(field, '2027-01-31');

    expect(field).toHaveValue('2027-01-31');
  });

  it('shows the prediction as written, not as a slug', () => {
    render(
      <Harness
        predictions={[
          { claimId: 'gaji-naik-dalam-6-bulan', probability: 0.7, text: 'Gaji naik dalam 6 bulan' },
        ]}
        outcomes={{}}
      />,
    );

    expect(screen.getByText('Gaji naik dalam 6 bulan')).toBeInTheDocument();
    expect(screen.queryByText('gaji-naik-dalam-6-bulan')).not.toBeInTheDocument();
  });

  it('records a prediction with a probability', async () => {
    const user = userEvent.setup();
    render(<Harness predictions={[]} outcomes={{}} />);
    await user.type(screen.getByLabelText(/prediksi/i), 'Gaji naik dalam 6 bulan');
    await user.type(screen.getByLabelText(/^peluang/i), '0.7');
    expect(screen.getByDisplayValue('Gaji naik dalam 6 bulan')).toBeInTheDocument();
  });

  it('says there is no calibration score until an outcome is resolved', () => {
    render(<Harness predictions={[{ claimId: 'c1', probability: 0.7 }]} outcomes={{}} />);
    // A Brier score from nothing is the absence of a score, not a good one.
    expect(screen.getByText(/belum ada prediksi yang selesai/i)).toBeInTheDocument();
  });

  it('computes a Brier score once an outcome is recorded', async () => {
    const user = userEvent.setup();
    render(<Harness predictions={[{ claimId: 'c1', probability: 0.8 }]} outcomes={{}} />);
    await user.click(screen.getByLabelText(/terjadi/i));
    // (0.8 - 1)^2 = 0.04
    expect(screen.getByText(/0\.04/)).toBeInTheDocument();
  });

  it('assigns distinct ids to duplicate prediction text', async () => {
    const user = userEvent.setup();
    render(<Harness predictions={[]} outcomes={{}} />);
    for (const probability of ['0.8', '0.3']) {
      await user.type(screen.getByLabelText(/prediksi/i), 'Harga naik');
      await user.clear(screen.getByLabelText(/^peluang/i));
      await user.type(screen.getByLabelText(/^peluang/i), probability);
      await user.click(screen.getByRole('button', { name: /tambah prediksi/i }));
    }
    expect(document.querySelectorAll('#outcome-harga-naik')).toHaveLength(1);
    expect(document.querySelectorAll('#outcome-harga-naik-2')).toHaveLength(1);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });
});

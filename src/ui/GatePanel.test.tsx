import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GatePanel } from './GatePanel';
import type { GateInputs } from '../core';

const empty: GateInputs = {
  sunkCost: null,
  survivorship: '',
  ostrich: '',
  hastyGeneralisation: '',
  causation: '',
  falseComparison: '',
};

function Harness({ initial }: { initial: GateInputs }) {
  const [value, setValue] = useState<GateInputs>(initial);
  return <GatePanel value={value} onChange={setValue} />;
}

function setup(initial: GateInputs = empty) {
  render(<Harness initial={initial} />);
  return { user: userEvent.setup() };
}

describe('GatePanel', () => {
  it('asks every bias question the framework requires', () => {
    setup();
    expect(screen.getByLabelText(/who tried this and failed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/evidence are you avoiding/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how many cases/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cause, or a coincidence/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what differs between your case/i)).toBeInTheDocument();
  });

  it('labels sunk cost as excluded from the arithmetic', () => {
    setup();
    // Review Focus 3: the exclusion must be visible, not merely true.
    expect(screen.getByText(/excluded from the arithmetic/i)).toBeInTheDocument();
  });

  it('accepts a zero sunk cost, because zero is an answer', async () => {
    const { user } = setup();
    const amount = screen.getByLabelText(/sunk cost/i);
    await user.clear(amount);
    await user.type(amount, '0');
    expect(amount).toHaveValue(0);

    // A recorded zero must not be reported as missing. The other five fields are
    // still empty here, so the only field that may be named is not sunkCost.
    const status = screen.getByRole('status');
    expect(status.textContent).not.toMatch(/sunkCost/);
  });

  it('reports the gate as incomplete until every field is answered', async () => {
    const { user } = setup();
    expect(screen.getByText(/unanswered/i)).toBeInTheDocument();

    const answers: [RegExp, string][] = [
      [/sunk cost/i, '5000000'],
      [/who tried this and failed/i, 'teman yang pindah lalu kembali'],
      [/evidence are you avoiding/i, 'gaji aktual di sana'],
      [/how many cases/i, 'dua'],
      [/cause, or a coincidence/i, 'koinsiden'],
      [/what differs between your case/i, 'pengalaman'],
    ];

    for (const [label, answer] of answers) {
      const field = screen.getByLabelText(label);
      await user.clear(field);
      await user.type(field, answer);
    }

    expect(screen.queryByText(/unanswered/i)).not.toBeInTheDocument();
  });
});

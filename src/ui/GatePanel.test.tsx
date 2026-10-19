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
    expect(screen.getByLabelText(/siapa yang mencoba ini lalu gagal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bukti apa yang sedang kamu hindari/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/berdasar berapa kasus/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sebab, atau kebetulan waktunya/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/beda kasusmu dengan kasus pembandingnya/i)).toBeInTheDocument();
  });

  it('shows the English line under each question, at lower emphasis', () => {
    setup();
    // Bilingual by design: Indonesian is the interface, English is the aid.
    const english = screen.getByText(/who tried this and failed/i);
    expect(english).toHaveAttribute('lang', 'en');
    expect(english.className).toMatch(/bi__en/);
  });

  it('labels sunk cost as excluded from the arithmetic', () => {
    setup();
    // Review Focus 3: the exclusion must be visible, not merely true.
    expect(screen.getByText(/tidak dihitung/i)).toBeInTheDocument();
  });

  it('accepts a zero sunk cost, because zero is an answer', async () => {
    const { user } = setup();
    const amount = screen.getByLabelText(/biaya yang sudah keluar/i);
    await user.clear(amount);
    await user.type(amount, '0');
    expect(amount).toHaveValue(0);

    // A recorded zero must not be reported as missing. The other five fields are
    // still empty here, so sunk cost must not appear among the unanswered ones.
    const status = screen.getByRole('status');
    expect(status.textContent).not.toMatch(/biaya yang sudah keluar/i);
    expect(status.textContent).toMatch(/siapa yang mencoba ini lalu gagal/i);
  });

  it('reports the gate as incomplete until every field is answered', async () => {
    const { user } = setup();
    expect(screen.getByText(/belum dijawab/i)).toBeInTheDocument();

    const answers: [RegExp, string][] = [
      [/biaya yang sudah keluar/i, '5000000'],
      [/siapa yang mencoba ini lalu gagal/i, 'teman yang pindah lalu kembali'],
      [/bukti apa yang sedang kamu hindari/i, 'gaji aktual di sana'],
      [/berdasar berapa kasus/i, 'dua'],
      [/sebab, atau kebetulan waktunya/i, 'koinsiden'],
      [/beda kasusmu dengan kasus pembandingnya/i, 'pengalaman'],
    ];

    for (const [label, answer] of answers) {
      const field = screen.getByLabelText(label);
      await user.clear(field);
      await user.type(field, answer);
    }

    expect(screen.queryByText(/belum dijawab/i)).not.toBeInTheDocument();
  });
});

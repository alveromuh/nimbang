import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemEditor } from './ItemEditor';
import type { Item } from '../core';

/**
 * A stateful harness. `ItemEditor` is controlled, so a harness that only records
 * changes would reset the field on every keystroke and the test would be
 * measuring the harness, not the component.
 */
function Harness({ initial, onCommit }: { initial: Item | undefined; onCommit: (p: number) => void }) {
  const [item, setItem] = useState<Item | undefined>(initial);
  return (
    <ItemEditor
      idPrefix="b--o1"
      label="Pindah on Penghasilan"
      item={item}
      onChange={(next) => {
        if (next !== null) {
          onCommit(next.probability);
        }
        setItem(next ?? undefined);
      }}
    />
  );
}

function setup(item: Item | undefined) {
  const commits: number[] = [];
  render(<Harness initial={item} onCommit={(p) => commits.push(p)} />);
  return { user: userEvent.setup(), commits };
}

const base: Item = {
  id: 'b--o1',
  optionId: 'b',
  objectiveId: 'o1',
  kind: 'benefit',
  value: 4,
  probability: 1,
  risk: 'ordinary',
};

describe('ItemEditor', () => {
  it('shows the current value', () => {
    setup(base);
    expect(screen.getByLabelText(/^nilai$/i)).toHaveValue(4);
  });

  it('lets the item be a cost, which the plain score form could not express', async () => {
    const { user } = setup(base);
    await user.selectOptions(screen.getByLabelText(/^jenis$/i), 'cost');
    expect(screen.getByLabelText(/^jenis$/i)).toHaveValue('cost');
  });

  it('lets the probability be less than one', async () => {
    const { user } = setup(base);
    const probability = screen.getByLabelText(/^peluang$/i);
    await user.clear(probability);
    await user.type(probability, '0.4');
    expect(probability).toHaveValue(0.4);
  });

  it('lets the item carry fatal risk, which blocks the recommendation', async () => {
    const { user } = setup(base);
    await user.click(screen.getByLabelText(/risiko fatal/i));
    expect(screen.getByLabelText(/risiko fatal/i)).toBeChecked();
  });

  it('records a reference class, without which the probability is rejected', async () => {
    const { user } = setup(base);
    await user.type(screen.getByLabelText(/kasus pembanding/i), 'proyek serupa');
    expect(screen.getByLabelText(/kasus pembanding/i)).toHaveValue('proyek serupa');
  });

  it('clears the value when the field is emptied', async () => {
    const { user } = setup(base);
    await user.clear(screen.getByLabelText(/^nilai$/i));
    expect(screen.getByLabelText(/^nilai$/i)).toHaveValue(null);
  });

  it('refuses a value outside 1..5', async () => {
    const { user } = setup(base);
    const value = screen.getByLabelText(/^nilai$/i);
    await user.clear(value);
    await user.type(value, '9');
    // Either the browser clamps it or the editor declines to store it; what must
    // not happen is an out-of-range value reaching the engine.
    expect(value).not.toHaveValue(9);
  });

  it('refuses a probability outside 0..1', async () => {
    const { user, commits } = setup(base);
    const probability = screen.getByLabelText(/^peluang$/i);
    await user.clear(probability);
    await user.type(probability, '1.5');
    // The field keeps the typed text so the user can correct it, but no
    // out-of-range probability is ever committed to the engine.
    expect(commits.every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it('creates a sensible item when the field was empty', async () => {
    const { user } = setup(undefined);
    await user.type(screen.getByLabelText(/^nilai$/i), '3');
    expect(screen.getByLabelText(/^nilai$/i)).toHaveValue(3);
    expect(screen.getByLabelText(/^jenis$/i)).toHaveValue('benefit');
    expect(screen.getByLabelText(/^peluang$/i)).toHaveValue(1);
    expect(screen.getByLabelText(/risiko fatal/i)).not.toBeChecked();
  });
});

import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimPanel } from './ClaimPanel';
import { validateTag, type Claim } from '../core';

/**
 * A stateful harness: the panel is controlled, so a harness that only recorded
 * changes would reset the field on every keystroke.
 */
function Harness({ initial }: { initial: Claim[] }) {
  const [claims, setClaims] = useState<Claim[]>(initial);
  return <ClaimPanel claims={claims} onChange={setClaims} />;
}

function setup(initial: Claim[] = []) {
  render(<Harness initial={initial} />);
  return { user: userEvent.setup() };
}

describe('ClaimPanel', () => {
  it('allows an empty list, because a decision may rest on no written claims', () => {
    setup();
    expect(screen.getByText(/belum ada klaim/i)).toBeInTheDocument();
    // Nothing to mistag, so the engine agrees the stage passes.
    expect(validateTag({ claims: [] }).ok).toBe(true);
  });

  it('adds a claim and asks a fact for its source', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /tambah klaim/i }));

    expect(screen.getByLabelText(/^jenis 1$/i)).toHaveValue('fact');
    expect(screen.getByLabelText(/sumber 1/i)).toBeInTheDocument();
  });

  it('asks a preference whose preference it is, instead of a source', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /tambah klaim/i }));
    await user.selectOptions(screen.getByLabelText(/^jenis 1$/i), 'preference');

    expect(screen.getByLabelText(/pemilik 1/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/sumber 1/i),
    ).not.toBeInTheDocument();
  });

  it('says which tag is still missing, on the claim itself', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /tambah klaim/i }));
    await user.type(screen.getByLabelText(/^klaim 1$/i), 'Gaji di sana 12 juta');

    expect(screen.getByText(/belum punya sumber/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/sumber 1/i), 'tanya HRD');
    expect(screen.queryByText(/belum punya sumber/i)).not.toBeInTheDocument();
  });

  it('refuses a fact with no source, through the engine validator', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /tambah klaim/i }));
    await user.type(screen.getByLabelText(/^klaim 1$/i), 'Gaji di sana 12 juta');

    // The panel's warning and the engine's rule have to be the same rule.
    const claim = { id: 'c1', text: 'Gaji di sana 12 juta', domain: 'fact' as const };
    expect(validateTag({ claims: [claim] }).ok).toBe(false);
  });

  it('removes a claim, and does not reuse its id', async () => {
    const committed: Claim[][] = [];
    function Recorder() {
      const [claims, setClaims] = useState<Claim[]>([]);
      return (
        <ClaimPanel
          claims={claims}
          onChange={(next) => {
            committed.push(next);
            setClaims(next);
          }}
        />
      );
    }
    render(<Recorder />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /tambah klaim/i }));
    await user.click(screen.getByRole('button', { name: /tambah klaim/i }));
    await user.click(screen.getByRole('button', { name: /hapus klaim 1/i }));
    await user.click(screen.getByRole('button', { name: /tambah klaim/i }));

    // Predictions key on claim id, so a reused id would make two claims
    // indistinguishable. The id counter has to survive the removal.
    const ids = committed.at(-1)?.map((claim) => claim.id);
    expect(ids).toEqual(['c2', 'c3']);
  });
});

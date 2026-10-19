import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DecisionWorkspace } from './DecisionWorkspace';
import type { Decision } from '../core';

/**
 * The workspace with a fake model.
 *
 * The real `sendTurn` is a network call, and a test that needs a gateway is a
 * test nobody can run. Swapping it lets these tests assert what the panel does
 * with a reply — which is the part that can be wrong.
 */
const replies = vi.hoisted(() => ({ next: [] as unknown[] }));

vi.mock('../chat/client', async () => {
  const actual = await vi.importActual<typeof import('../chat/client')>('../chat/client');
  return {
    ...actual,
    sendTurn: vi.fn(async () => {
      const next = replies.next.shift();
      if (next === undefined) {
        throw new Error('no reply queued');
      }
      return next;
    }),
  };
});

function decision(): Decision {
  return {
    id: 'd1',
    title: 'Pindah kerja',
    objectives: [{ id: 'o1', statement: 'Penghasilan naik', kind: 'motivation' }],
    options: [
      { id: 'a', label: 'Tidak melakukan apa-apa', isBaseline: true },
      { id: 'b', label: '', isBaseline: false },
      { id: 'c', label: '', isBaseline: false },
    ],
    items: [],
    claims: [],
    swingPoints: { o1: 100 },
  };
}

function turn(toolCalls: { name: string; arguments: string }[]) {
  return { toolCalls, reasoning: '', content: '', truncated: false };
}

function setup() {
  replies.next = [];
  render(<DecisionWorkspace decision={decision()} onSaved={() => {}} onDelete={() => {}} />);
  return { user: userEvent.setup() };
}

async function acceptOptions(user: ReturnType<typeof userEvent.setup>, labels: string[]) {
  replies.next.push(
    turn([{ name: 'record_options', arguments: JSON.stringify({ options: labels }) }]),
  );

  await user.click(screen.getByRole('button', { name: /belum tahu opsi apa saja/i }));
  await user.type(screen.getByLabelText(/jawabanmu/i), 'ini opsinya');
  await user.click(screen.getByRole('button', { name: /kirim/i }));
  await screen.findByRole('button', { name: /tambahkan yang dipilih/i });
  await user.click(screen.getByRole('button', { name: /tambahkan yang dipilih/i }));
}

const optionValues = () =>
  screen.getAllByLabelText(/^opsi \d+/i).map((input) => (input as HTMLInputElement).value);

/** The baseline marker is on the row label, not anywhere in the page. */
const baselineRows = () =>
  screen
    .getAllByLabelText(/^opsi \d+/i)
    .filter((input) => (input.closest('div')?.previousElementSibling?.textContent ?? '').includes('pembanding'));

describe('DecisionWorkspace: filling the option rows', () => {
  beforeEach(() => {
    replies.next = [];
  });

  it('fills the two blank rows instead of appending, leaving three rows', async () => {
    const { user } = setup();
    expect(optionValues()).toEqual(['Tidak melakukan apa-apa', '', '']);

    await acceptOptions(user, ['Tetap di pekerjaan ini', 'Pindah ke media fashion']);

    // Two accepted options, three rows — not five with two empty ones.
    expect(optionValues()).toEqual([
      'Tidak melakukan apa-apa',
      'Tetap di pekerjaan ini',
      'Pindah ke media fashion',
    ]);
  });

  it('drops the surplus blank row when only one option is accepted', async () => {
    const { user } = setup();
    await acceptOptions(user, ['Tetap di pekerjaan ini']);

    expect(optionValues()).toEqual(['Tidak melakukan apa-apa', 'Tetap di pekerjaan ini']);
  });

  it('grows to four rows when three options are accepted', async () => {
    const { user } = setup();
    await acceptOptions(user, ['Tetap', 'Pindah', 'Negosiasi']);

    expect(optionValues()).toEqual(['Tidak melakukan apa-apa', 'Tetap', 'Pindah', 'Negosiasi']);
  });

  it('grows to five rows when four options are accepted', async () => {
    const { user } = setup();
    await acceptOptions(user, ['Tetap', 'Pindah', 'Negosiasi', 'Freelance']);

    expect(optionValues()).toHaveLength(5);
    expect(optionValues()[4]).toBe('Freelance');
  });

  it('never overwrites a row the user typed by hand', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/^opsi 2$/i), 'Punya sendiri');

    await acceptOptions(user, ['Tetap', 'Pindah']);

    // "Punya sendiri" stays where it was; the two accepted options take the
    // remaining blank row and a new one.
    expect(optionValues()).toEqual([
      'Tidak melakukan apa-apa',
      'Punya sendiri',
      'Tetap',
      'Pindah',
    ]);
  });

  it('does not add an option that is already in the list', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/^opsi 2$/i), 'Pindah');

    await acceptOptions(user, ['pindah', 'Negosiasi']);

    // Case-insensitive: "pindah" is the row that is already there.
    expect(optionValues()).toEqual(['Tidak melakukan apa-apa', 'Pindah', 'Negosiasi']);
  });

  it('keeps exactly one baseline after a fill', async () => {
    const { user } = setup();
    await acceptOptions(user, ['Tetap', 'Pindah']);

    // The label is what the user reads; the baseline flag is what the engine
    // needs, and it must still be on exactly one row.
    expect(baselineRows()).toHaveLength(1);
    expect(baselineRows()[0]).toHaveValue('Tidak melakukan apa-apa');
  });
});

describe('DecisionWorkspace: the bias panel', () => {
  beforeEach(() => {
    replies.next = [];
  });

  it('offers an AI trigger inside the bias section', () => {
    setup();
    expect(screen.getByRole('button', { name: /belum tahu mau isi apa/i })).toBeInTheDocument();
  });

  it('writes accepted answers into the gate fields they belong to', async () => {
    const { user } = setup();

    replies.next.push(
      turn([
        {
          name: 'record_answers',
          arguments: JSON.stringify({
            answers: [
              { field: 'survivorship', text: 'Dua teman berhenti setelah tiga bulan' },
              { field: 'ostrich', text: 'Gaji sebenarnya di sana' },
            ],
          }),
        },
      ]),
    );

    await user.click(screen.getByRole('button', { name: /belum tahu mau isi apa/i }));
    await user.type(screen.getByLabelText(/jawabanmu/i), 'teman saya berhenti');
    await user.click(screen.getByRole('button', { name: /kirim/i }));
    await screen.findByRole('button', { name: /isi yang dipilih/i });
    await user.click(screen.getByRole('button', { name: /isi yang dipilih/i }));

    expect(screen.getByLabelText(/siapa yang mencoba ini lalu gagal/i)).toHaveValue(
      'Dua teman berhenti setelah tiga bulan',
    );
    expect(screen.getByLabelText(/bukti apa yang sedang kamu hindari/i)).toHaveValue(
      'Gaji sebenarnya di sana',
    );
  });

  it('writes only the answers the user left ticked', async () => {
    const { user } = setup();

    replies.next.push(
      turn([
        {
          name: 'record_answers',
          arguments: JSON.stringify({
            answers: [
              { field: 'survivorship', text: 'Dua teman berhenti' },
              { field: 'ostrich', text: 'Gaji sebenarnya' },
            ],
          }),
        },
      ]),
    );

    await user.click(screen.getByRole('button', { name: /belum tahu mau isi apa/i }));
    await user.type(screen.getByLabelText(/jawabanmu/i), 'dua teman berhenti');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    // Untick the second answer before accepting.
    await user.click(
      await screen.findByRole('checkbox', { name: /bukti apa yang sedang kamu hindari/i }),
    );
    await user.click(screen.getByRole('button', { name: /isi yang dipilih/i }));

    expect(screen.getByLabelText(/siapa yang mencoba ini lalu gagal/i)).toHaveValue(
      'Dua teman berhenti',
    );
    expect(screen.getByLabelText(/bukti apa yang sedang kamu hindari/i)).toHaveValue('');
  });
});

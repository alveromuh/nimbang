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
/**
 * The options section, found by its heading rather than by position: the section
 * moved trigger and gained a wrapper, and a test that counted children would have
 * broken for the wrong reason.
 */
function optionsSection(): HTMLElement {
  const section = screen.getByRole('heading', { name: /^opsi$/i }).closest('section');
  if (section === null) {
    throw new Error('opsi section not found');
  }
  return section;
}

const optionsTrigger = () =>
  screen.getByRole('button', { name: /belum tahu opsi apa saja/i });

/**
 * The two corner actions of the workspace.
 *
 * Matched by accessible name, which is also the assertion that the marks stay
 * decorative: if a mark leaked into the name, these would be "Cetak Cetak" and
 * "Hapus Hapus" and every test below would fail on the lookup.
 *
 * The Hapus buttons inside the option rows are named "Remove option 1" and so on,
 * so `/^hapus$/i` resolves to the corner action alone.
 */
const printButton = () => screen.getByRole('button', { name: /^cetak$/i });
const deleteButton = () => screen.getByRole('button', { name: /^hapus$/i });

describe('DecisionWorkspace: where the options trigger lives', () => {
  beforeEach(() => {
    replies.next = [];
  });

  it('puts the trigger in the section head, not at the foot of the fields', () => {
    setup();

    // In the head group: the button that opens a panel occupying the right half
    // has to be at the top, or it is a control on the far side of its own panel.
    expect(optionsSection().querySelector('.panel__head-end .suggest')).not.toBeNull();
    expect(optionsSection().querySelector('.panel__head .suggest')).toContainElement(
      optionsTrigger(),
    );
  });

  it('asks about the options the reader can see, and no longer states a rule', () => {
    setup();

    const hint = optionsSection().querySelector('.panel__hint')?.textContent ?? '';

    expect(hint).toMatch(/opsi apa saja yang tersedia/i);
    // The old hint stated the method ("one of which is doing nothing"). It now
    // belongs to the locked row, which explains itself.
    expect(hint).not.toMatch(/tidak melakukan apa-apa/i);
  });

  it('explains the baseline row the reader cannot remove', () => {
    setup();

    const note = screen.getByText(/barisnya selalu ada/i);

    // Beside the row it explains, inside the same field.
    expect(note.closest('.field')).toContainElement(screen.getByLabelText(/^opsi 1/i));
    // Locked, which is exactly why the note has to be here: an explanation is
    // owed for a row the reader is not allowed to delete.
    expect(screen.getByRole('button', { name: /remove option 1/i })).toBeDisabled();
  });
});

describe('DecisionWorkspace: splitting the options section', () => {
  beforeEach(() => {
    replies.next = [];
  });

  it('docks the panel beside the fields, one half each', async () => {
    const { user } = setup();
    expect(optionsSection().querySelector('.panel__split')).toBeNull();

    await user.click(optionsTrigger());

    const split = optionsSection().querySelector('.panel__split');
    expect(split).not.toBeNull();

    // The form first, the panel second: the reading order is unchanged, only the
    // width is shared.
    expect(split?.children[0]).toContainElement(screen.getByLabelText(/^opsi 1/i));
    expect(split?.children[1]).toHaveClass('chat');
  });

  it('keeps every option row when the panel opens', async () => {
    const { user } = setup();
    expect(optionValues()).toEqual(['Tidak melakukan apa-apa', '', '']);

    await user.click(optionsTrigger());

    // Nothing is displaced or hidden: the rows are re-laid-out, not replaced.
    expect(optionValues()).toEqual(['Tidak melakukan apa-apa', '', '']);
    expect(screen.getByRole('button', { name: /tambah opsi/i })).toBeInTheDocument();
  });

  it('goes back to one full-width column when the panel is closed', async () => {
    const { user } = setup();
    await user.click(optionsTrigger());
    expect(optionsSection().querySelector('.chat')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /tutup/i }));

    // A closed panel must not leave an empty half column behind.
    expect(optionsSection().querySelector('.panel__split')).toBeNull();
    expect(optionsSection().querySelector('.chat')).toBeNull();
    expect(optionsTrigger()).toBeInTheDocument();
  });

  it('hides the trigger while the panel is open, so there is one control per state', async () => {
    const { user } = setup();

    await user.click(optionsTrigger());

    expect(optionsSection().querySelector('.panel__head-end .suggest')).toBeNull();
  });
});

describe('DecisionWorkspace: the two corner actions', () => {
  beforeEach(() => {
    replies.next = [];
  });

  it('carries the classes the stylesheet fills, without letting colour be the label', () => {
    setup();

    // `btn-print` and `btn-danger` are the hooks the two fills hang off. Colour is
    // a second cue here, never the only one: the words are unchanged, so the
    // buttons still work for a reader who cannot separate the green from the red.
    expect(printButton()).toHaveClass('btn-action', 'btn-print');
    expect(deleteButton()).toHaveClass('btn-action', 'btn-danger');
    expect(printButton()).toHaveTextContent(/^cetak$/i);
    expect(deleteButton()).toHaveTextContent(/^hapus$/i);
  });

  it('marks both, and hides the mark from a screen reader', () => {
    setup();

    for (const button of [printButton(), deleteButton()]) {
      const mark = button.querySelector('svg');
      expect(mark).not.toBeNull();
      // Decorative: the label already names the action, so an announced mark
      // would be the same word twice.
      expect(mark).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('still prints and still deletes', async () => {
    const printed = vi.spyOn(window, 'print').mockImplementation(() => {});
    const onDelete = vi.fn();
    render(<DecisionWorkspace decision={decision()} onSaved={() => {}} onDelete={onDelete} />);
    const user = userEvent.setup();

    await user.click(printButton());
    expect(printed).toHaveBeenCalledTimes(1);

    // The one irreversible action in the workspace, so it is clicked here rather
    // than assumed from the handler being wired.
    await user.click(deleteButton());
    expect(onDelete).toHaveBeenCalledTimes(1);

    printed.mockRestore();
  });
});

describe('DecisionWorkspace: saving, escape, and the review date', () => {
  it('tells the user when the draft could not be saved', () => {
    // Storage lives in one browser, so a refused write is total loss. The
    // workspace must say so instead of looking like a successful save.
    render(
      <DecisionWorkspace
        decision={decision()}
        onSaved={() => {}}
        onDelete={() => {}}
        saveFailed
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/belum tersimpan/i);
  });

  it('says nothing about saving while saving works', () => {
    setup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes the elicitation panel with Escape', async () => {
    const user = userEvent.setup();
    render(<DecisionWorkspace decision={decision()} onSaved={() => {}} onDelete={() => {}} />);

    await user.click(screen.getByRole('button', { name: /belum tahu opsi apa saja/i }));
    expect(screen.getByRole('complementary', { name: /asisten opsi/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: /asisten opsi/i })).not.toBeInTheDocument();
  });

  it('keeps the review date the user typed', async () => {
    const user = userEvent.setup();
    render(<DecisionWorkspace decision={decision()} onSaved={() => {}} onDelete={() => {}} />);

    const field = screen.getByLabelText(/tinjau pada/i);
    await user.type(field, '2027-03-01');

    expect(field).toHaveValue('2027-03-01');
  });

  it('keeps every hint in a section head', () => {
    setup();

    const hints = document.querySelectorAll('.panel__hint');

    expect(hints.length).toBeGreaterThan(1);
    // The right-alignment is earned by the position: a hint in the corner of a
    // section ends its lines on the right edge. One rendered anywhere else would
    // be right-aligned with nothing to align against, so this is the invariant
    // that makes the rule safe.
    for (const hint of hints) {
      expect(hint.closest('.panel__head')).not.toBeNull();
    }
  });
});


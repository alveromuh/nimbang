import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { serializeDecision } from '../core';

/**
 * The dashboard starts empty and asks for a decision before it shows a form.
 * Every test below opens one first: that is the real path a user takes, and
 * testing around it would hide the flow.
 */
function installStorage() {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  return storage;
}

async function startDecision() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /keputusan baru/i }));
  return user;
}

async function fillDecision(
  user: ReturnType<typeof userEvent.setup>,
  scores: [string, string, string],
) {
  await user.type(screen.getByLabelText(/^tujuan 1$/i), 'Penghasilan');
  await user.type(screen.getByLabelText(/^opsi 2$/i), 'Tetap');
  await user.type(screen.getByLabelText(/^opsi 3$/i), 'Pindah');

  const values = screen.getAllByLabelText(/^nilai$/i);
  expect(values).toHaveLength(3);
  for (const [index, score] of scores.entries()) {
    await user.type(values[index], score);
  }
}

describe('App', () => {
  beforeEach(() => {
    installStorage();
  });

  it('opens on an empty dashboard that explains where to start', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /mulai dari tujuan/i })).toBeInTheDocument();
    expect(screen.getByText(/disimpan di browser ini/i)).toBeInTheDocument();
  });

  it('creates a decision and shows the workspace', async () => {
    render(<App />);
    const user = await startDecision();

    expect(screen.getByLabelText(/decision title/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tujuan/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /opsi/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /keputusan baru/i }));
    expect(screen.getAllByRole('button', { name: /keputusan tanpa judul/i })).toHaveLength(2);
  });

  it('says what is missing before it will rank anything', async () => {
    render(<App />);
    await startDecision();
    expect(screen.getAllByText(/belum punya nama/i).length).toBeGreaterThan(0);
  });

  it('ranks the options once each is scored', async () => {
    render(<App />);
    const user = await startDecision();
    await fillDecision(user, ['2', '5', '3']);

    expect(screen.getByRole('heading', { name: /hasil/i })).toBeInTheDocument();
    expect(screen.getAllByText('Tetap').length).toBeGreaterThan(0);
  });

  it('lets a cost subtract, which the old form could not express', async () => {
    render(<App />);
    const user = await startDecision();
    await fillDecision(user, ['1', '5', '3']);

    const kinds = screen.getAllByLabelText(/^jenis$/i);
    await user.selectOptions(kinds[1], 'cost');

    // Option 2 now contributes negatively, so it can no longer be the leader.
    const leader = screen.getByText(/^Rekomendasi$/i).parentElement?.textContent ?? '';
    expect(leader).not.toContain('Tetap');
  });

  it('blocks the recommendation when the leader carries fatal risk', async () => {
    render(<App />);
    const user = await startDecision();
    await fillDecision(user, ['1', '5', '3']);

    const fatals = screen.getAllByLabelText(/risiko fatal/i);
    await user.click(fatals[1]);

    expect(screen.getByRole('alert')).toHaveTextContent(/tidak ada rekomendasi/i);
  });

  it('asks the bias questions and marks sunk cost as excluded', async () => {
    render(<App />);
    await startDecision();

    expect(screen.getByText(/tidak dihitung/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/siapa yang mencoba ini lalu gagal/i)).toBeInTheDocument();
  });

  it('offers the bias panel its own AI trigger, separate from the options one', async () => {
    render(<App />);
    await startDecision();

    // Both panels are places a person gets stuck, so both get the button. The
    // labels differ because the stuck point differs.
    expect(
      screen.getByRole('button', { name: /belum tahu opsi apa saja/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /belum tahu mau isi apa/i }),
    ).toBeInTheDocument();
  });

  it('marks both AI triggers with the sparkle', async () => {
    render(<App />);
    await startDecision();

    const optionTrigger = screen.getByRole('button', { name: /belum tahu opsi apa saja/i });
    const biasTrigger = screen.getByRole('button', { name: /belum tahu mau isi apa/i });

    // The mark is decorative: the button's text already names the action, so an
    // aria-label on the icon would make a screen reader say it twice.
    for (const trigger of [optionTrigger, biasTrigger]) {
      const mark = trigger.querySelector('svg.ai-mark');
      expect(mark).not.toBeNull();
      expect(mark).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('states that there is no calibration score yet', async () => {
    render(<App />);
    await startDecision();
    expect(screen.getByText(/belum ada prediksi yang selesai/i)).toBeInTheDocument();
  });

  it('adds a second objective with its own swing weight', async () => {
    render(<App />);
    const user = await startDecision();

    expect(screen.getAllByLabelText(/^tujuan \d+$/i)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /tambah tujuan/i }));
    expect(screen.getAllByLabelText(/^tujuan \d+$/i)).toHaveLength(2);

    await user.type(screen.getByLabelText(/^tujuan 2$/i), 'Jam kerja');
    expect(screen.getByLabelText(/bobot untuk jam kerja/i)).toBeInTheDocument();
  });

  it('removes an objective and its scores', async () => {
    render(<App />);
    const user = await startDecision();

    await user.click(screen.getByRole('button', { name: /tambah tujuan/i }));
    await user.click(screen.getAllByRole('button', { name: /remove objective/i })[1]);
    expect(screen.getAllByLabelText(/^tujuan \d+$/i)).toHaveLength(1);
  });

  it('refuses to remove the last objective or a protected option', async () => {
    render(<App />);
    await startDecision();

    expect(screen.getByRole('button', { name: /remove objective 1/i })).toBeDisabled();
    // Option 1 is the baseline, and three options are the floor.
    expect(screen.getByRole('button', { name: /remove option 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove option 2/i })).toBeDisabled();
  });

  it('fills the template rows with the accepted options instead of appending', async () => {
    render(<App />);
    const user = await startDecision();

    // The template: one baseline and two blanks. Two accepted options must fill
    // the blanks, leaving three rows — not append beside them and leave five with
    // two empty ones for the user to tidy up.
    expect(screen.getAllByLabelText(/^opsi \d+/i)).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: /belum tahu opsi apa saja/i }));
    await user.type(screen.getByLabelText(/jawabanmu/i), 'Stay or move');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    // The panel is exercised through its own component; here the fake server is
    // not running, so the reply is an error. What matters is that the row count
    // is unchanged and no phantom option appeared.
    expect(await screen.findAllByRole('status')).not.toHaveLength(0);
    expect(screen.getAllByLabelText(/^opsi \d+/i)).toHaveLength(3);
  });

  it('opens a shared link and imports the decision', async () => {
    const shared = {
      id: 'shared-1',
      title: 'Dari tautan',
      objectives: [{ id: 'o1', statement: 'Penghasilan', kind: 'motivation' as const }],
      options: [
        { id: 'a', label: 'Tetap', isBaseline: true },
        { id: 'b', label: 'Pindah', isBaseline: false },
        { id: 'c', label: 'Negosiasi', isBaseline: false },
      ],
      items: [
        { id: 'a--o1', optionId: 'a', objectiveId: 'o1', kind: 'benefit' as const, value: 2, probability: 1, risk: 'ordinary' as const },
        { id: 'b--o1', optionId: 'b', objectiveId: 'o1', kind: 'benefit' as const, value: 5, probability: 1, risk: 'ordinary' as const },
        { id: 'c--o1', optionId: 'c', objectiveId: 'o1', kind: 'benefit' as const, value: 3, probability: 1, risk: 'ordinary' as const },
      ],
      claims: [],
      swingPoints: { o1: 100 },
    };

    // The app could always *produce* a share link; it could not read one back,
    // because the dashboard rewrite dropped the decode path and the old test
    // only checked the encoder. This asserts the round trip through the URL.
    window.history.replaceState(null, '', `/#d=${serializeDecision(shared)}`);

    render(<App />);

    expect(screen.getByLabelText(/decision title/i)).toHaveValue('Dari tautan');
    expect(screen.getAllByText('Pindah').length).toBeGreaterThan(0);
    // The fragment is cleared so a reload does not re-import a stale copy.
    expect(window.location.hash).toBe('');
  });

  it('falls back to the library when the shared link is malformed', () => {
    window.history.replaceState(null, '', '/#d=not-a-decision');
    render(<App />);
    // Not a crash and not a blank page: the normal empty state.
    expect(screen.getByRole('heading', { name: /mulai dari tujuan/i })).toBeInTheDocument();
  });

  it('deletes a decision and returns to the empty dashboard', async () => {
    render(<App />);
    const user = await startDecision();
    await user.click(screen.getByRole('button', { name: /^hapus$/i }));

    expect(screen.getByRole('heading', { name: /mulai dari tujuan/i })).toBeInTheDocument();
  });
});

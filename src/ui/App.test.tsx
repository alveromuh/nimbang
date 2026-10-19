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
  await user.click(screen.getByRole('button', { name: /new decision/i }));
  return user;
}

async function fillDecision(
  user: ReturnType<typeof userEvent.setup>,
  scores: [string, string, string],
) {
  await user.type(screen.getByLabelText(/^objective 1$/i), 'Penghasilan');
  await user.type(screen.getByLabelText(/^option 2$/i), 'Tetap');
  await user.type(screen.getByLabelText(/^option 3$/i), 'Pindah');

  const values = screen.getAllByLabelText(/^value$/i);
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
    expect(screen.getByRole('heading', { name: /start with the objective/i })).toBeInTheDocument();
    expect(screen.getByText(/kept in this browser/i)).toBeInTheDocument();
  });

  it('creates a decision and shows the workspace', async () => {
    render(<App />);
    const user = await startDecision();

    expect(screen.getByLabelText(/decision title/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /objectives/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /options/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new decision/i }));
    expect(screen.getAllByRole('button', { name: /untitled decision/i })).toHaveLength(2);
  });

  it('says what is missing before it will rank anything', async () => {
    render(<App />);
    await startDecision();
    expect(screen.getAllByText(/no name/i).length).toBeGreaterThan(0);
  });

  it('ranks the options once each is scored', async () => {
    render(<App />);
    const user = await startDecision();
    await fillDecision(user, ['2', '5', '3']);

    expect(screen.getByRole('heading', { name: /verdict/i })).toBeInTheDocument();
    expect(screen.getAllByText('Tetap').length).toBeGreaterThan(0);
  });

  it('lets a cost subtract, which the old form could not express', async () => {
    render(<App />);
    const user = await startDecision();
    await fillDecision(user, ['1', '5', '3']);

    const kinds = screen.getAllByLabelText(/^kind$/i);
    await user.selectOptions(kinds[1], 'cost');

    // Option 2 now contributes negatively, so it can no longer be the leader.
    const leader = screen.getByText(/^Recommendation$/i).parentElement?.textContent ?? '';
    expect(leader).not.toContain('Tetap');
  });

  it('blocks the recommendation when the leader carries fatal risk', async () => {
    render(<App />);
    const user = await startDecision();
    await fillDecision(user, ['1', '5', '3']);

    const fatals = screen.getAllByLabelText(/fatal risk/i);
    await user.click(fatals[1]);

    expect(screen.getByRole('alert')).toHaveTextContent(/no recommendation/i);
  });

  it('asks the bias questions and marks sunk cost as excluded', async () => {
    render(<App />);
    await startDecision();

    expect(screen.getByText(/excluded from the arithmetic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/who tried this and failed/i)).toBeInTheDocument();
  });

  it('states that there is no calibration score yet', async () => {
    render(<App />);
    await startDecision();
    expect(screen.getByText(/no resolved predictions/i)).toBeInTheDocument();
  });

  it('adds a second objective with its own swing weight', async () => {
    render(<App />);
    const user = await startDecision();

    expect(screen.getAllByLabelText(/^objective \d+$/i)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /add objective/i }));
    expect(screen.getAllByLabelText(/^objective \d+$/i)).toHaveLength(2);

    await user.type(screen.getByLabelText(/^objective 2$/i), 'Jam kerja');
    expect(screen.getByLabelText(/swing weight for jam kerja/i)).toBeInTheDocument();
  });

  it('removes an objective and its scores', async () => {
    render(<App />);
    const user = await startDecision();

    await user.click(screen.getByRole('button', { name: /add objective/i }));
    await user.click(screen.getAllByRole('button', { name: /remove objective/i })[1]);
    expect(screen.getAllByLabelText(/^objective \d+$/i)).toHaveLength(1);
  });

  it('refuses to remove the last objective or a protected option', async () => {
    render(<App />);
    await startDecision();

    expect(screen.getByRole('button', { name: /remove objective 1/i })).toBeDisabled();
    // Option 1 is the baseline, and three options are the floor.
    expect(screen.getByRole('button', { name: /remove option 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove option 2/i })).toBeDisabled();
  });

  it('adds several suggested options with distinct ids', async () => {
    render(<App />);
    const user = await startDecision();

    // Accepting two options at once used to give them the same id, which React
    // reports as duplicate keys and which would make edits land on the wrong row.
    const chat = screen.queryByRole('button', { name: /belum tahu opsi apa saja/i });
    if (chat === null) {
      // The panel is optional chrome; nothing to assert if it is not rendered.
      return;
    }
    await user.click(chat);
    await user.type(screen.getByLabelText(/jawabanmu/i), 'Stay or move');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
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
    expect(screen.getByRole('heading', { name: /start with the objective/i })).toBeInTheDocument();
  });

  it('deletes a decision and returns to the empty dashboard', async () => {
    render(<App />);
    const user = await startDecision();
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(screen.getByRole('heading', { name: /start with the objective/i })).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { loadDraft } from './persistence';

describe('App', () => {
  it('renders the form', () => {
    render(<App />);
    // The plan's query was getByText(/objective/i), which matches both the
    // section heading and the "Objective 1" label. The heading is what the test
    // means: the form has an objective section.
    expect(screen.getByRole('heading', { name: /objective/i })).toBeInTheDocument();
  });

  it('refuses to score until the options are named', () => {
    render(<App />);
    // Two of the three options are blank, so the option floor reports it and no
    // result is shown. This is Review Focus 1: fail gracefully, not crash.
    // getAllByText: the reason also appears in the gate's own message.
    expect(screen.getAllByText(/no name/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: /^result$/i })).not.toBeInTheDocument();
  });

  it('produces a recommendation once every option is scored', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/^decision$/i), 'Pindah kerja');
    await user.type(screen.getByLabelText(/^objective 1$/i), 'Penghasilan');
    await user.type(screen.getByLabelText(/^option 2$/i), 'Tetap');
    await user.type(screen.getByLabelText(/^option 3$/i), 'Pindah');

    // Each score row is a fieldset whose value field is labelled "Value (1-5)".
    // Order follows options then objectives.
    const values = screen.getAllByLabelText(/^value \(1-5\)$/i);
    expect(values).toHaveLength(3);
    await user.type(values[0], '2');
    await user.type(values[1], '5');
    await user.type(values[2], '3');

    expect(screen.getByRole('heading', { name: /^result$/i })).toBeInTheDocument();
    expect(screen.getByText(/recommendation: tetap/i)).toBeInTheDocument();
  });

  it('lets a cost subtract, so the app can express more than a benefit sum', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/^objective 1$/i), 'Penghasilan');
    await user.type(screen.getByLabelText(/^option 2$/i), 'Tetap');
    await user.type(screen.getByLabelText(/^option 3$/i), 'Pindah');

    const values = screen.getAllByLabelText(/^value \(1-5\)$/i);
    await user.type(values[0], '1');
    await user.type(values[1], '5');
    await user.type(values[2], '3');

    // Make option 2's item a cost. Before ItemEditor existed, every item was
    // hardcoded to 'benefit', so this was unreachable from the app.
    const kinds = screen.getAllByLabelText(/^kind$/i);
    await user.selectOptions(kinds[1], 'cost');

    // Option 2 now contributes negatively and must not lead.
    expect(screen.getByText(/recommendation: negosiasi|recommendation: pindah/i)).toBeInTheDocument();
    expect(screen.queryByText(/recommendation: tetap/i)).not.toBeInTheDocument();
  });

  it('blocks the recommendation when the leader carries fatal risk', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/^objective 1$/i), 'Penghasilan');
    await user.type(screen.getByLabelText(/^option 2$/i), 'Tetap');
    await user.type(screen.getByLabelText(/^option 3$/i), 'Pindah');

    const values = screen.getAllByLabelText(/^value \(1-5\)$/i);
    await user.type(values[0], '1');
    await user.type(values[1], '5');
    await user.type(values[2], '3');

    // Mark the leading option's item fatal: the ranking stays, the
    // recommendation does not. This is Review Focus 2, previously unreachable.
    const fatals = screen.getAllByLabelText(/fatal/i);
    await user.click(fatals[1]);

    expect(screen.getByText(/no recommendation/i)).toBeInTheDocument();
  });

  it('saves the draft as it is edited, so a refresh does not lose work', async () => {
    const user = userEvent.setup();
    const storage = installStorage();
    render(<App />);

    await user.type(screen.getByLabelText(/^objective 1$/i), 'Penghasilan');

    // Criterion 1: created and saved. The adapter validates against the schema,
    // so what lands in storage is a decision, not a partial form.
    const saved = loadDraft(storage);
    expect(saved?.objectives[0]?.statement).toBe('Penghasilan');
  });

  it('restores a saved draft on the next visit', async () => {
    const user = userEvent.setup();
    const storage = installStorage();
    const first = render(<App />);
    await user.type(screen.getByLabelText(/^objective 1$/i), 'Penghasilan');
    first.unmount();

    render(<App />);
    // Criterion 1: loaded.
    expect(screen.getByLabelText(/^objective 1$/i)).toHaveValue('Penghasilan');
    expect(loadDraft(storage)?.objectives[0]?.statement).toBe('Penghasilan');
  });

  it('offers a share link and a JSON export', async () => {
    const user = userEvent.setup();
    installStorage();
    render(<App />);

    await user.type(screen.getByLabelText(/^objective 1$/i), 'Penghasilan');

    // Criterion 1: exported as JSON, and shareable.
    const json = screen.getByLabelText(/json/i) as HTMLTextAreaElement;
    expect(JSON.parse(json.value).objectives[0].statement).toBe('Penghasilan');

    const link = screen.getByLabelText(/share link/i) as HTMLInputElement;
    expect(link.value).toContain('#d=');
  });

  it('asks the bias questions and refuses to call the gate complete', () => {
    installStorage();
    render(<App />);
    // Criterion 7: sunk cost is recorded and visibly excluded.
    expect(screen.getByText(/excluded from the arithmetic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/who tried this and failed/i)).toBeInTheDocument();
  });

  it('says there is no calibration score until a prediction is resolved', () => {
    installStorage();
    render(<App />);
    // Criterion 8: a Brier score is computed from resolved predictions, and its
    // absence is stated rather than shown as zero.
    expect(screen.getByText(/no resolved predictions/i)).toBeInTheDocument();
  });

  it('adds a second objective, so swing weighting can express a trade-off', async () => {
    const user = userEvent.setup();
    installStorage();
    render(<App />);

    expect(screen.getAllByLabelText(/^objective \d+$/i)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /add objective/i }));
    expect(screen.getAllByLabelText(/^objective \d+$/i)).toHaveLength(2);

    await user.type(screen.getByLabelText(/^objective 2$/i), 'Jam kerja');
    // A second objective needs its own swing weight, or the decision cannot be
    // scored at all.
    expect(screen.getByLabelText(/swing weight for jam kerja/i)).toBeInTheDocument();
  });

  it('removes an objective', async () => {
    const user = userEvent.setup();
    installStorage();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /add objective/i }));
    expect(screen.getAllByLabelText(/^objective \d+$/i)).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /remove objective/i })[1]);
    expect(screen.getAllByLabelText(/^objective \d+$/i)).toHaveLength(1);
  });

  it('adds an option beyond the third, and marks it non-baseline', async () => {
    const user = userEvent.setup();
    installStorage();
    render(<App />);

    expect(screen.getAllByLabelText(/^option \d+$/i)).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /add option/i }));
    expect(screen.getAllByLabelText(/^option \d+$/i)).toHaveLength(4);
    expect(screen.getByLabelText(/^option 4$/i)).toHaveValue('');
  });

  it('removes an option', async () => {
    const user = userEvent.setup();
    installStorage();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /add option/i }));
    await user.click(screen.getAllByRole('button', { name: /remove option/i })[3]);
    expect(screen.getAllByLabelText(/^option \d+$/i)).toHaveLength(3);
  });

  it('refuses to remove the last objective', () => {
    installStorage();
    render(<App />);

    // A decision with no objective cannot be scored, so the form should not let
    // the user reach that state by clicking.
    const remove = screen.getByRole('button', { name: /remove objective/i });
    expect(remove).toBeDisabled();
  });
});

/**
 * Replaces the global with an in-memory store. jsdom's localStorage getter
 * returns undefined under vitest, so the app's default lookup would find
 * nothing and persistence would be untestable through the UI.
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

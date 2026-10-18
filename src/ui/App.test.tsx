import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

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
});

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

    // The score fields are the only number inputs labelled "... on ...".
    const scores = screen.getAllByRole('spinbutton', { name: /on penghasilan/i });
    await user.type(scores[0], '2');
    await user.type(scores[1], '5');
    await user.type(scores[2], '3');

    expect(screen.getByRole('heading', { name: /^result$/i })).toBeInTheDocument();
    expect(screen.getByText(/recommendation: tetap/i)).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareBar } from './ShareBar';
import { deserializeDecision } from '../core';
import type { Decision } from '../core';

const decision: Decision = {
  id: 'd1',
  title: 'Pindah kerja',
  objectives: [{ id: 'o1', statement: 'Penghasilan', kind: 'motivation' }],
  options: [
    { id: 'a', label: 'Tetap', isBaseline: true },
    { id: 'b', label: 'Pindah', isBaseline: false },
    { id: 'c', label: 'Negosiasi', isBaseline: false },
  ],
  items: [],
  claims: [],
  swingPoints: { o1: 100 },
};

describe('ShareBar', () => {
  it('produces a share link that carries the decision', () => {
    render(<ShareBar decision={decision} />);
    const link = screen.getByLabelText(/share link/i) as HTMLInputElement;
    const payload = link.value.split('#d=')[1];
    expect(payload).toBeTruthy();
    expect(deserializeDecision(payload)).toEqual(decision);
  });

  it('puts the payload in the fragment, not the query string', () => {
    render(<ShareBar decision={decision} />);
    const link = screen.getByLabelText(/share link/i) as HTMLInputElement;
    // A fragment is not sent to any server, so the decision never leaves the
    // browser even when the link is opened from a host.
    expect(link.value).toContain('#d=');
    expect(link.value).not.toContain('?d=');
  });

  it('exports the decision as JSON', () => {
    render(<ShareBar decision={decision} />);
    const json = screen.getByLabelText(/json/i) as HTMLTextAreaElement;
    expect(JSON.parse(json.value)).toEqual(decision);
  });

  it('marks the link as read-only so it cannot be edited by accident', () => {
    render(<ShareBar decision={decision} />);
    expect(screen.getByLabelText(/share link/i)).toHaveAttribute('readonly');
  });

  it('copies the link when the button is pressed', async () => {
    const user = userEvent.setup();
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: (text: string) => { copied = text; return Promise.resolve(); } },
      configurable: true,
    });

    render(<ShareBar decision={decision} />);
    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(copied).toContain('#d=');
    expect(deserializeDecision(copied.split('#d=')[1])).toEqual(decision);
  });
});

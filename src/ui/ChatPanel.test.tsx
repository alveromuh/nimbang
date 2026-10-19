import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from './ChatPanel';

function setup(overrides: Partial<React.ComponentProps<typeof ChatPanel>> = {}) {
  const onAccept = vi.fn();
  const onAddObjective = vi.fn();
  const onClose = vi.fn();
  const onSend = vi.fn().mockResolvedValue({
    toolCalls: [
      {
        name: 'record_options',
        arguments: JSON.stringify({ options: ['Stay where I am', 'Move to media fashion'] }),
      },
    ],
    reasoning: '',
    content: '',
    truncated: false,
  });

  render(
    <ChatPanel
      objectives={['Penghasilan naik']}
      existingOptions={[]}
      onSend={onSend}
      onAccept={onAccept}
      onAddObjective={onAddObjective}
      onClose={onClose}
      {...overrides}
    />,
  );

  return { user: userEvent.setup(), onAccept, onAddObjective, onClose, onSend };
}

describe('ChatPanel', () => {
  it('names the objectives in the first line, without spending a request', () => {
    setup();
    // The app writes the opening message, so it is always correct and costs
    // nothing. See prompt.ts.
    expect(
      screen.getByText(/opsi apa saja yang sedang kamu pertimbangkan untuk mencapai penghasilan naik/i),
    ).toBeInTheDocument();
  });

  it('names several objectives', () => {
    setup({ objectives: ['Penghasilan naik', 'Jam kerja tidak bertambah'] });
    expect(
      screen.getByText(/penghasilan naik dan jam kerja tidak bertambah/i),
    ).toBeInTheDocument();
  });

  it('does not call the model on mount', () => {
    const { onSend } = setup();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends the reply and shows the next question', async () => {
    const { user } = setup({
      onSend: vi.fn().mockResolvedValue({
        toolCalls: [
          {
            name: 'ask_clarification',
            arguments: JSON.stringify({ question: 'Anything else you have considered?' }),
          },
        ],
        reasoning: '',
        content: '',
        truncated: false,
      }),
    });

    await user.type(screen.getByLabelText(/jawabanmu/i), 'Stay, or move to media fashion');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    expect(await screen.findByText(/anything else you have considered/i)).toBeInTheDocument();
  });

  it('shows a proposal and applies nothing until accepted', async () => {
    const { user, onAccept } = setup();

    await user.type(screen.getByLabelText(/jawabanmu/i), 'Stay or move');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    expect(await screen.findByText('Stay where I am')).toBeInTheDocument();
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('accepts the proposal, and only the ticked options', async () => {
    const { user, onAccept } = setup();

    await user.type(screen.getByLabelText(/jawabanmu/i), 'Stay or move');
    await user.click(screen.getByRole('button', { name: /kirim/i }));
    await screen.findByText('Stay where I am');

    await user.click(screen.getByRole('checkbox', { name: 'Stay where I am' }));
    await user.click(screen.getByRole('button', { name: /tambahkan yang dipilih/i }));

    expect(onAccept).toHaveBeenCalledWith(['Move to media fashion']);
  });

  it('does not duplicate an option the user already has', async () => {
    const { user } = setup({ existingOptions: ['Move to media fashion'] });

    await user.type(screen.getByLabelText(/jawabanmu/i), 'Stay or move');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    expect(await screen.findByText(/sudah ada di daftarmu/i)).toBeInTheDocument();
  });

  it('offers to re-frame an off-topic reply instead of rejecting it', async () => {
    const { user, onAddObjective } = setup({
      onSend: vi.fn().mockResolvedValue({
        toolCalls: [
          {
            name: 'flag_scope',
            arguments: JSON.stringify({
              kind: 'missing_objective',
              text: 'I want shorter hours',
              question: 'Is working fewer hours an objective too?',
            }),
          },
        ],
        reasoning: '',
        content: '',
        truncated: false,
      }),
    });

    await user.type(screen.getByLabelText(/jawabanmu/i), 'honestly I just want shorter hours');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    // Never "that's out of scope": an offer, and the user decides.
    expect(
      await screen.findByText(/is working fewer hours an objective too/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tambahkan sebagai tujuan/i })).toBeInTheDocument();
    expect(onAddObjective).not.toHaveBeenCalled();
  });

  it('adds the objective when the user accepts the re-frame', async () => {
    const { user, onAddObjective } = setup({
      onSend: vi.fn().mockResolvedValue({
        toolCalls: [
          {
            name: 'flag_scope',
            arguments: JSON.stringify({
              kind: 'missing_objective',
              text: 'shorter hours',
              question: 'Is that an objective too?',
            }),
          },
        ],
        reasoning: '',
        content: '',
        truncated: false,
      }),
    });

    await user.type(screen.getByLabelText(/jawabanmu/i), 'shorter hours please');
    await user.click(screen.getByRole('button', { name: /kirim/i }));
    await user.click(await screen.findByRole('button', { name: /tambahkan sebagai tujuan/i }));

    expect(onAddObjective).toHaveBeenCalledWith('shorter hours');
  });

  it('states a rate limit rather than failing silently', async () => {
    const { ChatError } = await import('../chat/client');
    const { user } = setup({
      onSend: vi.fn().mockRejectedValue(new ChatError('rate_limited', 'busy')),
    });

    await user.type(screen.getByLabelText(/jawabanmu/i), 'stay or move');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/rate limiting/i);
  });

  it('tells the user when the model cannot call tools', async () => {
    const { ChatError } = await import('../chat/client');
    const { user } = setup({
      onSend: vi.fn().mockRejectedValue(new ChatError('no_tools', 'no tools')),
    });

    await user.type(screen.getByLabelText(/jawabanmu/i), 'stay or move');
    await user.click(screen.getByRole('button', { name: /kirim/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/tool calling/i);
  });

  it('closes without changing anything', async () => {
    const { user, onClose, onAccept } = setup();
    await user.click(screen.getByRole('button', { name: /tutup/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onAccept).not.toHaveBeenCalled();
  });
});

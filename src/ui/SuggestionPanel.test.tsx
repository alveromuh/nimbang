import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuggestionPanel } from './SuggestionPanel';
import { SuggestionError } from '../suggestions/client';
import type { Suggestions } from '../suggestions/map';

const suggestions: Suggestions = {
  source: 'clef:free',
  options: [
    {
      archetype: 'negotiate',
      label: 'Negotiate where you are',
      detail: 'Ask for the change you want without leaving.',
      confidence: 0.58,
      alreadyPresent: false,
      source: 'model',
    },
  ],
  biases: [
    {
      key: 'survivorship',
      question: 'Who tried this and failed?',
      starter: 'Think of people who took this path and it did not work out.',
      probability: 0.73,
      source: 'model',
    },
  ],
};

function setup(overrides: Partial<React.ComponentProps<typeof SuggestionPanel>> = {}) {
  const onAddOption = vi.fn();
  const onUseBias = vi.fn();
  const onRequest = vi.fn().mockResolvedValue(suggestions);

  render(
    <SuggestionPanel
      onRequest={onRequest}
      onAddOption={onAddOption}
      onUseBias={onUseBias}
      {...overrides}
    />,
  );

  return { user: userEvent.setup(), onAddOption, onUseBias, onRequest };
}

describe('SuggestionPanel', () => {
  it('does nothing until the user asks', () => {
    const { onRequest } = setup();
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /suggest/i })).toBeInTheDocument();
  });

  it('asks the model only when the button is pressed', async () => {
    const { user, onRequest } = setup();
    await user.click(screen.getByRole('button', { name: /suggest/i }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('shows a suggested option as a proposal, not as an applied change', async () => {
    const { user, onAddOption } = setup();
    await user.click(screen.getByRole('button', { name: /suggest/i }));

    expect(await screen.findByText('Negotiate where you are')).toBeInTheDocument();
    expect(onAddOption).not.toHaveBeenCalled();
  });

  it('adds the option when the user accepts it', async () => {
    const { user, onAddOption } = setup();
    await user.click(screen.getByRole('button', { name: /suggest/i }));
    await user.click(await screen.findByRole('button', { name: /add.*negotiate/i }));

    expect(onAddOption).toHaveBeenCalledWith('Negotiate where you are');
  });

  it('says who produced the suggestion', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /suggest/i }));
    expect(await screen.findByText(/clef:free/)).toBeInTheDocument();
  });

  it('offers a bias prompt but never a filled answer', async () => {
    const { user, onUseBias } = setup();
    await user.click(screen.getByRole('button', { name: /suggest/i }));

    expect(await screen.findByText(/who tried this and failed/i)).toBeInTheDocument();
    expect(onUseBias).not.toHaveBeenCalled();
  });

  it('inserts the starter text when the user asks for it', async () => {
    const { user, onUseBias } = setup();
    await user.click(screen.getByRole('button', { name: /suggest/i }));
    await user.click(await screen.findByRole('button', { name: /use this prompt/i }));

    expect(onUseBias).toHaveBeenCalledWith(
      'survivorship',
      expect.stringContaining('did not work out'),
    );
  });

  it('explains an unconfigured server instead of failing silently', async () => {
    const { user } = setup({
      onRequest: vi
        .fn()
        .mockRejectedValue(new SuggestionError('not_configured', 'not configured')),
    });

    await user.click(screen.getByRole('button', { name: /suggest/i }));

    // The contract forbids silent fallback: the user is told why.
    expect(await screen.findByRole('status')).toHaveTextContent(/not configured/i);
  });

  it('says it is busy rather than showing an empty result', async () => {
    const { user } = setup({
      onRequest: vi.fn().mockRejectedValue(new SuggestionError('unavailable', 'busy')),
    });

    await user.click(screen.getByRole('button', { name: /suggest/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/try again/i);
  });

  it('marks a suggestion the user already has, and disables it', async () => {
    const { user } = setup({
      onRequest: vi.fn().mockResolvedValue({
        ...suggestions,
        options: [{ ...suggestions.options[0], alreadyPresent: true }],
      }),
    });

    await user.click(screen.getByRole('button', { name: /suggest/i }));
    const button = await screen.findByRole('button', { name: /already in your list/i });
    expect(button).toBeDisabled();
  });

  it('shows a note when there is nothing worth suggesting', async () => {
    const { user } = setup({
      onRequest: vi.fn().mockResolvedValue({
        source: 'clef:free',
        options: [],
        biases: [],
        note: 'Nothing to suggest from what you have written so far.',
      }),
    });

    await user.click(screen.getByRole('button', { name: /suggest/i }));
    expect(await screen.findByText(/nothing to suggest/i)).toBeInTheDocument();
  });

  it('can be dismissed without applying anything', async () => {
    const { user, onAddOption } = setup();
    await user.click(screen.getByRole('button', { name: /suggest/i }));
    await screen.findByText('Negotiate where you are');

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Negotiate where you are')).not.toBeInTheDocument();
    expect(onAddOption).not.toHaveBeenCalled();
  });
});

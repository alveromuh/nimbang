import { useState } from 'react';
import { SuggestionError } from '../suggestions/client';
import type { BiasKey } from '../suggestions/catalog';
import type { Suggestions } from '../suggestions/map';

interface SuggestionPanelProps {
  onRequest: () => Promise<Suggestions>;
  onAddOption: (label: string) => void;
  onUseBias: (key: BiasKey, starter: string) => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; suggestions: Suggestions }
  | { kind: 'failed'; message: string };

/**
 * Suggestions, on request only.
 *
 * Three rules shape this component, all of them from the contract:
 *
 * 1. **Nothing is applied automatically.** Every suggestion is a proposal with an
 *    explicit button. The model fills a field; it never computes a result.
 * 2. **Failures are stated.** A timeout, a rate limit, and a missing key are
 *    different messages, because "no suggestions" and "the service is down" are
 *    different facts and only one of them is the user's to fix.
 * 3. **The source is named.** The model id is on screen, so a suggestion is never
 *    indistinguishable from something the user wrote.
 *
 * The request is manual rather than triggered on every keystroke: firing on
 * each objective edit would spend tokens and attention before the user has
 * written anything worth classifying, and would make the panel feel like it is
 * interrupting.
 */
export function SuggestionPanel({ onRequest, onAddOption, onUseBias }: SuggestionPanelProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function request() {
    setState({ kind: 'loading' });
    try {
      const suggestions = await onRequest();
      setState({ kind: 'ready', suggestions });
    } catch (error) {
      setState({ kind: 'failed', message: messageFor(error) });
    }
  }

  if (state.kind === 'idle' || state.kind === 'failed') {
    return (
      <div className="suggest">
        <div className="suggest__trigger">
          <button type="button" className="btn-quiet" onClick={request}>
            Suggest options and checks
          </button>
          <span className="suggest__hint">
            Asks a model for ideas. Nothing is added until you accept it.
          </span>
        </div>
        {state.kind === 'failed' && (
          <p className="note note--warn" role="status">
            {state.message}
          </p>
        )}
      </div>
    );
  }

  if (state.kind === 'loading') {
    return (
      <div className="suggest">
        <p className="note" role="status">
          Asking for suggestions…
        </p>
      </div>
    );
  }

  const { suggestions } = state;
  const isEmpty = suggestions.options.length === 0 && suggestions.biases.length === 0;

  return (
    <div className="suggest suggest--open">
      <div className="suggest__head">
        <span className="badge badge--accent">Suggested by {suggestions.source}</span>
        <button
          type="button"
          className="btn-quiet btn-icon"
          onClick={() => setState({ kind: 'idle' })}
        >
          Dismiss
        </button>
      </div>

      {isEmpty && <p className="note">{suggestions.note}</p>}

      {suggestions.options.length > 0 && (
        <>
          <p className="suggest__label">An option you may have missed</p>
          {suggestions.options.map((option) => (
            <div className="suggest__item" key={option.archetype}>
              <div>
                <strong>{option.label}</strong>
                <p className="note">{option.detail}</p>
              </div>
              <button
                type="button"
                aria-label={
                  option.alreadyPresent
                    ? `${option.label} — already in your list`
                    : `Add ${option.label}`
                }
                disabled={option.alreadyPresent}
                onClick={() => onAddOption(option.label)}
              >
                {option.alreadyPresent ? 'Already in your list' : 'Add'}
              </button>
            </div>
          ))}
        </>
      )}

      {suggestions.biases.length > 0 && (
        <>
          <p className="suggest__label">Checks worth answering here</p>
          {suggestions.biases.map((bias) => (
            <div className="suggest__item" key={bias.key}>
              <div>
                <strong>{bias.question}</strong>
                <p className="note">{bias.starter}</p>
              </div>
              <button
                type="button"
                onClick={() => onUseBias(bias.key, bias.starter)}
                aria-label={`Use this prompt for ${bias.question}`}
              >
                Use this prompt
              </button>
            </div>
          ))}
        </>
      )}

      <p className="note suggest__footnote">
        A suggestion is a starting point, not an answer. Edit or remove anything you add.
      </p>
    </div>
  );
}

function messageFor(error: unknown): string {
  if (error instanceof SuggestionError) {
    switch (error.kind) {
      case 'not_configured':
        return 'Suggestions are not configured on this server. Everything else still works without them.';
      case 'empty_state':
        return 'Write an objective first, so there is something to suggest from.';
      case 'malformed':
        return 'The suggestion service returned something unexpected. Try again.';
      case 'unavailable':
        return 'The suggestion service is busy. Try again in a moment.';
    }
  }
  return 'Could not reach the suggestion service. Try again.';
}

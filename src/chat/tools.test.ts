import { describe, it, expect } from 'vitest';
import { parseTurn, toolsFor } from './tools';

describe('chat tools', () => {
  it('defines the three option-scope tools', () => {
    const names = toolsFor('options').map((tool) => tool.function.name);
    expect(names).toEqual(['ask_clarification', 'record_options', 'flag_scope']);
  });

  it('defines the three bias-scope tools', () => {
    const names = toolsFor('bias').map((tool) => tool.function.name);
    expect(names).toEqual(['ask_question', 'record_answers', 'flag_scope']);
  });

  it('reads a clarifying question', () => {
    const result = parseTurn('options', {
      name: 'ask_clarification',
      arguments: JSON.stringify({ question: 'What else have you considered?' }),
    });

    expect(result).toEqual({ kind: 'ask', question: 'What else have you considered?' });
  });

  it('reads a recorded option list', () => {
    const result = parseTurn('options', {
      name: 'record_options',
      arguments: JSON.stringify({ options: ['Stay', 'Move to media fashion'] }),
    });

    expect(result).toEqual({ kind: 'record', items: ['Stay', 'Move to media fashion'] });
  });

  it('reads a scope flag', () => {
    const result = parseTurn('options', {
      name: 'flag_scope',
      arguments: JSON.stringify({
        kind: 'missing_objective',
        text: 'Shorter hours',
        question: 'Is working fewer hours an objective too?',
      }),
    });

    expect(result).toMatchObject({ kind: 'flag', flagKind: 'missing_objective' });
  });

  it('rejects a tool that belongs to the other scope', () => {
    // Bias tools must not leak into the options panel: the scopes exist so the
    // model cannot wander.
    const result = parseTurn('options', {
      name: 'record_answers',
      arguments: JSON.stringify({ answers: [] }),
    });

    expect(result).toMatchObject({ kind: 'error' });
  });

  it('rejects arguments that are not JSON', () => {
    const result = parseTurn('options', { name: 'record_options', arguments: 'not json' });
    expect(result).toMatchObject({ kind: 'error' });
  });

  it('rejects a missing required field', () => {
    const result = parseTurn('options', { name: 'record_options', arguments: '{}' });
    expect(result).toMatchObject({ kind: 'error' });
  });

  it('rejects an empty option list rather than recording nothing', () => {
    const result = parseTurn('options', {
      name: 'record_options',
      arguments: JSON.stringify({ options: ['   '] }),
    });
    expect(result).toMatchObject({ kind: 'error' });
  });

  it('rejects an unknown scope-flag kind', () => {
    const result = parseTurn('options', {
      name: 'flag_scope',
      arguments: JSON.stringify({ kind: 'whatever', text: 'x', question: 'y' }),
    });
    expect(result).toMatchObject({ kind: 'error' });
  });

  it('rejects prose instead of a tool call', () => {
    // The whole point of forcing a tool is that there is no prose to parse.
    const result = parseTurn('options', null);
    expect(result).toMatchObject({ kind: 'error' });
    expect(result).toHaveProperty('message');
  });

  it('rejects more than one tool call', () => {
    const result = parseTurn('options', [
      { name: 'ask_clarification', arguments: JSON.stringify({ question: 'a' }) },
      { name: 'record_options', arguments: JSON.stringify({ options: ['b'] }) },
    ]);
    expect(result).toMatchObject({ kind: 'error' });
  });

  it('rejects a bias answer that is not a string', () => {
    const result = parseTurn('bias', {
      name: 'record_answers',
      arguments: JSON.stringify({ answers: [{ field: 'survivorship', text: 42 }] }),
    });
    expect(result).toMatchObject({ kind: 'error' });
  });

  it('reads bias answers, keeping the user wording verbatim', () => {
    const result = parseTurn('bias', {
      name: 'record_answers',
      arguments: JSON.stringify({
        answers: [{ field: 'survivorship', text: 'Dua teman berhenti setelah 3 bulan' }],
      }),
    });

    expect(result).toEqual({
      kind: 'record',
      items: ['Dua teman berhenti setelah 3 bulan'],
    });
  });
});

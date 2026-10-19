import { describe, it, expect } from 'vitest';
import { initialState, reduce, MAX_TURNS } from './state';

describe('chat state', () => {
  it('starts empty and ready to ask', () => {
    const state = initialState('options');
    expect(state.turns).toEqual([]);
    expect(state.extracted).toEqual([]);
    expect(state.flags).toEqual([]);
    expect(state.phase).toBe('asking');
  });

  it('records a question as a turn', () => {
    const next = reduce(initialState('options'), {
      type: 'ask',
      question: 'What are you currently considering?',
    });
    expect(next.turns).toHaveLength(1);
    expect(next.turns[0].role).toBe('model');
    expect(next.phase).toBe('asking');
  });

  it('records the user reply and counts the turn', () => {
    let state = reduce(initialState('options'), {
      type: 'ask',
      question: 'What are you currently considering?',
    });
    state = reduce(state, { type: 'reply', text: 'Stay, or move to media fashion' });

    expect(state.turns).toHaveLength(2);
    expect(state.turns[1].role).toBe('user');
    // A turn is one exchange, not one message: the cap counts replies.
    expect(state.replies).toBe(1);
  });

  it('accumulates extracted options across turns', () => {
    let state = initialState('options');
    state = reduce(state, { type: 'extract', items: ['Stay'] });
    state = reduce(state, { type: 'extract', items: ['Move to media fashion'] });

    expect(state.extracted).toEqual(['Stay', 'Move to media fashion']);
  });

  it('does not duplicate an extracted option', () => {
    let state = initialState('options');
    state = reduce(state, { type: 'extract', items: ['Stay'] });
    state = reduce(state, { type: 'extract', items: ['Stay', 'Move'] });

    expect(state.extracted).toEqual(['Stay', 'Move']);
  });

  it('ignores an empty extracted item', () => {
    const state = reduce(initialState('options'), { type: 'extract', items: ['   ', ''] });
    expect(state.extracted).toEqual([]);
  });

  it('records a scope flag instead of dropping the message', () => {
    const state = reduce(initialState('options'), {
      type: 'flag',
      kind: 'missing_objective',
      text: 'I want shorter hours',
    });

    expect(state.flags).toHaveLength(1);
    expect(state.flags[0].kind).toBe('missing_objective');
    // The flag is an offer, not an action: nothing is written to the decision.
    expect(state.extracted).toEqual([]);
  });

  it('finishes when the model records options', () => {
    const state = reduce(initialState('options'), {
      type: 'finish',
      items: ['Stay', 'Move'],
    });

    expect(state.phase).toBe('done');
    expect(state.extracted).toEqual(['Stay', 'Move']);
  });

  it('finishes when the user stops early', () => {
    const state = reduce(initialState('options'), { type: 'stop' });
    expect(state.phase).toBe('done');
  });

  it('stops asking at the turn cap, without losing what was extracted', () => {
    let state = initialState('options');
    for (let turn = 0; turn < MAX_TURNS; turn += 1) {
      state = reduce(state, { type: 'reply', text: `reply ${turn}` });
    }

    // A conversation that never ends is a conversation that never decides.
    expect(state.phase).toBe('done');
    expect(state.replies).toBe(MAX_TURNS);
  });

  it('ignores a reply after it is done', () => {
    let state = reduce(initialState('options'), { type: 'stop' });
    state = reduce(state, { type: 'reply', text: 'one more thing' });

    expect(state.phase).toBe('done');
    expect(state.replies).toBe(0);
  });

  it('keeps the two scopes separate', () => {
    expect(initialState('bias').scope).toBe('bias');
    expect(initialState('options').scope).toBe('options');
  });

  it('records a failure without ending the conversation', () => {
    const state = reduce(initialState('options'), {
      type: 'fail',
      message: 'The service is busy.',
    });

    expect(state.error).toBe('The service is busy.');
    // A failed turn is not a finished conversation: the user can try again.
    expect(state.phase).toBe('asking');
  });
});

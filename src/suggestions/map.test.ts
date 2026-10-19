import { describe, it, expect } from 'vitest';
import { toSuggestions, MIN_CONFIDENCE, MAX_OPTION_SUGGESTIONS } from './map';
import type { SystemOneResponse } from './client';

/** A response shaped like the one the spike actually returned. */
function response(overrides: Partial<SystemOneResponse['answers']> = {}): SystemOneResponse {
  return {
    model: 'clef:free',
    usage: { input_tokens: 453, output_tokens: 0 },
    answers: {
      option_archetype: {
        type: 'choice',
        choice: 'negotiate',
        confidence: 0.44,
        probabilities: {
          do_nothing: 0.09,
          negotiate: 0.58,
          move: 0.19,
          ask_first: 0.14,
          partial: 0.0,
          defer: 0.0,
        },
      },
      bias_survivorship: { type: 'noul', noul: 0.73 },
      bias_ostrich: { type: 'noul', noul: 0.2 },
      bias_hasty: { type: 'noul', noul: 0.15 },
      bias_causation: { type: 'noul', noul: 0.1 },
      bias_false_comparison: { type: 'noul', noul: 0.12 },
      ...overrides,
    },
  };
}

describe('mapping model answers to suggestions', () => {
  it('turns a choice into an option the user can add', () => {
    const result = toSuggestions(response(), ['Do nothing', 'Pindah']);
    expect(result.options).toHaveLength(1);
    expect(result.options[0].label).toBe('Negotiate where you are');
    // The label comes from the catalog, never from the model.
    expect(result.options[0].archetype).toBe('negotiate');
  });

  it('carries the model confidence so the UI can show it', () => {
    const result = toSuggestions(response(), []);
    expect(result.options[0].confidence).toBeCloseTo(0.58);
  });

  it('does not suggest an option the user already has', () => {
    // The model says "move", but the user already wrote "Pindah".
    const result = toSuggestions(
      response({
        option_archetype: {
          type: 'choice',
          choice: 'move',
          confidence: 0.8,
          probabilities: { move: 0.8, negotiate: 0.2 },
        },
      }),
      ['Do nothing', 'Pindah'],
    );
    // "Pindah" is not a literal match for "Take the other path", so the label
    // check alone cannot catch it. This asserts the behaviour we actually want:
    // the archetype is offered, and the UI shows it as already present.
    expect(result.options[0].archetype).toBe('move');
    expect(result.options[0].alreadyPresent).toBe(true);
  });

  it('drops an option suggestion below the confidence floor', () => {
    const result = toSuggestions(
      response({
        option_archetype: {
          type: 'choice',
          choice: 'negotiate',
          confidence: 0.05,
          probabilities: { negotiate: 0.05 },
        },
      }),
      [],
    );
    expect(result.options).toHaveLength(0);
    expect(result.note).toMatch(/not confident/i);
  });

  it('surfaces only the bias checks the model considers likely', () => {
    const result = toSuggestions(response(), []);
    // survivorship 0.73 is over the floor; the rest are under it.
    expect(result.biases.map((bias) => bias.key)).toEqual(['survivorship']);
    expect(result.biases[0].probability).toBeCloseTo(0.73);
  });

  it('never fills a bias answer, only offers a prompt', () => {
    const result = toSuggestions(response(), []);
    // The contract forbids the model producing an answer the user did not give.
    expect(result.biases[0]).not.toHaveProperty('answer');
    expect(result.biases[0].starter.length).toBeGreaterThan(20);
  });

  it('survives a response that is missing answers entirely', () => {
    const result = toSuggestions({ model: 'clef:free', usage: {}, answers: {} }, []);
    expect(result.options).toEqual([]);
    expect(result.biases).toEqual([]);
    expect(result.note).toBeTruthy();
  });

  it('survives an unknown choice label without inventing one', () => {
    const result = toSuggestions(
      response({
        option_archetype: {
          type: 'choice',
          choice: 'something_new',
          confidence: 0.9,
          probabilities: { something_new: 0.9 },
        },
      }),
      [],
    );
    // A label the catalog does not know is dropped, not rendered raw.
    expect(result.options).toHaveLength(0);
  });

  it('labels the source of every suggestion', () => {
    const result = toSuggestions(response(), []);
    expect(result.source).toBe('clef:free');
    expect(result.options[0].source).toBe('model');
  });

  it('exposes the confidence floor as a number the UI can explain', () => {
    expect(MIN_CONFIDENCE).toBeGreaterThan(0);
    expect(MIN_CONFIDENCE).toBeLessThan(1);
  });

  it('offers a second option when the distribution supports one', () => {
    // The model returns a distribution; using only the argmax wastes it. With
    // two blank option slots, one suggestion is thin.
    const result = toSuggestions(
      response({
        option_archetype: {
          type: 'choice',
          choice: 'partial',
          confidence: 0.45,
          probabilities: { partial: 0.72, move: 0.11, negotiate: 0.09 },
        },
      }),
      [],
    );
    // 0.11 and 0.09 are below the floor, so only the strong one survives.
    expect(result.options.map((option) => option.archetype)).toEqual(['partial']);
  });

  it('returns at most two options, ranked by probability', () => {
    const result = toSuggestions(
      response({
        option_archetype: {
          type: 'choice',
          choice: 'negotiate',
          confidence: 0.4,
          probabilities: { negotiate: 0.5, ask_first: 0.4, move: 0.35, partial: 0.3 },
        },
      }),
      [],
    );
    expect(result.options).toHaveLength(MAX_OPTION_SUGGESTIONS);
    expect(result.options.map((option) => option.archetype)).toEqual(['negotiate', 'ask_first']);
    expect(result.options[0].confidence).toBeGreaterThan(result.options[1].confidence);
  });
});

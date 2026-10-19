import { BIAS_PROMPTS, OPTION_ARCHETYPES, type BiasKey, type OptionArchetype } from './catalog';
import { BIAS_QUESTION_IDS, OPTIONS_QUESTION_ID } from './questions';
import type { SystemOneResponse } from './client';

/**
 * Below this, a suggestion is not worth showing. The spike produced confidences
 * as low as 0.05 on the wrong archetype, and a suggestion the model does not
 * believe is worse than no suggestion: it costs the user a decision to reject.
 */
export const MIN_CONFIDENCE = 0.35;

/** Below this, a bias check is not surfaced. Same reasoning, different scale. */
export const MIN_BIAS_PROBABILITY = 0.5;

/**
 * How many option archetypes to offer. Two: the user usually has two or three
 * blank slots, and more than two turns a suggestion into a menu to read.
 */
export const MAX_OPTION_SUGGESTIONS = 2;

export interface OptionSuggestion {
  archetype: OptionArchetype;
  label: string;
  detail: string;
  confidence: number;
  /** True when the user's list already covers this, so the UI can say so. */
  alreadyPresent: boolean;
  /** Always 'model'. The field exists so a future human-suggested entry can differ. */
  source: 'model';
}

export interface BiasSuggestion {
  key: BiasKey;
  question: string;
  starter: string;
  probability: number;
  source: 'model';
}

export interface Suggestions {
  options: OptionSuggestion[];
  biases: BiasSuggestion[];
  /** Which model produced this, so the label is honest. */
  source: string;
  /** A sentence for the user when there is nothing to show, or nothing at all. */
  note?: string;
}

/**
 * Turns a System One response into suggestions.
 *
 * The model supplies only a label and a probability. Every word the user reads
 * comes from the catalog, which is why an unknown label is dropped rather than
 * rendered: there is no code path in which model-authored text reaches the UI.
 *
 * Nothing here writes to the decision. Suggestions are proposals; the caller
 * applies one only when the user clicks it.
 */
export function toSuggestions(response: SystemOneResponse, existingOptions: string[]): Suggestions {
  const options: OptionSuggestion[] = [];
  const biases: BiasSuggestion[] = [];

  const choice = response.answers[OPTIONS_QUESTION_ID];

  if (choice !== undefined && choice.type === 'choice') {
    // The model returns a distribution, not a single answer, so use it as one.
    // Taking only the argmax throws away a second plausible idea the user would
    // have found useful, and with two blank option slots one suggestion is thin.
    const ranked = Object.entries(choice.probabilities)
      .filter(([key, probability]) => key in OPTION_ARCHETYPES && probability >= MIN_CONFIDENCE)
      .sort((left, right) => right[1] - left[1])
      .slice(0, MAX_OPTION_SUGGESTIONS);

    for (const [key, probability] of ranked) {
      const archetype = key as OptionArchetype;
      const entry = OPTION_ARCHETYPES[archetype];
      options.push({
        archetype,
        label: entry.label,
        detail: entry.detail,
        confidence: probability,
        alreadyPresent: isAlreadyPresent(archetype, existingOptions),
        source: 'model',
      });
    }
  }

  for (const [key, questionId] of Object.entries(BIAS_QUESTION_IDS) as [BiasKey, string][]) {
    const answer = response.answers[questionId];
    if (answer === undefined || answer.type !== 'noul') {
      continue;
    }
    if (answer.noul < MIN_BIAS_PROBABILITY) {
      continue;
    }

    const prompt = BIAS_PROMPTS[key];
    biases.push({
      key,
      question: prompt.question,
      starter: prompt.starter,
      probability: answer.noul,
      source: 'model',
    });
  }

  biases.sort((left, right) => right.probability - left.probability);

  let note: string | undefined;
  if (options.length === 0 && biases.length === 0) {
    note =
      'Nothing to suggest from what you have written so far. Add an objective or a couple of options and try again.';
  } else if (options.length === 0) {
    note = 'The model was not confident about an option worth adding.';
  }

  return { options, biases, source: response.model, note };
}

/**
 * Whether the user's own list already covers an archetype.
 *
 * Deliberately crude: a keyword match on the archetype's intent, not on the
 * label. "Pindah" does not contain "Take the other path", but it is the move
 * option, and telling the user to add a move option they already have would make
 * the feature look careless.
 */
function isAlreadyPresent(archetype: OptionArchetype, existingOptions: string[]): boolean {
  const keywords: Record<OptionArchetype, string[]> = {
    do_nothing: ['nothing', 'tetap', 'stay', 'do nothing', 'status quo', 'diam'],
    negotiate: ['negosiasi', 'negotiate', 'ask for', 'minta', 'raise', 'renegosiasi'],
    move: ['pindah', 'move', 'leave', 'resign', 'keluar', 'ambil tawaran'],
    ask_first: ['cari tahu', 'find out', 'ask first', 'tanya', 'cek dulu', 'research'],
    partial: ['freelance', 'part', 'sebagian', 'trial', 'coba dulu', 'side'],
    defer: ['tunda', 'defer', 'wait', 'tunggu', 'nanti'],
  };

  const haystack = existingOptions.join(' ').toLowerCase();
  return keywords[archetype].some((keyword) => haystack.includes(keyword));
}

/**
 * The versioned question set sent to System One.
 *
 * The contract is explicit that question wording is an artefact, not a string
 * literal inline in a fetch call: rephrasing one question was measured to move
 * accuracy by 50 percentage points. So this file is the artefact, it carries a
 * version, and changing it means re-running the eval before trusting the output.
 *
 * Wording follows the contract's rule: inference-framed, not literal. "Which
 * option has the person *not* written down" finds the missing option even when
 * they never say what they are choosing between; "does the text mention an
 * option" would not.
 */
export const QUESTION_SET_VERSION = 'suggest-v1';

/** One question per option archetype, so the answer is a probability per archetype. */
export const OPTIONS_QUESTION_ID = 'option_archetype';

/**
 * Bias questions are asked as `noul` (P(true)) rather than `choice`: the useful
 * output is "how likely is this bias to matter here", which is a probability, and
 * a probability lets the app decide what to surface instead of hard-coding it.
 */
export const BIAS_QUESTION_IDS = {
  survivorship: 'bias_survivorship',
  ostrich: 'bias_ostrich',
  hastyGeneralisation: 'bias_hasty',
  causation: 'bias_causation',
  falseComparison: 'bias_false_comparison',
} as const;

export const QUESTIONS = {
  [OPTIONS_QUESTION_ID]: {
    type: 'choice',
    instructions:
      'The person is choosing between courses of action. Which of these have they NOT written down but is genuinely available to them? Pick the single most useful one to add to their list.',
    criteria: {
      do_nothing: 'Continue exactly as now, and see whether the situation resolves itself',
      negotiate: 'Ask for a change where they already are, without leaving',
      move: 'Leave for the alternative they are considering',
      ask_first: 'Delay the decision until one specific unknown is resolved',
      partial: 'Take a smaller version: a trial, a freelance start, a side project',
      defer: 'Decide now to decide later, when a named event happens',
    },
  },
  [BIAS_QUESTION_IDS.survivorship]: {
    type: 'noul',
    instructions:
      'Would asking "who tried this and failed?" change this person\'s estimate? True when what they are relying on is the visible success stories of people who tried it.',
    criteria: {
      true: 'The evidence available is likely survivor-biased: only the successes are visible',
      false: 'No obvious survivor bias in what they are relying on',
    },
  },
  [BIAS_QUESTION_IDS.ostrich]: {
    type: 'noul',
    instructions:
      'Is there a specific piece of evidence this person seems to be avoiding because it might contradict the option they prefer?',
    criteria: {
      true: 'An uncomfortable check is identifiable from what they wrote',
      false: 'Nothing suggests avoidance',
    },
  },
  [BIAS_QUESTION_IDS.hastyGeneralisation]: {
    type: 'noul',
    instructions:
      'Does this decision rest on a small number of cases, such that one more example could change it?',
    criteria: {
      true: 'It rests on a handful of examples at most',
      false: 'It rests on a broad pattern or on data, not on a few cases',
    },
  },
  [BIAS_QUESTION_IDS.causation]: {
    type: 'noul',
    instructions:
      'Is this person treating something as a cause when it may only have happened at the same time?',
    criteria: {
      true: 'A causal claim rests on timing alone',
      false: 'No causal claim is being inferred from timing',
    },
  },
  [BIAS_QUESTION_IDS.falseComparison]: {
    type: 'noul',
    instructions:
      'Is this person comparing their situation to a case that is meaningfully different from theirs?',
    criteria: {
      true: 'The comparison case differs in a way that matters',
      false: 'The comparison is like for like',
    },
  },
} as const;

/**
 * The state sent with the questions. Only what the model needs to classify:
 * the objective and the option labels the user already has. No identifiers, no
 * timestamps, nothing that is not part of the decision itself.
 */
export function buildState(input: {
  title: string;
  objectives: string[];
  options: string[];
}): string {
  const objectives = input.objectives.filter((entry) => entry.trim() !== '');
  const options = input.options.filter((entry) => entry.trim() !== '');

  return [
    input.title.trim() === '' ? null : `Decision: ${input.title.trim()}`,
    objectives.length > 0 ? `Objectives: ${objectives.join('; ')}` : null,
    options.length > 0 ? `Options already listed: ${options.join('; ')}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

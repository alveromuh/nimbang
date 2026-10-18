/**
 * The suggestion catalog.
 *
 * Every user-facing string a suggestion can produce lives here. The model never
 * writes text: `choice` questions return a class label and a probability, so the
 * model's only job is to pick a label. This module owns what that label means.
 *
 * Pure data and pure functions — no fetch, no React, no storage. That keeps the
 * mapping testable without a network, which matters because a suggestion feature
 * that is only testable online is a feature that is not tested.
 */

/** Option archetypes the model can classify into. Keys are the `choice` labels. */
export const OPTION_ARCHETYPES = {
  do_nothing: {
    label: 'Do nothing',
    detail: 'Continue exactly as now, and see whether the situation resolves itself.',
    baseline: true,
  },
  negotiate: {
    label: 'Negotiate where you are',
    detail: 'Ask for the change you want without leaving: more pay, fewer hours, a different scope.',
    baseline: false,
  },
  move: {
    label: 'Take the other path',
    detail: 'Leave for the alternative you are considering.',
    baseline: false,
  },
  ask_first: {
    label: 'Find out more before deciding',
    detail: 'Delay the decision until one specific unknown is resolved.',
    baseline: false,
  },
  partial: {
    label: 'Do part of it',
    detail: 'Take a smaller version: a trial, a freelance start, a side project.',
    baseline: false,
  },
  defer: {
    label: 'Defer to a trigger',
    detail: 'Decide now to decide later, when a named event happens.',
    baseline: false,
  },
} as const;

export type OptionArchetype = keyof typeof OPTION_ARCHETYPES;

/**
 * The bias questions, with a starter prompt for each.
 *
 * The model cannot answer these for the user — they are about the user's own
 * evidence. What it can do is say which ones are likely to matter here, so the
 * user is not staring at six empty boxes. The `starter` is a prompt, never an
 * answer: filling it in is the user's work, and pretending otherwise would be
 * the exact "model produces a number" failure the contract forbids.
 */
export const BIAS_PROMPTS = {
  survivorship: {
    question: 'Who tried this and failed?',
    starter:
      'Think of people who took this path and it did not work out. What happened to them, and why have you not heard from them?',
  },
  ostrich: {
    question: 'What evidence are you avoiding?',
    starter:
      'Name the one check you would rather not make, and what you are afraid it would show.',
  },
  hastyGeneralisation: {
    question: 'How many cases does this rest on?',
    starter: 'Put a number on it: how many people, projects, or examples is this based on?',
  },
  causation: {
    question: 'Is this a cause, or a coincidence in time?',
    starter: 'What would have to be true for this to be a cause rather than something that happened alongside?',
  },
  falseComparison: {
    question: 'What differs between your case and the comparison case?',
    starter: 'The case you are comparing against is probably cleaner than your reality. What is different?',
  },
} as const;

export type BiasKey = keyof typeof BIAS_PROMPTS;

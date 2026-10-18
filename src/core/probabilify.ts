export interface ProbabilifyResult {
  ok: boolean;
  /** Ids of items whose probability has no reference class. Empty when ok. */
  problems: { itemId: string; reason: string }[];
  reason?: string;
}

/**
 * The minimum shape this stage needs. It deliberately does not take a full
 * `Item`: the rule is about the probability, and a caller checking an item
 * before its other fields are filled should not have to invent them.
 */
export interface ProbabilityInput {
  id: string;
  probability: number;
  referenceClass?: string;
}

/**
 * No probability is accepted without a reference class.
 *
 * The point is not bureaucracy. A number like 0.8 feels like information but is
 * only an opinion about a frequency, and the reference class is the sentence
 * that says which frequency. "How do similar cases usually turn out?" is the
 * question that turns a guess into a checkable claim — and often the answer
 * changes the number.
 */
export function validateProbabilities(items: ProbabilityInput[]): ProbabilifyResult {
  const problems: ProbabilifyResult['problems'] = [];

  for (const item of items) {
    if (!isFilled(item.referenceClass)) {
      problems.push({
        itemId: item.id,
        reason:
          'A probability must name its reference class: how do similar cases usually turn out?',
      });
    }
  }

  if (problems.length > 0) {
    return {
      ok: false,
      problems,
      reason: `${problems.length} probability/probabilities have no reference class.`,
    };
  }

  return { ok: true, problems };
}

function isFilled(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

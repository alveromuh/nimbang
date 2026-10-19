import type { Claim } from './types';

export interface TagResult {
  ok: boolean;
  /** Ids of claims that are missing a required field. Empty when ok. */
  problems: { claimId: string; reason: string }[];
  reason?: string;
}

/**
 * A fact must name its source; a preference must name whose preference it is.
 *
 * This is the is-ought check made mechanical. It computes nothing, which is the
 * point: it catches the class of decision where an opinion is written down in
 * the grammar of a fact, and no amount of arithmetic repairs that.
 *
 * Every claim is reported, not just the first, so the user sees the whole list.
 */
export function validateTag(input: { claims: Claim[] }): TagResult {
  const problems: TagResult['problems'] = [];

  for (const claim of input.claims) {
    if (claim.domain === 'fact' && !isFilled(claim.source)) {
      problems.push({
        claimId: claim.id,
        reason: 'A fact must name its source or the check behind it.',
      });
    }

    if (claim.domain === 'preference' && !isFilled(claim.owner)) {
      problems.push({
        claimId: claim.id,
        reason: 'A preference must name whose preference it is.',
      });
    }
  }

  if (problems.length > 0) {
    return {
      ok: false,
      problems,
      reason: `${problems.length} claim(s) are untagged.`,
    };
  }

  return { ok: true, problems };
}

function isFilled(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

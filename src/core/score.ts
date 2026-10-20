import type { Decision, Item } from './types';

export interface ScoreAnchors {
  min: number;
  max: number;
}

export interface ScoreResult {
  /** Weighted, normalised net score per option. */
  net: Record<string, number>;
  /** Option ids, best first. Ties broken by option array order. */
  ranking: string[];
  /**
   * The per-objective min and max that normalisation used. Stress needs these to
   * solve for a break-even without re-normalising: re-normalising after a
   * perturbation makes every score scale-invariant, and then no change to any
   * input could ever flip the ranking.
   */
  anchors: Record<string, ScoreAnchors>;
  /** Options carrying at least one item with risk = 'fatal'. */
  fatal: string[];
  /**
   * The leader, unless it is in `fatal`. Fatal risk is not priced: it blocks the
   * recommendation and leaves the ranking and the flag.
   */
  recommendation: string | null;
}

/**
 * Additive value function over options.
 *
 *     net(option) = Σ_o w_o · ( Σ_benefit v·p − Σ_cost v·p )_o
 *     v = (value − min_o) / (max_o − min_o)
 *
 * Normalisation is per objective across the option set, not per option across
 * its items, so listing more items does not win by item count.
 *
 * Anchors are computed from the items that exist. An option with no item on an
 * objective contributes nothing to that objective, and is not counted as a zero
 * for the purposes of finding the min and max — otherwise adding an option with
 * no data would silently drag every other option's normalised score upward.
 *
 * Throws on an objective with no weight, and on an item naming an objective or
 * option that does not exist. These are data errors, and a score computed by
 * guessing what the user meant is worse than no score.
 */
export function scoreDecision(
  decision: Decision,
  weights: Record<string, number>,
): ScoreResult {
  const objectiveIds = new Set(decision.objectives.map((objective) => objective.id));
  const optionIds = new Set(decision.options.map((option) => option.id));

  for (const objective of decision.objectives) {
    const weight = weights[objective.id];
    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      throw new Error(`Objective "${objective.id}" has no weight.`);
    }
  }

  for (const item of decision.items) {
    if (!objectiveIds.has(item.objectiveId)) {
      throw new Error(
        `Item "${item.id}" points at objective "${item.objectiveId}", which does not exist.`,
      );
    }
    if (!optionIds.has(item.optionId)) {
      throw new Error(
        `Item "${item.id}" points at option "${item.optionId}", which does not exist.`,
      );
    }
  }

  const anchors: Record<string, ScoreAnchors> = {};
  for (const objective of decision.objectives) {
    const values = decision.items
      .filter((item) => item.objectiveId === objective.id)
      .map((item) => item.value);

    anchors[objective.id] = {
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  }

  const net: Record<string, number> = {};
  for (const option of decision.options) {
    net[option.id] = 0;
  }

  for (const item of decision.items) {
    const { min, max } = anchors[item.objectiveId];
    const range = max - min;

    // All options tie on this objective: no option is better, so this item
    // contributes nothing. This is the division-by-zero guard.
    if (range === 0) {
      continue;
    }

    const normalised = (item.value - min) / range;
    const signed = item.kind === 'benefit' ? 1 : -1;
    const weight = weights[item.objectiveId];

    net[item.optionId] += weight * signed * normalised * item.probability;
  }

  const fatal = decision.options
    .filter((option) =>
      decision.items.some((item) => item.optionId === option.id && item.risk === 'fatal'),
    )
    .map((option) => option.id);

  const ranking = rankOptions(decision, net);
  const leader = ranking[0] ?? null;

  return {
    net,
    ranking,
    anchors,
    fatal,
    recommendation: leader !== null && !fatal.includes(leader) ? leader : null,
  };
}

/**
 * Sort by score, best first. Ties keep option array order, so the engine never
 * sorts on a hidden key: Array.prototype.sort is stable, and the comparison
 * returns 0 for a tie.
 */
function rankOptions(decision: Decision, net: Record<string, number>): string[] {
  return [...decision.options]
    .sort((left, right) => (net[right.id] ?? 0) - (net[left.id] ?? 0))
    .map((option) => option.id);
}

/** Exported for Stress, which needs the same slope definition. */
export function itemSlope(item: Item, weight: number, range: number): number {
  if (range === 0) {
    return 0;
  }
  const signed = item.kind === 'benefit' ? 1 : -1;
  return (signed * weight * item.probability) / range;
}

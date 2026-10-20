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
   * The per-attribute min and max that normalisation used. Stress needs these to
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
 *     net(option) = Σ_o Σ_a (w_o / n_o) · signed(v·p)_a
 *     v = (value − min_a) / (max_a − min_a)
 *
 * Normalisation is per stable attribute across options. Each objective weight
 * is divided equally among its distinct attributes.
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
  const attributesByObjective = new Map(decision.objectives.map((objective) => [
    objective.id,
    objective.attributes?.length ? objective.attributes : [{ id: objective.id, name: objective.statement }],
  ]));

  /** Which item owns each option-by-attribute cell, so a duplicate is caught. */
  const cells = new Map<string, string>();

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
    const attributes = attributesByObjective.get(item.objectiveId) ?? [];
    const attributeId = item.attributeId ?? item.objectiveId;
    if (!attributes.some((attribute) => attribute.id === attributeId)) {
      throw new Error(`Item "${item.id}" points at attribute "${attributeId}", which does not exist.`);
    }

    // One cell, one assessment. A second item on the same option-and-attribute
    // pair would add to the same normalised term and let an option win by being
    // recorded twice — exactly the item-count advantage the normalisation is
    // supposed to remove. The UI cannot produce this, but a shared link or an
    // edited document can, so the engine refuses rather than quietly summing.
    const cell = `${item.optionId}\u0000${attributeId}`;
    const previous = cells.get(cell);
    if (previous !== undefined) {
      throw new Error(
        `Items "${previous}" and "${item.id}" both score option "${item.optionId}" on attribute "${attributeId}". Each cell takes one assessment.`,
      );
    }
    cells.set(cell, item.id);
  }

  const anchors: Record<string, ScoreAnchors> = {};
  for (const objective of decision.objectives) {
    const attributes = attributesByObjective.get(objective.id) ?? [];
    for (const attribute of attributes) {
      // Anchors are keyed by attribute id alone, so two objectives sharing one
      // would overwrite each other's range and normalise against the wrong
      // scale. That is a data error, not something to paper over.
      if (anchors[attribute.id] !== undefined) {
        throw new Error(
          `Attribute "${attribute.id}" appears more than once. Attribute ids must be unique across the decision.`,
        );
      }
      const values = decision.items
        .filter((item) => item.objectiveId === objective.id && (item.attributeId ?? objective.id) === attribute.id)
        .map((item) => item.value);

      anchors[attribute.id] = {
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
      };
    }
  }

  const net: Record<string, number> = {};
  for (const option of decision.options) {
    net[option.id] = 0;
  }

  for (const item of decision.items) {
    const attributeId = item.attributeId ?? item.objectiveId;
    const { min, max } = anchors[attributeId];
    const range = max - min;

    // All options tie on this objective: no option is better, so this item
    // contributes nothing. This is the division-by-zero guard.
    if (range === 0) {
      continue;
    }

    const normalised = (item.value - min) / range;
    const signed = item.kind === 'benefit' ? 1 : -1;
    const attributeCount = attributesByObjective.get(item.objectiveId)?.length ?? 1;
    const weight = weights[item.objectiveId] / attributeCount;

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

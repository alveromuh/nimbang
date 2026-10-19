import type { Objective } from './types';

/**
 * Swing weighting: normalise the swing points to weights that sum to 1.
 *
 * The points are not "how important is this objective" — that question has no
 * anchor and everyone answers 5. They are "how much does it matter that the
 * option set moves from worst to best on this objective", which is a comparison
 * the user can actually make, because the worst and best options are in front of
 * them.
 *
 * Throws rather than guessing. A missing point is a weight the user did not
 * supply; defaulting it to 0 silently deletes an objective from the decision,
 * and defaulting it to the mean invents an opinion.
 */
export function swingWeights(
  objectives: Objective[],
  points: Record<string, number>,
): Record<string, number> {
  const weights: Record<string, number> = {};

  let total = 0;
  for (const objective of objectives) {
    const point = points[objective.id];

    if (typeof point !== 'number' || !Number.isFinite(point)) {
      throw new Error(`Objective "${objective.id}" has no swing points.`);
    }
    if (point < 0) {
      throw new Error(`Objective "${objective.id}" has negative swing points.`);
    }

    total += point;
  }

  if (total <= 0) {
    throw new Error('Swing points sum to zero; no objective has any weight.');
  }

  for (const objective of objectives) {
    weights[objective.id] = points[objective.id] / total;
  }

  return weights;
}

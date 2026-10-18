import type { Decision } from './types';
import { itemSlope, scoreDecision } from './score';

export interface FlipPoint {
  itemId: string;
  /** Distance to indifference, in raw 1–5 units. */
  delta: number;
}

export interface TornadoEntry {
  itemId: string;
  /** Largest change this item can cause in its option's net score. */
  influence: number;
}

export interface StressReport {
  fragile: boolean;
  flipsAt: FlipPoint | null;
  tornado: TornadoEntry[];
}

const MIN_VALUE = 1;
const MAX_VALUE = 5;
const EPSILON = 1e-9;

/**
 * Break-even sensitivity: how far would one input have to move before the
 * ranking changes?
 *
 * The weighted sum is affine in each item's value, so this is solved in closed
 * form rather than by stepping the value in increments. A stepped search reports
 * the step size it happened to try, not the distance to indifference, and it
 * misses every flip smaller than its step.
 *
 * A flip is the winner changing, not only the top two swapping: an item on a
 * third option can overtake the leader. A tie is not a reversal, so the change
 * must be strictly greater than the break-even, which is why the reachable
 * change is compared with `<` against the edge of the scale rather than `<=`.
 */
export function stressTest(
  decision: Decision,
  weights: Record<string, number>,
): StressReport {
  const score = scoreDecision(decision, weights);
  const [winner, runnerUp] = score.ranking;

  const tornado = decision.items
    .map((item) => {
      const range = rangeOf(score.anchors[item.objectiveId]);
      const slope = itemSlope(item, weights[item.objectiveId] ?? 0, range);
      const reachable = Math.max(item.value - MIN_VALUE, MAX_VALUE - item.value);
      return { itemId: item.id, influence: Math.abs(slope) * reachable };
    })
    .sort((left, right) => right.influence - left.influence);

  if (winner === undefined || runnerUp === undefined) {
    return { fragile: false, flipsAt: null, tornado };
  }

  let flipsAt: FlipPoint | null = null;

  for (const item of decision.items) {
    const range = rangeOf(score.anchors[item.objectiveId]);
    const slope = itemSlope(item, weights[item.objectiveId] ?? 0, range);

    if (slope === 0) {
      continue;
    }

    const isOnWinner = item.optionId === winner;
    const leader = score.net[winner] ?? 0;
    const target = isOnWinner ? (score.net[runnerUp] ?? 0) : (score.net[item.optionId] ?? 0);
    const gap = leader - target;

    if (gap < 0) {
      continue;
    }

    const delta = gap / Math.abs(slope);

    // Which way the value has to move for this item's option to gain on the
    // leader. On the winner, its own score has to fall; elsewhere, the
    // challenger's score has to rise.
    const rises = isOnWinner ? slope < 0 : slope > 0;
    const edge = rises ? MAX_VALUE : MIN_VALUE;
    const reachable = Math.abs(edge - item.value);

    if (!(delta < reachable - EPSILON)) {
      continue;
    }

    if (flipsAt === null || delta < flipsAt.delta) {
      flipsAt = { itemId: item.id, delta };
    }
  }

  return { fragile: flipsAt !== null, flipsAt, tornado };
}

function rangeOf(anchors: { min: number; max: number } | undefined): number {
  return anchors ? anchors.max - anchors.min : 0;
}

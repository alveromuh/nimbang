import type { Prediction } from './types';

/** One prediction, resolved. `p` is what was forecast, `o` is what happened. */
export interface ResolvedPrediction {
  p: number;
  o: boolean;
}

/**
 * Brier score: the mean squared error of probabilistic forecasts.
 *
 *     brier = mean( (p − o)² )
 *
 * Lower is better. 0 is a perfect forecast, 0.25 is the score of always saying
 * 0.5, and 1 is a confident forecast that was wrong. This is what makes the tool
 * a practice rather than a calculator: the number that matters is not the one
 * score you got today but whether your 0.8s happen 80% of the time.
 *
 * Throws on an empty list rather than returning NaN. `mean` of nothing is
 * undefined, and a calibration score computed from no resolved predictions is
 * not a low score — it is the absence of one, and the UI must be able to tell
 * the difference.
 */
export function brierScore(predictions: ResolvedPrediction[]): number {
  if (predictions.length === 0) {
    throw new Error('Cannot compute a Brier score from no resolved predictions.');
  }

  let total = 0;
  for (const prediction of predictions) {
    if (!Number.isFinite(prediction.p) || prediction.p < 0 || prediction.p > 1) {
      throw new Error(`Probability ${prediction.p} is outside 0..1.`);
    }
    const outcome = prediction.o ? 1 : 0;
    total += (prediction.p - outcome) ** 2;
  }

  return total / predictions.length;
}

/**
 * Turns a decision's predictions and its recorded outcomes into resolved
 * predictions, dropping any that have not been resolved yet.
 *
 * Unresolved predictions are excluded rather than counted as "did not happen".
 * A prediction you have not checked is not evidence about your calibration.
 */
export function resolvePredictions(
  predictions: Prediction[],
  outcomes: Record<string, boolean>,
): ResolvedPrediction[] {
  return predictions
    .filter((prediction) => Object.hasOwn(outcomes, prediction.claimId))
    .map((prediction) => ({
      p: prediction.probability,
      o: outcomes[prediction.claimId],
    }));
}

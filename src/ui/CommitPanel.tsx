import { useState } from 'react';
import { brierScore, resolvePredictions, type Prediction } from '../core';

interface CommitPanelProps {
  predictions: Prediction[];
  outcomes: Record<string, boolean>;
  onChangePredictions: (next: Prediction[]) => void;
  onChangeOutcomes: (next: Record<string, boolean>) => void;
}

/**
 * The stage that turns this from a calculator into practice: record what you
 * expect, then later record what happened and see how well calibrated you were.
 *
 * The Brier score is deliberately absent until at least one prediction is
 * resolved. Showing 0 for "no data" would read as a perfect forecast.
 */
export function CommitPanel({
  predictions,
  outcomes,
  onChangePredictions,
  onChangeOutcomes,
}: CommitPanelProps) {
  const resolved = resolvePredictions(predictions, outcomes);

  const [draftText, setDraftText] = useState('');
  const [draftProbability, setDraftProbability] = useState('0.5');

  return (
    <section aria-labelledby="commit-heading">
      <h2 id="commit-heading">Commit</h2>
      <p>
        Write down what you expect, so that later you can check it. A prediction you never
        resolve teaches you nothing.
      </p>

      <label htmlFor="commit-review">Review on</label>
      <input id="commit-review" type="date" />

      <label htmlFor="commit-prediction">Prediction</label>
      <input
        id="commit-prediction"
        placeholder="What will be true, and by when?"
        value={draftText}
        onChange={(event) => setDraftText(event.target.value)}
      />

      <label htmlFor="commit-probability">Probability (0-1)</label>
      <input
        id="commit-probability"
        type="number"
        min={0}
        max={1}
        step={0.05}
        value={draftProbability}
        onChange={(event) => setDraftProbability(event.target.value)}
      />

      <button
        type="button"
        onClick={() => {
          const probability = Number(draftProbability);
          if (
            draftText.trim() === '' ||
            !Number.isFinite(probability) ||
            probability < 0 ||
            probability > 1
          ) {
            return;
          }
          // The claim id is derived from the text: predictions in v1 are keyed by
          // the claim they are about, and there is no separate claims editor yet.
          const claimId = draftText.trim().toLowerCase().replace(/\s+/g, '-');
          onChangePredictions([...predictions, { claimId, probability }]);
          setDraftText('');
          setDraftProbability('0.5');
        }}
      >
        Add prediction
      </button>

      <ul>
        {predictions.map((prediction) => (
          <li key={prediction.claimId}>
            {prediction.claimId} — {prediction.probability}
            <label htmlFor={`outcome-${prediction.claimId}`}>Happened</label>
            <input
              id={`outcome-${prediction.claimId}`}
              type="checkbox"
              checked={outcomes[prediction.claimId] ?? false}
              onChange={(event) =>
                onChangeOutcomes({ ...outcomes, [prediction.claimId]: event.target.checked })
              }
            />
          </li>
        ))}
      </ul>

      <Calibration resolved={resolved} />
    </section>
  );
}

function Calibration({ resolved }: { resolved: { p: number; o: boolean }[] }) {
  if (resolved.length === 0) {
    return <p>No resolved predictions yet, so there is no calibration score.</p>;
  }

  return <p>Brier score: {brierScore(resolved).toFixed(3)} (lower is better; 0.25 is a coin toss)</p>;
}

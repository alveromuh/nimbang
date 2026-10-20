import { useState } from 'react';
import { brierScore, resolvePredictions, type Prediction } from '../core';
import { Bi } from './Bi';
import { copy } from './i18n';

interface CommitPanelProps {
  predictions: Prediction[];
  outcomes: Record<string, boolean>;
  reviewAt: string;
  onChangePredictions: (next: Prediction[]) => void;
  onChangeOutcomes: (next: Record<string, boolean>) => void;
  onChangeReviewAt: (next: string) => void;
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
  reviewAt,
  onChangePredictions,
  onChangeOutcomes,
  onChangeReviewAt,
}: CommitPanelProps) {
  const resolved = resolvePredictions(predictions, outcomes);

  const [draftText, setDraftText] = useState('');
  const [draftProbability, setDraftProbability] = useState('0.5');

  return (
    <section className="panel" aria-labelledby="commit-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="commit-heading">
          <Bi text={copy.commit} />
        </h2>
        <p className="panel__hint">
          <Bi text={copy.commitHint} />
        </p>
      </div>

      <div className="field-row">
        <div>
          <label htmlFor="commit-review">Tinjau pada</label>
          <input
            id="commit-review"
            type="date"
            value={reviewAt}
            onChange={(event) => onChangeReviewAt(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="commit-probability">Peluang (0-1)</label>
          <input
            id="commit-probability"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={draftProbability}
            onChange={(event) => setDraftProbability(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="commit-prediction">Prediksi</label>
        <div className="row-actions">
          <input
            id="commit-prediction"
            placeholder="Apa yang akan benar, dan kapan?"
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
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
              // The claim id is derived from the text: predictions in v1 are keyed
              // by the claim they are about, and there is no separate claims editor
              // yet.
              const baseId = draftText.trim().toLowerCase().replace(/\s+/g, '-');
              const claimId = uniqueClaimId(baseId, predictions);
              onChangePredictions([
                ...predictions,
                { claimId, probability, text: draftText.trim() },
              ]);
              setDraftText('');
              setDraftProbability('0.5');
            }}
          >
            Tambah prediksi
          </button>
        </div>
      </div>

      {predictions.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Prediksi</th>
              <th className="num" scope="col">
                P
              </th>
              <th scope="col">Terjadi</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => (
              <tr key={prediction.claimId}>
                <td>{prediction.text ?? prediction.claimId}</td>
                <td className="num">{prediction.probability}</td>
                <td>
                  <label className="check" htmlFor={`outcome-${prediction.claimId}`}>
                    <input
                      id={`outcome-${prediction.claimId}`}
                      type="checkbox"
                      checked={outcomes[prediction.claimId] ?? false}
                      onChange={(event) =>
                        onChangeOutcomes({
                          ...outcomes,
                          [prediction.claimId]: event.target.checked,
                        })
                      }
                    />
                    Terjadi
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Calibration resolved={resolved} />
    </section>
  );
}

function Calibration({ resolved }: { resolved: { p: number; o: boolean }[] }) {
  if (resolved.length === 0) {
    return (
      <p className="note">
        Belum ada prediksi yang selesai, jadi belum ada skor kalibrasi.
      </p>
    );
  }

  return (
    <p className="note">
      Skor Brier: <strong>{brierScore(resolved).toFixed(3)}</strong>. Makin kecil makin baik;
      0,25 sama dengan melempar koin.
    </p>
  );
}

/** Slug plus a stable numeric suffix so repeated text remains independently resolvable. */
function uniqueClaimId(base: string, predictions: Prediction[]): string {
  const taken = new Set(predictions.map((prediction) => prediction.claimId));
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

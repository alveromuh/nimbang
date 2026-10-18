import type { Decision, ScoreResult, StressReport } from '../core';

interface ResultProps {
  decision: Decision;
  score: ScoreResult;
  stress: StressReport;
}

/**
 * Shows the ranking, the recommendation, and — the reason the app exists — what
 * would have to change for the answer to change. Every number here is traceable
 * to an input the user typed.
 */
export function Result({ decision, score, stress }: ResultProps) {
  const labelOf = (optionId: string) =>
    decision.options.find((option) => option.id === optionId)?.label || optionId;

  return (
    <section aria-labelledby="result-heading">
      <h2 id="result-heading">Result</h2>

      <ol>
        {score.ranking.map((optionId) => (
          <li key={optionId}>
            {labelOf(optionId)} — {(score.net[optionId] ?? 0).toFixed(3)}
            {score.fatal.includes(optionId) && <strong> (fatal risk)</strong>}
          </li>
        ))}
      </ol>

      {score.recommendation === null ? (
        <p role="alert">
          No recommendation. The leading option carries a fatal risk, and this engine does not
          price a fatal risk against an ordinary one.
        </p>
      ) : (
        <p>Recommendation: {labelOf(score.recommendation)}</p>
      )}

      {stress.flipsAt === null ? (
        <p>No single input reverses this ranking within the 1–5 scale.</p>
      ) : (
        <p>
          Fragile: changing {itemLabel(decision, stress.flipsAt.itemId)} by{' '}
          {stress.flipsAt.delta.toFixed(2)} would reverse the ranking. Find out whether that is
          true before committing.
        </p>
      )}

      <h3>What moves the answer most</h3>
      <ul>
        {stress.tornado.map((entry) => (
          <li key={entry.itemId}>
            {itemLabel(decision, entry.itemId)} — influence {entry.influence.toFixed(3)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function itemLabel(decision: Decision, itemId: string): string {
  const item = decision.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    return itemId;
  }
  const option = decision.options.find((candidate) => candidate.id === item.optionId);
  const objective = decision.objectives.find((candidate) => candidate.id === item.objectiveId);
  return `${option?.label || item.optionId} on ${objective?.statement || item.objectiveId}`;
}

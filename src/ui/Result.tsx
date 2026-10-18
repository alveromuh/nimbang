import type { Decision, ScoreResult, StressReport } from '../core';

interface ResultProps {
  decision: Decision;
  score: ScoreResult;
  stress: StressReport;
}

/**
 * The verdict, then the evidence.
 *
 * Two claims sit at the top, side by side, because they are the two answers the
 * user came for: which option leads, and whether that lead survives a wrong
 * input. The ranking and the tornado sit underneath as the support.
 *
 * A blocked recommendation is not styled as a warning banner. It is a verdict of
 * its own — "no recommendation" — because that is the honest output, not a
 * failure to produce one.
 */
export function Result({ decision, score, stress }: ResultProps) {
  const labelOf = (optionId: string) =>
    decision.options.find((option) => option.id === optionId)?.label || optionId;

  const leader = score.ranking[0];
  const margin =
    leader !== undefined && score.ranking[1] !== undefined
      ? (score.net[leader] ?? 0) - (score.net[score.ranking[1]] ?? 0)
      : null;

  return (
    <section className="panel" aria-labelledby="result-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="result-heading">
          Verdict
        </h2>
        <p className="panel__hint">
          {decision.items.length} {decision.items.length === 1 ? 'score' : 'scores'} · {decision.objectives.length}{' '}
          {decision.objectives.length === 1 ? 'objective' : 'objectives'}
        </p>
      </div>

      <div className="verdict">
        <div>
          <div className="verdict__label">Recommendation</div>
          {score.recommendation === null ? (
            <p className="verdict__value verdict__value--blocked" role="alert">
              No recommendation. The leading option carries a fatal risk, and this engine does not
              price a fatal risk against an ordinary one.
            </p>
          ) : (
            <>
              <div className="verdict__value">{labelOf(score.recommendation)}</div>
              {margin !== null && (
                <p className="verdict__sub">
                  {margin.toFixed(3)} ahead of {labelOf(score.ranking[1])}
                </p>
              )}
            </>
          )}
        </div>

        <div>
          <div className="verdict__label">Fragility</div>
          {stress.flipsAt === null ? (
            <p className="verdict__sub" style={{ marginTop: 0 }}>
              No single score reverses this ranking within the 1–5 scale. That is a robust answer,
              not a precise one.
            </p>
          ) : (
            <>
              <div className="verdict__value">
                {stress.flipsAt.delta === 0 ? 'Already tied' : `±${stress.flipsAt.delta.toFixed(2)}`}
              </div>
              <p className="verdict__sub">
                Change {itemLabel(decision, stress.flipsAt.itemId)} by this much and the ranking
                reverses. Find out whether that is true before committing.
              </p>
            </>
          )}
        </div>
      </div>

      <table className="table" style={{ marginTop: 'var(--s-lg)' }}>
        <thead>
          <tr>
            <th className="rank" scope="col">
              #
            </th>
            <th scope="col">Option</th>
            <th className="num" scope="col">
              Net
            </th>
            <th scope="col">Flags</th>
          </tr>
        </thead>
        <tbody>
          {score.ranking.map((optionId, index) => (
            <tr key={optionId} data-leader={index === 0}>
              <td className="rank">{index + 1}</td>
              <td>{labelOf(optionId)}</td>
              <td className="num">{(score.net[optionId] ?? 0).toFixed(3)}</td>
              <td>
                {score.fatal.includes(optionId) ? (
                  <span className="badge badge--fatal">Fatal</span>
                ) : index === 0 ? (
                  <span className="badge badge--accent">Leads</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {stress.tornado.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: 'var(--s-lg) 0 var(--s-sm)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            What moves the answer most
          </h3>
          <ul className="tornado">
            {stress.tornado.slice(0, 6).map((entry) => {
              const max = stress.tornado[0]?.influence || 1;
              return (
                <li key={entry.itemId}>
                  <div>
                    {itemLabel(decision, entry.itemId)}
                    <div className="tornado__bar">
                      <span style={{ width: `${Math.max(2, (entry.influence / max) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="tornado__value">{entry.influence.toFixed(3)}</div>
                </li>
              );
            })}
          </ul>
        </>
      )}
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

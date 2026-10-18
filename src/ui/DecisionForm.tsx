import { useMemo, useState } from 'react';
import {
  scoreDecision,
  stressTest,
  swingWeights,
  validateDiverge,
  validateFrame,
  type Decision,
  type Item,
  type Objective,
  type Option,
} from '../core';
import { Result } from './Result';

/**
 * The pipeline as one form. No chat, and no wizard that hides the arithmetic:
 * the objective, the options, the weights and the items are visible at once,
 * which is the point — the output is a number traceable to something the user
 * typed.
 *
 * Every input has an explicit `htmlFor`/`id` pair. Wrapping the input inside the
 * label also works, but it makes the accessible name include the surrounding
 * text, so a test (or a screen reader) cannot address the field unambiguously.
 */
export function DecisionForm() {
  const [title, setTitle] = useState('');
  const [objectives, setObjectives] = useState<Objective[]>([
    { id: 'o1', statement: '', kind: 'motivation' },
  ]);
  const [options, setOptions] = useState<Option[]>([
    { id: 'a', label: 'Do nothing', isBaseline: true },
    { id: 'b', label: '', isBaseline: false },
    { id: 'c', label: '', isBaseline: false },
  ]);
  const [items, setItems] = useState<Item[]>([]);
  const [swingPoints, setSwingPoints] = useState<Record<string, number>>({ o1: 100 });

  const decision: Decision = useMemo(
    () => ({ id: 'draft', title, objectives, options, items, claims: [] }),
    [title, objectives, options, items],
  );

  const frame = validateFrame(decision);
  const diverge = validateDiverge(decision);

  const result = useMemo(() => {
    if (!frame.ok || !diverge.ok) {
      return null;
    }
    try {
      const weights = swingWeights(objectives, swingPoints);
      return { score: scoreDecision(decision, weights), stress: stressTest(decision, weights) };
    } catch {
      // An incomplete decision is the normal state of a form, not an error worth
      // a crash. No result is shown until the inputs support one.
      return null;
    }
  }, [decision, frame.ok, diverge.ok, objectives, swingPoints]);

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <section aria-labelledby="frame-heading">
        <h2 id="frame-heading">Objective</h2>

        <p>
          <label htmlFor="decision-title">Decision</label>
        </p>
        <input
          id="decision-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        {objectives.map((objective, index) => (
          <div key={objective.id}>
            <label htmlFor={`objective-${index}`}>Objective {index + 1}</label>
            <input
              id={`objective-${index}`}
              value={objective.statement}
              onChange={(event) =>
                setObjectives(
                  replaceAt(objectives, index, { ...objective, statement: event.target.value }),
                )
              }
            />
          </div>
        ))}

        {!frame.ok && <p role="status">{frame.reason}</p>}
      </section>

      <section aria-labelledby="diverge-heading">
        <h2 id="diverge-heading">Options</h2>
        <p>At least three, one of which is doing nothing.</p>

        {options.map((option, index) => (
          <div key={option.id}>
            <label htmlFor={`option-${index}`}>Option {index + 1}</label>
            <input
              id={`option-${index}`}
              value={option.label}
              onChange={(event) =>
                setOptions(replaceAt(options, index, { ...option, label: event.target.value }))
              }
            />
          </div>
        ))}

        {!diverge.ok && <p role="status">{diverge.reason}</p>}
      </section>

      <section aria-labelledby="weigh-heading">
        <h2 id="weigh-heading">Swing weights</h2>
        <p>How much does it matter that the options move from worst to best on this objective?</p>

        {objectives.map((objective, index) => (
          <div key={objective.id}>
            <label htmlFor={`swing-${index}`}>
              Swing weight for {objective.statement || `objective ${index + 1}`}
            </label>
            <input
              id={`swing-${index}`}
              type="number"
              min={0}
              value={swingPoints[objective.id] ?? 0}
              onChange={(event) =>
                setSwingPoints({ ...swingPoints, [objective.id]: Number(event.target.value) })
              }
            />
          </div>
        ))}
      </section>

      <section aria-labelledby="score-heading">
        <h2 id="score-heading">Scores</h2>
        <p>Rate each option against each objective, from 1 to 5.</p>

        {options.map((option, optionIndex) =>
          objectives.map((objective, objectiveIndex) => {
            const id = `score-${option.id}-${objective.id}`;
            const item = items.find(
              (candidate) =>
                candidate.optionId === option.id && candidate.objectiveId === objective.id,
            );
            return (
              <div key={id}>
                <label htmlFor={id}>
                  {option.label || `Option ${optionIndex + 1}`} on{' '}
                  {objective.statement || `objective ${objectiveIndex + 1}`}
                </label>
                <input
                  id={id}
                  type="number"
                  min={1}
                  max={5}
                  value={item?.value ?? ''}
                  onChange={(event) => {
                    if (event.target.value === '') {
                      setItems(items.filter((candidate) => candidate !== item));
                      return;
                    }
                    const value = Number(event.target.value);
                    if (Number.isNaN(value)) {
                      return;
                    }
                    setItems(upsertItem(items, option.id, objective.id, value));
                  }}
                />
              </div>
            );
          }),
        )}
      </section>

      {result && <Result decision={decision} score={result.score} stress={result.stress} />}
    </form>
  );
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((entry, position) => (position === index ? value : entry));
}

function upsertItem(items: Item[], optionId: string, objectiveId: string, value: number): Item[] {
  const id = `${optionId}-${objectiveId}`;
  const next: Item = {
    id,
    optionId,
    objectiveId,
    kind: 'benefit',
    value,
    probability: 1,
    risk: 'ordinary',
  };
  const existing = items.some((item) => item.id === id);
  return existing ? items.map((item) => (item.id === id ? next : item)) : [...items, next];
}

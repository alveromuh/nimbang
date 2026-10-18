import { useEffect, useMemo, useState } from 'react';
import {
  deserializeDecision,
  scoreDecision,
  stressTest,
  swingWeights,
  validateDiverge,
  validateFrame,
  type Decision,
  type GateInputs,
  type Item,
  type Objective,
  type Option,
  type Prediction,
} from '../core';
import { CommitPanel } from './CommitPanel';
import { GatePanel } from './GatePanel';
import { ItemEditor } from './ItemEditor';
import { Result } from './Result';
import { ShareBar } from './ShareBar';
import { loadDraft, saveDraft } from './persistence';

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
  // Initial state comes from the URL fragment if present, then from the saved
  // draft, then from a blank decision. The URL wins because opening a shared
  // link is an explicit request to see that decision, not whatever was last
  // being worked on.
  const [initial] = useState(loadInitialDecision);

  const [title, setTitle] = useState(initial.title);
  const [objectives, setObjectives] = useState<Objective[]>(initial.objectives);
  const [options, setOptions] = useState<Option[]>(initial.options);
  const [items, setItems] = useState<Item[]>(initial.items);
  const [swingPoints, setSwingPoints] = useState<Record<string, number>>(
    initial.swingPoints ?? { o1: 100 },
  );
  const [gate, setGate] = useState<GateInputs>(
    initial.gate ?? {
      sunkCost: null,
      survivorship: '',
      ostrich: '',
      hastyGeneralisation: '',
      causation: '',
      falseComparison: '',
    },
  );
  const [predictions, setPredictions] = useState<Prediction[]>(initial.predictions ?? []);
  const [outcomes, setOutcomes] = useState<Record<string, boolean>>(initial.outcomes ?? {});

  const decision: Decision = useMemo(
    () => ({
      id: initial.id,
      title,
      objectives,
      options,
      items,
      claims: [],
      swingPoints,
      predictions,
      outcomes,
    }),
    [initial.id, title, objectives, options, items, swingPoints, predictions, outcomes],
  );

  // Persist on every change. A failed write (private mode, full quota) is not
  // surfaced: the form keeps working, and blocking the user over a storage
  // error would be worse than losing the draft.
  useEffect(() => {
    saveDraft(decision);
  }, [decision]);

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
        <p>
          For each option and objective: a value from 1 to 5, whether it is a benefit or a cost,
          how likely it is, and what similar cases usually do.
        </p>

        {options.map((option, optionIndex) =>
          objectives.map((objective, objectiveIndex) => {
            const itemId = `${option.id}--${objective.id}`;
            const item = items.find(
              (candidate) =>
                candidate.optionId === option.id && candidate.objectiveId === objective.id,
            );
            return (
              <ItemEditor
                key={itemId}
                idPrefix={itemId}
                label={`${option.label || `Option ${optionIndex + 1}`} on ${
                  objective.statement || `objective ${objectiveIndex + 1}`
                }`}
                item={item}
                onChange={(next) => setItems(upsertItem(items, itemId, next))}
              />
            );
          }),
        )}
      </section>

      {result && <Result decision={decision} score={result.score} stress={result.stress} />}

      <GatePanel value={gate} onChange={setGate} />

      <CommitPanel
        predictions={predictions}
        outcomes={outcomes}
        onChangePredictions={setPredictions}
        onChangeOutcomes={setOutcomes}
      />

      <ShareBar decision={decision} />
    </form>
  );
}

/**
 * A shared link wins over the local draft. `location` is read defensively
 * because this module also runs in tests and in any future server-side render,
 * where it does not exist.
 */
function loadInitialDecision(): Decision {
  if (typeof location !== 'undefined') {
    const payload = location.hash.startsWith('#d=') ? location.hash.slice(3) : null;
    if (payload !== null) {
      try {
        return deserializeDecision(payload);
      } catch {
        // A malformed link falls through to the draft rather than blanking the
        // page: the user still has their own work.
      }
    }
  }

  return loadDraft() ?? blankDecision();
}

function blankDecision(): Decision {
  return {
    id: 'draft',
    title: '',
    objectives: [{ id: 'o1', statement: '', kind: 'motivation' }],
    options: [
      { id: 'a', label: 'Do nothing', isBaseline: true },
      { id: 'b', label: '', isBaseline: false },
      { id: 'c', label: '', isBaseline: false },
    ],
    items: [],
    claims: [],
    swingPoints: { o1: 100 },
  };
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((entry, position) => (position === index ? value : entry));
}

/**
 * Replaces or removes the item with this id. `null` from the editor means the
 * value was cleared, which is the user's way of saying the item does not apply.
 */
function upsertItem(items: Item[], itemId: string, next: Item | null): Item[] {
  if (next === null) {
    return items.filter((item) => item.id !== itemId);
  }

  const exists = items.some((item) => item.id === itemId);
  return exists
    ? items.map((item) => (item.id === itemId ? next : item))
    : [...items, next];
}

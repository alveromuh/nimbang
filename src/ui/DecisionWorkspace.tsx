import { useEffect, useMemo, useState } from 'react';
import {
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
import { ItemGrid } from './ItemGrid';
import { Result } from './Result';
import { SuggestionPanel } from './SuggestionPanel';
import { requestSuggestions } from '../suggestions/client';
import { toSuggestions } from '../suggestions/map';
import { buildState } from '../suggestions/questions';
import type { BiasKey } from '../suggestions/catalog';

interface DecisionWorkspaceProps {
  decision: Decision;
  onSaved: (decision: Decision) => void;
  onDelete: () => void;
}

const EMPTY_GATE: GateInputs = {
  sunkCost: null,
  survivorship: '',
  ostrich: '',
  hastyGeneralisation: '',
  causation: '',
  falseComparison: '',
};

/**
 * One decision, open for editing.
 *
 * The composition is the point: the verdict sits at the top, so the answer stays
 * visible while the inputs are being changed. Everything below is the machinery
 * that produced it, in pipeline order, so any number can be traced to the field
 * it came from.
 */
export function DecisionWorkspace({ decision, onSaved, onDelete }: DecisionWorkspaceProps) {
  const [title, setTitle] = useState(decision.title);
  const [objectives, setObjectives] = useState<Objective[]>(decision.objectives);
  const [options, setOptions] = useState<Option[]>(decision.options);
  const [items, setItems] = useState<Item[]>(decision.items);
  const [swingPoints, setSwingPoints] = useState<Record<string, number>>(
    decision.swingPoints ?? { o1: 100 },
  );
  const [gate, setGate] = useState<GateInputs>(decision.gate ?? EMPTY_GATE);
  const [predictions, setPredictions] = useState<Prediction[]>(decision.predictions ?? []);
  const [outcomes, setOutcomes] = useState<Record<string, boolean>>(decision.outcomes ?? {});

  const draft: Decision = useMemo(
    () => ({
      ...decision,
      title,
      objectives,
      options,
      items,
      swingPoints,
      predictions,
      outcomes,
    }),
    [decision, title, objectives, options, items, swingPoints, predictions, outcomes],
  );

  // Save on a short debounce: typing a title should not write to storage on every
  // keystroke, but nothing should be lost either.
  useEffect(() => {
    const handle = setTimeout(() => onSaved({ ...draft, updatedAt: new Date().toISOString() }), 250);
    return () => clearTimeout(handle);
    // onSaved is stable in the parent; draft changes on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const frame = validateFrame(draft);
  const diverge = validateDiverge(draft);

  const result = useMemo(() => {
    if (!frame.ok || !diverge.ok) {
      return null;
    }
    try {
      const weights = swingWeights(objectives, swingPoints);
      return { score: scoreDecision(draft, weights), stress: stressTest(draft, weights) };
    } catch {
      return null;
    }
  }, [draft, frame.ok, diverge.ok, objectives, swingPoints]);

  function addObjective(): void {
    const id = nextId('o', objectives);
    setObjectives([...objectives, { id, statement: '', kind: 'motivation' }]);
    setSwingPoints({ ...swingPoints, [id]: 50 });
  }

  function removeObjective(id: string): void {
    setObjectives(objectives.filter((objective) => objective.id !== id));
    setItems(items.filter((item) => item.objectiveId !== id));
    const remaining = { ...swingPoints };
    delete remaining[id];
    setSwingPoints(remaining);
  }

  function addOption(): void {
    setOptions([...options, { id: nextId('x', options), label: '', isBaseline: false }]);
  }

  /**
   * Accepts a suggested option. It arrives as a normal, editable option: the
   * suggestion is a starting point, and once added it is the user's text to
   * change or delete.
   */
  function addSuggestedOption(label: string): void {
    setOptions([...options, { id: nextId('x', options), label, isBaseline: false }]);
  }

  /**
   * Inserts a bias prompt as a starting point for the user's own answer. The
   * model never supplies the answer itself; this writes a question to think
   * about, which the user then replaces.
   */
  function useBiasPrompt(key: BiasKey, starter: string): void {
    const field = key as keyof GateInputs;
    setGate((current) => ({ ...current, [field]: starter }));
  }

  function requestSuggestionSet() {
    const state = buildState({
      title,
      objectives: objectives.map((objective) => objective.statement),
      options: options.map((option) => option.label),
    });
    return requestSuggestions({ state }).then((response) =>
      toSuggestions(response, options.map((option) => option.label)),
    );
  }

  function removeOption(id: string): void {
    setOptions(options.filter((option) => option.id !== id));
    setItems(items.filter((item) => item.optionId !== id));
  }

  return (
    <>
      <header className="work__head">
        <div className="work__head-main">
          <p className="work__kicker">Decision</p>
          <input
            aria-label="Decision title"
            className="work__title-input"
            placeholder="What are you deciding?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="work__actions">
          <button type="button" className="btn-quiet" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="btn-quiet" onClick={onDelete}>
            Delete
          </button>
        </div>
      </header>

      {result !== null ? (
        <Result decision={draft} score={result.score} stress={result.stress} />
      ) : frame.ok && diverge.ok ? (
        // Only shown when both gates pass but there is nothing to rank yet. When
        // a gate fails, its message already sits next to the field that caused
        // it; repeating it up here would be the same sentence twice.
        <div className="panel">
          <p className="note">Add a score for each option to see a ranking.</p>
        </div>
      ) : null}

      <section className="panel" aria-labelledby="frame-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="frame-heading">
            Objectives
          </h2>
          <p className="panel__hint">What are you trying to achieve, before you list options?</p>
        </div>

        {objectives.map((objective, index) => (
          <div key={objective.id} className="field">
            <label htmlFor={`objective-${index}`}>Objective {index + 1}</label>
            <div className="row-actions">
              <input
                id={`objective-${index}`}
                value={objective.statement}
                placeholder="e.g. Penghasilan naik tanpa jam kerja lebih panjang"
                onChange={(event) =>
                  setObjectives(
                    replaceAt(objectives, index, { ...objective, statement: event.target.value }),
                  )
                }
              />
              <button
                type="button"
                className="btn-icon"
                aria-label={`Remove objective ${index + 1}`}
                disabled={objectives.length === 1}
                onClick={() => removeObjective(objective.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {!frame.ok && <p className="note note--warn">{frame.reason}</p>}
        <button type="button" onClick={addObjective}>
          Add objective
        </button>
      </section>

      <section className="panel" aria-labelledby="diverge-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="diverge-heading">
            Options
          </h2>
          <p className="panel__hint">At least three, one of which is doing nothing.</p>
        </div>

        {options.map((option, index) => (
          <div key={option.id} className="field">
            <label htmlFor={`option-${index}`}>
              Option {index + 1}
              {option.isBaseline ? ' · baseline' : ''}
            </label>
            <div className="row-actions">
              <input
                id={`option-${index}`}
                value={option.label}
                placeholder={option.isBaseline ? 'Do nothing' : 'Name this option'}
                onChange={(event) =>
                  setOptions(replaceAt(options, index, { ...option, label: event.target.value }))
                }
              />
              <button
                type="button"
                className="btn-icon"
                aria-label={`Remove option ${index + 1}`}
                disabled={option.isBaseline || options.length <= 3}
                onClick={() => removeOption(option.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {!diverge.ok && <p className="note note--warn">{diverge.reason}</p>}
        <button type="button" onClick={addOption}>
          Add option
        </button>

        <SuggestionPanel
          onRequest={requestSuggestionSet}
          onAddOption={addSuggestedOption}
          onUseBias={useBiasPrompt}
        />
      </section>

      <section className="panel" aria-labelledby="weigh-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="weigh-heading">
            Swing weights
          </h2>
          <p className="panel__hint">
            How much does it matter that the options move from worst to best here?
          </p>
        </div>

        <div className="field-row">
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
        </div>
      </section>

      <ItemGrid
        options={options}
        objectives={objectives}
        items={items}
        onChange={(itemId, next) => setItems(upsertItem(items, itemId, next))}
      />

      <GatePanel value={gate} onChange={setGate} />

      <CommitPanel
        predictions={predictions}
        outcomes={outcomes}
        onChangePredictions={setPredictions}
        onChangeOutcomes={setOutcomes}
      />
    </>
  );
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((entry, position) => (position === index ? value : entry));
}

/**
 * The first unused id with this prefix. Deriving from the existing set rather
 * than from `length` matters after a removal: with three objectives, removing the
 * second leaves `o1` and `o3`, and `length + 1` would produce `o3` again.
 */
function nextId(prefix: string, existing: { id: string }[]): string {
  const taken = new Set(existing.map((entry) => entry.id));
  let index = 1;
  while (taken.has(`${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

function upsertItem(items: Item[], itemId: string, next: Item | null): Item[] {
  if (next === null) {
    return items.filter((item) => item.id !== itemId);
  }
  const exists = items.some((item) => item.id === itemId);
  return exists ? items.map((item) => (item.id === itemId ? next : item)) : [...items, next];
}

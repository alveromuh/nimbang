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
import { ChatPanel } from './ChatPanel';
import { AiTrigger } from './AiTrigger';
import { Bi } from './Bi';
import { copy } from './i18n';
import { fillOptionSlots } from './fillOptions';
import { divergeMessage, frameMessage } from './messages';
import { sendTurn } from '../chat/client';
import type { BiasAnswer } from '../chat/tools';

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

/** The five answered questions, in panel order. `sunkCost` is excluded: it is a number. */
const GATE_FIELDS = [
  'survivorship',
  'ostrich',
  'hastyGeneralisation',
  'causation',
  'falseComparison',
] as const;

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
  /**
   * Which elicitation panel is open, if any.
   *
   * One state rather than two booleans: two panels cannot be open at once, and a
   * pair of booleans would allow exactly that state to exist.
   */
  const [chat, setChat] = useState<'options' | 'bias' | null>(null);

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
   * Accepts the options the user ticked by **filling the template's rows**, not
   * by appending beside them. Two accepted options in a three-row template leave
   * three rows, not five: a surplus blank row is dropped, and a fourth accepted
   * option adds a fourth row.
   *
   * Scores belonging to a removed row go with it, so nothing is left pointing at
   * an option that no longer exists.
   */
  function acceptSuggestedOptions(accepted: string[]): void {
    const filled = fillOptionSlots(options, accepted);
    const keptIds = new Set(filled.map((option) => option.id));

    setOptions(filled);
    setItems(items.filter((item) => keptIds.has(item.optionId)));
  }

  /** A re-framed aim becomes a real objective, with its own swing weight. */
  function addSuggestedObjective(text: string): void {
    const id = nextId('o', objectives);
    setObjectives([...objectives, { id, statement: text, kind: 'motivation' }]);
    setSwingPoints({ ...swingPoints, [id]: 50 });
  }

  /**
   * Writes accepted bias answers into the gate.
   *
   * Only fields the user ticked are written, and an empty answer is never written:
   * the gate treats a blank field as unanswered, so writing `''` would look like
   * the question had been answered and skipped.
   */
  function acceptBiasAnswers(answers: BiasAnswer[]): void {
    const patch: Partial<GateInputs> = {};
    for (const answer of answers) {
      if (answer.text.trim() !== '') {
        patch[answer.field] = answer.text.trim();
      }
    }
    if (Object.keys(patch).length > 0) {
      setGate({ ...gate, ...patch });
    }
  }

  function removeOption(id: string): void {
    setOptions(options.filter((option) => option.id !== id));
    setItems(items.filter((item) => item.optionId !== id));
  }

  return (
    <>
      <header className="work__head">
        <div className="work__head-main">
          <p className="work__kicker">Keputusan</p>
          <input
            aria-label="Decision title"
            className="work__title-input"
            placeholder="Apa yang sedang kamu putuskan?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="work__actions">
          <button type="button" className="btn-quiet" onClick={() => window.print()}>
            Cetak
          </button>
          <button type="button" className="btn-quiet" onClick={onDelete}>
            Hapus
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
            <Bi text={copy.objectives} />
          </h2>
          <p className="panel__hint">
            <Bi text={copy.objectivesHint} />
          </p>
        </div>

        {objectives.map((objective, index) => (
          <div key={objective.id} className="field">
            {/* Numbered labels stay Indonesian-only. They are structure, not
                description: a reader who needs "Tujuan 2" translated is not
                helped by a second line, and inside a <label> it would become part
                of the field's accessible name. */}
            <label htmlFor={`objective-${index}`}>Tujuan {index + 1}</label>
            <div className="row-actions">
              <input
                id={`objective-${index}`}
                value={objective.statement}
                placeholder="mis. Penghasilan naik tanpa jam kerja lebih panjang"
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
                Hapus
              </button>
            </div>
          </div>
        ))}

        {frameMessage(frame) !== null && (
          <p className="note note--warn">{frameMessage(frame)}</p>
        )}
        <button type="button" onClick={addObjective}>
          Tambah tujuan
        </button>
      </section>

      <section className="panel" aria-labelledby="diverge-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="diverge-heading">
            <Bi text={copy.options} />
          </h2>
          <p className="panel__hint">
            <Bi text={copy.optionsHint} />
          </p>
        </div>

        {options.map((option, index) => (
          <div key={option.id} className="field">
            <label htmlFor={`option-${index}`}>
              Opsi {index + 1}
              {option.isBaseline ? ` · ${copy.baseline.id}` : ''}
            </label>
            <div className="row-actions">
              <input
                id={`option-${index}`}
                value={option.label}
                placeholder={
                  option.isBaseline ? 'Tidak melakukan apa-apa' : 'Beri nama opsi ini'
                }
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
                Hapus
              </button>
            </div>
          </div>
        ))}

        {divergeMessage(diverge, options) !== null && (
          <p className="note note--warn">{divergeMessage(diverge, options)}</p>
        )}
        <button type="button" onClick={addOption}>
          Tambah opsi
        </button>

        {chat === 'options' ? (
          <ChatPanel
            scope="options"
            title={title}
            objectives={objectives.map((objective) => objective.statement)}
            existingOptions={options.map((option) => option.label)}
            onSend={sendTurn}
            onAccept={acceptSuggestedOptions}
            onAddObjective={addSuggestedObjective}
            onClose={() => setChat(null)}
          />
        ) : (
          <AiTrigger scope="options" onOpen={() => setChat('options')} />
        )}
      </section>

      <section className="panel" aria-labelledby="weigh-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="weigh-heading">
            <Bi text={copy.weights} />
          </h2>
          <p className="panel__hint">
            <Bi text={copy.weightsHint} />
          </p>
        </div>

        <div className="field-row">
          {objectives.map((objective, index) => (
            <div key={objective.id}>
              <label htmlFor={`swing-${index}`}>
                Bobot untuk {objective.statement || `tujuan ${index + 1}`}
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

      <GatePanel
        value={gate}
        onChange={setGate}
        ask={
          chat === 'bias' ? (
            <ChatPanel
              scope="bias"
              title={title}
              objectives={objectives.map((objective) => objective.statement)}
              existingOptions={[]}
              existingAnswers={GATE_FIELDS.map((field) => gate[field]).filter(
                (answer) => answer.trim() !== '',
              )}
              onSend={sendTurn}
              onAccept={acceptSuggestedOptions}
              onAcceptAnswers={acceptBiasAnswers}
              onAddObjective={addSuggestedObjective}
              onClose={() => setChat(null)}
            />
          ) : (
            <AiTrigger scope="bias" onOpen={() => setChat('bias')} />
          )
        }
      />

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

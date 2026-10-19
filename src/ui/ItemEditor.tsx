import { useState } from 'react';
import type { Item } from '../core';
import { bi } from './Bi';
import { copy } from './i18n';

interface ItemEditorProps {
  /** Unique within the page, so ids do not collide across rows. */
  idPrefix: string;
  /** The accessible name for the group, e.g. "Pindah on Penghasilan". */
  label: string;
  item: Item | undefined;
  /** `null` means "remove this item", which happens when the value is cleared. */
  onChange: (next: Item | null) => void;
}

/**
 * One scored item: value, benefit-or-cost, probability, reference class, and the
 * fatal flag.
 *
 * The plain score field this replaces hardcoded `kind: 'benefit'`,
 * `probability: 1`, `risk: 'ordinary'`. That made the engine's two most
 * important ideas — that a cost subtracts, and that a fatal risk is not priced —
 * unreachable from the app, so the form could only ever express a naive
 * pros-and-cons score.
 */
export function ItemEditor({ idPrefix, label, item, onChange }: ItemEditorProps) {
  const value = item?.value;
  const kind = item?.kind ?? 'benefit';
  const risk = item?.risk ?? 'ordinary';
  const probability = item?.probability ?? 1;
  const referenceClass = item?.referenceClass ?? '';

  // The probability field needs its own draft. It is a controlled number input,
  // and a controlled one cannot hold the intermediate states a user types
  // through ("0.", "0.4"): rejecting the partial value snaps the field back to
  // the committed one, so the digits after the decimal point are unreachable.
  const [probabilityDraft, setProbabilityDraft] = useState<string | null>(null);
  const probabilityText = probabilityDraft ?? String(item?.probability ?? 1);

  const emit = (patch: Partial<Item>) => {
    if (item === undefined) {
      // First edit of an empty row: create it from the defaults, so the user does
      // not have to fill four fields before the fifth one works.
      onChange({ ...defaults(idPrefix), ...patch });
      return;
    }
    onChange({ ...item, ...patch });
  };

  return (
    <div className="item">
      {/* The label is an accessible name only. The matrix already prints the
          option name in its row and the objective in its column, so showing it
          again in every cell would be the same sentence nine times. */}
      <span className="sr-only">{label}</span>

      <div className="item__meta">
        <div>
          {/* Indonesian only: these labels sit in a dense matrix cell, where a
              second line per field would push the grid out of shape. The words
              are short and repeat across every cell, so they are learned once. */}
          <label htmlFor={`${idPrefix}-value`}>{bi(copy.value)}</label>
          <input
            id={`${idPrefix}-value`}
            type="number"
            min={1}
            max={5}
            step={0.5}
            placeholder="1-5"
            value={value ?? ''}
            onChange={(event) => {
              if (event.target.value === '') {
                onChange(null);
                return;
              }
              const parsed = Number(event.target.value);
              if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
                return;
              }
              emit({ value: parsed });
            }}
          />
        </div>

        <div>
          <label htmlFor={`${idPrefix}-kind`}>{bi(copy.kind)}</label>
          <select
            id={`${idPrefix}-kind`}
            value={kind}
            onChange={(event) => emit({ kind: event.target.value === 'cost' ? 'cost' : 'benefit' })}
          >
            <option value="benefit">{bi(copy.benefit)}</option>
            <option value="cost">{bi(copy.cost)}</option>
          </select>
        </div>
      </div>

      {/* The three refinements live behind a disclosure. In the matrix the job is
          scanning values across options; five stacked fields per cell turns a
          comparison into a wall of inputs. <details> keeps them one click away
          and needs no JavaScript. */}
      <details className="item__more">
        <summary>
          {probability !== 1 ? `P ${probability}` : 'Peluang'}
          {risk === 'fatal' ? ' · fatal' : ''}
        </summary>

        <label htmlFor={`${idPrefix}-probability`}>{bi(copy.probability)}</label>
        <input
          id={`${idPrefix}-probability`}
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={probabilityText}
          onChange={(event) => {
            const text = event.target.value;
            setProbabilityDraft(text);

            if (text === '') {
              return;
            }
            const parsed = Number(text);
            if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
              // Keep the typed text visible so the user can correct it, but do not
              // commit an out-of-range probability to the engine.
              return;
            }
            emit({ probability: parsed });
          }}
          onBlur={() => setProbabilityDraft(null)}
        />

        <label htmlFor={`${idPrefix}-reference`}>{bi(copy.referenceClass)}</label>
        <input
          id={`${idPrefix}-reference`}
          value={referenceClass}
          placeholder="kasus serupa?"
          onChange={(event) => emit({ referenceClass: event.target.value })}
        />

        <label className="check" htmlFor={`${idPrefix}-fatal`}>
          <input
            id={`${idPrefix}-fatal`}
            type="checkbox"
            checked={risk === 'fatal'}
            onChange={(event) => emit({ risk: event.target.checked ? 'fatal' : 'ordinary' })}
          />
          Risiko fatal
        </label>
      </details>
    </div>
  );
}

/**
 * `idPrefix` is the item id, so it is also the option and objective pair. Parsing
 * it back is safe because the app generates it; an item arriving from a shared
 * URL keeps its own ids, which is why this is only used for a brand-new row.
 */
function defaults(idPrefix: string): Item {
  const [optionId, objectiveId] = idPrefix.split('--');
  return {
    id: idPrefix,
    optionId: optionId ?? idPrefix,
    objectiveId: objectiveId ?? '',
    kind: 'benefit',
    value: 3,
    probability: 1,
    risk: 'ordinary',
  };
}

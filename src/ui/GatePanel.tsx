import { validateGate, type GateInputs } from '../core';
import type { ReactNode } from 'react';
import { Bi } from './Bi';
import { copy } from './i18n';
import { gateMessage } from './messages';

interface GatePanelProps {
  value: GateInputs;
  onChange: (next: GateInputs) => void;
  /**
   * The elicitation trigger or the open panel.
   *
   * A slot rather than a callback so the panel stays a pure form: it does not
   * know the chat exists, and it can still be rendered and tested on its own.
   */
  ask?: ReactNode;
}

/**
 * The questions, in the order the panel asks them.
 *
 * `field` is the key the bias panel writes back to, so the wording here and the
 * tool's enum in `src/chat/tools.ts` have to agree. The bilingual copy lives in
 * `i18n.ts`; this table only says which key belongs to which field.
 */
const QUESTIONS: {
  field: Exclude<keyof GateInputs, 'sunkCost'>;
  id: string;
  question: keyof typeof copy;
  hint: keyof typeof copy;
}[] = [
  {
    field: 'survivorship',
    id: 'gate-survivorship',
    question: 'survivorship',
    hint: 'survivorshipHint',
  },
  { field: 'ostrich', id: 'gate-ostrich', question: 'ostrich', hint: 'ostrichHint' },
  {
    field: 'hastyGeneralisation',
    id: 'gate-hasty',
    question: 'hasty',
    hint: 'hastyHint',
  },
  { field: 'causation', id: 'gate-causation', question: 'causation', hint: 'causationHint' },
  {
    field: 'falseComparison',
    id: 'gate-comparison',
    question: 'comparison',
    hint: 'comparisonHint',
  },
];

/**
 * The bias gate, as required fields rather than advice.
 *
 * The value of this screen is that it cannot be skipped: a field that is merely
 * recommended is a field left blank. Sunk cost is shown with an explicit
 * "excluded from the arithmetic" label, because the exclusion has to be visible
 * to be believed — a number on screen that silently does not count is worse than
 * no number at all.
 */
export function GatePanel({ value, onChange, ask }: GatePanelProps) {
  const result = validateGate(value);

  const patch = (next: Partial<GateInputs>) => onChange({ ...value, ...next });

  return (
    <section className="panel" aria-labelledby="gate-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="gate-heading">
          <Bi text={copy.bias} />
        </h2>
        <p className="panel__hint">
          <Bi text={copy.biasHint} />
        </p>
      </div>

      <div className="field">
        <div className="field-row">
          <div>
            <label htmlFor="gate-sunk-amount">
              <Bi text={copy.sunkCost} />
            </label>
            <input
              id="gate-sunk-amount"
              type="number"
              min={0}
              value={value.sunkCost?.amount ?? ''}
              onChange={(event) => {
                if (event.target.value === '') {
                  patch({ sunkCost: null });
                  return;
                }
                const amount = Number(event.target.value);
                if (!Number.isFinite(amount) || amount < 0) {
                  return;
                }
                patch({ sunkCost: { amount, note: value.sunkCost?.note ?? '' } });
              }}
            />
          </div>
          <div>
            <label htmlFor="gate-sunk-note">
              <Bi text={copy.sunkNote} />
            </label>
            <input
              id="gate-sunk-note"
              value={value.sunkCost?.note ?? ''}
              onChange={(event) =>
                patch({
                  sunkCost: { amount: value.sunkCost?.amount ?? 0, note: event.target.value },
                })
              }
            />
          </div>
        </div>

        <p className="note">
          {/* A badge is a compact label, not prose: two languages inside one pill
              is unreadable at this size. The sentence beside it is bilingual. */}
          <span className="badge badge--excluded">{copy.excluded.id}</span>{' '}
          <Bi text={copy.sunkWhy} />
        </p>
      </div>

      {QUESTIONS.map((entry) => (
        <div className="field" key={entry.field}>
          <label htmlFor={entry.id}>
            <Bi text={copy[entry.question]} />
          </label>
          <textarea
            id={entry.id}
            placeholder={copy[entry.hint].id}
            value={value[entry.field]}
            onChange={(event) => patch({ [entry.field]: event.target.value } as Partial<GateInputs>)}
          />
        </div>
      ))}

      {gateMessage(result) !== null && (
        <p className="note note--warn" role="status">
          {gateMessage(result)}
        </p>
      )}

      {/* Last, because the button is for the person who has read the questions
          and is stuck on one — not the first thing the panel says. */}
      {ask}
    </section>
  );
}

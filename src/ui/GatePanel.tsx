import { validateGate, type GateInputs } from '../core';

interface GatePanelProps {
  value: GateInputs;
  onChange: (next: GateInputs) => void;
}

const QUESTIONS: {
  field: Exclude<keyof GateInputs, 'sunkCost'>;
  id: string;
  question: string;
  hint: string;
}[] = [
  {
    field: 'survivorship',
    id: 'gate-survivorship',
    question: 'Who tried this and failed?',
    hint: 'Why have you not heard from them?',
  },
  {
    field: 'ostrich',
    id: 'gate-ostrich',
    question: 'What evidence are you avoiding?',
    hint: 'The thing you would rather not check.',
  },
  {
    field: 'hastyGeneralisation',
    id: 'gate-hasty',
    question: 'How many cases does this rest on?',
    hint: 'A number, not a feeling.',
  },
  {
    field: 'causation',
    id: 'gate-causation',
    question: 'Is this a cause, or a coincidence in time?',
    hint: 'What would have to be true for it to be a cause?',
  },
  {
    field: 'falseComparison',
    id: 'gate-comparison',
    question: 'What differs between your case and the comparison case?',
    hint: 'The comparison is usually cleaner than the reality.',
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
export function GatePanel({ value, onChange }: GatePanelProps) {
  const result = validateGate(value);

  const patch = (next: Partial<GateInputs>) => onChange({ ...value, ...next });

  return (
    <section aria-labelledby="gate-heading">
      <h2 id="gate-heading">Bias checks</h2>
      <p>Each question targets a specific way this decision could be wrong.</p>

      <div>
        <label htmlFor="gate-sunk-amount">Sunk cost already spent</label>
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

        <label htmlFor="gate-sunk-note">What it was for</label>
        <input
          id="gate-sunk-note"
          value={value.sunkCost?.note ?? ''}
          onChange={(event) =>
            patch({ sunkCost: { amount: value.sunkCost?.amount ?? 0, note: event.target.value } })
          }
        />

        <p>
          <strong>Excluded from the arithmetic.</strong> Money and time already spent are the same
          whether you continue or stop, so they cannot make one option better than another.
        </p>
      </div>

      {QUESTIONS.map((entry) => (
        <div key={entry.field}>
          <label htmlFor={entry.id}>{entry.question}</label>
          <p>{entry.hint}</p>
          <textarea
            id={entry.id}
            value={value[entry.field]}
            onChange={(event) => patch({ [entry.field]: event.target.value } as Partial<GateInputs>)}
          />
        </div>
      ))}

      {!result.ok && <p role="status">{result.reason}</p>}
    </section>
  );
}

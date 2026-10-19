import type { SunkCost } from './types';

/**
 * The bias checks, each as one required input rather than one paragraph of
 * advice. The value of this stage is that none of them can be skipped: a field
 * that is merely recommended is a field that is left blank.
 *
 * Sunk cost is recorded here and **excluded from all arithmetic**. It is a type
 * of its own so that no future scoring function can accidentally take it as an
 * input: there is nothing in `scoreDecision` or `stressTest` shaped like it.
 */
export type { SunkCost };

/**
 * The form state of the gate. `sunkCost` is nullable here because "not yet
 * asked" and "asked, and it is zero" are different states, and only the second
 * one may pass. The committed form is `Gate` in `types.ts`, where it is
 * required.
 */
export interface GateInputs {
  sunkCost: SunkCost | null;
  /** "Who tried this and failed? Why haven't you heard from them?" */
  survivorship: string;
  /** "What evidence are you avoiding?" */
  ostrich: string;
  /** "How many cases does this rest on?" */
  hastyGeneralisation: string;
  /** "Is this a cause, or a coincidence in time?" */
  causation: string;
  /** "What differs between your case and the comparison case?" */
  falseComparison: string;
}

export interface GateResult {
  ok: boolean;
  /** Field names that are still empty, in the order the gate checks them. */
  missing: (keyof GateInputs)[];
  reason?: string;
}

const REQUIRED_TEXT: Exclude<keyof GateInputs, 'sunkCost'>[] = [
  'survivorship',
  'ostrich',
  'hastyGeneralisation',
  'causation',
  'falseComparison',
];

const FIELD_LABELS: Record<keyof GateInputs, string> = {
  sunkCost: 'sunk cost',
  survivorship: 'who tried and failed',
  ostrich: 'evidence you are avoiding',
  hastyGeneralisation: 'how many cases',
  causation: 'cause or coincidence',
  falseComparison: 'what differs',
};

/**
 * False dichotomy and miscalibrated probability are enforced elsewhere, by the
 * option floor and the reference-class rule. They are not repeated here: one
 * mechanism per bias, so that a failure points at exactly one stage.
 */
export function validateGate(inputs: GateInputs): GateResult {
  const missing: (keyof GateInputs)[] = [];

  // Sunk cost must be recorded, even when there is none. A null means the
  // question was not asked; `{ amount: 0 }` means it was asked and answered.
  if (inputs.sunkCost === null || inputs.sunkCost === undefined) {
    missing.push('sunkCost');
  } else if (typeof inputs.sunkCost.amount !== 'number' || !Number.isFinite(inputs.sunkCost.amount)) {
    missing.push('sunkCost');
  }

  for (const field of REQUIRED_TEXT) {
    if (!isFilled(inputs[field])) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    // Field names are for the developer, not the user: "hastyGeneralisation" is
    // not a sentence anyone should have to read.
    const named = missing.map((field) => FIELD_LABELS[field]).join(', ');
    return {
      ok: false,
      missing,
      reason:
        missing.length === 1
          ? `One bias check is unanswered: ${named}.`
          : `${missing.length} bias checks are unanswered: ${named}.`,
    };
  }

  return { ok: true, missing };
}

function isFilled(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

import type { DivergeResult, FrameResult, GateInputs, GateResult } from '../core';
import { copy } from './i18n';

/**
 * The interface's own sentences for engine failures.
 *
 * The engine is a pure library and speaks English — `validateDiverge` returns
 * "No baseline option. One option must be…". Printing that in an Indonesian form
 * is the app handing its voice to a library, which is the same mistake as letting
 * a model author the interface.
 *
 * So the UI derives its own sentence from the structured parts of the result
 * (`missing`, and the option list it already holds) and never shows `reason`.
 * The engine's strings stay for logs and for the core's own tests.
 */

export function divergeMessage(result: DivergeResult, options: { label: string; isBaseline: boolean }[]): string | null {
  if (result.ok) {
    return null;
  }

  if (options.length < 3) {
    // The count is stated here because this is the last place it is stated at
    // all: the form cannot go below three rows, so this branch is a backstop for
    // a decision that arrived with fewer, not a warning a user normally sees.
    return `Baru ada ${options.length} opsi. Minimal tiga.`;
  }

  const baselines = options.filter((option) => option.isBaseline).length;
  if (baselines === 0) {
    return 'Belum ada opsi pembanding. Satu opsi harus "tidak melakukan apa-apa", untuk dibandingkan.';
  }
  if (baselines > 1) {
    return `Ada ${baselines} opsi yang ditandai sebagai pembanding. Seharusnya tepat satu.`;
  }

  const unnamed = options.filter((option) => option.label.trim() === '').length;
  if (unnamed === 1) {
    return 'Ada satu opsi yang belum punya nama. Opsi yang tidak bisa kamu sebutkan bukan opsi.';
  }
  if (unnamed > 1) {
    return `Ada ${unnamed} opsi yang belum punya nama. Opsi yang tidak bisa kamu sebutkan bukan opsi.`;
  }

  // The result failed for a reason this function does not model. Saying so is
  // better than inventing a cause.
  return 'Opsi belum bisa dipakai. Periksa daftar di atas.';
}

export function frameMessage(result: FrameResult): string | null {
  if (result.ok) {
    return null;
  }
  return 'Belum ada tujuan. Tulis dulu apa yang mau kamu capai sebelum menilai opsi.';
}

/** The gate names the fields it is missing; the labels are the panel's own. */
const GATE_LABELS: Record<keyof GateInputs, string> = {
  sunkCost: copy.sunkCost.id,
  survivorship: copy.survivorship.id,
  ostrich: copy.ostrich.id,
  hastyGeneralisation: copy.hasty.id,
  causation: copy.causation.id,
  falseComparison: copy.comparison.id,
};

export function gateMessage(result: GateResult): string | null {
  if (result.ok) {
    return null;
  }
  const named = result.missing.map((field) => GATE_LABELS[field]).join(', ');
  return result.missing.length === 1
    ? `Satu pemeriksaan belum dijawab: ${named}.`
    : `${result.missing.length} pemeriksaan belum dijawab: ${named}.`;
}

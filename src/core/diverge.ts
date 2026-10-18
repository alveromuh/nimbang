import type { Option } from './types';

export interface DivergeResult {
  ok: boolean;
  reason?: string;
}

/**
 * The false-dichotomy check, made mechanical: at least three options, exactly
 * one of which is the baseline ("do nothing" or its equivalent).
 *
 * Both halves matter. Fewer than three options is the false dichotomy itself;
 * no baseline removes the comparison against doing nothing, which is the option
 * with the lowest switching cost and therefore the one most often ignored.
 */
export function validateDiverge(input: { options: Option[] }): DivergeResult {
  const { options } = input;

  if (options.length < 3) {
    return {
      ok: false,
      reason: `Only ${options.length} option(s). At least three are required, including doing nothing.`,
    };
  }

  const baselines = options.filter((option) => option.isBaseline).length;

  if (baselines === 0) {
    return {
      ok: false,
      reason: 'No baseline option. One option must be "do nothing", to compare against.',
    };
  }

  if (baselines > 1) {
    return {
      ok: false,
      reason: `${baselines} options are marked as the baseline. Exactly one must be.`,
    };
  }

  const unnamed = options.filter((option) => option.label.trim().length === 0).length;

  if (unnamed > 0) {
    return {
      ok: false,
      reason: `${unnamed} option(s) have no name. An option you cannot state is not an option.`,
    };
  }

  return { ok: true };
}

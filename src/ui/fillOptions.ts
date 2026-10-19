import type { Option } from '../core';

/**
 * Fills the option slots with accepted suggestions.
 *
 * The template gives every new decision three rows: one baseline and two blanks.
 * Accepting suggestions should **fill those rows**, not append beside them —
 * otherwise a user who accepted two options ends up with five rows, two of which
 * are empty, and has to tidy up after the feature that was meant to help.
 *
 * The rules:
 *
 * - A blank row is filled before a new row is created.
 * - A row the user typed by hand is never overwritten.
 * - Surplus blank rows are dropped, so the list has no empty trailing rows.
 * - More suggestions than rows adds rows.
 * - Exactly one baseline survives, because the engine refuses to score a decision
 *   without one.
 */
export function fillOptionSlots(existing: Option[], accepted: string[]): Option[] {
  const wanted = dedupe(accepted);
  if (wanted.length === 0) {
    return existing;
  }

  const next = existing.map((option) => ({ ...option }));

  // No baseline detection from the accepted text. The template's baseline row
  // already has a label, so it is preserved by the dedupe below like any other
  // filled row. Trying to guess which suggestion "means" the baseline would
  // overwrite a real option — "Stay" is a baseline word and also a perfectly
  // good option of its own.

  const taken = new Set(
    next.map((option) => option.label.trim().toLowerCase()).filter((label) => label !== ''),
  );

  for (const label of wanted) {
    if (taken.has(label.toLowerCase())) {
      // Already in the list, by the user's own hand or by this loop.
      continue;
    }

    const blank = next.find((option) => option.label.trim() === '');
    if (blank !== undefined) {
      blank.label = label;
    } else {
      next.push({ id: nextId(next), label, isBaseline: false });
    }
    taken.add(label.toLowerCase());
  }

  // Drop rows still blank: they were template scaffolding, not the user's options.
  const kept = next.filter((option) => option.label.trim() !== '' || option.isBaseline);

  return ensureSingleBaseline(kept);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = trimmed.toLowerCase();
    if (trimmed === '' || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

/**
 * Exactly one baseline, always. If the accepted list removed the baseline row,
 * the first option takes over: a decision with none cannot be scored at all.
 */
function ensureSingleBaseline(options: Option[]): Option[] {
  if (options.length === 0) {
    return options;
  }

  const baselines = options.filter((option) => option.isBaseline);
  if (baselines.length === 1) {
    return options;
  }

  return options.map((option, index) => ({ ...option, isBaseline: index === 0 }));
}

/** A fresh id that does not collide with the list it is joining. */
function nextId(options: Option[]): string {
  const taken = new Set(options.map((option) => option.id));
  let index = 1;
  while (taken.has(`x${index}`)) {
    index += 1;
  }
  return `x${index}`;
}

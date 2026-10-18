import { DecisionSchema, type Decision } from '../core';

/**
 * Draft persistence.
 *
 * Lives in `src/ui/`, not `src/core/`, because `src/core/` must not touch a
 * storage API. The engine takes plain data and returns plain data; deciding
 * where a draft is kept is the app's job.
 */
export const STORAGE_KEY = 'nimbang.draft.v1';

/**
 * The slice of the Storage interface this module uses. Narrow on purpose: a test
 * can pass a plain object, and the adapter cannot start depending on a browser
 * API it does not need.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Storage is injected rather than reached for directly.
 *
 * jsdom exposes `window._localStorage` but its `localStorage` getter returns
 * undefined under vitest, so a module that reads the global is untestable in
 * this environment. Injecting it also keeps the adapter honest: it has no
 * opinion about where the bytes live.
 */
export function resolveStorage(): StorageLike | null {
  try {
    const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
    return candidate ?? null;
  } catch {
    // Accessing localStorage throws outright in some privacy modes.
    return null;
  }
}

/**
 * Saves the draft. Returns false when storage is unavailable or refuses, which
 * happens in private modes and when the quota is full. The caller is expected to
 * keep working: losing persistence is not a reason to lose the form.
 */
export function saveDraft(decision: Decision, storage: StorageLike | null = resolveStorage()): boolean {
  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(decision));
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads the draft, or null if there is nothing usable.
 *
 * Every failure returns null rather than throwing: a corrupt or outdated draft
 * is not an error the user can act on, and crashing on startup because of a
 * stale key would be worse than starting fresh. The schema check means a draft
 * written by an older version with an incompatible shape is discarded instead of
 * half-loading.
 */
export function loadDraft(storage: StorageLike | null = resolveStorage()): Decision | null {
  if (storage === null) {
    return null;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = DecisionSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

export function clearDraft(storage: StorageLike | null = resolveStorage()): void {
  if (storage === null) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the draft is already unreachable.
  }
}

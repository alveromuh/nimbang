import { DecisionSchema, type Decision } from '../core';
import { resolveStorage, type StorageLike } from './persistence';

export type { StorageLike };

/**
 * The decisions library.
 *
 * A dashboard needs more than one decision, so storage moves from a single
 * draft key to one key per decision plus an index. `StorageLike` is reused from
 * the draft module: the same injected adapter serves both.
 *
 * Migration matters here. Users of the previous version have a single
 * `nimbang.draft.v1` key; a library that ignored it would silently delete their
 * work on first load.
 */
export const INDEX_KEY = 'nimbang.decisions.v1';
export const DECISION_PREFIX = 'nimbang.decision.';
export const LEGACY_DRAFT_KEY = 'nimbang.draft.v1';

export function decisionKey(id: string): string {
  return `${DECISION_PREFIX}${id}`;
}

/**
 * A new decision with the shape the option floor and objective gate require:
 * one objective, three options, exactly one baseline, and a swing weight for
 * every objective. Blank, but never invalid.
 */
export function createDecision(now: string = new Date().toISOString()): Decision {
  return {
    id: newId(),
    title: '',
    objectives: [{ id: 'o1', statement: '', kind: 'motivation' }],
    options: [
      // Indonesian, like the rest of the interface: this is a starting value the
      // user reads and edits, not an enum. The engine only cares that exactly one
      // option carries `isBaseline`.
      { id: 'a', label: 'Tidak melakukan apa-apa', isBaseline: true },
      { id: 'b', label: '', isBaseline: false },
      { id: 'c', label: '', isBaseline: false },
    ],
    items: [],
    claims: [],
    swingPoints: { o1: 100 },
    updatedAt: now,
  };
}

/**
 * Writes the decision and refreshes the index. The index is a list of ids only:
 * storing the documents twice would let the two copies disagree.
 */
export function saveDecision(decision: Decision, storage: StorageLike | null = resolveStorage()): boolean {
  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(decisionKey(decision.id), JSON.stringify(decision));

    const ids = readIndex(storage);
    if (!ids.includes(decision.id)) {
      storage.setItem(INDEX_KEY, JSON.stringify([decision.id, ...ids]));
    }
    return true;
  } catch {
    return false;
  }
}

export function loadDecision(id: string, storage: StorageLike | null = resolveStorage()): Decision | null {
  if (storage === null) {
    return null;
  }

  try {
    const raw = storage.getItem(decisionKey(id));
    return raw === null ? null : parseDecision(raw);
  } catch {
    return null;
  }
}

/**
 * Every readable decision, newest first.
 *
 * A corrupt record is skipped rather than thrown: one bad entry must not make
 * the dashboard look empty, which would read as data loss.
 */
export function listDecisions(storage: StorageLike | null = resolveStorage()): Decision[] {
  if (storage === null) {
    return [];
  }

  migrateLegacyDraft(storage);

  const decisions: Decision[] = [];
  for (const id of readIndex(storage)) {
    const decision = loadDecision(id, storage);
    if (decision !== null) {
      decisions.push(decision);
    }
  }

  return decisions.sort((left, right) => timestamp(right) - timestamp(left));
}

export function deleteDecision(id: string, storage: StorageLike | null = resolveStorage()): void {
  if (storage === null) {
    return;
  }

  try {
    storage.removeItem(decisionKey(id));
    storage.setItem(INDEX_KEY, JSON.stringify(readIndex(storage).filter((entry) => entry !== id)));
  } catch {
    // Nothing to do: the decision is already unreachable.
  }
}

function readIndex(storage: StorageLike): string[] {
  try {
    const raw = storage.getItem(INDEX_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function parseDecision(raw: string): Decision | null {
  try {
    const result = DecisionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Moves the old single draft into the library, once. The legacy key is left in
 * place: if the migration half-fails, the original is still there to retry.
 */
function migrateLegacyDraft(storage: StorageLike): void {
  let raw: string | null;
  try {
    raw = storage.getItem(LEGACY_DRAFT_KEY);
  } catch {
    return;
  }

  if (raw === null) {
    return;
  }

  const decision = parseDecision(raw);
  if (decision === null) {
    return;
  }

  saveDecision(decision, storage);
}

function timestamp(decision: Decision): number {
  const parsed = Date.parse(decision.updatedAt ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function newId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  // A counter-free fallback for environments without crypto.randomUUID. Uniqueness
  // only has to hold within one browser's storage.
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

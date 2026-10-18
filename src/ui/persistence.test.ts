import { describe, it, expect } from 'vitest';
import { clearDraft, loadDraft, saveDraft, STORAGE_KEY, type StorageLike } from './persistence';
import type { Decision } from '../core';

const decision: Decision = {
  id: 'd1',
  title: 'Pindah kerja',
  objectives: [{ id: 'o1', statement: 'Penghasilan', kind: 'motivation' }],
  options: [
    { id: 'a', label: 'Tetap', isBaseline: true },
    { id: 'b', label: 'Pindah', isBaseline: false },
    { id: 'c', label: 'Negosiasi', isBaseline: false },
  ],
  items: [
    { id: 'a-o1', optionId: 'a', objectiveId: 'o1', kind: 'benefit', value: 2, probability: 1, risk: 'ordinary' },
  ],
  claims: [],
  swingPoints: { o1: 100 },
};

/**
 * A real in-memory store rather than jsdom's. jsdom exposes
 * `window._localStorage` but its `localStorage` getter returns undefined under
 * vitest, so reading the global in a test would be testing the environment
 * rather than the adapter. Injection keeps the test about our code.
 */
function memoryStorage(): StorageLike & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}

describe('persistence', () => {
  it('returns null when nothing is stored', () => {
    expect(loadDraft(memoryStorage())).toBeNull();
  });

  it('saves and loads a decision', () => {
    const storage = memoryStorage();
    expect(saveDraft(decision, storage)).toBe(true);
    expect(loadDraft(storage)).toEqual(decision);
  });

  it('writes under a namespaced key, not a generic one', () => {
    const storage = memoryStorage();
    saveDraft(decision, storage);
    expect(storage.entries.has(STORAGE_KEY)).toBe(true);
    expect(STORAGE_KEY).toMatch(/^nimbang\./);
  });

  it('returns null rather than throwing on corrupt storage', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, 'not json');
    expect(loadDraft(storage)).toBeNull();
  });

  it('returns null rather than throwing on valid JSON that is not a decision', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ hello: 'world' }));
    expect(loadDraft(storage)).toBeNull();
  });

  it('clears the draft', () => {
    const storage = memoryStorage();
    saveDraft(decision, storage);
    clearDraft(storage);
    expect(loadDraft(storage)).toBeNull();
  });

  it('survives storage that throws, which private modes do', () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(loadDraft(hostile)).toBeNull();
    expect(saveDraft(decision, hostile)).toBe(false);
    expect(() => clearDraft(hostile)).not.toThrow();
  });

  it('reports failure instead of throwing when there is no storage at all', () => {
    expect(saveDraft(decision, null)).toBe(false);
    expect(loadDraft(null)).toBeNull();
    expect(() => clearDraft(null)).not.toThrow();
  });

  it('resolves the global storage when no adapter is passed', () => {
    // The default argument is the browser path. jsdom's localStorage getter
    // returns undefined under vitest, so this asserts the behaviour that
    // matters: with no usable global, the adapter degrades instead of throwing.
    expect(() => saveDraft(decision)).not.toThrow();
    expect(() => loadDraft()).not.toThrow();
    expect(() => clearDraft()).not.toThrow();
  });
});

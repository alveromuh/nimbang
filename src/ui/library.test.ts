import { describe, it, expect } from 'vitest';
import {
  createDecision,
  deleteDecision,
  listDecisions,
  loadDecision,
  saveDecision,
  type StorageLike,
} from './library';

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

describe('decision library', () => {
  it('starts empty', () => {
    expect(listDecisions(memoryStorage())).toEqual([]);
  });

  it('creates a decision with a blank but valid shape', () => {
    const decision = createDecision();
    expect(decision.id).toBeTruthy();
    expect(decision.objectives).toHaveLength(1);
    expect(decision.options).toHaveLength(3);
    expect(decision.options.filter((option) => option.isBaseline)).toHaveLength(1);
    expect(decision.swingPoints).toBeDefined();
  });

  it('saves and loads one decision by id', () => {
    const storage = memoryStorage();
    const decision = { ...createDecision(), title: 'Pindah kerja' };
    saveDecision(decision, storage);
    expect(loadDecision(decision.id, storage)?.title).toBe('Pindah kerja');
  });

  it('lists decisions newest first', () => {
    const storage = memoryStorage();
    saveDecision({ ...createDecision(), id: 'old', title: 'Old', updatedAt: '2026-01-01T00:00:00.000Z' }, storage);
    saveDecision({ ...createDecision(), id: 'new', title: 'New', updatedAt: '2026-06-01T00:00:00.000Z' }, storage);
    expect(listDecisions(storage).map((entry) => entry.id)).toEqual(['new', 'old']);
  });

  it('deletes a decision without touching the others', () => {
    const storage = memoryStorage();
    const keep = { ...createDecision(), id: 'keep' };
    const drop = { ...createDecision(), id: 'drop' };
    saveDecision(keep, storage);
    saveDecision(drop, storage);

    deleteDecision('drop', storage);
    expect(listDecisions(storage).map((entry) => entry.id)).toEqual(['keep']);
  });

  it('ignores a corrupt entry instead of losing the whole library', () => {
    const storage = memoryStorage();
    saveDecision({ ...createDecision(), id: 'good' }, storage);
    storage.setItem('nimbang.decision.broken', 'not json');

    // One bad record must not make the dashboard empty.
    expect(listDecisions(storage).map((entry) => entry.id)).toEqual(['good']);
  });

  it('migrates a v1 single-draft key once so deletion stays permanent', () => {
    const storage = memoryStorage();
    storage.setItem(
      'nimbang.draft.v1',
      JSON.stringify({ ...createDecision(), id: 'legacy', title: 'From the old draft' }),
    );

    expect(listDecisions(storage).map((entry) => entry.title)).toEqual(['From the old draft']);
    deleteDecision('legacy', storage);
    expect(listDecisions(storage)).toEqual([]);
  });

  it('returns null for an unknown id', () => {
    expect(loadDecision('nope', memoryStorage())).toBeNull();
  });
});

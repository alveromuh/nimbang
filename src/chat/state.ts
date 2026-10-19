/**
 * The conversation as a pure reducer.
 *
 * No network, no React, no storage. A chat is a state machine, and making it one
 * means the hard parts — turn limits, de-duplication, what happens after an
 * error — are testable without a model in the loop. At 50 requests a day, a test
 * suite that calls the model is a test suite nobody can afford to run.
 */

export type Scope = 'options' | 'bias';

/**
 * Six turns. A conversation that never ends is a conversation that never
 * decides, and the free tier is the binding constraint anyway.
 */
export const MAX_TURNS = 6;

export type ScopeFlagKind = 'missing_objective' | 'unrelated';

export interface Turn {
  role: 'model' | 'user';
  text: string;
}

export interface ScopeFlag {
  kind: ScopeFlagKind;
  text: string;
}

export interface ChatState {
  scope: Scope;
  turns: Turn[];
  /** What has been extracted so far, shown live so the user can correct it. */
  extracted: string[];
  /** Off-topic input that was re-framed rather than dropped. */
  flags: ScopeFlag[];
  replies: number;
  phase: 'asking' | 'done';
  error?: string;
}

export type ChatEvent =
  | { type: 'ask'; question: string }
  | { type: 'reply'; text: string }
  | { type: 'extract'; items: string[] }
  | { type: 'flag'; kind: ScopeFlagKind; text: string }
  | { type: 'finish'; items: string[] }
  | { type: 'stop' }
  | { type: 'fail'; message: string };

export function initialState(scope: Scope): ChatState {
  return { scope, turns: [], extracted: [], flags: [], replies: 0, phase: 'asking' };
}

export function reduce(state: ChatState, event: ChatEvent): ChatState {
  switch (event.type) {
    case 'ask':
      return { ...state, turns: [...state.turns, { role: 'model', text: event.question }] };

    case 'reply': {
      if (state.phase === 'done') {
        // Late input after the conversation closed is not silently appended: the
        // proposal the user is looking at was built from a finished state.
        return state;
      }
      const replies = state.replies + 1;
      return {
        ...state,
        turns: [...state.turns, { role: 'user', text: event.text }],
        replies,
        phase: replies >= MAX_TURNS ? 'done' : 'asking',
        error: undefined,
      };
    }

    case 'extract':
      return { ...state, extracted: mergeUnique(state.extracted, event.items) };

    case 'flag':
      return { ...state, flags: [...state.flags, { kind: event.kind, text: event.text }] };

    case 'finish':
      return {
        ...state,
        extracted: mergeUnique(state.extracted, event.items),
        phase: 'done',
      };

    case 'stop':
      return { ...state, phase: 'done' };

    case 'fail':
      // A failed turn is not a finished conversation. The user can retry, and the
      // error is shown rather than swallowed.
      return { ...state, error: event.message };
  }
}

/** Trims, drops empties, and keeps first-seen order so the list does not churn. */
function mergeUnique(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing);
  const merged = [...existing];

  for (const item of incoming) {
    const trimmed = item.trim();
    if (trimmed === '' || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    merged.push(trimmed);
  }

  return merged;
}

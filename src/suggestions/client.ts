import { QUESTIONS } from './questions';

/**
 * The shape System One returns. Declared narrowly and defensively: this is
 * network input, so every field is checked before it is trusted.
 */
export interface SystemOneResponse {
  model: string;
  usage: { input_tokens?: number; output_tokens?: number };
  answers: Record<string, SystemOneAnswer>;
}

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface NoulAnswer {
  type: 'noul';
  noul: number;
}

export type SystemOneAnswer = ChoiceAnswer | NoulAnswer;

/**
 * Failure modes, as distinct states rather than one generic error.
 *
 * The contract forbids silent fallback, and the UI needs to say *why* there is
 * nothing to show: "not configured" is a setup problem the user can act on,
 * while "unavailable" is a transient one. Collapsing them into one message would
 * make the feature look broken when it is merely unconfigured.
 */
export type SuggestionFailure = 'not_configured' | 'unavailable' | 'empty_state' | 'malformed';

export class SuggestionError extends Error {
  constructor(
    public readonly kind: SuggestionFailure,
    message: string,
  ) {
    super(message);
    this.name = 'SuggestionError';
  }
}

interface RequestOptions {
  state: string;
  fetchImpl?: typeof fetch;
  retries?: number;
  retryDelayMs?: number;
}

/**
 * Calls the app's own endpoint, never Kenari directly.
 *
 * The API key cannot live in a browser, so the browser talks to `/api/suggest`
 * and the server holds the key. That endpoint is the only server-side piece in
 * the project, and this function is the only place that knows its shape.
 */
export async function requestSuggestions({
  state,
  fetchImpl = fetch,
  retries = 4,
  retryDelayMs = 900,
}: RequestOptions): Promise<SystemOneResponse> {
  if (state.trim() === '') {
    // Nothing to classify. Calling the model here would spend tokens to produce
    // a guess about an empty page.
    throw new SuggestionError('empty_state', 'Write an objective first.');
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetchImpl('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, questions: QUESTIONS }),
    });

    if (response.status === 429) {
      // Free-tier rate limit. Retrying is correct; treating it as an answer is
      // the bug the project's first eval run made.
      await sleep(retryDelayMs * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      const body = await safeJson(response);
      if (body?.error === 'not_configured') {
        throw new SuggestionError(
          'not_configured',
          'Suggestions are not configured on this server.',
        );
      }
      throw new SuggestionError('unavailable', 'The suggestion service did not respond.');
    }

    const body = await safeJson(response);
    if (!isResponse(body)) {
      throw new SuggestionError(
        'malformed',
        'The suggestion service returned an unexpected shape.',
      );
    }
    return body;
  }

  throw new SuggestionError('unavailable', 'The suggestion service is busy. Try again.');
}

function isResponse(value: Record<string, unknown> | null): value is SystemOneResponse & Record<string, unknown> {
  if (value === null) {
    return false;
  }
  return (
    typeof value.model === 'string' &&
    typeof value.answers === 'object' &&
    value.answers !== null
  );
}

async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await response.json();
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

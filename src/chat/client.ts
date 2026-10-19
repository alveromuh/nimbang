import { SseAccumulator } from './sse';
import { TurnAssembler } from './assemble';
import type { ToolSpec, RawToolCall } from './tools';

/**
 * Talks to our own `/api/chat`, never to a gateway directly.
 *
 * The endpoint streams; this reads it, reports reasoning as it arrives, and
 * returns one assembled turn. Failures are named states rather than one generic
 * error, because the panel has to tell the user which one happened: a missing
 * key is theirs to fix, a rate limit is not.
 */

export type ChatFailure =
  | 'not_configured'
  | 'unauthorized'
  | 'rate_limited'
  | 'no_tools'
  | 'no_model'
  | 'unreachable'
  | 'malformed'
  | 'interrupted';

export class ChatError extends Error {
  constructor(
    public readonly kind: ChatFailure,
    message: string,
    public readonly retryAfter?: string,
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

export interface TurnResult {
  toolCalls: RawToolCall[];
  reasoning: string;
  content: string;
  truncated: boolean;
}

export interface SendTurnOptions {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  tools: ToolSpec[];
  /** Called as reasoning text streams in, for the "thinking…" indicator. */
  onReasoning?: (text: string) => void;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export async function sendTurn({
  messages,
  tools,
  onReasoning,
  fetchImpl = fetch,
  signal,
}: SendTurnOptions): Promise<TurnResult> {
  let response: Response;
  try {
    response = await fetchImpl('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, tools }),
      signal,
    });
  } catch {
    throw new ChatError('unreachable', 'Could not reach the chat endpoint.');
  }

  if (!response.ok) {
    throw await failureFor(response);
  }

  if (response.body === null) {
    throw new ChatError('malformed', 'The chat endpoint returned no body.');
  }

  const sse = new SseAccumulator();
  const assembler = new TurnAssembler();
  const reader = response.body.getReader();
  let sawDone = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      for (const event of sse.push(value)) {
        // [DONE] is not JSON; checking first is the documented rule.
        if (event.data === '[DONE]') {
          sawDone = true;
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          continue;
        }

        if (applyChunk(parsed, assembler, onReasoning)) {
          // A mid-stream error chunk. The turn is discarded: the user may already
          // have seen partial output, so silently retrying would be worse.
          throw new ChatError('interrupted', 'The reply was interrupted. Try again.');
        }
      }
    }
  } catch (error) {
    if (error instanceof ChatError) {
      throw error;
    }
    throw new ChatError('interrupted', 'The connection dropped mid-reply. Try again.');
  } finally {
    reader.releaseLock();
  }

  if (!sawDone) {
    // A stream that ends without the sentinel was truncated, and a truncated
    // tool call is not valid JSON.
    throw new ChatError('interrupted', 'The reply ended early. Try again.');
  }

  const assembled = assembler.result();
  return {
    toolCalls: assembled.toolCalls,
    reasoning: assembled.reasoning,
    content: assembled.content,
    truncated: assembled.truncated,
  };
}

/** Returns true when the chunk is an error, which ends the turn. */
function applyChunk(
  chunk: unknown,
  assembler: TurnAssembler,
  onReasoning: ((text: string) => void) | undefined,
): boolean {
  if (typeof chunk !== 'object' || chunk === null) {
    return false;
  }

  const record = chunk as Record<string, unknown>;

  if (record.error !== undefined) {
    return true;
  }

  const choices = record.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return false;
  }

  const choice = choices[0] as Record<string, unknown>;
  const delta = choice.delta as Record<string, unknown> | undefined;
  if (delta === undefined) {
    return false;
  }

  const reasoningDelta = textOf(delta.reasoning) ?? textOf(delta.reasoning_content);
  if (reasoningDelta !== undefined) {
    onReasoning?.(reasoningDelta);
  }

  const contentDelta = textOf(delta.content);
  const toolCalls = Array.isArray(delta.tool_calls) ? delta.tool_calls : [];

  if (toolCalls.length === 0) {
    assembler.add({ index: 0, reasoningDelta, contentDelta });
  }

  for (const [position, entry] of toolCalls.entries()) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const call = entry as Record<string, unknown>;
    const fn = (call.function ?? {}) as Record<string, unknown>;

    assembler.add({
      index: typeof call.index === 'number' ? call.index : position,
      name: typeof fn.name === 'string' ? fn.name : undefined,
      argumentsDelta: typeof fn.arguments === 'string' ? fn.arguments : undefined,
    });
  }

  if (typeof choice.finish_reason === 'string') {
    assembler.setFinishReason(choice.finish_reason);
  }

  return false;
}

function textOf(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

async function failureFor(response: Response): Promise<ChatError> {
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // Keep the default.
  }

  const retryAfter = response.headers.get('retry-after') ?? undefined;

  switch (body.error) {
    case 'not_configured':
      return new ChatError(
        'not_configured',
        'The chat is not configured on this server. Everything else still works.',
      );
    case 'unauthorized':
      return new ChatError('unauthorized', 'The gateway rejected the API key.');
    case 'rate_limited':
      return new ChatError(
        'rate_limited',
        'The gateway is rate limiting. Try again shortly.',
        retryAfter,
      );
    case 'no_tools':
      return new ChatError(
        'no_tools',
        'The configured model does not support tool calling, which this panel needs.',
      );
    case 'no_model':
      return new ChatError(
        'no_model',
        typeof body.message === 'string'
          ? body.message
          : 'No model is available. Set LLM_MODEL to choose one.',
      );
    default:
      return new ChatError('unreachable', 'The chat endpoint returned an error.');
  }
}

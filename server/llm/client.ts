import { joinUrl, type LlmConfig } from './config';

/**
 * One streaming turn against an OpenAI-compatible gateway.
 *
 * This module knows the wire format and nothing else: no provider names, no model
 * ids, no application logic. It yields text chunks and lets the caller assemble
 * them, which keeps the parsing rules (in src/chat) testable without a network.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolSpec {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface StreamOptions {
  config: LlmConfig;
  model: string;
  messages: ChatMessage[];
  tools: ToolSpec[];
  /** Buffers a partial turn; the caller decides how much to hold. */
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export type UpstreamFailure =
  | 'unauthorized'
  | 'rate_limited'
  | 'no_tools'
  | 'unreachable'
  | 'bad_request';

export class UpstreamError extends Error {
  constructor(
    public readonly kind: UpstreamFailure,
    message: string,
    /** Rate-limit headers, when the gateway sent them. */
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

/**
 * Opens the stream. The response body is returned raw so the caller can drive the
 * SSE parser; this function's job is to turn HTTP failures into named states.
 */
export async function openStream({
  config,
  model,
  messages,
  tools,
  signal,
  fetchImpl = fetch,
}: StreamOptions): Promise<ReadableStream<Uint8Array>> {
  const body: Record<string, unknown> = {
    model,
    messages,
    tools,
    // Force a tool call: there is no prose to parse, and no reliable way to tell
    // a finished conversation from a question otherwise.
    tool_choice: 'required',
    stream: true,
  };

  // Only sent when configured. A gateway that does not know this field can 400
  // on it, so a default here would break the ones that do not support it.
  if (config.reasoningEffort !== undefined) {
    body.reasoning_effort = config.reasoningEffort;
  }

  let response: Response;
  try {
    response = await fetchImpl(joinUrl(config.baseUrl, 'chat/completions'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw new UpstreamError('unreachable', 'Could not reach the model gateway.');
  }

  if (!response.ok) {
    throw await failureFor(response);
  }

  if (response.body === null) {
    throw new UpstreamError('unreachable', 'The gateway returned no response body.');
  }

  return response.body;
}

async function failureFor(response: Response): Promise<UpstreamError> {
  const headers = rateLimitHeaders(response);

  if (response.status === 401 || response.status === 403) {
    return new UpstreamError('unauthorized', 'The gateway rejected the API key.', headers);
  }

  if (response.status === 429) {
    return new UpstreamError('rate_limited', 'The gateway is rate limiting.', headers);
  }

  if (response.status === 400) {
    // The most common cause by far is a model that cannot call tools, and the
    // gateway says so in a 400 rather than a capability flag.
    const detail = await safeText(response);
    if (/tool|function/i.test(detail)) {
      return new UpstreamError(
        'no_tools',
        'The configured model does not support tool calling, which this panel needs.',
        headers,
      );
    }
    return new UpstreamError('bad_request', `The gateway rejected the request: ${detail.slice(0, 200)}`, headers);
  }

  return new UpstreamError('unreachable', `The gateway returned ${response.status}.`, headers);
}

/**
 * Rate-limit headers, forwarded so the panel can be honest about what is left.
 * Names vary between gateways, so this reads the common ones and passes through
 * anything else it recognises.
 */
export function rateLimitHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of [
    'retry-after',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'ratelimit-limit',
    'ratelimit-remaining',
    'ratelimit-reset',
  ]) {
    const value = response.headers.get(name);
    if (value !== null) {
      headers[name] = value;
    }
  }
  return headers;
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

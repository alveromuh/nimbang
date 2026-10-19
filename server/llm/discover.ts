import { joinUrl } from './config';

/**
 * Finds a model, without hardcoding one.
 *
 * `/v1/models` is the only listing the OpenAI-compatible contract guarantees, but
 * what it *contains* varies: some gateways return rich capability metadata
 * (reasoning, tool_call, pricing), most return `{id, object, owned_by}`. So this
 * probes rather than assumes — if capability fields are present it prefers a
 * model that supports tools, and if they are absent it takes the first id.
 *
 * Failure is loud and actionable. The whole point of not hardcoding an id is that
 * an id the gateway does not have is worse than asking the user which one to use.
 */

export type DiscoveryFailure = 'unauthorized' | 'unreachable' | 'empty';

export class DiscoveryError extends Error {
  constructor(
    public readonly kind: DiscoveryFailure,
    message: string,
  ) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

interface DiscoverOptions {
  baseUrl: string;
  apiKey: string;
  headers: Record<string, string>;
  fetchImpl?: typeof fetch;
}

interface ModelEntry {
  id?: unknown;
  endpoints?: unknown;
  tool_call?: unknown;
  reasoning?: unknown;
}

export async function discoverModel({
  baseUrl,
  apiKey,
  headers,
  fetchImpl = fetch,
}: DiscoverOptions): Promise<string> {
  let response: Response;

  try {
    response = await fetchImpl(joinUrl(baseUrl, 'models'), {
      headers: { Authorization: `Bearer ${apiKey}`, ...headers },
    });
  } catch {
    throw new DiscoveryError(
      'unreachable',
      'Could not reach the model list. Set LLM_MODEL to choose a model explicitly.',
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new DiscoveryError(
      'unauthorized',
      'The gateway rejected the API key while listing models.',
    );
  }

  if (!response.ok) {
    throw new DiscoveryError(
      'unreachable',
      `The gateway returned ${response.status} for its model list. Set LLM_MODEL to choose a model explicitly.`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new DiscoveryError('unreachable', 'The model list was not JSON.');
  }

  const entries = extractEntries(body);
  if (entries.length === 0) {
    throw new DiscoveryError('empty', 'The gateway listed no models. Set LLM_MODEL explicitly.');
  }

  const toolCapable = entries.find(
    (entry) => typeof entry.id === 'string' && entry.tool_call === true && servesChat(entry),
  );

  if (toolCapable !== undefined) {
    return toolCapable.id as string;
  }

  const first = entries.find((entry) => typeof entry.id === 'string');
  if (first === undefined) {
    throw new DiscoveryError('empty', 'The model list had no usable ids. Set LLM_MODEL explicitly.');
  }

  // No capability metadata, or none advertising tools. The caller will find out
  // on the first turn if the model cannot call tools, and say so plainly.
  return first.id as string;
}

function extractEntries(body: unknown): ModelEntry[] {
  if (typeof body !== 'object' || body === null) {
    return [];
  }
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((entry): entry is ModelEntry => typeof entry === 'object' && entry !== null);
}

/** Some gateways list non-chat models; only filter when the field is present. */
function servesChat(entry: ModelEntry): boolean {
  if (!Array.isArray(entry.endpoints)) {
    return true;
  }
  return entry.endpoints.includes('chat');
}

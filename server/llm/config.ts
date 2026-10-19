/**
 * Provider-neutral configuration.
 *
 * Everything the chat needs is the OpenAI-compatible contract: POST
 * {base}/chat/completions with messages, tools, tool_choice and stream. Groq,
 * Together, OpenRouter, DeepSeek, Mistral, vLLM, LM Studio and Ollama's /v1 mode
 * all implement it, so one config object covers them.
 *
 * Nothing here names a provider. The Kenari fallback exists because its key
 * helper is already on this machine; it is a default value, not a dependency,
 * and a deployment that sets the LLM_* variables never touches it.
 */

export interface Env {
  LLM_BASE_URL?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_REASONING_EFFORT?: string;
  LLM_HEADERS?: string;
  KENARI_API_KEY?: string;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  /**
   * Optional on purpose. When unset, the app discovers a model from GET /models,
   * because the gateway's own docs say not to hardcode ids that change.
   */
  model?: string;
  /**
   * Only sent when set. Some gateways 400 on an unknown field, so a default here
   * would break the ones that do not support it.
   */
  reasoningEffort?: string;
  headers: Record<string, string>;
  /** How the key was found, so the UI can explain a missing key precisely. */
  source: 'llm' | 'kenari';
}

const KENARI_BASE = 'https://kenari.id/v1';

export function resolveConfig(env: Env): LlmConfig | null {
  const baseUrl = clean(env.LLM_BASE_URL);
  const apiKey = clean(env.LLM_API_KEY);

  if (baseUrl !== undefined && apiKey !== undefined) {
    return {
      baseUrl,
      apiKey,
      model: clean(env.LLM_MODEL),
      reasoningEffort: clean(env.LLM_REASONING_EFFORT),
      headers: parseHeaders(env.LLM_HEADERS),
      source: 'llm',
    };
  }

  const kenariKey = clean(env.KENARI_API_KEY);
  if (kenariKey !== undefined) {
    return {
      baseUrl: KENARI_BASE,
      apiKey: kenariKey,
      model: clean(env.LLM_MODEL),
      reasoningEffort: clean(env.LLM_REASONING_EFFORT),
      headers: parseHeaders(env.LLM_HEADERS),
      source: 'kenari',
    };
  }

  return null;
}

/**
 * Joins a base URL and a path without doubling or dropping the slash. Bases in
 * the wild arrive both ways: `https://x/v1` and `https://x/v1/`.
 */
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** A blank variable is not a configured variable. */
function clean(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Extra headers as JSON, for gateways that require them (Azure's `api-key`,
 * OpenRouter's `HTTP-Referer`). Unparseable input yields no headers rather than
 * a startup crash: a typo in an optional variable should not stop the app.
 */
function parseHeaders(value: string | undefined): Record<string, string> {
  const raw = clean(value);
  if (raw === undefined) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const headers: Record<string, string> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (typeof entry === 'string') {
        headers[key] = entry;
      }
    }
    return headers;
  } catch {
    return {};
  }
}

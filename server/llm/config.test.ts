import { describe, it, expect } from 'vitest';
import { resolveConfig, joinUrl, type Env } from './config';

function env(overrides: Env = {}): Env {
  return overrides;
}

describe('LLM config', () => {
  it('reads a generic OpenAI-compatible gateway', () => {
    const config = resolveConfig(
      env({
        LLM_BASE_URL: 'https://api.groq.com/openai/v1',
        LLM_API_KEY: 'gsk_test',
        LLM_MODEL: 'llama-3.3-70b',
      }),
    );

    expect(config).toMatchObject({
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'gsk_test',
      model: 'llama-3.3-70b',
    });
  });

  it('falls back to Kenari when only its key is present', () => {
    // Existing users keep working with zero configuration. The fallback is a
    // default, not a dependency: no provider name appears in the chat code.
    const config = resolveConfig(env({ KENARI_API_KEY: 'kn_test' }));

    expect(config?.baseUrl).toContain('kenari.id');
    expect(config?.apiKey).toBe('kn_test');
    expect(config?.model).toBeUndefined();
  });

  it('prefers the generic variables over the Kenari fallback', () => {
    const config = resolveConfig(
      env({
        KENARI_API_KEY: 'kn_test',
        LLM_BASE_URL: 'https://openrouter.ai/api/v1',
        LLM_API_KEY: 'sk_or',
      }),
    );

    expect(config?.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(config?.apiKey).toBe('sk_or');
  });

  it('returns null when nothing is configured', () => {
    expect(resolveConfig(env())).toBeNull();
  });

  it('omits reasoning effort when unset, rather than sending a default', () => {
    // Sending reasoning_effort to a gateway that does not know it can 400.
    const config = resolveConfig(
      env({ LLM_BASE_URL: 'https://x/v1', LLM_API_KEY: 'k', LLM_MODEL: 'm' }),
    );

    expect(config?.reasoningEffort).toBeUndefined();
  });

  it('keeps a configured reasoning effort', () => {
    const config = resolveConfig(
      env({
        LLM_BASE_URL: 'https://x/v1',
        LLM_API_KEY: 'k',
        LLM_MODEL: 'm',
        LLM_REASONING_EFFORT: 'low',
      }),
    );

    expect(config?.reasoningEffort).toBe('low');
  });

  it('parses extra headers, for gateways that require them', () => {
    const config = resolveConfig(
      env({
        LLM_BASE_URL: 'https://openrouter.ai/api/v1',
        LLM_API_KEY: 'k',
        LLM_MODEL: 'm',
        LLM_HEADERS: '{"HTTP-Referer":"https://example.test"}',
      }),
    );

    expect(config?.headers).toEqual({ 'HTTP-Referer': 'https://example.test' });
  });

  it('ignores unparseable headers instead of crashing at startup', () => {
    const config = resolveConfig(
      env({
        LLM_BASE_URL: 'https://x/v1',
        LLM_API_KEY: 'k',
        LLM_MODEL: 'm',
        LLM_HEADERS: 'not json',
      }),
    );

    expect(config?.headers).toEqual({});
  });

  it('treats a blank variable as unset', () => {
    const config = resolveConfig(
      env({ LLM_BASE_URL: '   ', LLM_API_KEY: '   ', LLM_MODEL: '  ' }),
    );
    expect(config).toBeNull();
  });
});

describe('url joining', () => {
  it('appends the path once, with or without a trailing slash', () => {
    expect(joinUrl('https://x/v1', 'chat/completions')).toBe('https://x/v1/chat/completions');
    expect(joinUrl('https://x/v1/', 'chat/completions')).toBe('https://x/v1/chat/completions');
  });

  it('keeps a base that already has a path', () => {
    expect(joinUrl('https://openrouter.ai/api/v1', 'models')).toBe(
      'https://openrouter.ai/api/v1/models',
    );
  });
});

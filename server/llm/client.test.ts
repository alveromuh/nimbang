import { describe, it, expect, vi } from 'vitest';
import { openStream, rateLimitHeaders, UpstreamError } from './client';
import type { LlmConfig } from './config';

const config: LlmConfig = {
  baseUrl: 'https://gateway.test/v1',
  apiKey: 'secret',
  headers: {},
  source: 'llm',
};

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'record_options',
      description: 'x',
      parameters: { type: 'object' as const, properties: {}, required: [] },
    },
  },
];

function streamResponse() {
  const body = new ReadableStream<Uint8Array>();
  return { ok: true, status: 200, body, headers: new Headers() } as unknown as Response;
}

function errorResponse(status: number, text = '', headers: Record<string, string> = {}) {
  return {
    ok: false,
    status,
    body: null,
    headers: new Headers(headers),
    text: async () => text,
  } as unknown as Response;
}

describe('upstream client', () => {
  it('posts to chat/completions with the key and the custom headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse());

    await openStream({
      config: { ...config, headers: { 'HTTP-Referer': 'https://example.test' } },
      model: 'some-model',
      messages: [{ role: 'user', content: 'hi' }],
      tools,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://gateway.test/v1/chat/completions');
    const request = init as RequestInit;
    expect(request.headers).toMatchObject({
      Authorization: 'Bearer secret',
      'HTTP-Referer': 'https://example.test',
    });
  });

  it('forces a tool call and asks for a stream', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse());

    await openStream({
      config,
      model: 'm',
      messages: [],
      tools,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.tool_choice).toBe('required');
    expect(body.stream).toBe(true);
    expect(body.tools).toEqual(tools);
  });

  it('omits reasoning_effort when it is not configured', async () => {
    // Sending it to a gateway that does not know the field can 400.
    const fetchMock = vi.fn().mockResolvedValue(streamResponse());

    await openStream({
      config,
      model: 'm',
      messages: [],
      tools,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body).not.toHaveProperty('reasoning_effort');
  });

  it('sends reasoning_effort when it is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse());

    await openStream({
      config: { ...config, reasoningEffort: 'low' },
      model: 'm',
      messages: [],
      tools,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.reasoning_effort).toBe('low');
  });

  it('names an auth failure as auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(401));

    await expect(
      openStream({
        config,
        model: 'm',
        messages: [],
        tools,
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('names a rate limit as a rate limit, and keeps its headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(errorResponse(429, '', { 'retry-after': '12', 'x-ratelimit-remaining': '0' }));

    const error = await openStream({
      config,
      model: 'm',
      messages: [],
      tools,
      fetchImpl: fetchMock as unknown as typeof fetch,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).kind).toBe('rate_limited');
    expect((error as UpstreamError).headers).toMatchObject({ 'retry-after': '12' });
  });

  it('detects a model that cannot call tools from the 400 body', async () => {
    // The most common misconfiguration, and the gateway reports it as a 400
    // rather than a capability flag.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(errorResponse(400, 'this model does not support tools'));

    await expect(
      openStream({
        config,
        model: 'm',
        messages: [],
        tools,
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ kind: 'no_tools' });
  });

  it('names an unreachable gateway as unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      openStream({
        config,
        model: 'm',
        messages: [],
        tools,
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ kind: 'unreachable' });
  });

  it('reads rate-limit headers whatever the gateway calls them', () => {
    const response = {
      headers: new Headers({ 'ratelimit-remaining': '7', 'retry-after': '3' }),
    } as unknown as Response;

    expect(rateLimitHeaders(response)).toEqual({
      'ratelimit-remaining': '7',
      'retry-after': '3',
    });
  });
});

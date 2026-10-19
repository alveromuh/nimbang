import { describe, it, expect, vi } from 'vitest';
import { discoverModel, DiscoveryError } from './discover';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

const RICH = {
  data: [
    { id: 'cheap-no-tools', endpoints: ['chat'], tool_call: false, reasoning: false },
    { id: 'chat-no-tools', endpoints: ['chat'], tool_call: false },
    { id: 'picked', endpoints: ['chat'], tool_call: true, reasoning: true },
  ],
};

const MINIMAL = { data: [{ id: 'llama-3.3-70b' }, { id: 'mixtral' }] };

describe('model discovery', () => {
  it('prefers a model that supports tools when metadata says so', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(RICH));

    const model = await discoverModel({
      baseUrl: 'https://x/v1',
      apiKey: 'k',
      headers: {},
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(model).toBe('picked');
  });

  it('takes the first id when the gateway returns no capability metadata', async () => {
    // OpenAI-compatible gateways often return only {id, object, owned_by}.
    // Guessing the richer shape would make the feature fail on most of them.
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(MINIMAL));

    const model = await discoverModel({
      baseUrl: 'https://x/v1',
      apiKey: 'k',
      headers: {},
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(model).toBe('llama-3.3-70b');
  });

  it('sends the key in an Authorization header and any custom headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(MINIMAL));

    await discoverModel({
      baseUrl: 'https://x/v1',
      apiKey: 'secret',
      headers: { 'HTTP-Referer': 'https://example.test' },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://x/v1/models');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer secret',
      'HTTP-Referer': 'https://example.test',
    });
  });

  it('reports a 401 as an auth failure, not as "no models"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 401));

    await expect(
      discoverModel({
        baseUrl: 'https://x/v1',
        apiKey: 'bad',
        headers: {},
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('reports an empty catalogue as its own failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));

    await expect(
      discoverModel({
        baseUrl: 'https://x/v1',
        apiKey: 'k',
        headers: {},
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(DiscoveryError);
  });

  it('tells the user to set LLM_MODEL when discovery cannot help', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 404));

    // The message is the whole value of this failure: the user can fix it only
    // if they are told what to set.
    await expect(
      discoverModel({
        baseUrl: 'https://x/v1',
        apiKey: 'k',
        headers: {},
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/LLM_MODEL/);
  });
});

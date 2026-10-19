import { describe, it, expect, vi } from 'vitest';
import { requestSuggestions, SuggestionError } from './client';
import { QUESTIONS } from './questions';

const STATE = 'Decision: Pindah kerja\nObjectives: Penghasilan naik';

function okResponse() {
  return {
    model: 'clef:free',
    usage: { input_tokens: 100, output_tokens: 0 },
    answers: {},
  };
}

describe('System One client', () => {
  it('posts the state and the versioned question set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => okResponse(),
    });

    await requestSuggestions({ state: STATE, fetchImpl: fetchMock as unknown as typeof fetch });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/suggest');
    const body = JSON.parse(String(init.body));
    expect(body.state).toBe(STATE);
    expect(body.questions).toEqual(QUESTIONS);
  });

  it('retries a 429 and succeeds, rather than reporting a wrong answer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => okResponse() });

    const result = await requestSuggestions({
      state: STATE,
      fetchImpl: fetchMock as unknown as typeof fetch,
      retryDelayMs: 0,
    });

    expect(result.model).toBe('clef:free');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry budget instead of looping forever', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    await expect(
      requestSuggestions({
        state: STATE,
        fetchImpl: fetchMock as unknown as typeof fetch,
        retries: 2,
        retryDelayMs: 0,
      }),
    ).rejects.toBeInstanceOf(SuggestionError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reports a server error as unavailable, not as an empty suggestion', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    // The contract forbids silent fallback: a failed call must not look like
    // "the model had nothing to say".
    await expect(
      requestSuggestions({ state: STATE, fetchImpl: fetchMock as unknown as typeof fetch }),
    ).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('reports a not-configured server as its own state, so the UI can say why', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'not_configured' }),
    });

    await expect(
      requestSuggestions({ state: STATE, fetchImpl: fetchMock as unknown as typeof fetch }),
    ).rejects.toMatchObject({ kind: 'not_configured' });
  });

  it('refuses an empty state without calling the network', async () => {
    const fetchMock = vi.fn();

    await expect(
      requestSuggestions({ state: '   ', fetchImpl: fetchMock as unknown as typeof fetch }),
    ).rejects.toMatchObject({ kind: 'empty_state' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a malformed body as unavailable rather than trusting it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ nope: true }),
    });

    await expect(
      requestSuggestions({ state: STATE, fetchImpl: fetchMock as unknown as typeof fetch }),
    ).rejects.toBeInstanceOf(SuggestionError);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { sendTurn, ChatError } from './client';

function sseStream(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
}

function okResponse(frames: string[]) {
  return { ok: true, status: 200, body: sseStream(frames), headers: new Headers() } as unknown as Response;
}

const toolCallFrames = [
  'data: {"choices":[{"delta":{"reasoning":"thinking about it"}}]}\n\n',
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"record_options","arguments":"{\\"options\\":"}}]}}]}\n\n',
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"[\\"Stay\\",\\"Move\\"]}"}}]}}]}\n\n',
  'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
  'data: [DONE]\n\n',
];

describe('chat client', () => {
  it('assembles a streamed tool call and reports reasoning', async () => {
    const reasoning: string[] = [];
    const result = await sendTurn({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      onReasoning: (text) => reasoning.push(text),
      fetchImpl: vi.fn().mockResolvedValue(okResponse(toolCallFrames)) as unknown as typeof fetch,
    });

    expect(result.toolCalls).toEqual([
      { name: 'record_options', arguments: '{"options":["Stay","Move"]}' },
    ]);
    // Reasoning streams separately, which is what makes the wait bearable.
    expect(reasoning).toEqual(['thinking about it']);
    expect(result.reasoning).toBe('thinking about it');
  });

  it('posts the messages and tools to our own endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(['data: [DONE]\n\n']));

    await sendTurn({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/chat');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('rejects a stream that ends without the DONE sentinel', async () => {
    // A truncated stream means the tool arguments are not valid JSON, and
    // pretending otherwise would hand the parser garbage.
    await expect(
      sendTurn({
        messages: [],
        tools: [],
        fetchImpl: vi
          .fn()
          .mockResolvedValue(
            okResponse(['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n']),
          ) as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ kind: 'interrupted' });
  });

  it('treats a mid-stream error chunk as an interrupted turn', async () => {
    await expect(
      sendTurn({
        messages: [],
        tools: [],
        fetchImpl: vi
          .fn()
          .mockResolvedValue(okResponse(['data: {"error":{"message":"boom"}}\n\n', 'data: [DONE]\n\n'])) as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ kind: 'interrupted' });
  });

  it('names each server failure state', async () => {
    const cases: [string, string][] = [
      ['not_configured', 'not_configured'],
      ['unauthorized', 'unauthorized'],
      ['rate_limited', 'rate_limited'],
      ['no_tools', 'no_tools'],
      ['no_model', 'no_model'],
    ];

    for (const [serverError, expected] of cases) {
      const response = {
        ok: false,
        status: 503,
        headers: new Headers(),
        json: async () => ({ error: serverError, message: 'detail' }),
      } as unknown as Response;

      await expect(
        sendTurn({
          messages: [],
          tools: [],
          fetchImpl: vi.fn().mockResolvedValue(response) as unknown as typeof fetch,
        }),
      ).rejects.toMatchObject({ kind: expected });
    }
  });

  it('keeps the retry-after hint from a rate limit', async () => {
    const response = {
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '30' }),
      json: async () => ({ error: 'rate_limited' }),
    } as unknown as Response;

    const error = await sendTurn({
      messages: [],
      tools: [],
      fetchImpl: vi.fn().mockResolvedValue(response) as unknown as typeof fetch,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ChatError);
    expect((error as ChatError).retryAfter).toBe('30');
  });

  it('names a network failure as unreachable', async () => {
    await expect(
      sendTurn({
        messages: [],
        tools: [],
        fetchImpl: vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ kind: 'unreachable' });
  });

  it('ignores keepalive comments while waiting', async () => {
    const result = await sendTurn({
      messages: [],
      tools: [],
      fetchImpl: vi
        .fn()
        .mockResolvedValue(
          okResponse([': keepalive\n\n', 'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n', 'data: [DONE]\n\n']),
        ) as unknown as typeof fetch,
    });

    expect(result.content).toBe('hi');
  });
});

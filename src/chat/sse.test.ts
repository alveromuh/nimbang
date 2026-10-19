import { describe, it, expect } from 'vitest';
import { SseAccumulator } from './sse';

function chunk(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe('SSE accumulator', () => {
  it('parses one complete event', () => {
    const sse = new SseAccumulator();
    const events = sse.push(chunk('data: {"a":1}\n\n'));
    expect(events).toEqual([{ data: '{"a":1}' }]);
  });

  it('skips keepalive comment lines', () => {
    // The gateway sends ": keepalive" while a reasoning model is thinking. A
    // parser that treats it as data breaks exactly when the model is slowest.
    const sse = new SseAccumulator();
    const events = sse.push(chunk(': keepalive\n\ndata: {"a":1}\n\n'));
    expect(events).toEqual([{ data: '{"a":1}' }]);
  });

  it('holds a partial frame until the rest arrives', () => {
    // "One chunk may contain several events or half an event." Splitting on
    // network chunks is the documented way to get this wrong.
    const sse = new SseAccumulator();
    expect(sse.push(chunk('data: {"a"'))).toEqual([]);
    expect(sse.push(chunk(':1}\n\n'))).toEqual([{ data: '{"a":1}' }]);
  });

  it('parses several events from one chunk', () => {
    const sse = new SseAccumulator();
    const events = sse.push(chunk('data: {"n":1}\n\ndata: {"n":2}\n\n'));
    expect(events.map((event) => event.data)).toEqual(['{"n":1}', '{"n":2}']);
  });

  it('passes the DONE sentinel through untouched', () => {
    const sse = new SseAccumulator();
    const events = sse.push(chunk('data: [DONE]\n\n'));
    // [DONE] is not JSON. Checking for it before decoding is the documented rule.
    expect(events).toEqual([{ data: '[DONE]' }]);
  });

  it('keeps an event name when the gateway sends one', () => {
    const sse = new SseAccumulator();
    const events = sse.push(chunk('event: error\ndata: {"message":"boom"}\n\n'));
    expect(events).toEqual([{ event: 'error', data: '{"message":"boom"}' }]);
  });

  it('ignores blank lines between frames', () => {
    const sse = new SseAccumulator();
    const events = sse.push(chunk('\n\ndata: {"a":1}\n\n\n'));
    expect(events).toHaveLength(1);
  });
});

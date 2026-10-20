/**
 * A server-sent-events frame accumulator.
 *
 * Written by hand rather than pulled from a library because the failure modes are
 * specific and documented: frames can be split across network chunks, one chunk
 * can carry several frames, keepalive comment lines arrive while a reasoning
 * model is thinking, and `data: [DONE]` is not JSON. Each of those has a test.
 */

export interface SseEvent {
  /** Present only when the stream sends `event:` lines. */
  event?: string;
  data: string;
}

export class SseAccumulator {
  private buffer = '';
  private readonly decoder = new TextDecoder();

  /**
   * Feeds a network chunk and returns whatever complete frames it finished.
   * Text is decoded as a stream, so a multi-byte character split across chunks
   * is not mangled.
   */
  push(chunk: Uint8Array): SseEvent[] {
    this.buffer += this.decoder.decode(chunk, { stream: true });

    const events: SseEvent[] = [];
    let boundary = /\r?\n\r?\n/.exec(this.buffer);

    while (boundary !== null) {
      const frame = this.buffer.slice(0, boundary.index);
      this.buffer = this.buffer.slice(boundary.index + boundary[0].length);

      const parsed = parseFrame(frame);
      if (parsed !== null) {
        events.push(parsed);
      }

      boundary = /\r?\n\r?\n/.exec(this.buffer);
    }

    return events;
  }

  /** Any trailing bytes that never formed a complete frame. */
  get pending(): string {
    return this.buffer;
  }
}

function parseFrame(frame: string): SseEvent | null {
  const lines = frame.split(/\r\n|\r|\n/);
  const dataLines: string[] = [];
  let event: string | undefined;

  for (const line of lines) {
    // A comment: the gateway sends ": keepalive" during long reasoning pauses.
    if (line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      // One optional leading space is stripped, per the SSE spec; the rest is
      // data even if it looks like whitespace.
      const value = line.slice('data:'.length);
      dataLines.push(value.startsWith(' ') ? value.slice(1) : value);
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const data = dataLines.join('\n');
  return event === undefined ? { data } : { event, data };
}

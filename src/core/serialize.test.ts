import { describe, it, expect } from 'vitest';
import { serializeDecision, deserializeDecision } from './serialize';

const decision = {
  id: 'd1',
  title: 'Test',
  objectives: [{ id: 'o1', statement: 'Money', kind: 'motivation' as const }],
  options: [
    { id: 'a', label: 'A', isBaseline: true },
    { id: 'b', label: 'B', isBaseline: false },
    { id: 'c', label: 'C', isBaseline: false },
  ],
  items: [],
  claims: [],
};

describe('URL round-trip', () => {
  it('round-trips a decision', () => {
    const s = serializeDecision(decision);
    const back = deserializeDecision(s);
    expect(back).toEqual(decision);
  });

  it('round-trips Indonesian text, which is not Latin-1', () => {
    // btoa throws on any code point above U+00FF, so an implementation built on
    // it passes an ASCII test and then breaks on the app's actual language.
    const withText = {
      ...decision,
      title: 'Pindah kerja ke media fashion — gaji lebih besar?',
      objectives: [
        { id: 'o1', statement: 'Penghasilan naik, tapi jam kerja lebih panjang', kind: 'motivation' as const },
      ],
    };
    const back = deserializeDecision(serializeDecision(withText));
    expect(back).toEqual(withText);
  });

  it('produces a string that is safe inside a URL', () => {
    const s = serializeDecision(decision);
    expect(encodeURIComponent(s)).toBe(s);
  });

  it('rejects a payload that is not a decision', () => {
    expect(() => deserializeDecision(serializeDecision(decision).slice(0, 10))).toThrow();
  });

  it('rejects a payload whose JSON is valid but is not a decision', () => {
    const notADecision = referenceBase64Url(JSON.stringify({ hello: 'world' }));
    expect(() => deserializeDecision(notADecision)).toThrow();
  });

  it('agrees with a reference encoder for every byte-length remainder', () => {
    // The codec is hand-written because btoa is Latin-1 only and Buffer is not
    // available in a browser. A test-only cross-check against Node's encoder
    // covers the three padding cases (0, 1, 2 leftover bytes) directly.
    for (let length = 0; length <= 20; length += 1) {
      const decision = {
        id: 'd1',
        title: 'x'.repeat(length) + 'é',
        objectives: [],
        options: [],
        items: [],
        claims: [],
      };
      expect(serializeDecision(decision)).toBe(referenceBase64Url(JSON.stringify(decision)));
    }
  });
});

/**
 * Node's own base64url encoder, reached through `process` so this file does not
 * need @types/node just to check the codec. Test-only: `src/core/` itself must
 * not depend on Node or on the DOM.
 */
function referenceBase64Url(text: string): string {
  const nodeProcess = (globalThis as unknown as { process: { getBuiltinModule: (id: string) => unknown } })
    .process;
  const buffer = nodeProcess.getBuiltinModule('node:buffer') as {
    Buffer: { from: (input: string, encoding: string) => { toString: (encoding: string) => string } };
  };
  return buffer.Buffer.from(text, 'utf8').toString('base64url');
}

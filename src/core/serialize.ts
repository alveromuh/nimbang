import { DecisionSchema, type Decision } from './types';

/**
 * URL round-trip for a decision document.
 *
 * The encoding is base64url over UTF-8 bytes, written out by hand rather than
 * delegated to `btoa` or `Buffer`:
 *
 * - `btoa` throws on any code point above U+00FF, so it cannot carry Indonesian
 *   text — which is the language this app is written in. It would pass an ASCII
 *   test and fail on the first real title.
 * - `Buffer` is a Node global and does not exist in the browser, and
 *   `src/core/` has to run in both.
 *
 * base64url uses `-` and `_` instead of `+` and `/`, so the payload is safe
 * inside a URL without escaping, and the padding is dropped because a query
 * string does not need it.
 */
export function serializeDecision(decision: Decision): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(decision)));
}

/**
 * Parses and validates. A payload that decodes but is not a decision is a
 * failure, not an empty decision: silently substituting a blank document would
 * destroy whatever the user thought they had shared.
 */
export function deserializeDecision(encoded: string): Decision {
  const bytes = fromBase64Url(encoded);
  const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('The shared decision is not valid JSON.');
  }

  const result = DecisionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('The shared decision is missing required fields.');
  }

  return result.data;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes: Uint8Array): string {
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const b0 = bytes[index];
    const b1 = index + 1 < bytes.length ? bytes[index + 1] : undefined;
    const b2 = index + 2 < bytes.length ? bytes[index + 2] : undefined;

    output += ALPHABET[b0 >> 2];
    output += ALPHABET[((b0 & 0b11) << 4) | ((b1 ?? 0) >> 4)];

    if (b1 === undefined) {
      break;
    }
    output += ALPHABET[((b1 & 0b1111) << 2) | ((b2 ?? 0) >> 6)];

    if (b2 === undefined) {
      break;
    }
    output += ALPHABET[b2 & 0b111111];
  }

  return output;
}

function fromBase64Url(encoded: string): Uint8Array {
  const bytes: number[] = [];

  for (let index = 0; index < encoded.length; index += 4) {
    const chunk = [
      sextet(encoded[index]),
      sextet(encoded[index + 1]),
      sextet(encoded[index + 2]),
      sextet(encoded[index + 3]),
    ];

    bytes.push((chunk[0] << 2) | (chunk[1] >> 4));
    if (chunk[2] !== -1) {
      bytes.push(((chunk[1] & 0b1111) << 4) | (chunk[2] >> 2));
    }
    if (chunk[3] !== -1) {
      bytes.push(((chunk[2] & 0b11) << 6) | chunk[3]);
    }
  }

  return new Uint8Array(bytes);
}

function sextet(character: string | undefined): number {
  if (character === undefined) {
    return -1;
  }
  const value = ALPHABET.indexOf(character);
  if (value === -1) {
    throw new Error(`The shared decision contains an invalid character: "${character}".`);
  }
  return value;
}

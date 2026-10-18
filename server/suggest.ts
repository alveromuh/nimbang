import type { Plugin, Connect } from 'vite';
import type { ServerResponse } from 'node:http';

/**
 * The one server-side piece in the project.
 *
 * The System One key cannot live in a browser, so the browser posts to
 * `/api/suggest` and this middleware holds the key. It exists for exactly that
 * reason and does nothing else: no storage, no accounts, no decision logic. The
 * engine still computes; this only relays a classification request.
 *
 * Mounted for both `vite` (dev) and `vite preview` so the feature is testable in
 * the built output. A real deployment needs this same handler behind whatever
 * serves `dist/`; the handler is deliberately dependency-free so it can be
 * lifted into any Node server.
 */
export function suggestApi(): Plugin {
  return {
    name: 'nimbang-suggest-api',
    configureServer(server) {
      server.middlewares.use('/api/suggest', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/suggest', handler);
    },
  };
}

const ENDPOINT = 'https://kenari.id/v1/systemone';

/** `clef:free` is the measured choice for rubric-style questions. See docs. */
const MODEL = 'clef:free';

/** The contract caps questions at 128; the app sends six. */
const MAX_QUESTIONS = 128;

const handler: Connect.NextHandleFunction = async (req, res) => {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'method_not_allowed' });
  }

  const key = process.env.KENARI_API_KEY ?? (await readKeyFromHelper());
  if (key === null) {
    // A missing key is a setup problem, and saying so lets the UI tell the user
    // to configure it rather than implying the model had nothing to say.
    return send(res, 503, { error: 'not_configured' });
  }

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { error: 'bad_json' });
  }

  const payload = body as { state?: unknown; questions?: unknown };

  if (typeof payload.state !== 'string' || payload.state.trim() === '') {
    return send(res, 400, { error: 'empty_state' });
  }

  if (!isQuestions(payload.questions)) {
    return send(res, 400, { error: 'bad_questions' });
  }

  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, state: payload.state, questions: payload.questions }),
    });

    if (upstream.status === 429) {
      // Pass the rate limit through as itself, so the client retries rather than
      // reporting a failure that never happened.
      return send(res, 429, { error: 'rate_limited' });
    }

    if (!upstream.ok) {
      // Never forward the upstream body: it can echo the request, and the key is
      // in the header. The status is enough for the client to act on.
      return send(res, 502, { error: 'upstream_error', status: upstream.status });
    }

    const result: unknown = await upstream.json();
    return send(res, 200, result);
  } catch {
    return send(res, 502, { error: 'upstream_unreachable' });
  }
};

/**
 * Reads the key from the `kenari-key` helper during development. Never logs it,
 * never returns it to the client, never writes it anywhere.
 */
async function readKeyFromHelper(): Promise<string | null> {
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const run = promisify(execFile);
    const home = process.env.HOME ?? '';
    const { stdout } = await run(`${home}/.local/bin/kenari-key`, [], { timeout: 5000 });
    const key = stdout.trim();
    return key === '' ? null : key;
  } catch {
    return null;
  }
}

function isQuestions(value: unknown): value is Record<string, { type: string }> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const entries = Object.values(value);
  return (
    entries.length > 0 &&
    entries.length <= MAX_QUESTIONS &&
    entries.every((entry) => typeof entry === 'object' && entry !== null)
  );
}

function readJson(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      // A decision description is small; anything large is not this endpoint's
      // job, and buffering it would be a denial-of-service vector.
      if (size > 32_768) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

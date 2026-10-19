import type { Connect, Plugin } from 'vite';
import type { ServerResponse } from 'node:http';
import { resolveConfig, type Env, type LlmConfig } from './llm/config';
import { discoverModel, DiscoveryError } from './llm/discover';
import { openStream, UpstreamError } from './llm/client';

/**
 * The one server-side piece in the project.
 *
 * A browser cannot hold an API key, so the browser posts here and this holds it.
 * It does nothing else: no storage, no accounts, no decision logic. It relays one
 * turn to whichever OpenAI-compatible gateway is configured and streams the
 * answer back.
 *
 * Provider-neutral by construction: no gateway name, URL or model id appears in
 * this file. See server/llm/config.ts for how it is configured.
 */
export function chatApi(): Plugin {
  return {
    name: 'nimbang-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat', handler);
    },
  };
}

const MAX_BODY = 64 * 1024;
const MAX_TURNS = 6;

const handler: Connect.NextHandleFunction = async (req, res) => {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'method_not_allowed' });
  }

  const config = await loadConfig();
  if (config === null) {
    // A missing key is a setup problem. Saying so lets the panel tell the user
    // to configure it, rather than implying the model had nothing to say.
    return send(res, 503, { error: 'not_configured' });
  }

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { error: 'bad_json' });
  }

  const payload = body as {
    messages?: unknown;
    tools?: unknown;
    scope?: unknown;
    model?: unknown;
  };

  if (!isMessages(payload.messages)) {
    return send(res, 400, { error: 'bad_messages' });
  }
  if (!Array.isArray(payload.tools) || payload.tools.length === 0) {
    return send(res, 400, { error: 'bad_tools' });
  }

  let model = config.model;
  if (model === undefined) {
    try {
      model = await discoverModel({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        headers: config.headers,
      });
    } catch (error) {
      const message = error instanceof DiscoveryError ? error.message : 'No model available.';
      return send(res, 503, { error: 'no_model', message });
    }
  }

  try {
    const stream = await openStream({
      config,
      model,
      messages: payload.messages,
      tools: payload.tools as never,
    });

    // Stream straight through. The client parses frames; this layer never
    // inspects the model's output, so it cannot corrupt or reshape it.
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = stream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        res.write(value);
      }
    } catch {
      // The upstream stream broke mid-flight. The client sees a truncated turn
      // and reports it; there is nothing to retry from here, because a stream
      // cannot be resumed.
    } finally {
      res.end();
    }
  } catch (error) {
    if (error instanceof UpstreamError) {
      const status = error.kind === 'unauthorized' ? 401 : error.kind === 'rate_limited' ? 429 : 502;
      return send(res, status, { error: error.kind, message: error.message, headers: error.headers });
    }
    return send(res, 502, { error: 'unreachable' });
  }
};

/** The key comes from the environment, or from the existing helper on this machine. */
async function loadConfig(): Promise<LlmConfig | null> {
  const env = process.env as Env;
  const direct = resolveConfig(env);
  if (direct !== null) {
    return direct;
  }

  const helperKey = await readKeyFromHelper();
  if (helperKey === null) {
    return null;
  }
  return resolveConfig({ ...env, KENARI_API_KEY: helperKey });
}

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

function isMessages(value: unknown): value is { role: 'system' | 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) {
    return false;
  }
  const roles = new Set(['system', 'user', 'assistant']);
  return value.every(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      roles.has(String((entry as { role?: unknown }).role)) &&
      typeof (entry as { content?: unknown }).content === 'string',
  );
}

function readJson(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
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

export { MAX_TURNS };

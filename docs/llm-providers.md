# LLM providers

The elicitation panel needs a chat model that supports **tool calling**. Any
OpenAI-compatible gateway will do. Nothing in the code names a provider; three
environment variables configure it.

```bash
LLM_BASE_URL=   # includes the version segment, without /chat/completions
LLM_API_KEY=
LLM_MODEL=      # optional; discovered from GET {base}/models when blank
```

Optional: `LLM_REASONING_EFFORT` and `LLM_HEADERS` (JSON). See
[`.env.example`](../.env.example).

## Why OpenAI-compatible is enough

Everything the panel needs is the OpenAI Chat Completions contract:
`POST {base}/chat/completions` with `messages`, `tools`, `tool_choice` and
`stream`. Groq, Together, OpenRouter, DeepSeek, Mistral, Fireworks, vLLM,
LM Studio, Ollama's `/v1` mode and Azure OpenAI all implement it.

The differences between gateways are **fields, not protocols**:

| Difference | How this handles it |
|---|---|
| `reasoning_effort` vs `reasoning:{effort}` vs `thinking:{budget_tokens}` | Only `reasoning_effort` is sent, and only when `LLM_REASONING_EFFORT` is set. Gateways that do not know it never receive it. |
| `/v1/models` returns rich metadata, or only `{id, object, owned_by}` | Discovery probes: if capability fields exist it prefers a tool-capable model, otherwise it takes the first id. |
| Auth header differs (Azure uses `api-key`) | `LLM_HEADERS` adds any header you need. |
| Rate-limit headers differ | The common names are read; anything else is ignored rather than guessed. |

## Settings per gateway

| Gateway | `LLM_BASE_URL` | Notes |
|---|---|---|
| Kenari | `https://kenari.id/v1` | The default when only `KENARI_API_KEY` is set. Free tier: 5 req/min, 50 req/day on a new account. |
| OpenAI | `https://api.openai.com/v1` | `reasoning_effort` supported on reasoning models. |
| Groq | `https://api.groq.com/openai/v1` | Fast; check which models support tools. |
| Together | `https://api.together.xyz/v1` | |
| OpenRouter | `https://openrouter.ai/api/v1` | Set `LLM_HEADERS={"HTTP-Referer":"https://your.app"}` if required. |
| DeepSeek | `https://api.deepseek.com/v1` | |
| Mistral | `https://api.mistral.ai/v1` | |
| Azure OpenAI | `https://<resource>.openai.azure.com/openai/deployments/<deployment>` | Use the deployment name as `LLM_MODEL`, and `LLM_HEADERS={"api-key":"..."}`. |
| Ollama | `http://localhost:11434/v1` | `LLM_API_KEY` can be any non-empty string. |
| LM Studio | `http://localhost:1234/v1` | Same. |

Anything not listed still works if it speaks OpenAI Chat Completions.

## Tool calling is required

The panel forces a tool call (`tool_choice: "required"`) so that:

- the conversation has an unambiguous end (`record_options` was called), and
- there is no prose to parse.

A model without tool calling cannot do either. The endpoint detects the usual
400 response and the panel says so:

> The configured model does not support tool calling, which this panel needs.

There is no JSON-in-text fallback. It doubles the parsing surface and adds the
one failure mode that produces unparseable output, which is the opposite of what
this project is for.

## Model discovery

Leave `LLM_MODEL` blank and the app calls `GET {LLM_BASE_URL}/models`:

1. If entries carry capability metadata, prefer one with `tool_call: true`.
2. If they do not, take the first id.
3. If discovery fails, the error says **set `LLM_MODEL`** — because an id the
   gateway does not have is worse than asking you which one to use.

Kenari's own docs say not to hardcode model ids because they change; this is why
discovery exists.

## What is never sent

The panel sends only the decision title, the objectives, and the options already
written down. No scores, no weights, no probabilities, no identifiers. The model
never sees the arithmetic, which is what keeps "the model fills fields, the
engine computes" true rather than aspirational.

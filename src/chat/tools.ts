import type { Scope, ScopeFlagKind } from './state';

/**
 * Tool definitions and a strict parser for what comes back.
 *
 * The parser is the boundary that keeps the model's output from reaching the
 * decision unchecked. It accepts exactly one tool call, of a tool that belongs
 * to the active scope, with arguments that validate. Everything else is an
 * error with a message the UI can show — never a partial application.
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

const FLAG_SCOPE: ToolDefinition = {
  type: 'function',
  function: {
    name: 'flag_scope',
    description:
      'Use when the reply does not fit the stated objectives. Offer to re-frame it rather than dropping it: off-topic input usually reveals an objective the person has not written down.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['missing_objective', 'unrelated'],
          description:
            'missing_objective when the reply implies an aim that is not in the objective list; unrelated when it has nothing to do with the decision.',
        },
        text: {
          type: 'string',
          description: 'The substance of what the person said, in their words.',
        },
        question: {
          type: 'string',
          description: 'A short question offering to add it, or setting it aside. Never dismissive.',
        },
      },
      required: ['kind', 'text', 'question'],
    },
  },
};

const ASK_CLARIFICATION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'ask_clarification',
    description:
      'Ask one question to help the person say what they already know. One question, never a list.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'One question, in the second person.' },
      },
      required: ['question'],
    },
  },
};

const RECORD_OPTIONS: ToolDefinition = {
  type: 'function',
  function: {
    name: 'record_options',
    description:
      'Record the options the person has stated, in their own words, once they are clear. Ends the conversation.',
    parameters: {
      type: 'object',
      properties: {
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Short option labels, as the person phrased them.',
        },
      },
      required: ['options'],
    },
  },
};

const BIAS_FIELDS = [
  'survivorship',
  'ostrich',
  'hastyGeneralisation',
  'causation',
  'falseComparison',
] as const;

const ASK_QUESTION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'ask_question',
    description:
      'Ask about one bias check. Ask the person to answer in their own words; never answer for them.',
    parameters: {
      type: 'object',
      properties: {
        field: { type: 'string', enum: [...BIAS_FIELDS] },
        question: { type: 'string' },
      },
      required: ['field', 'question'],
    },
  },
};

const RECORD_ANSWERS: ToolDefinition = {
  type: 'function',
  function: {
    name: 'record_answers',
    description:
      'Record the answers the person gave, verbatim. Do not paraphrase, summarise, or improve them. Ends the conversation.',
    parameters: {
      type: 'object',
      properties: {
        answers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', enum: [...BIAS_FIELDS] },
              text: { type: 'string', description: "The person's own words, unedited." },
            },
            required: ['field', 'text'],
          },
        },
      },
      required: ['answers'],
    },
  },
};

export function toolsFor(scope: Scope): ToolDefinition[] {
  return scope === 'options'
    ? [ASK_CLARIFICATION, RECORD_OPTIONS, FLAG_SCOPE]
    : [ASK_QUESTION, RECORD_ANSWERS, FLAG_SCOPE];
}

/** One tool call as it arrives, whether complete or assembled from stream deltas. */
export interface RawToolCall {
  name: string;
  /** The JSON string, exactly as the model produced it. */
  arguments: string;
}

export type ParsedTurn =
  | { kind: 'ask'; question: string }
  | { kind: 'record'; items: string[] }
  | { kind: 'flag'; flagKind: ScopeFlagKind; text: string; question: string }
  | { kind: 'error'; message: string };

/**
 * Parses the model's turn.
 *
 * `null` means no tool call at all, which is a failure rather than an empty
 * turn: `tool_choice: "required"` was sent, so a prose reply means the gateway
 * or model ignored it, and continuing would mean guessing.
 */
export function parseTurn(
  scope: Scope,
  call: RawToolCall | RawToolCall[] | null,
): ParsedTurn {
  if (call === null) {
    return {
      kind: 'error',
      message: 'The model replied without calling a tool, so there is nothing to act on.',
    };
  }

  if (Array.isArray(call)) {
    if (call.length !== 1) {
      return {
        kind: 'error',
        message: `The model returned ${call.length} tool calls; exactly one was expected.`,
      };
    }
    return parseTurn(scope, call[0]);
  }

  const allowed = toolsFor(scope).map((tool) => tool.function.name);
  if (!allowed.includes(call.name)) {
    return {
      kind: 'error',
      message: `The model called "${call.name}", which is not part of this panel.`,
    };
  }

  let args: unknown;
  try {
    args = JSON.parse(call.arguments);
  } catch {
    return { kind: 'error', message: 'The model returned arguments that were not valid JSON.' };
  }

  if (typeof args !== 'object' || args === null) {
    return { kind: 'error', message: 'The model returned no arguments.' };
  }

  const record = args as Record<string, unknown>;

  if (call.name === 'ask_clarification' || call.name === 'ask_question') {
    const question = typeof record.question === 'string' ? record.question.trim() : '';
    return question === ''
      ? { kind: 'error', message: 'The model asked an empty question.' }
      : { kind: 'ask', question };
  }

  if (call.name === 'flag_scope') {
    const kind = record.kind;
    if (kind !== 'missing_objective' && kind !== 'unrelated') {
      return { kind: 'error', message: 'The model used an unknown scope flag.' };
    }
    const text = typeof record.text === 'string' ? record.text.trim() : '';
    const question = typeof record.question === 'string' ? record.question.trim() : '';
    if (text === '' || question === '') {
      return { kind: 'error', message: 'The model sent a scope flag with no text.' };
    }
    return { kind: 'flag', flagKind: kind, text, question };
  }

  if (call.name === 'record_options') {
    const items = stringList(record.options);
    return items === null
      ? { kind: 'error', message: 'The model recorded no usable options.' }
      : { kind: 'record', items };
  }

  // record_answers: the user's wording, kept verbatim.
  if (!Array.isArray(record.answers)) {
    return { kind: 'error', message: 'The model recorded no usable answers.' };
  }

  const items: string[] = [];
  for (const entry of record.answers) {
    if (typeof entry !== 'object' || entry === null) {
      return { kind: 'error', message: 'The model recorded a malformed answer.' };
    }
    const text = (entry as Record<string, unknown>).text;
    if (typeof text !== 'string') {
      return { kind: 'error', message: 'The model recorded an answer that was not text.' };
    }
    if (text.trim() !== '') {
      items.push(text.trim());
    }
  }

  return items.length === 0
    ? { kind: 'error', message: 'The model recorded no usable answers.' }
    : { kind: 'record', items };
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const trimmed = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  return trimmed.length === 0 ? null : trimmed;
}

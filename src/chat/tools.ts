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

/** What a caller sends to the endpoint: the same shape, named for the wire. */
export type ToolSpec = ToolDefinition;

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

/**
 * A bias question's identifier.
 *
 * Exported because the answer has to land in the matching gate field. Losing this
 * and keeping only the text would leave the panel able to collect five answers
 * that it could not tell apart.
 */
export type BiasField = (typeof BIAS_FIELDS)[number];

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
  | { kind: 'ask'; question: string; field?: BiasField }
  | { kind: 'record'; items: string[]; answers?: BiasAnswer[] }
  | { kind: 'flag'; flagKind: ScopeFlagKind; text: string; question: string }
  | { kind: 'error'; message: string };

/** One answered bias check, keyed to the field it answers. */
export interface BiasAnswer {
  field: BiasField;
  text: string;
}

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
      message: 'Asisten menjawab tanpa memanggil tool, jadi tidak ada yang bisa dipakai.',
    };
  }

  if (Array.isArray(call)) {
    if (call.length !== 1) {
      return {
        kind: 'error',
        message: `Asisten mengirim ${call.length} panggilan tool; seharusnya tepat satu.`,
      };
    }
    return parseTurn(scope, call[0]);
  }

  const allowed = toolsFor(scope).map((tool) => tool.function.name);
  if (!allowed.includes(call.name)) {
    return {
      kind: 'error',
      message: `Asisten memanggil "${call.name}", yang bukan bagian dari panel ini.`,
    };
  }

  let args: unknown;
  try {
    args = JSON.parse(call.arguments);
  } catch {
    return { kind: 'error', message: 'Asisten mengirim argumen yang bukan JSON yang sah.' };
  }

  if (typeof args !== 'object' || args === null) {
    return { kind: 'error', message: 'Asisten tidak mengirim argumen.' };
  }

  const record = args as Record<string, unknown>;

  if (call.name === 'ask_clarification' || call.name === 'ask_question') {
    const question = typeof record.question === 'string' ? record.question.trim() : '';
    if (question === '') {
      return { kind: 'error', message: 'Asisten mengirim pertanyaan kosong.' };
    }
    // ask_question names the check it is asking about; carrying the field through
    // lets the panel show which question is being answered instead of leaving the
    // user to infer it from the wording.
    const field = BIAS_FIELDS.find((candidate) => candidate === record.field);
    return field === undefined
      ? { kind: 'ask', question }
      : { kind: 'ask', question, field };
  }

  if (call.name === 'flag_scope') {
    const kind = record.kind;
    if (kind !== 'missing_objective' && kind !== 'unrelated') {
      return { kind: 'error', message: 'Asisten memakai penanda lingkup yang tidak dikenal.' };
    }
    const text = typeof record.text === 'string' ? record.text.trim() : '';
    const question = typeof record.question === 'string' ? record.question.trim() : '';
    if (text === '' || question === '') {
      return { kind: 'error', message: 'Asisten mengirim penanda lingkup tanpa isi.' };
    }
    return { kind: 'flag', flagKind: kind, text, question };
  }

  if (call.name === 'record_options') {
    const items = stringList(record.options);
    return items === null
      ? { kind: 'error', message: 'Asisten tidak mencatat opsi yang bisa dipakai.' }
      : { kind: 'record', items };
  }

  // record_answers: the user's wording, kept verbatim, keyed to the check it answers.
  if (!Array.isArray(record.answers)) {
    return { kind: 'error', message: 'Asisten tidak mencatat jawaban yang bisa dipakai.' };
  }

  const answers: BiasAnswer[] = [];
  for (const entry of record.answers) {
    if (typeof entry !== 'object' || entry === null) {
      return { kind: 'error', message: 'Asisten mencatat jawaban yang bentuknya salah.' };
    }
    const { field, text } = entry as Record<string, unknown>;
    if (typeof text !== 'string') {
      return { kind: 'error', message: 'Asisten mencatat jawaban yang bukan teks.' };
    }
    const matched = BIAS_FIELDS.find((candidate) => candidate === field);
    if (matched === undefined) {
      // An answer with no recognisable field cannot be written anywhere, and
      // guessing which question it belongs to would put the user's words under
      // the wrong heading.
      return { kind: 'error', message: 'Asisten mencatat jawaban untuk pemeriksaan yang tidak dikenal.' };
    }
    if (text.trim() !== '') {
      answers.push({ field: matched, text: text.trim() });
    }
  }

  return answers.length === 0
    ? { kind: 'error', message: 'Asisten tidak mencatat jawaban yang bisa dipakai.' }
    : { kind: 'record', items: answers.map((answer) => answer.text), answers };
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

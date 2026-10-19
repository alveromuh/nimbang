import type { RawToolCall } from './tools';

/**
 * Assembles one streamed turn into a complete tool call.
 *
 * Tool-call arguments arrive as fragments and are not valid JSON until the last
 * one, so they are buffered and parsed once at the end. Reasoning and content
 * arrive separately and are kept apart: reasoning is shown as a thinking
 * indicator, content is a failure (the model was supposed to call a tool).
 */

export interface ToolCallDelta {
  index: number;
  name?: string;
  argumentsDelta?: string;
  reasoningDelta?: string;
  contentDelta?: string;
}

export interface AssembledTurn {
  toolCalls: RawToolCall[];
  reasoning: string;
  content: string;
  finishReason?: string;
  /** True when the reply was cut off, which means the arguments are not valid JSON. */
  truncated: boolean;
}

export class TurnAssembler {
  private readonly calls = new Map<number, { name: string; arguments: string }>();
  private reasoning = '';
  private content = '';
  private finishReason: string | undefined;

  add(delta: ToolCallDelta): void {
    if (delta.reasoningDelta !== undefined) {
      this.reasoning += delta.reasoningDelta;
    }
    if (delta.contentDelta !== undefined) {
      this.content += delta.contentDelta;
    }

    if (delta.name === undefined && delta.argumentsDelta === undefined) {
      return;
    }

    const existing = this.calls.get(delta.index) ?? { name: '', arguments: '' };
    if (delta.name !== undefined && existing.name === '') {
      // The name arrives once, in the first chunk of that call.
      existing.name = delta.name;
    }
    if (delta.argumentsDelta !== undefined) {
      existing.arguments += delta.argumentsDelta;
    }
    this.calls.set(delta.index, existing);
  }

  setFinishReason(reason: string | undefined): void {
    this.finishReason = reason;
  }

  result(): AssembledTurn {
    const toolCalls: RawToolCall[] = [...this.calls.entries()]
      .sort((left, right) => left[0] - right[0])
      .filter(([, call]) => call.name !== '')
      .map(([, call]) => ({ name: call.name, arguments: call.arguments }));

    return {
      toolCalls,
      reasoning: this.reasoning,
      content: this.content,
      finishReason: this.finishReason,
      truncated: this.finishReason === 'length',
    };
  }
}

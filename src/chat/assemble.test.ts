import { describe, it, expect } from 'vitest';
import { TurnAssembler } from './assemble';

describe('turn assembler', () => {
  it('accumulates tool call arguments split across chunks', () => {
    // The docs are explicit: arguments are not valid JSON until the last chunk.
    const asm = new TurnAssembler();
    asm.add({ index: 0, name: 'record_options', argumentsDelta: '{"options":' });
    asm.add({ index: 0, name: undefined, argumentsDelta: '["Stay","Move"]}' });

    expect(asm.result()).toEqual({
      toolCalls: [{ name: 'record_options', arguments: '{"options":["Stay","Move"]}' }],
      reasoning: '',
      content: '',
      finishReason: undefined,
      truncated: false,
    });
  });

  it('keeps the name from the first chunk only', () => {
    const asm = new TurnAssembler();
    asm.add({ index: 0, name: 'ask_clarification', argumentsDelta: '' });
    asm.add({ index: 0, name: undefined, argumentsDelta: '{"question":"Why?"}' });

    expect(asm.result().toolCalls[0].name).toBe('ask_clarification');
  });

  it('accumulates reasoning separately from content', () => {
    const asm = new TurnAssembler();
    asm.add({ index: 0, reasoningDelta: 'weighing ' });
    asm.add({ index: 0, reasoningDelta: 'the options' });
    asm.add({ index: 0, contentDelta: 'Hello' });

    const result = asm.result();
    expect(result.reasoning).toBe('weighing the options');
    expect(result.content).toBe('Hello');
  });

  it('handles two parallel tool calls without merging them', () => {
    const asm = new TurnAssembler();
    asm.add({ index: 0, name: 'ask_clarification', argumentsDelta: '{"q":1}' });
    asm.add({ index: 1, name: 'flag_scope', argumentsDelta: '{"k":2}' });

    expect(asm.result().toolCalls.map((call) => call.name)).toEqual([
      'ask_clarification',
      'flag_scope',
    ]);
  });

  it('reports no tool call when the model replied in prose', () => {
    const asm = new TurnAssembler();
    asm.add({ index: 0, contentDelta: 'Sure, here are some options:' });

    const result = asm.result();
    expect(result.toolCalls).toEqual([]);
    expect(result.content).toContain('here are some options');
  });

  it('records the finish reason', () => {
    const asm = new TurnAssembler();
    asm.setFinishReason('tool_calls');
    expect(asm.result().finishReason).toBe('tool_calls');
  });

  it('flags truncation, which produces invalid JSON', () => {
    const asm = new TurnAssembler();
    asm.add({ index: 0, name: 'record_options', argumentsDelta: '{"options":["Stay"' });
    asm.setFinishReason('length');

    // A reply cut off by max_tokens is not a valid call, and saying so beats
    // parsing it and hoping.
    expect(asm.result().truncated).toBe(true);
  });
});

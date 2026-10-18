import type { Objective } from './types';

export interface FrameResult {
  ok: boolean;
  reason?: string;
}

export function validateFrame(input: { objectives: Objective[] }): FrameResult {
  if (input.objectives.length === 0) {
    return { ok: false, reason: 'No objective stated. Define what you want before scoring.' };
  }
  return { ok: true };
}

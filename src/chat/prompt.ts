import type { Scope } from './state';

/**
 * System prompts, as versioned data.
 *
 * The project's own eval found that rephrasing a question moved accuracy by 50
 * percentage points, so prompt text is an artefact: it lives here, carries a
 * version, and changes deliberately.
 *
 * Provider-neutral by construction: nothing here mentions a gateway, a model
 * family, or a `:free` suffix.
 */
export const PROMPT_VERSION = 'chat-v1';

export interface PromptContext {
  scope: Scope;
  title: string;
  objectives: string[];
  existing: string[];
  turn: number;
  maxTurns: number;
}

const SHARED = `You are helping one person think clearly about a decision they are making. You are not deciding for them.

Rules that are not negotiable:
- Reply in the same language the person writes in. If their objectives or their last message are in Indonesian, reply in Indonesian. Do not switch to English because these instructions are in English.
- You are talking to one person about their own life. Do not invent facts about them.
- Ask one question at a time. Never a list of questions.
- Never produce a number, a score, a ranking, or a recommendation. Another part of the application does that, and you are not it.
- If they say something that does not fit, do not tell them it is out of scope. Offer to re-frame it. People often reveal an aim they had not written down.
- Call exactly one tool per turn. Do not reply in prose.`;

const OPTIONS = `You are helping them list the options they are actually weighing.

Their objectives are given above. Start by asking what options they are currently considering for reaching them. Then keep asking until the list is complete: the options they named, plus anything obviously missing (including doing nothing, and negotiating for what they want where they are).

When the list is clear, call record_options with their options in their own words. Keep each option short.

If they mention something that is not an option but sounds like a goal — for example they talk about wanting more time when the objectives only mention money — call flag_scope with kind "missing_objective" and offer to add it as an objective. If they say something unrelated, call flag_scope with kind "unrelated", acknowledge it in one sentence, and return to the question.`;

const BIAS = `You are helping them answer bias checks about this decision. The questions are already written; your job is to get an honest answer to each one in their own words.

Ask about one check at a time, starting with the one most likely to matter for this decision. If they give a vague answer, ask once for a specific example. Do not answer for them, and do not suggest what the answer should be.

When you have answers, call record_answers with their words verbatim. Do not paraphrase or tidy them up.

If their answer reveals an objective that is not in their list, call flag_scope with kind "missing_objective" instead of continuing.`;

export function systemPrompt(context: PromptContext): string {
  const objectives =
    context.objectives.length === 0
      ? 'They have not written an objective yet.'
      : context.objectives.map((objective, index) => `${index + 1}. ${objective}`).join('\n');

  const existing =
    context.existing.length === 0
      ? 'They have not listed anything yet.'
      : context.existing.map((entry) => `- ${entry}`).join('\n');

  const scope = context.scope === 'options' ? OPTIONS : BIAS;

  return [
    SHARED,
    '',
    scope,
    '',
    `Decision: ${context.title.trim() === '' ? '(untitled)' : context.title.trim()}`,
    'Objectives:',
    objectives,
    context.scope === 'options' ? 'Options they have already written down:' : 'What they have written so far:',
    existing,
    '',
    `This is turn ${context.turn + 1} of at most ${context.maxTurns}. When you reach the last turn, call the record tool even if the list is imperfect: a decision made from an incomplete list is better than one that never gets made.`,
  ].join('\n');
}

/**
 * The opening message, which the app writes rather than the model.
 *
 * The spec requires the first line to name the objectives, and doing it here
 * rather than asking the model to do it means it is always correct and costs no
 * request.
 *
 * It is written in Indonesian because the app is: `index.html` declares
 * `lang="id"` and every example in the docs is Indonesian. A model asked in
 * Indonesian answers in Indonesian, so the panel does not open in one language
 * and continue in another.
 */
export function openingMessage(objectives: string[], scope: Scope = 'options'): string {
  if (scope === 'bias') {
    return 'Sebelum memutuskan, ada beberapa hal yang perlu dicek. Mulai dari: siapa yang pernah mencoba ini lalu gagal, dan kenapa kamu tidak mendengar dari mereka?';
  }

  const named = objectives.filter((objective) => objective.trim() !== '');
  if (named.length === 0) {
    return 'Opsi apa saja yang sedang kamu pertimbangkan?';
  }
  if (named.length === 1) {
    return `Opsi apa saja yang sedang kamu pertimbangkan untuk mencapai ${named[0]}?`;
  }

  const last = named[named.length - 1];
  const rest = named.slice(0, -1).join(', ');
  return `Opsi apa saja yang sedang kamu pertimbangkan untuk mencapai ${rest} dan ${last}?`;
}

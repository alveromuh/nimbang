import { AiMark } from './AiMark';
import { Bi } from './Bi';
import { copy } from './i18n';

interface AiTriggerProps {
  scope: 'options' | 'bias';
  onOpen: () => void;
}

/**
 * The button that opens the elicitation panel, in either stage.
 *
 * One component rather than two so the two entry points cannot drift: the same
 * sparkle, the same weight, the same hint. The label differs because the stuck
 * point differs — not knowing your options is a different problem from not
 * knowing what to write about a bias check.
 *
 * The button carries one line of Indonesian and a quiet English gloss. The
 * longer explanation that used to sit beside it is gone: four lines of text in a
 * row of chrome, twice on one page, read as clutter. The panel itself says what
 * it does, and it says it after the user has clicked — which is when they need it.
 */
export function AiTrigger({ scope, onOpen }: AiTriggerProps) {
  const label = scope === 'options' ? copy.aiOptions : copy.aiBias;

  return (
    <div className="suggest">
      <button type="button" className="btn-quiet btn-ai" onClick={onOpen}>
        <AiMark />
        <Bi text={label} />
      </button>
    </div>
  );
}

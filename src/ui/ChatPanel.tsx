import { useMemo, useState } from 'react';
import { ChatError, type TurnResult } from '../chat/client';
import { openingMessage, systemPrompt } from '../chat/prompt';
import { MAX_TURNS, type ChatState, type Scope } from '../chat/state';
import { parseTurn, toolsFor, type ParsedTurn } from '../chat/tools';

interface ChatPanelProps {
  scope?: Scope;
  title?: string;
  objectives: string[];
  existingOptions: string[];
  onSend: (request: {
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    tools: ReturnType<typeof toolsFor>;
  }) => Promise<TurnResult>;
  onAccept: (items: string[]) => void;
  onAddObjective: (text: string) => void;
  onClose: () => void;
}

/**
 * The elicitation panel.
 *
 * Three rules from the spec shape everything here:
 *
 * 1. **Nothing is applied until the user accepts.** The proposal is a checklist.
 * 2. **Off-topic input is re-framed, not rejected.** A reply that does not fit is
 *    usually evidence of an objective the person had not written down, so the
 *    panel offers to add it and lets them decide.
 * 3. **Every failure is stated.** A rate limit, a missing key, and a model that
 *    cannot call tools are different facts, and only some are the user's to fix.
 */
export function ChatPanel({
  scope = 'options',
  title = '',
  objectives,
  existingOptions,
  onSend,
  onAccept,
  onAddObjective,
  onClose,
}: ChatPanelProps) {
  const opening = useMemo(() => openingMessage(objectives), [objectives]);

  const [turns, setTurns] = useState<{ role: 'model' | 'user'; text: string }[]>([
    { role: 'model', text: opening },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [proposal, setProposal] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [flag, setFlag] = useState<{ text: string; question: string } | null>(null);
  const [done, setDone] = useState(false);

  const replies = turns.filter((turn) => turn.role === 'user').length;

  async function submit() {
    const text = draft.trim();
    if (text === '' || busy || done) {
      return;
    }

    const history = [...turns, { role: 'user' as const, text }];
    setTurns(history);
    setDraft('');
    setBusy(true);
    setError(undefined);
    setThinking('');

    try {
      const result = await onSend({
        messages: [
          {
            role: 'system',
            content: systemPrompt({
              scope,
              title,
              objectives,
              existing: existingOptions,
              turn: replies,
              maxTurns: MAX_TURNS,
            }),
          },
          ...history.map((turn) => ({
            role: turn.role === 'model' ? ('assistant' as const) : ('user' as const),
            content: turn.text,
          })),
        ],
        tools: toolsFor(scope),
      });

      handle(result);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
      setThinking('');
    }
  }

  function handle(result: TurnResult) {
    if (result.truncated) {
      setError('The reply was cut off before it finished. Try again.');
      return;
    }

    const parsed: ParsedTurn = parseTurn(
      scope,
      result.toolCalls.length === 0 ? null : result.toolCalls,
    );

    if (parsed.kind === 'error') {
      setError(parsed.message);
      return;
    }

    if (parsed.kind === 'ask') {
      setTurns((current) => [...current, { role: 'model', text: parsed.question }]);
      return;
    }

    if (parsed.kind === 'flag') {
      setFlag({ text: parsed.text, question: parsed.question });
      setTurns((current) => [...current, { role: 'model', text: parsed.question }]);
      return;
    }

    // Recorded: show the proposal, tick everything that is not already present.
    const fresh = parsed.items.filter((item) => !alreadyHas(existingOptions, item));
    setProposal(parsed.items);
    setSelected(new Set(fresh));
    setDone(true);
  }

  function accept() {
    if (proposal === null) {
      return;
    }
    const chosen = proposal.filter((item) => selected.has(item));
    if (chosen.length > 0) {
      onAccept(chosen);
    }
    onClose();
  }

  return (
    <aside className="chat" aria-label="Asisten opsi">
      <header className="chat__head">
        <span className="chat__title">Berpikir sambil bicara</span>
        <button type="button" className="btn-quiet btn-icon" onClick={onClose}>
          Tutup
        </button>
      </header>

      <ol className="chat__log">
        {turns.map((turn, index) => (
          <li
            key={index}
            className={turn.role === 'model' ? 'chat__turn' : 'chat__turn chat__turn--user'}
          >
            {turn.text}
          </li>
        ))}
      </ol>

      {busy && (
        <p className="chat__thinking" role="status">
          {thinking === '' ? 'Sedang berpikir…' : `Sedang berpikir… ${thinking.slice(-80)}`}
        </p>
      )}

      {error !== undefined && (
        <p className="note note--warn" role="status">
          {error}
        </p>
      )}

      {flag !== null && (
        <div className="chat__flag">
          <p className="note">Sepertinya ini tujuan yang berbeda dari yang sudah tertulis.</p>
          <button type="button" onClick={() => onAddObjective(flag.text)}>
            Tambahkan sebagai tujuan
          </button>
          <button type="button" className="btn-quiet" onClick={() => setFlag(null)}>
            Kesampingkan
          </button>
        </div>
      )}

      {proposal !== null ? (
        <div className="chat__proposal">
          <p className="chat__label">Usulan opsi</p>
          {proposal.map((item) => {
            const present = alreadyHas(existingOptions, item);
            return (
              <label className="chat__check" key={item}>
                <input
                  type="checkbox"
                  aria-label={item}
                  checked={!present && selected.has(item)}
                  disabled={present}
                  onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) {
                      next.add(item);
                    } else {
                      next.delete(item);
                    }
                    setSelected(next);
                  }}
                />
                {item}
                {present && <span className="chat__present">sudah ada di daftarmu</span>}
              </label>
            );
          })}
          <button type="button" className="btn-primary" onClick={accept}>
            Tambahkan yang dipilih
          </button>
        </div>
      ) : (
        <div className="chat__compose">
          <label htmlFor="chat-reply">Jawabanmu</label>
          <textarea
            id="chat-reply"
            value={draft}
            disabled={busy || done}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="chat__actions">
            <button type="button" onClick={submit} disabled={busy || done || draft.trim() === ''}>
              Kirim
            </button>
            <span className="chat__count">
              {replies} dari {MAX_TURNS} putaran
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

/** Loose on purpose: "Move to media fashion" and "move to media fashion" are one option. */
function alreadyHas(existing: string[], candidate: string): boolean {
  const normalise = (value: string) => value.trim().toLowerCase();
  return existing.some((entry) => normalise(entry) === normalise(candidate));
}

function messageFor(error: unknown): string {
  if (error instanceof ChatError) {
    switch (error.kind) {
      case 'not_configured':
        return 'The assistant is not configured on this server. Everything else still works.';
      case 'unauthorized':
        return 'The gateway rejected the API key.';
      case 'rate_limited':
        return error.retryAfter === undefined
          ? 'The gateway is rate limiting. Try again shortly.'
          : `The gateway is rate limiting. Try again in ${error.retryAfter}s.`;
      case 'no_tools':
        return 'The configured model does not support tool calling, which this panel needs.';
      case 'no_model':
        return 'No model is available. Set LLM_MODEL on the server.';
      case 'interrupted':
        return 'The reply was interrupted. Try again.';
      case 'malformed':
        return 'The assistant returned something unexpected.';
      case 'unreachable':
        return 'Could not reach the assistant. Try again.';
    }
  }
  return 'Something went wrong talking to the assistant.';
}

export type { ChatState };

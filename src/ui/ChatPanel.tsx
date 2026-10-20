import { useEffect, useMemo, useState } from 'react';
import { ChatError, type TurnResult } from '../chat/client';
import { openingMessage, systemPrompt } from '../chat/prompt';
import { MAX_TURNS, type ChatState, type Scope } from '../chat/state';
import { parseTurn, toolsFor, type BiasAnswer, type BiasField, type ParsedTurn } from '../chat/tools';
import { AiMark } from './AiMark';
import { copy } from './i18n';

/**
 * The heading each bias answer is filed under.
 *
 * Indonesian, matching the panel it writes into. Kept here rather than imported
 * from the gate so the chat panel does not depend on the gate's markup, and so a
 * reworded question in one place cannot silently retitle the other.
 */
const BIAS_TITLES: Record<BiasField, string> = {
  survivorship: copy.survivorship.id,
  ostrich: copy.ostrich.id,
  hastyGeneralisation: copy.hasty.id,
  causation: copy.causation.id,
  falseComparison: copy.comparison.id,
};

interface ChatPanelProps {
  scope?: Scope;
  title?: string;
  objectives: string[];
  existingOptions: string[];
  /** Answers already in the gate, so the panel does not ask again what is filled. */
  existingAnswers?: string[];
  onSend: (request: {
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    tools: ReturnType<typeof toolsFor>;
  }) => Promise<TurnResult>;
  onAccept: (items: string[]) => void;
  /** Bias scope only: writes each answer into the gate field it belongs to. */
  onAcceptAnswers?: (answers: BiasAnswer[]) => void;
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
  existingAnswers = [],
  onSend,
  onAccept,
  onAcceptAnswers,
  onAddObjective,
  onClose,
}: ChatPanelProps) {
  const opening = useMemo(() => openingMessage(objectives, scope), [objectives, scope]);

  const [turns, setTurns] = useState<{ role: 'model' | 'user'; text: string }[]>([
    { role: 'model', text: opening },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [proposal, setProposal] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<BiasAnswer[] | null>(null);
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
              existing: scope === 'options' ? existingOptions : existingAnswers,
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
      setError('Jawabannya terpotong sebelum selesai. Coba lagi.');
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

    setDone(true);

    // Bias answers are keyed to a gate field, so they are shown one per check
    // rather than as one undifferentiated list.
    if (scope === 'bias') {
      const recorded = parsed.answers ?? [];
      setAnswers(recorded);
      setSelected(new Set(recorded.map((answer) => answer.field)));
      return;
    }

    // Recorded: show the proposal, tick everything that is not already present.
    const fresh = parsed.items.filter((item) => !alreadyHas(existingOptions, item));
    setProposal(parsed.items);
    setSelected(new Set(fresh));
  }

  function accept() {
    if (scope === 'bias') {
      if (answers !== null && onAcceptAnswers !== undefined) {
        const chosen = answers.filter((answer) => selected.has(answer.field));
        if (chosen.length > 0) {
          onAcceptAnswers(chosen);
        }
      }
      onClose();
      return;
    }

    if (proposal === null) {
      return;
    }
    const chosen = proposal.filter((item) => selected.has(item));
    if (chosen.length > 0) {
      onAccept(chosen);
    }
    onClose();
  }

  /**
   * Escape closes the panel.
   *
   * Bound to the document rather than to the panel because focus is not
   * guaranteed to be inside it: the panel opens while the cursor is still in the
   * form. The listener is removed on unmount so a closed panel cannot swallow a
   * key press meant for the page.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <aside className="chat" aria-label={scope === 'bias' ? 'Asisten pemeriksaan bias' : 'Asisten opsi'}>
      <header className="chat__head">
        <span className="chat__title">
          <AiMark />
          {scope === 'bias' ? 'Menggali jawabanmu' : 'Berpikir sambil bicara'}
        </span>
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

      {proposal !== null || answers !== null ? (
        <div className="chat__proposal">
          <p className="chat__label">{scope === 'bias' ? 'Usulan jawaban' : 'Usulan opsi'}</p>

          {answers !== null
            ? answers.map((answer) => (
                <label className="chat__check" key={answer.field}>
                  <input
                    type="checkbox"
                    aria-label={BIAS_TITLES[answer.field]}
                    checked={selected.has(answer.field)}
                    onChange={(event) => {
                      const next = new Set(selected);
                      if (event.target.checked) {
                        next.add(answer.field);
                      } else {
                        next.delete(answer.field);
                      }
                      setSelected(next);
                    }}
                  />
                  <span>
                    <span className="chat__field">{BIAS_TITLES[answer.field]}</span>
                    {answer.text}
                  </span>
                </label>
              ))
            : (proposal ?? []).map((item) => {
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
            {scope === 'bias' ? 'Isi yang dipilih' : 'Tambahkan yang dipilih'}
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

/**
 * Failures, in the interface's language.
 *
 * Indonesian because these are the app's own sentences, and the rule is that the
 * app owns every word the user reads. The model's prose never reaches here: a
 * parser error is the app reporting what it could not use.
 */
function messageFor(error: unknown): string {
  if (error instanceof ChatError) {
    switch (error.kind) {
      case 'not_configured':
        return 'Asisten belum diatur di server ini. Bagian lain tetap berjalan.';
      case 'unauthorized':
        return 'Kunci API ditolak oleh gateway.';
      case 'rate_limited':
        return error.retryAfter === undefined
          ? 'Gateway sedang membatasi permintaan. Coba lagi sebentar.'
          : `Gateway sedang membatasi permintaan. Coba lagi dalam ${error.retryAfter} detik.`;
      case 'no_tools':
        return 'Model yang dipakai tidak mendukung pemanggilan tool, padahal panel ini memerlukannya.';
      case 'no_model':
        return 'Tidak ada model yang tersedia. Setel LLM_MODEL di server.';
      case 'interrupted':
        return 'Jawabannya terputus. Coba lagi.';
      case 'malformed':
        return 'Asisten mengembalikan sesuatu yang tidak bisa dibaca.';
      case 'unreachable':
        return 'Tidak bisa menghubungi asisten. Coba lagi.';
    }
  }
  return 'Ada yang gagal saat menghubungi asisten.';
}

export type { ChatState };

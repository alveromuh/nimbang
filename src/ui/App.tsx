import { useMemo, useState } from 'react';
import { deserializeDecision, type Decision } from '../core';
import { createDecision, deleteDecision, listDecisions, saveDecision } from './library';
import { DecisionWorkspace } from './DecisionWorkspace';

/**
 * Reads a shared decision out of the URL fragment, if there is one.
 *
 * The fragment is used rather than the query string because it is never sent to
 * a server, so a decision stays in the browser even when the link is opened from
 * a hosted copy.
 */
function sharedDecisionFromUrl(): Decision | null {
  if (typeof location === 'undefined') {
    return null;
  }
  if (!location.hash.startsWith('#d=')) {
    return null;
  }
  try {
    return deserializeDecision(location.hash.slice(3));
  } catch {
    // A malformed link falls through to the library rather than blanking the
    // page: the user still has their own work.
    return null;
  }
}

/**
 * The dashboard.
 *
 * A **Monitor** surface with an **Operate** secondary: the rail lists decisions,
 * the workspace shows the one being worked on. No hero, no feature cards. The
 * list is the navigation, because someone using this over months has more than
 * one decision and needs to see them.
 */
export function App() {
  // A shared link is imported once, on first render, and becomes a normal entry
  // in the library. It is not special afterwards: the user can edit it, delete
  // it, and it persists like anything else.
  const [decisions, setDecisions] = useState<Decision[]>(() => {
    const shared = sharedDecisionFromUrl();
    if (shared !== null) {
      saveDecision(shared);
      // Drop the fragment so a reload does not re-import a stale copy over edits.
      if (typeof history !== 'undefined') {
        history.replaceState(null, '', location.pathname + location.search);
      }
      return listDecisions();
    }
    return listDecisions();
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => decisions.find((decision) => decision.id === activeId) ?? decisions[0] ?? null,
    [decisions, activeId],
  );

  function refresh(): void {
    setDecisions(listDecisions());
  }

  function openNew(): void {
    const decision = createDecision();
    saveDecision(decision);
    refresh();
    setActiveId(decision.id);
  }

  function remove(id: string): void {
    deleteDecision(id);
    refresh();
    if (activeId === id) {
      setActiveId(null);
    }
  }

  return (
    <div className="shell">
      <nav className="rail" aria-label="Daftar keputusan">
        <div className="rail__brand">
          <h1>Nimbang</h1>
        </div>
        <p className="rail__lede">
          Tujuan dulu, baru opsi — dan catatan apa yang kamu harapkan.
        </p>

        {decisions.length === 0 ? (
          <p className="rail__empty">Belum ada keputusan.</p>
        ) : (
          <ul className="rail__list">
            {decisions.map((decision) => (
              <li key={decision.id}>
                <button
                  type="button"
                  className="rail__item"
                  aria-current={decision.id === active?.id}
                  onClick={() => setActiveId(decision.id)}
                >
                  <span className="rail__item-title">
                    {decision.title.trim() || 'Keputusan tanpa judul'}
                  </span>
                  <span className="rail__item-meta">
                    {decision.options.length} opsi · {decision.items.length} nilai
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="rail__footer">
          <button type="button" className="btn-primary" onClick={openNew}>
            Keputusan baru
          </button>
        </div>
      </nav>

      <main className="work">
        {active === null ? (
          <div className="empty">
            <h2>Mulai dari tujuan</h2>
            <p>
              Bukan dari opsinya. Keputusan yang dimulai dari daftar pilihan sudah melepas
              kesempatan menemukan pilihan yang lebih baik.
            </p>
            <p className="empty__aside">
              Semua keputusanmu disimpan di browser ini, tidak di mana pun lagi.
            </p>
          </div>
        ) : (
          <DecisionWorkspace
            key={active.id}
            decision={active}
            onSaved={(saved) => {
              saveDecision(saved);
              setDecisions((current) =>
                current.map((entry) => (entry.id === saved.id ? saved : entry)),
              );
            }}
            onDelete={() => remove(active.id)}
          />
        )}
      </main>
    </div>
  );
}

export default App;

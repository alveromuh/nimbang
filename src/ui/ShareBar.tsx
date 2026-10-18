import { useState } from 'react';
import { serializeDecision, type Decision } from '../core';

interface ShareBarProps {
  decision: Decision;
}

/**
 * Share and export.
 *
 * The payload goes in the URL **fragment**, not the query string. A fragment is
 * never sent to a server, so a decision stays in the browser even when the link
 * is opened from a hosted copy of the app — which is the same promise the
 * "no backend, no accounts" constraint makes.
 */
export function ShareBar({ decision }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const payload = serializeDecision(decision);
  const link = buildShareLink(payload);
  const json = JSON.stringify(decision, null, 2);

  return (
    <section aria-labelledby="share-heading">
      <h2 id="share-heading">Share and export</h2>

      <label htmlFor="share-link">Share link</label>
      <input id="share-link" readOnly value={link} onFocus={(event) => event.target.select()} />

      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          } catch {
            // Clipboard access can be refused. The link is selectable above, so
            // the user is not stuck; saying nothing is better than an alert.
          }
        }}
      >
        Copy link
      </button>
      {copied && <span role="status">Copied.</span>}

      <label htmlFor="share-json">Decision as JSON</label>
      <textarea id="share-json" readOnly rows={12} value={json} />

      <button
        type="button"
        onClick={() => download(`${slug(decision.title)}.json`, json)}
      >
        Download JSON
      </button>
    </section>
  );
}

/**
 * Uses the current page as the base, so the link works wherever the app is
 * hosted. Falls back to a relative form when there is no location, which is the
 * case in a test environment without a document URL.
 */
function buildShareLink(payload: string): string {
  const base =
    typeof location === 'undefined' ? '' : `${location.origin}${location.pathname}`;
  return `${base}#d=${payload}`;
}

function slug(title: string): string {
  const cleaned = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned === '' ? 'nimbang-decision' : cleaned;
}

function download(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

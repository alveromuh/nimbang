import type { Claim } from '../core';
import { Bi } from './Bi';
import { copy } from './i18n';

interface ClaimPanelProps {
  claims: Claim[];
  onChange: (next: Claim[]) => void;
}

/**
 * The Tag stage, as a form.
 *
 * `validateTag` has existed since the engine was written, but nothing could
 * produce a claim, so the check passed on an empty list and enforced nothing.
 * A rule that cannot fail is not a rule: this panel is what makes the fact /
 * preference distinction reachable.
 *
 * The list may stay empty — a decision with no written claims has nothing to
 * mistag. What is not allowed is a claim that is half-written: a fact with no
 * source is exactly the confusion the stage exists to catch.
 */
export function ClaimPanel({ claims, onChange }: ClaimPanelProps) {
  const replace = (index: number, patch: Partial<Claim>) =>
    onChange(claims.map((claim, position) => (position === index ? { ...claim, ...patch } : claim)));

  return (
    <section className="panel" aria-labelledby="tag-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="tag-heading">
          <Bi text={copy.claims} />
        </h2>
        <p className="panel__hint">
          <Bi text={copy.claimsHint} />
        </p>
      </div>

      {claims.length === 0 && (
        <p className="note">
          <Bi text={copy.claimsEmpty} />
        </p>
      )}

      {claims.map((claim, index) => {
        const needsSource = claim.domain === 'fact';
        const missing = needsSource ? !filled(claim.source) : !filled(claim.owner);
        const tagLabel = needsSource ? copy.claimSource.id : copy.claimOwner.id;
        return (
          <div className="claim" key={claim.id}>
            <div className="claim__row">
              <div>
                <label htmlFor={`claim-${index}-text`}>
                  {copy.claimText.id} {index + 1}
                </label>
                <input
                  id={`claim-${index}-text`}
                  aria-label={`${copy.claimText.id} ${index + 1}`}
                  placeholder={copy.claimTextPlaceholder.id}
                  value={claim.text}
                  onChange={(event) => replace(index, { text: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`claim-${index}-domain`}>
                  {copy.claimDomain.id} {index + 1}
                </label>
                <select
                  id={`claim-${index}-domain`}
                  aria-label={`${copy.claimDomain.id} ${index + 1}`}
                  value={claim.domain}
                  onChange={(event) =>
                    replace(index, {
                      domain: event.target.value === 'preference' ? 'preference' : 'fact',
                    })
                  }
                >
                  <option value="fact">{copy.fact.id}</option>
                  <option value="preference">{copy.preference.id}</option>
                </select>
              </div>
              <button
                type="button"
                className="btn-icon"
                aria-label={`${copy.removeClaim.id} ${index + 1}`}
                onClick={() => onChange(claims.filter((_, position) => position !== index))}
              >
                Hapus
              </button>
            </div>

            {/* One field, not two. A claim is a fact or a preference, never both,
                and asking for both would invite a claim that answers neither. */}
            <div className="claim__tag">
              <label htmlFor={`claim-${index}-tag`}>{tagLabel}</label>
              <input
                id={`claim-${index}-tag`}
                aria-label={`${tagLabel} ${index + 1}`}
                placeholder={
                  needsSource ? copy.claimSourcePlaceholder.id : copy.claimOwnerPlaceholder.id
                }
                value={(needsSource ? claim.source : claim.owner) ?? ''}
                onChange={(event) =>
                  replace(index, needsSource ? { source: event.target.value } : { owner: event.target.value })
                }
              />
              {missing && (
                <p className="note note--warn">
                  {needsSource
                    ? 'Fakta ini belum punya sumber.'
                    : 'Preferensi ini belum menyebut pemiliknya.'}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          onChange([
            ...claims,
            {
              // Claims are referenced by predictions, so the id has to be stable
              // and unique. The count is enough: ids are never reused, because
              // removal only ever shrinks the list.
              id: `c${nextClaimNumber(claims)}`,
              text: '',
              domain: 'fact',
            },
          ])
        }
      >
        {copy.addClaim.id}
      </button>
    </section>
  );
}

function filled(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Highest numeric suffix in use, so removing a middle claim cannot reuse an id. */
function nextClaimNumber(claims: Claim[]): number {
  let highest = 0;
  for (const claim of claims) {
    const match = /^c(\d+)$/.exec(claim.id);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return highest + 1;
}

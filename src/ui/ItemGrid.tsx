import type { Attribute, Item, Objective, Option } from '../core';
import { ItemEditor } from './ItemEditor';
import { Bi } from './Bi';
import { copy } from './i18n';

interface ItemGridProps {
  options: Option[];
  objectives: Objective[];
  items: Item[];
  onChange: (itemId: string, next: Item | null) => void;
  onAttributesChange: (objectiveId: string, attributes: Attribute[]) => void;
  /** Removing a dimension must also remove the assessments that named it. */
  onAttributeRemove: (objectiveId: string, attributeId: string) => void;
}

/**
 * The score matrix: options down the side, attributes across the top.
 *
 * The previous layout listed every option-by-objective pair in one vertical run,
 * which is the wrong shape for the question. Comparing options is the whole task,
 * so they have to be visible side by side; a list makes the reader hold the
 * others in memory. The grid is the composition the task actually needs.
 *
 * A column is one named attribute, not one objective. Two things scored under
 * "Penghasilan" (pay and hours) are different dimensions, and averaging them
 * into a single column would hide which one moved the answer.
 */
export function ItemGrid({
  options,
  objectives,
  items,
  onChange,
  onAttributesChange,
  onAttributeRemove,
}: ItemGridProps) {
  /**
   * An objective written before attributes existed has one unnamed dimension,
   * keyed by its own id. Items saved back then carry no `attributeId`, and the
   * engine reads that as this same id — so the legacy column keeps working.
   *
   * The name is left empty rather than copied from the objective statement: a
   * field pre-filled with the sentence directly above it reads as a duplicate,
   * and the column heading already falls back to that sentence.
   */
  const attributesFor = (objective: Objective): Attribute[] =>
    objective.attributes?.length ? objective.attributes : [{ id: objective.id, name: '' }];

  const columns = objectives.flatMap((objective) =>
    attributesFor(objective).map((attribute, index) => {
      const named = attribute.name.trim();
      return {
        objective,
        attribute,
        // A column with no name of its own shows the objective sentence, which is
        // the same dimension expressed once. `named` decides how it is styled.
        label: named || (attribute.id === objective.id ? objective.statement : '') || `Atribut ${index + 1}`,
        named: named !== '',
      };
    }),
  );

  return (
    <section className="panel" aria-labelledby="score-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="score-heading">
          <Bi text={copy.scores} />
        </h2>
        <p className="panel__hint">
          <Bi text={copy.scoresHint} />
        </p>
      </div>

      <div className="grid" data-cols={columns.length}>
        <div className="attributes" aria-label="Atribut penilaian">
          {objectives.map((objective, objectiveIndex) => {
            const statement = objective.statement || `Tujuan ${objectiveIndex + 1}`;
            return (
              <div className="attribute-group" key={objective.id}>
                <p className="attribute-group__name">{statement}</p>
                {(objective.attributes ?? []).map((attribute, index) => (
                  <div className="attribute" key={attribute.id}>
                    <div>
                      <label htmlFor={`attribute-${attribute.id}`}>
                        Nama atribut {index + 1}
                      </label>
                      <input
                        id={`attribute-${attribute.id}`}
                        value={attribute.name}
                        placeholder={index === 0 ? 'Nama atribut' : statement}
                        aria-label={`Nama atribut ${statement} ${index + 1}`}
                        onChange={(event) => {
                          const next = [...(objective.attributes ?? [])];
                          next[index] = { ...attribute, name: event.target.value };
                          onAttributesChange(objective.id, next);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label={`Hapus atribut ${statement} ${index + 1}`}
                      disabled={(objective.attributes ?? []).length <= 1}
                      onClick={() => onAttributeRemove(objective.id, attribute.id)}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="attribute-add"
                  onClick={() => {
                    // The first attribute is the objective's existing dimension,
                    // so items scored before attributes existed stay attached to
                    // the column the user already filled in.
                    const current = attributesFor(objective);
                    onAttributesChange(objective.id, [
                      ...current,
                      { id: nextAttributeId(objective.id, current), name: '' },
                    ]);
                  }}
                >
                  Tambah atribut
                </button>
              </div>
            );
          })}
        </div>
        <div
          className="grid__row"
          style={{ gridTemplateColumns: `11rem repeat(${columns.length}, minmax(9rem, 17rem))` }}
        >
          <div className="grid__head">{copy.optionLabel.id}</div>
          {columns.map(({ objective, attribute, label, named }) => (
            <div className={named ? 'grid__head' : 'grid__head grid__head--fallback'} key={attribute.id}>
              {label}
              {named && label !== objective.statement && <small>{objective.statement}</small>}
            </div>
          ))}
        </div>

        {options.map((option, optionIndex) => (
          <div
            className="grid__row"
            key={option.id}
            style={{ gridTemplateColumns: `11rem repeat(${columns.length}, minmax(9rem, 17rem))` }}
          >
            <div className="grid__option">
              {option.label || `Opsi ${optionIndex + 1}`}
              {option.isBaseline && <small>{copy.baseline.id}</small>}
            </div>

            {columns.map(({ objective, attribute, label }) => {
              const itemId = `${option.id}--${attribute.id}`;
              const item = items.find(
                (candidate) =>
                  candidate.optionId === option.id && candidate.objectiveId === objective.id && (candidate.attributeId ?? objective.id) === attribute.id,
              );
              return (
                <ItemEditor
                  key={itemId}
                  idPrefix={itemId}
                  label={`${option.label || `Opsi ${optionIndex + 1}`} pada ${label}`}
                  item={item}
                  objectiveId={objective.id}
                  attributeId={attribute.id}
                  onChange={(next) => onChange(itemId, next)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Attribute ids are stable and never reused within an objective: a removed id
 * that came back would silently adopt the assessments that outlived it.
 *
 * The new id is derived from the highest number already in use rather than from
 * the list length, because removing a middle attribute makes those two disagree.
 */
function nextAttributeId(objectiveId: string, existing: Attribute[]): string {
  let highest = 0;
  for (const attribute of existing) {
    const match = /-a(\d+)$/.exec(attribute.id);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return `${objectiveId}-a${highest + 1}`;
}

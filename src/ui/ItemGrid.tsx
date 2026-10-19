import type { Item, Objective, Option } from '../core';
import { ItemEditor } from './ItemEditor';
import { Bi } from './Bi';
import { copy } from './i18n';

interface ItemGridProps {
  options: Option[];
  objectives: Objective[];
  items: Item[];
  onChange: (itemId: string, next: Item | null) => void;
}

/**
 * The score matrix: options down the side, objectives across the top.
 *
 * The previous layout listed every option-by-objective pair in one vertical run,
 * which is the wrong shape for the question. Comparing options is the whole task,
 * so they have to be visible side by side; a list makes the reader hold the
 * others in memory. The grid is the composition the task actually needs.
 */
export function ItemGrid({ options, objectives, items, onChange }: ItemGridProps) {
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

      <div className="grid" data-cols={objectives.length}>
        <div
          className="grid__row"
          style={{ gridTemplateColumns: `11rem repeat(${objectives.length}, minmax(9rem, 17rem))` }}
        >
          <div className="grid__head">{copy.optionLabel.id}</div>
          {objectives.map((objective, index) => (
            <div className="grid__head" key={objective.id}>
              {objective.statement || `Tujuan ${index + 1}`}
            </div>
          ))}
        </div>

        {options.map((option, optionIndex) => (
          <div
            className="grid__row"
            key={option.id}
            style={{ gridTemplateColumns: `11rem repeat(${objectives.length}, minmax(9rem, 17rem))` }}
          >
            <div className="grid__option">
              {option.label || `Opsi ${optionIndex + 1}`}
              {option.isBaseline && <small>{copy.baseline.id}</small>}
            </div>

            {objectives.map((objective) => {
              const itemId = `${option.id}--${objective.id}`;
              const item = items.find(
                (candidate) =>
                  candidate.optionId === option.id && candidate.objectiveId === objective.id,
              );
              return (
                <ItemEditor
                  key={itemId}
                  idPrefix={itemId}
                  label={`${option.label || `Opsi ${optionIndex + 1}`} pada ${
                    objective.statement || 'tujuan ini'
                  }`}
                  item={item}
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

import { mergeClasses } from "src/gui/classes";
import { listClasses } from "../classes/common";
import type { JSX } from "react";
import { List } from "./List";
import { ListRow, LabeledControl } from "./ListRow";

export interface DeckItem {
  readonly depth: number;
  readonly isDisabled: boolean;
  readonly name: string;
  readonly shortName: string;
  readonly syncedCount: number;
  readonly tooltip?: string;
  readonly totalCount: number;
  readonly updatedCount: number | null;
}

export interface DeckListProps {
  readonly alreadySyncedTooltip?: string;
  readonly className?: string;
  readonly emptyTooltip?: string;
  readonly getRowClassName?: (
    item: DeckItem,
    isDisabled: boolean,
  ) => string | undefined;
  readonly inputClassName?: string;
  readonly inputName?: string;
  readonly items: DeckItem[];
  readonly labelClassName?: string;
  readonly onSelect: (name: string) => void;
  readonly prompt?: string;
  readonly selectedName: string;
}

export function DeckList({
  items,
  selectedName,
  onSelect,
  className,
  prompt = "Select a deck:",
  alreadySyncedTooltip = "Already in target",
  emptyTooltip = "Empty deck",
  inputName = "deck-selection",
  inputClassName,
  labelClassName,
  getRowClassName,
}: DeckListProps): JSX.Element {
  const rootClassName = mergeClasses(listClasses.list, className);
  const listColumns = ["Deck", "Imported"];

  if (!items.length) {
    return (
      <div className={rootClassName}>
        <p>No decks found.</p>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <p>{prompt}</p>
      <List columns={listColumns} columnWidths="1fr auto" dividers="bottom">
        {items.map(
          ({
            name,
            shortName,
            depth,
            totalCount,
            syncedCount,
            updatedCount,
            isDisabled,
            tooltip,
          }) => {
            const upToDateCount =
              updatedCount === null ? syncedCount : totalCount - updatedCount;
            const isFullyImported =
              totalCount > 0 && upToDateCount === totalCount;
            const isEmptyDeck = totalCount === 0;
            let deckTooltip: string;
            if (isFullyImported) {
              deckTooltip = alreadySyncedTooltip;
            } else if (isEmptyDeck) {
              deckTooltip = emptyTooltip;
            } else {
              deckTooltip = tooltip ?? "";
            }

            const deckRowCells = [
              <LabeledControl
                control={
                  <input
                    checked={name === selectedName}
                    className={inputClassName}
                    disabled={isDisabled}
                    name={inputName}
                    onChange={() => onSelect(name)}
                    title={deckTooltip}
                    type="radio"
                    value={name}
                  />
                }
                controlLabel={shortName}
                disabled={isDisabled}
                key="select"
                label={<span className={labelClassName}>{shortName}</span>}
                tooltip={deckTooltip}
              />,
              <span key="count">
                {upToDateCount}/{totalCount}
              </span>,
            ];

            const fallbackClassName = mergeClasses(
              listClasses.listRow,
              isDisabled ? "opacity-50" : undefined,
            );
            const rowClassName = getRowClassName
              ? getRowClassName(
                  {
                    depth,
                    isDisabled,
                    name,
                    shortName,
                    syncedCount,
                    tooltip,
                    totalCount,
                    updatedCount,
                  },
                  isDisabled,
                )
              : fallbackClassName;
            return (
              <ListRow
                cells={deckRowCells}
                className={rowClassName}
                disabled={isDisabled}
                key={name}
                onSelect={() => onSelect(name)}
                style={{
                  paddingLeft: `calc(${depth} * var(--ankipalace-note-transfer-wizard-modal__row-indent) + 0.25rem)`,
                }}
              />
            );
          },
        )}
      </List>
    </div>
  );
}

import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
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
  readonly tooltip?: string | undefined;
  readonly totalCount: number;
  readonly updatedCount: number | null | undefined;
}

export interface DeckListProps {
  readonly alreadySyncedTooltip?: string | undefined;
  readonly className?: string | undefined;
  readonly emptyTooltip?: string | undefined;
  readonly getRowClassName?: (
    item: DeckItem,
    isDisabled: boolean,
  ) => string | undefined;
  readonly inputClassName?: string | undefined;
  readonly inputName?: string | undefined;
  readonly items: DeckItem[];
  readonly labelClassName?: string | undefined;
  readonly onSelect: (name: string) => void;
  readonly prompt?: string | undefined;
  readonly selectedName: string;
}

interface DeckCounts {
  readonly isEmptyDeck: boolean;
  readonly isFullyImported: boolean;
  readonly upToDateCount: number;
}

function deckCounts({
  syncedCount,
  totalCount,
  updatedCount,
}: DeckItem): DeckCounts {
  const upToDateCount =
    updatedCount === null || updatedCount === undefined
      ? syncedCount
      : totalCount - updatedCount;
  return {
    isEmptyDeck: totalCount === 0,
    isFullyImported: totalCount > 0 && upToDateCount === totalCount,
    upToDateCount,
  };
}

interface DeckTooltipOptions {
  readonly alreadySyncedTooltip: string;
  readonly emptyTooltip: string;
  readonly isEmptyDeck: boolean;
  readonly isFullyImported: boolean;
  readonly tooltip: string | undefined;
}

function deckTooltip({
  alreadySyncedTooltip,
  emptyTooltip,
  isEmptyDeck,
  isFullyImported,
  tooltip,
}: DeckTooltipOptions): string {
  if (isFullyImported) {
    return alreadySyncedTooltip;
  }
  if (isEmptyDeck) {
    return emptyTooltip;
  }
  return tooltip ?? "";
}

function deckRowClassName(
  getRowClassName: DeckRowProps["getRowClassName"],
  item: DeckItem,
): string | undefined {
  if (getRowClassName) {
    return getRowClassName(item, item.isDisabled);
  }
  return mergeClasses(
    listClasses.listRow,
    item.isDisabled ? "opacity-50" : undefined,
  );
}

interface DeckRowProps {
  readonly alreadySyncedTooltip: string;
  readonly emptyTooltip: string;
  readonly getRowClassName?:
    ((item: DeckItem, isDisabled: boolean) => string | undefined) | undefined;
  readonly inputClassName?: string | undefined;
  readonly inputName: string;
  readonly item: DeckItem;
  readonly labelClassName?: string | undefined;
  readonly onSelect: (name: string) => void;
  readonly selectedName: string;
}

function DeckRow({
  alreadySyncedTooltip,
  emptyTooltip,
  getRowClassName,
  inputClassName,
  inputName,
  item,
  labelClassName,
  onSelect,
  selectedName,
}: DeckRowProps): JSX.Element {
  const { depth, isDisabled, name, shortName, tooltip, totalCount } = item;
  const { isEmptyDeck, isFullyImported, upToDateCount } = deckCounts(item);
  const resolvedTooltip = deckTooltip({
    alreadySyncedTooltip,
    emptyTooltip,
    isEmptyDeck,
    isFullyImported,
    tooltip,
  });
  const cells = [
    <LabeledControl
      control={
        <input
          checked={name === selectedName}
          className={inputClassName}
          disabled={isDisabled}
          name={inputName}
          onChange={() => onSelect(name)}
          title={resolvedTooltip}
          type="radio"
          value={name}
        />
      }
      controlLabel={shortName}
      disabled={isDisabled}
      key="select"
      label={<span className={labelClassName}>{shortName}</span>}
      tooltip={resolvedTooltip}
    />,
    <span key="count">
      {upToDateCount}/{totalCount}
    </span>,
  ];
  return (
    <ListRow
      cells={cells}
      className={deckRowClassName(getRowClassName, item)}
      disabled={isDisabled}
      key={name}
      onSelect={() => onSelect(name)}
      style={{
        paddingLeft: `calc(${depth} * var(--notepalace-note-transfer-wizard-modal__row-indent) + 0.25rem)`,
      }}
    />
  );
}

export function DeckList({
  items,
  selectedName,
  onSelect,
  className,
  prompt = t("deck.selectPrompt"),
  alreadySyncedTooltip = t("deck.alreadyInTarget"),
  emptyTooltip = t("deck.emptyDeck"),
  inputName = "deck-selection",
  inputClassName,
  labelClassName,
  getRowClassName,
}: DeckListProps): JSX.Element {
  const rootClassName = mergeClasses(listClasses.list, className);
  const listColumns = [t("deck.columns.deck"), t("deck.columns.imported")];

  if (!items.length) {
    return (
      <div className={rootClassName}>
        <p>{t("deck.noDecks")}</p>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <p>{prompt}</p>
      <List columns={listColumns} columnWidths="1fr auto" dividers="bottom">
        {items.map((item) => (
          <DeckRow
            alreadySyncedTooltip={alreadySyncedTooltip}
            emptyTooltip={emptyTooltip}
            getRowClassName={getRowClassName}
            inputClassName={inputClassName}
            inputName={inputName}
            item={item}
            key={item.name}
            labelClassName={labelClassName}
            onSelect={onSelect}
            selectedName={selectedName}
          />
        ))}
      </List>
    </div>
  );
}

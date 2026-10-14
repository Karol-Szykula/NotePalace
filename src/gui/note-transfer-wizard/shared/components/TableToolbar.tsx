import type { JSX } from "react";
import { t } from "src/i18n";
import { listClasses } from "../classes/common";
import { SearchBox, type SearchBoxProps } from "./SearchBox";

interface TableToolbarProps {
  readonly anyExpandedOnPage: boolean;
  readonly count: string;
  readonly onExpandAllToggle: () => void;
  readonly search?: SearchBoxProps | undefined;
}

export function TableToolbar({
  anyExpandedOnPage,
  count,
  onExpandAllToggle,
  search,
}: TableToolbarProps): JSX.Element {
  return (
    <div className={listClasses.listToolbar}>
      <p className={listClasses.listToolbarCount}>{count}</p>
      {search && (
        <div className={listClasses.listToolbarSearch}>
          <SearchBox {...search} />
        </div>
      )}
      <button
        className={listClasses.listToolbarAction}
        onClick={onExpandAllToggle}
        type="button"
      >
        {anyExpandedOnPage ? t("preview.collapseAll") : t("preview.expandAll")}
      </button>
    </div>
  );
}

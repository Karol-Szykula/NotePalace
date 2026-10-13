import type { JSX } from "react";
import { t } from "src/i18n";
import { searchBoxClasses } from "../classes/common";

export interface SearchBoxProps {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
  readonly placeholder?: string | undefined;
  readonly value: string;
}

export function SearchBox({
  label,
  onChange,
  onClear,
  placeholder,
  value,
}: SearchBoxProps): JSX.Element {
  return (
    <div className={searchBoxClasses.searchBox}>
      <input
        aria-label={label}
        className={searchBoxClasses.searchInput}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClear();
          }
        }}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {value !== "" && (
        <button
          aria-label={t("preview.clearSearch")}
          className={searchBoxClasses.searchClear}
          onClick={onClear}
          type="button"
        >
          {"\u00d7"}
        </button>
      )}
    </div>
  );
}

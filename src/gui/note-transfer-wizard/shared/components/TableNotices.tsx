import type { JSX } from "react";
import { listClasses } from "../classes/common";

interface TableNoticesProps {
  readonly notesLeftToDecide: number;
  readonly resurrectableLeft: boolean;
  readonly resurrectionWarning?: string | undefined;
  readonly selectionNotice?: string | undefined;
}

export function TableNotices({
  notesLeftToDecide,
  resurrectableLeft,
  resurrectionWarning,
  selectionNotice,
}: TableNoticesProps): JSX.Element {
  return (
    <>
      {selectionNotice && notesLeftToDecide > 0 && (
        <p className={listClasses.listToolbarBanner}>{selectionNotice}</p>
      )}
      {resurrectionWarning && resurrectableLeft && (
        <p className={listClasses.listToolbarBanner}>{resurrectionWarning}</p>
      )}
    </>
  );
}

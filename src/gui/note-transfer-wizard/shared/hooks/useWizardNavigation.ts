import {
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface WizardNavigation {
  readonly canAdvance: boolean;
  readonly currentPage: number;
  readonly goToNextPage: () => void;
  readonly goToPrevPage: () => void;
  readonly leftButtons: ReadonlyArray<{
    readonly label: string;
    readonly onClick: () => void;
  }>;
  readonly onCancel: () => void;
  readonly rightButtons: ReadonlyArray<{
    readonly label: string;
    readonly onClick: () => void;
    readonly disabled?: boolean;
  }>;
  readonly setCurrentPage: Dispatch<SetStateAction<number>>;
}

export function useWizardNavigation(
  pageTitles: string[],
  initialPage: number,
  canAdvance: boolean,
  onCancel: () => void,
  onFinish: () => void,
): WizardNavigation {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const goToNextPage = useCallback(() => {
    if (canAdvance && currentPage < pageTitles.length) {
      setCurrentPage(currentPage + 1);
    }
  }, [canAdvance, currentPage, pageTitles.length]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const rightButtons = [];
  if (currentPage > 1) {
    rightButtons.push({
      label: "← Back",
      onClick: goToPrevPage,
    });
  }
  if (currentPage < pageTitles.length) {
    const isLastPage = currentPage === pageTitles.length;
    rightButtons.push({
      label: isLastPage ? "Finish" : `Next: ${pageTitles[currentPage]} →`,
      disabled: !canAdvance,
      onClick: isLastPage ? onFinish : goToNextPage,
    });
  }
  if (currentPage === pageTitles.length) {
    rightButtons.push({
      label: "OK",
      onClick: onCancel,
    });
  }

  const leftButtons =
    currentPage === pageTitles.length
      ? []
      : [{ label: "Cancel", onClick: onCancel }];

  return {
    currentPage,
    setCurrentPage,
    canAdvance,
    goToNextPage,
    goToPrevPage,
    rightButtons,
    leftButtons,
    onCancel,
  };
}

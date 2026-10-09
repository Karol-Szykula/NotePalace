import { useState, type Dispatch, type SetStateAction } from "react";

export interface WizardNavigation {
  readonly currentPage: number;
  readonly setCurrentPage: Dispatch<SetStateAction<number>>;
}

export function useWizardNavigation(initialPage: number): WizardNavigation {
  const [currentPage, setCurrentPage] = useState(initialPage);
  return { currentPage, setCurrentPage };
}

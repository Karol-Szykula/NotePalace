import { useMemo, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { noteTransferWizardClasses } from "../classes";
import { PageIndicator } from "./PageIndicator";
import { Footer, type FooterButton } from "./Footer";

export interface WizardPage<Context = unknown> {
  readonly canAdvance?: (context: Context) => boolean;
  readonly canFinish?: (context: Context) => boolean;
  readonly render: (context: Context) => JSX.Element;
  readonly title: string;
}

interface WizardPagination {
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly totalPages: number;
}

export interface WizardShellProps<Context> {
  readonly className?: string;
  readonly getContext: () => Context;
  readonly getNextLabel?: (
    page: number,
    context: Context,
  ) => string | undefined;
  readonly getPagination?: (page: number) => WizardPagination | undefined;
  readonly initialPage: number;
  readonly notice?: string | undefined;
  readonly onBeforeAdvance?: (fromPage: number, context: Context) => void;
  readonly onCancel: () => void;
  readonly pages: WizardPage<Context>[];
}

export function WizardShell<Context>({
  pages,
  initialPage,
  notice,
  getContext,
  getNextLabel,
  getPagination,
  onBeforeAdvance,
  onCancel,
  className,
}: WizardShellProps<Context>): JSX.Element {
  const context = getContext();
  const pageTitles = useMemo(() => pages.map((p) => p.title), [pages]);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const totalPages = pages.length;
  const activePage = pages[currentPage - 1];
  const canAdvance = canAdvanceFrom(activePage, currentPage, pages, context);
  const canFinish = activePage?.canFinish?.(context) ?? true;

  const goToNextPage = () => {
    if (!canAdvance || currentPage >= totalPages) {
      return;
    }
    onBeforeAdvance?.(currentPage, context);
    setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const nextLabel = nextLabelFor(
    getNextLabel?.(currentPage, context),
    currentPage,
    totalPages,
  );
  const rightButtons = rightButtonsFor({
    canAdvance,
    canFinish,
    currentPage,
    goToNextPage,
    goToPrevPage,
    nextLabel,
    onCancel,
    totalPages,
  });

  return (
    <div className={mergeClasses("wizard-shell", className)}>
      <PageIndicator currentPage={currentPage} pages={pageTitles} />
      {notice !== undefined && currentPage === initialPage && (
        <p className={noteTransferWizardClasses.notice}>{notice}</p>
      )}
      {activePage?.render(context)}
      <Footer
        leftButtons={leftButtonsFor(currentPage, totalPages, onCancel)}
        pagination={getPagination?.(currentPage)}
        rightButtons={rightButtons}
      />
    </div>
  );
}

interface RightButtonsState {
  canAdvance: boolean;
  canFinish: boolean;
  currentPage: number;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  nextLabel: string | undefined;
  onCancel: () => void;
  totalPages: number;
}

function canAdvanceFrom<Context>(
  activePage: WizardPage<Context> | undefined,
  currentPage: number,
  pages: WizardPage<Context>[],
  context: Context,
): boolean {
  if (activePage === undefined) {
    return false;
  }
  return activePage.canAdvance?.(context) ?? currentPage < pages.length;
}

function nextLabelFor(
  custom: string | undefined,
  currentPage: number,
  totalPages: number,
): string | undefined {
  if (custom !== undefined) {
    return custom;
  }
  if (currentPage < totalPages - 1) {
    return t("wizard.next");
  }
  if (currentPage === totalPages - 1) {
    return t("wizard.finish");
  }
  return undefined;
}

function leftButtonsFor(
  currentPage: number,
  totalPages: number,
  onCancel: () => void,
): FooterButton[] {
  return currentPage === totalPages
    ? []
    : [{ label: t("wizard.cancel"), onClick: onCancel }];
}

function rightButtonsFor(state: RightButtonsState): FooterButton[] {
  const buttons: FooterButton[] = [];
  if (state.currentPage > 1 && state.currentPage < state.totalPages) {
    buttons.push({ label: t("wizard.back"), onClick: state.goToPrevPage });
  }
  if (state.nextLabel !== undefined && state.currentPage < state.totalPages) {
    buttons.push({
      disabled: !state.canAdvance,
      label: state.nextLabel,
      onClick: state.goToNextPage,
    });
  }
  if (state.currentPage === state.totalPages) {
    buttons.push({
      disabled: !state.canFinish,
      label: t("wizard.ok"),
      onClick: state.onCancel,
    });
  }
  return buttons;
}

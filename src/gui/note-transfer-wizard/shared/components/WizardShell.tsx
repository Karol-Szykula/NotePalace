import { useMemo, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { PageIndicator } from "./PageIndicator";
import { Footer } from "./Footer";
import { useWizardNavigation } from "../hooks/useWizardNavigation";

export interface WizardPage<Context = unknown> {
  readonly canAdvance?: (context: Context) => boolean;
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
  readonly onBeforeAdvance?: (fromPage: number, context: Context) => void;
  readonly onCancel: () => void;
  readonly pages: WizardPage<Context>[];
}

export function WizardShell<Context>({
  pages,
  initialPage,
  getContext,
  getNextLabel,
  getPagination,
  onBeforeAdvance,
  onCancel,
  className,
}: WizardShellProps<Context>): JSX.Element {
  const context = getContext();
  const pageTitles = useMemo(() => pages.map((p) => p.title), [pages]);

  const { currentPage, setCurrentPage } = useWizardNavigation(initialPage);
  const activePage = pages[currentPage - 1];
  const canAdvance = activePage
    ? (activePage.canAdvance?.(context) ?? currentPage < pages.length)
    : false;

  const goToNextPage = () => {
    if (!canAdvance || currentPage >= pages.length) {
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

  const customNextLabel = getNextLabel?.(currentPage, context);
  let defaultNextLabel: string | undefined;
  if (currentPage < pages.length - 1) {
    defaultNextLabel = t("wizard.next");
  } else if (currentPage === pages.length - 1) {
    defaultNextLabel = t("wizard.finish");
  }
  const nextLabel = customNextLabel ?? defaultNextLabel;

  const rightButtons: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }[] = [];
  if (currentPage > 1 && currentPage < pages.length) {
    rightButtons.push({ label: t("wizard.back"), onClick: goToPrevPage });
  }
  if (nextLabel !== undefined && currentPage < pages.length) {
    rightButtons.push({
      disabled: !canAdvance,
      label: nextLabel,
      onClick: goToNextPage,
    });
  }
  if (currentPage === pages.length) {
    rightButtons.push({ label: t("wizard.ok"), onClick: onCancel });
  }

  return (
    <div className={mergeClasses("wizard-shell", className)}>
      <PageIndicator currentPage={currentPage} pages={pageTitles} />
      {activePage?.render(context)}
      <Footer
        leftButtons={
          currentPage === pages.length
            ? []
            : [{ label: t("wizard.cancel"), onClick: onCancel }]
        }
        pagination={getPagination?.(currentPage)}
        rightButtons={rightButtons}
      />
    </div>
  );
}
